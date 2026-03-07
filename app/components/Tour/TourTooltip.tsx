import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  DeviceEventEmitter,
  Modal,
  findNodeHandle,
  UIManager,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../../Theme/tokens";
import { parseTextStyle } from "../../util/functions/parseStyles";
import Icon from "react-native-vector-icons/Ionicons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";

import { TooltipProps, useTourGuideController } from "rn-tourguide";
import { useTourStore } from "../../stores/tour";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface Coords {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * AUTONOMOUS GLOBAL TOUR CONTROLLER
 * This component renders at the App Root as a standalone Modal.
 * It listens to the TourGuideController independently.
 */
const GlobalTourTooltip = () => {
  const insets = useSafeAreaInsets();
  const { getCurrentStep, stop } = useTourGuideController();
  const { activeTourMaxSteps } = useTourStore();

  const step = getCurrentStep();
  const active = !!step;

  const targetY = useSharedValue(0);
  const targetHeight = useSharedValue(0);
  const [layoutReady, setLayoutReady] = useState(false);
  const intervalRef = useRef<any>(null);
  const transitionRef = useRef(false);

  // Animation values
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (active && step?.target) {
      // RESET: Go invisible and clear old position immediately to prevent flickering
      opacity.value = 0;
      setLayoutReady(false);
      targetY.value = 0;
      targetHeight.value = 0;
      transitionRef.current = false;

      const stabilityRef = { count: 0, lastY: 0 };

      const measure = () => {
        if (transitionRef.current) return;
        let handle;
        try {
          handle = findNodeHandle(step.target);
        } catch (e) {
          return;
        }
        if (!handle) return;

        UIManager.measure(
          handle,
          (
            x: number,
            y: number,
            width: number,
            height: number,
            pageX: number,
            pageY: number,
          ) => {
            if (pageX !== undefined && pageY !== undefined && width > 0) {
              // STABILITY CHECK:
              // Tooltip revelation is deferred until the Y coordinate is stable
              // for at least 3 consecutive checks (300ms of stability).
              const isStable = Math.abs(pageY - stabilityRef.lastY) < 1;
              if (isStable) {
                stabilityRef.count += 1;
              } else {
                stabilityRef.count = 0;
                stabilityRef.lastY = pageY;
              }

              // Update shared values
              targetY.value = pageY;
              targetHeight.value = height;

              // Only reveal if stable and not already showing
              if (
                !transitionRef.current &&
                opacity.value === 0 &&
                stabilityRef.count >= 3
              ) {
                opacity.value = withTiming(1, { duration: 400 });
                scale.value = withTiming(1, { duration: 400 });
                runOnJS(setLayoutReady)(true);
              }
            }
          },
        );
      };

      // Increased settling delay to 600ms to allow layout animations to finish
      const timer = setTimeout(() => {
        measure();
        intervalRef.current = setInterval(measure, 100);
      }, 600);

      return () => {
        clearTimeout(timer);
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    } else {
      // EXIT animation
      opacity.value = withTiming(0, { duration: 250 });
      scale.value = withTiming(0.8, { duration: 250 }, () => {
        runOnJS(setLayoutReady)(false);
      });
    }
  }, [active, step?.name]);

  const animatedStyle = useAnimatedStyle(() => {
    /**
     * UI THREAD POSITIONING LOGIC
     * This eliminates frame misalignment flickers
     */
    const MARGIN = 12;
    const cardHeightEstimate = 220;

    let topVal = targetY.value + targetHeight.value + MARGIN;
    let isBelowVal = true;

    const isStepHighClarity =
      step?.order === 4 ||
      step?.order === 5 ||
      step?.order === 6 ||
      step?.order === 7 ||
      step?.order === 8;
    const bottomThreshold = SCREEN_HEIGHT - insets.bottom - 40;

    if (topVal + cardHeightEstimate > bottomThreshold && step?.order !== 6) {
      topVal = targetY.value - cardHeightEstimate - MARGIN;
      isBelowVal = false;

      if (isStepHighClarity) {
        topVal -= 40;
      }
    } else {
      if (isStepHighClarity) {
        topVal += 40;
      }
    }

    // Final safety clamp
    topVal = Math.max(
      insets.top + 20,
      Math.min(topVal, SCREEN_HEIGHT - insets.bottom - cardHeightEstimate - 20),
    );

    return {
      opacity: opacity.value,
      transform: [{ scale: scale.value }],
      top: topVal,
      borderTopRightRadius: isBelowVal ? 32 : 8,
      borderBottomRightRadius: isBelowVal ? 8 : 32,
    };
  });

  if (!active || !layoutReady) return null;

  const emitNext = () => {
    DeviceEventEmitter.emit("tour:next", {
      currentStep: step,
      handleStop: stop,
    });
  };

  const emitPrev = () => {
    DeviceEventEmitter.emit("tour:prev", {
      currentStep: step,
      handleStop: stop,
    });
  };

  const handleNext = () => {
    transitionRef.current = true;
    if (intervalRef.current) clearInterval(intervalRef.current);

    opacity.value = withTiming(0, { duration: 200 });
    scale.value = withTiming(0.8, { duration: 200 }, () => {
      runOnJS(emitNext)();
    });
  };

  const handlePrev = () => {
    transitionRef.current = true;
    if (intervalRef.current) clearInterval(intervalRef.current);

    opacity.value = withTiming(0, { duration: 200 });
    scale.value = withTiming(0.8, { duration: 200 }, () => {
      runOnJS(emitPrev)();
    });
  };

  const startStop = () => {
    stop();
  };

  const handleStop = () => {
    transitionRef.current = true;
    if (intervalRef.current) clearInterval(intervalRef.current);

    opacity.value = withTiming(0, { duration: 200 });
    scale.value = withTiming(0.8, { duration: 200 }, () => {
      runOnJS(startStop)();
    });
  };

  const isFirstStep = step.order === 1;
  const isLastStep = step.order >= activeTourMaxSteps;

  return (
    <Modal visible={active && layoutReady} transparent animationType="none">
      <View style={styles.rootLayer} pointerEvents="box-none">
        <Animated.View style={[styles.container, animatedStyle]}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Icon
                name="sparkles"
                size={18}
                color={theme.colors.actionPrimary.default}
              />
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>STEP {step.order}</Text>
            </View>
          </View>

          <View style={styles.content}>
            <Text style={styles.description}>{step.text}</Text>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity onPress={handleStop} style={styles.skipButton}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>

            <View style={styles.navGroup}>
              {!isFirstStep && (
                <TouchableOpacity
                  onPress={handlePrev}
                  style={styles.backButton}
                >
                  <Text style={styles.backText}>Back</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={isLastStep ? handleStop : handleNext}
                style={styles.nextButton}
              >
                <Text style={styles.nextText}>
                  {isLastStep ? "Finish" : "Next"}
                </Text>
                <Icon
                  name={isLastStep ? "checkmark-circle" : "arrow-forward"}
                  size={14}
                  color="#FFF"
                />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  rootLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    alignItems: "center",
  },
  container: {
    position: "absolute",
    backgroundColor: "rgba(255, 255, 255, 0.98)",
    width: SCREEN_WIDTH - 48,
    borderRadius: 32,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 25,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(249, 115, 22, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: theme.colors.text.default,
    letterSpacing: 0.5,
  },
  content: {
    marginBottom: 24,
  },
  description: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "500",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  navGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  skipButton: { paddingVertical: 8 },
  skipText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text.default,
    opacity: 0.5,
  },
  backButton: { paddingVertical: 10, paddingHorizontal: 16 },
  backText: { fontSize: 14, fontWeight: "700", color: theme.colors.text.title },
  nextButton: {
    backgroundColor: theme.colors.actionPrimary.default,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 100,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    shadowColor: theme.colors.actionPrimary.default,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  nextText: { color: "#FFF", fontSize: 15, fontWeight: "800" },
});

export const LocalTourTooltipStub = () => null;
export default GlobalTourTooltip;
