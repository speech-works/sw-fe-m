import React, { useEffect, useState, useMemo } from "react";
import {
  Modal,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "../Theme/tokens";
import { parseShadowStyle } from "../util/functions/parseStyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface BottomSheetModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;

  /**
   * How tall the sheet is allowed to become.
   * Accepts:
   *   • A number (pixels), e.g. 300
   *   • A literal percentage string, e.g. "70%"
   * If omitted, the sheet will size itself to its content (minHeight: 200).
   */
  maxHeight?: number | `${number}%`;

  /**
   * If true, displays a small drag indicator handle at the top of the modal.
   */
  showHandle?: boolean;
  /**
   * If true, displays a circular close button at the top right.
   */
  showCloseButton?: boolean;
  /**
   * Optional background color to override default 'white'
   */
  backgroundColor?: string;
  /**
   * If true, the sheet will only be as tall as its content needs (up to maxHeight).
   * Note: Children must NOT use flex: 1 for this to work correctly.
   */
  fitContent?: boolean;
}

const BottomSheetModal: React.FC<BottomSheetModalProps> = ({
  visible,
  onClose,
  children,
  maxHeight,
  showHandle = true,
  showCloseButton = false,
  backgroundColor = "white",
  fitContent = false,
}) => {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [isMounted, setIsMounted] = useState(visible);
  
  // Start the sheet off-screen
  const translateY = useSharedValue(windowHeight);

  // Compute a _fixed pixel height_ from maxHeight (whether it's a number or "xx%")
  const resolvedSheetHeight = useMemo(() => {
    if (maxHeight == null) {
      return undefined; // let content + minHeight:200 drive it
    }
    if (typeof maxHeight === "string" && maxHeight.endsWith("%")) {
      const pct = parseFloat(maxHeight) / 100;
      return windowHeight * pct;
    }
    // otherwise it's a number in px
    return maxHeight;
  }, [maxHeight, windowHeight]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      translateY.value = withTiming(0, {
        duration: 350,
        easing: Easing.out(Easing.quad),
      });
    } else {
      translateY.value = withTiming(
        windowHeight,
        {
          duration: 300,
          easing: Easing.in(Easing.quad),
        },
        (finished) => {
          if (finished) {
            runOnJS(setIsMounted)(false);
          }
        }
      );
    }
  }, [visible, windowHeight, translateY]);

  if (!isMounted) return null;

  return (
    <Modal
      transparent
      animationType="none"
      visible={isMounted}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Tapping the dim background closes */}
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backgroundTouchableArea} />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.modal,
            { backgroundColor },
            { paddingBottom: Math.max(insets.bottom, 20) },
            resolvedSheetHeight != null
              ? fitContent
                ? { maxHeight: resolvedSheetHeight }
                : { height: resolvedSheetHeight }
              : fitContent
                ? { maxHeight: windowHeight * 0.9 } // Default safety cap for fitContent
                : { minHeight: 200 }, // Keep minHeight only if NOT fitContent and no height set
            animatedStyle,
          ]}
        >
          {children}
          {showHandle && <View style={styles.handle} />}
          {showCloseButton && (
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <MaterialCommunityIcons
                name="close"
                size={20}
                color={theme.colors.text.title}
              />
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

export default BottomSheetModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  backgroundTouchableArea: {
    ...StyleSheet.absoluteFillObject,
  },
  modal: {
    width: "100%",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: "hidden",
    elevation: 20,
    ...parseShadowStyle(theme.shadow.elevation4),
  },
  handle: {
    position: "absolute",
    top: 12,
    alignSelf: "center",
    width: 44,
    height: 5,
    backgroundColor: "rgba(0,0,0,0.12)",
    borderRadius: 3,
    zIndex: 10,
  },
  closeBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FFFFFF", // Changed from rgba(255,255,255,0.7)
    alignItems: "center",
    justifyContent: "center",
    ...parseShadowStyle(theme.shadow.elevation1),
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
});
