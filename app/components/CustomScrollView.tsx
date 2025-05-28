// CustomScrollView.tsx
import React, { forwardRef, useState, useRef } from "react";
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
  Animated,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleProp,
  ViewStyle,
  TextStyle,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import { theme } from "../Theme/tokens"; // Keep your existing import

export const SHADOW_BUFFER = 5;

interface CustomScrollViewProps {
  children: React.ReactNode;
  buttonContainerStyle?: StyleProp<ViewStyle>;
  topButtonContainerStyle?: StyleProp<ViewStyle>;
  bottomButtonContainerStyle?: StyleProp<ViewStyle>;
  buttonIconStyle?: StyleProp<TextStyle>;
  showButtonsInitially?: boolean;
  showScrollButtons?: boolean;

  [key: string]: any;
}

// Wrap your component in forwardRef<ScrollView, CustomScrollViewProps>
const CustomScrollView = forwardRef<ScrollView, CustomScrollViewProps>(
  (
    {
      children,
      buttonContainerStyle,
      topButtonContainerStyle,
      bottomButtonContainerStyle,
      buttonIconStyle,
      showButtonsInitially = false,
      showScrollButtons = false,
      ...rest
    },
    ref
  ) => {
    // Now ref is the forwarded ref that parent can use.
    // You can still keep your own internal scrollViewRef if you want local refs,
    // but we only need one ref so that parent’s `ref` points at the <ScrollView> below.
    const [showScrollToTop, setShowScrollToTop] =
      useState(showButtonsInitially);
    const [showScrollToBottom, setShowScrollToBottom] =
      useState(showButtonsInitially);

    const currentScrollY = useRef(0);
    const [scrollViewLayout, setScrollViewLayout] = useState<{
      width: number;
      height: number;
    } | null>(null);
    const [contentSize, setContentSize] = useState<{
      width: number;
      height: number;
    } | null>(null);

    const scrollToTopOpacity = useRef(
      new Animated.Value(showButtonsInitially ? 1 : 0)
    ).current;
    const scrollToBottomOpacity = useRef(
      new Animated.Value(showButtonsInitially ? 1 : 0)
    ).current;

    const BUTTON_AREA_HEIGHT = 100; // Approximate height for button + padding

    const animateButtonVisibility = (
      animatedValue: Animated.Value,
      isVisible: boolean
    ) => {
      Animated.timing(animatedValue, {
        toValue: isVisible ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    };

    const updateButtonVisibility = (
      currentScrollYPos: number,
      visibleHeight: number,
      totalContentHeight: number
    ) => {
      const isScrollableUp = currentScrollYPos > 0;
      if (isScrollableUp !== showScrollToTop) {
        setShowScrollToTop(isScrollableUp);
        animateButtonVisibility(scrollToTopOpacity, isScrollableUp);
      }

      const isScrollableDown =
        currentScrollYPos + visibleHeight < totalContentHeight - 1;
      if (isScrollableDown !== showScrollToBottom) {
        setShowScrollToBottom(isScrollableDown);
        animateButtonVisibility(scrollToBottomOpacity, isScrollableDown);
      }
    };

    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const {
        contentOffset,
        layoutMeasurement,
        contentSize: currentContentSize,
      } = event.nativeEvent;
      currentScrollY.current = contentOffset.y;

      updateButtonVisibility(
        contentOffset.y,
        layoutMeasurement.height,
        currentContentSize.height
      );

      if (
        contentSize?.height !== currentContentSize.height ||
        contentSize?.width !== currentContentSize.width
      ) {
        setContentSize(currentContentSize);
      }
    };

    const handleContentSizeChange = (width: number, height: number) => {
      setContentSize({ width, height });

      if (scrollViewLayout) {
        updateButtonVisibility(
          currentScrollY.current,
          scrollViewLayout.height,
          height
        );
      }
    };

    const handleScrollViewLayout = (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      setScrollViewLayout({ width, height });

      if (contentSize) {
        updateButtonVisibility(
          currentScrollY.current,
          height,
          contentSize.height
        );
      }
    };

    // Expose two methods that can be called via the forwarded ref if needed:
    const scrollToTop = () => {
      if (ref && typeof ref !== "function" && ref.current) {
        (ref.current as ScrollView).scrollTo({ y: 0, animated: true });
      }
    };

    const scrollToBottom = () => {
      if (ref && typeof ref !== "function" && ref.current) {
        (ref.current as ScrollView).scrollToEnd({ animated: true });
      }
    };

    return (
      <View style={styles.container}>
        <ScrollView
          // Attach the forwarded ref here
          ref={ref}
          onScroll={handleScroll}
          onContentSizeChange={handleContentSizeChange}
          onLayout={handleScrollViewLayout}
          scrollEventThrottle={16}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: BUTTON_AREA_HEIGHT,
              padding: SHADOW_BUFFER,
            },
          ]}
          showsVerticalScrollIndicator={false}
          {...rest}
        >
          {children}
        </ScrollView>

        {/* Conditionally render scroll buttons based on showScrollButtons prop */}
        {showScrollButtons && (
          <>
            {/* Scroll to Top Button */}
            <Animated.View
              style={[
                styles.baseButton,
                styles.topButton,
                buttonContainerStyle,
                topButtonContainerStyle,
                { opacity: scrollToTopOpacity },
              ]}
              pointerEvents={showScrollToTop ? "auto" : "none"}
            >
              <TouchableOpacity
                onPress={scrollToTop}
                style={styles.touchableButton}
              >
                <Icon
                  name="chevron-up"
                  style={[styles.baseIcon, buttonIconStyle]}
                />
              </TouchableOpacity>
            </Animated.View>

            {/* Scroll to Bottom Button */}
            <Animated.View
              style={[
                styles.baseButton,
                styles.bottomButton,
                buttonContainerStyle,
                bottomButtonContainerStyle,
                { opacity: scrollToBottomOpacity },
              ]}
              pointerEvents={showScrollToBottom ? "auto" : "none"}
            >
              <TouchableOpacity
                onPress={scrollToBottom}
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
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1, // Allows content to grow within ScrollView
    // paddingBottom is handled inline based on BUTTON_AREA_HEIGHT
  },
  baseButton: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  touchableButton: {
    padding: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  baseIcon: {
    fontSize: 24,
    color: theme.colors.actionPrimary.default,
  },
  topButton: {
    bottom: 120,
    right: -20,
  },
  bottomButton: {
    bottom: 50,
    right: -20,
  },
});

export default CustomScrollView;
