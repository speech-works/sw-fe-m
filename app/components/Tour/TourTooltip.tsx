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

  const step = getCurrentStep();
  const active = !!step;

  const [coords, setCoords] = useState<Coords | null>(null);
  const [layoutReady, setLayoutReady] = useState(false);
  const intervalRef = useRef<any>(null);

  // Animation values
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (active && step?.target) {
      const measure = () => {
        const handle = findNodeHandle(step.target);
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
              setCoords({ x: pageX, y: pageY, width, height });
            }
          },
        );
      };

      const timer = setTimeout(() => {
        measure();
        intervalRef.current = setInterval(measure, 100);
      }, 500);

      scale.value = withSpring(1, { damping: 15, stiffness: 120 });
      opacity.value = withTiming(1, { duration: 300 }, () => {
        runOnJS(setLayoutReady)(true);
      });

      return () => {
        clearTimeout(timer);
        if (intervalRef.current) clearInterval(intervalRef.current);
        setLayoutReady(false);
      };
    } else {
      scale.value = withSpring(0.8);
      opacity.value = withTiming(0, { duration: 200 }, () => {
        runOnJS(setCoords)(null);
        runOnJS(setLayoutReady)(false);
      });
    }
  }, [active, step?.name]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (!active || !coords) return null;

  const handleNext = () => {
    DeviceEventEmitter.emit("tour:next", {
      currentStep: step,
      handleStop: stop,
    });
  };

  const handlePrev = () => {
    DeviceEventEmitter.emit("tour:prev", {
      currentStep: step,
      handleStop: stop,
    });
  };

  /**
   * POSITIONING LOGIC
   */
  const MARGIN = 16;
  const cardHeightEstimate = 160;

  let top = coords.y + coords.height + MARGIN;
  let isBelow = true;

  // If it hits the bottom safe area, place it above
  if (top + cardHeightEstimate > SCREEN_HEIGHT - insets.bottom - 40) {
    top = coords.y - cardHeightEstimate - MARGIN;
    isBelow = false;
  }

  // Safety clamp
  top = Math.max(
    insets.top + 20,
    Math.min(top, SCREEN_HEIGHT - insets.bottom - cardHeightEstimate - 20),
  );

  const isFirstStep = step.order === 1;
  const isLastStep = step.order >= 4; // Adjust based on total steps

  return (
    <Modal visible={active && !!coords} transparent animationType="none">
      <View style={styles.rootLayer} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.container,
            {
              top,
              borderTopRightRadius: isBelow ? 32 : 8,
              borderBottomRightRadius: isBelow ? 8 : 32,
            },
            animatedStyle,
          ]}
        >
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
            <TouchableOpacity onPress={stop} style={styles.skipButton}>
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
                onPress={isLastStep ? stop : handleNext}
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

export const LocalTourTooltipStub = () => (
  <View
    style={{
      width: SCREEN_WIDTH,
      height: 100,
      backgroundColor: "transparent",
    }}
  />
);
export default GlobalTourTooltip;
