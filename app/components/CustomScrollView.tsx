// CustomScrollView.tsx
import React, { forwardRef, useImperativeHandle } from "react";
import {
  StyleProp,
  StyleSheet,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import Animated, {
  runOnJS,
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Icon from "react-native-vector-icons/FontAwesome5";
import { theme } from "../Theme/tokens";

export const SHADOW_BUFFER = 5;

interface CustomScrollViewProps {
  children: React.ReactNode;
  buttonContainerStyle?: StyleProp<ViewStyle>;
  topButtonContainerStyle?: StyleProp<ViewStyle>;
  bottomButtonContainerStyle?: StyleProp<ViewStyle>;
  buttonIconStyle?: StyleProp<TextStyle>;
  showButtonsInitially?: boolean;
  showScrollButtons?: boolean;
  /** Called when the user scrolls within `onEndReachedThreshold` px of the bottom. */
  onEndReached?: () => void;
  /** Distance (px) from the bottom at which `onEndReached` fires. Defaults to 320. */
  onEndReachedThreshold?: number;
  outerScrollY?: Animated.SharedValue<number>;
  [key: string]: any;
}

const BUTTON_AREA_HEIGHT = 180;

const CustomScrollView = forwardRef<Animated.ScrollView, CustomScrollViewProps>(
  (
    {
      children,
      buttonContainerStyle,
      topButtonContainerStyle,
      bottomButtonContainerStyle,
      buttonIconStyle,
      showButtonsInitially = false,
      showScrollButtons = false,
      onEndReached,
      onEndReachedThreshold = 320,
      onScrollY,
      outerScrollY,
      ...rest
    },
    ref,
  ) => {
    // Internal ref for Reanimated scrollTo
    const internalRef = useAnimatedRef<Animated.ScrollView>();

    // Shared values for scroll state
    const scrollY = useSharedValue(0);
    const contentHeight = useSharedValue(0);
    const layoutHeight = useSharedValue(0);
    // Last vertical offset reported to JS via onScrollY (px-bucketed to throttle).
    const lastReportedY = useSharedValue(0);
    // Guards onEndReached so it fires once per entry into the bottom zone,
    // re-arming only after the user scrolls back out of it.
    const canFireEndReached = useSharedValue(true);

    // Scroll Handler running on UI thread
    const scrollHandler = useAnimatedScrollHandler(
      {
        onScroll: (event) => {
          scrollY.value = event.contentOffset.y;
          if (outerScrollY) {
            outerScrollY.value = event.contentOffset.y;
          }
          contentHeight.value = event.contentSize.height;
          layoutHeight.value = event.layoutMeasurement.height;

          // Report vertical offset to JS, bucketed to ~6px so we don't spam the bridge.
          if (onScrollY && Math.abs(event.contentOffset.y - lastReportedY.value) > 6) {
            lastReportedY.value = event.contentOffset.y;
            runOnJS(onScrollY)(event.contentOffset.y);
          }

          if (onEndReached) {
            const distanceFromBottom =
              event.contentSize.height -
              (event.contentOffset.y + event.layoutMeasurement.height);
            if (distanceFromBottom <= onEndReachedThreshold) {
              if (canFireEndReached.value) {
                canFireEndReached.value = false;
                runOnJS(onEndReached)();
              }
            } else {
              canFireEndReached.value = true;
            }
          }
        },
      },
      [onEndReached, onEndReachedThreshold, onScrollY],
    );

    // Helper to sync external ref if provided (optional/advanced, avoiding for simplicity unless needed)
    // For this refactor, we primarily rely on internalRef for the buttons.
    // If parent needs ref, we might need a workaround, but typically parents just use it for scrollTo.
    // We will attach the passed ref to the component alongside internalRef if possible,
    // or just rely on the user passing a ref that Reanimated can handle.
    // A simple strategy is to let the parent control the ref if they want, but use ours for the buttons.
    // However, Reanimated's scrollTo needs an AnimatedRef.
    // We'll wrap the scrolling functions.
    useImperativeHandle(ref, () => internalRef.current as Animated.ScrollView);

    const handleScrollToTop = () => {
      // Run on UI thread directly
      scrollTo(internalRef, 0, 0, true);
    };

    const handleScrollToBottom = () => {
      // Run on UI thread directly
      const maxOffset = contentHeight.value - layoutHeight.value;
      if (maxOffset > 0) {
        scrollTo(internalRef, 0, maxOffset, true);
      }
    };

    // Animated styles for buttons
    const topButtonStyle = useAnimatedStyle(() => {
      const isScrollableUp = scrollY.value > 10; // small buffer
      return {
        opacity: withTiming(isScrollableUp ? 1 : 0, { duration: 200 }),
        // Disable pointer events when invisible effectively by checking opacity in render or zIndex?
        // Reanimated doesn't modify pointerEvents easily. We can use transform scale.
        transform: [{ scale: withTiming(isScrollableUp ? 1 : 0.8) }],
      };
    });

    const bottomButtonStyle = useAnimatedStyle(() => {
      // If we haven't measured yet, hide
      if (contentHeight.value === 0 || layoutHeight.value === 0) {
        return { opacity: 0 };
      }
      const isScrollableDown =
        scrollY.value + layoutHeight.value < contentHeight.value - 20; // 20px buffer
      return {
        opacity: withTiming(isScrollableDown ? 1 : 0, { duration: 200 }),
        transform: [{ scale: withTiming(isScrollableDown ? 1 : 0.8) }],
      };
    });

    const { style, contentContainerStyle, ...otherProps } = rest as any;

    return (
      <View style={[styles.container, { overflow: "hidden" }]}>
        <Animated.ScrollView
          ref={internalRef}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          style={[{ flex: 1, overflow: "hidden" }, style]}
          contentContainerStyle={[
            styles.scrollContent,
            showScrollButtons && {
              padding: SHADOW_BUFFER,
              paddingBottom: BUTTON_AREA_HEIGHT,
            },
            contentContainerStyle,
          ]}
          showsVerticalScrollIndicator={false}
          {...otherProps}
        >
          {children}
        </Animated.ScrollView>

        {showScrollButtons && (
          <>
            <Animated.View
              style={[
                styles.baseButton,
                styles.topButton,
                buttonContainerStyle,
                topButtonContainerStyle,
                topButtonStyle,
              ]}
            >
              <TouchableOpacity
                onPress={handleScrollToTop}
                style={styles.touchableButton}
              >
                <Icon
                  name="chevron-up"
                  style={[styles.baseIcon, buttonIconStyle]}
                />
              </TouchableOpacity>
            </Animated.View>

            <Animated.View
              style={[
                styles.baseButton,
                styles.bottomButton,
                buttonContainerStyle,
                bottomButtonContainerStyle,
                bottomButtonStyle,
              ]}
            >
              <TouchableOpacity
                onPress={handleScrollToBottom}
                style={styles.touchableButton}
              >
                <Icon
                  name="chevron-down"
                  style={[styles.baseIcon, buttonIconStyle]}
                />
              </TouchableOpacity>
            </Animated.View>
          </>
        )}
      </View>
    );
  },
);

export default CustomScrollView;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {},
  baseButton: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  touchableButton: {
    padding: 10,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.9)", // Added BG for visibility
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  baseIcon: {
    fontSize: 20,
    color: theme.colors.actionPrimary.default,
  },
  topButton: {
    bottom: 120,
    right: 20, // Cleaned up positioning
  },
  bottomButton: {
    bottom: 50,
    right: 20,
  },
});
