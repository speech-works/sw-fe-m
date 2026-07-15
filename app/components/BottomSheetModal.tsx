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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, relativeLuminance } from "../design-system";
import { useRegisterNativeModal } from "../stores/nativeModal";

interface BottomSheetModalProps {
  visible: boolean;
  onClose: () => void;
  onAfterClose?: () => void;
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
   * Sheet background. Defaults to the dark `surface.elevated`. Pass a light colour
   * for a light sheet — the handle/close chrome auto-adapts to the background's
   * luminance so it stays legible either way.
   */
  backgroundColor?: string;
  /**
   * If true, the sheet will only be as tall as its content needs (up to maxHeight).
   * Note: Children must NOT use flex: 1 for this to work correctly.
   */
  fitContent?: boolean;
  /**
   * If false, the bottom safe area padding will be disabled.
   * Useful when children want to fill the entire space (e.g. gradient backgrounds).
   */
  hasBottomSafePadding?: boolean;
  /**
   * If false, tapping the dimmed backdrop will not dismiss the sheet.
   */
  closeOnBackdropPress?: boolean;
}

const BottomSheetModal: React.FC<BottomSheetModalProps> = ({
  visible,
  onClose,
  onAfterClose,
  children,
  maxHeight,
  showHandle = true,
  showCloseButton = false,
  backgroundColor,
  fitContent = false,
  hasBottomSafePadding = false,
  closeOnBackdropPress = true,
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [isMounted, setIsMounted] = useState(visible);
  useRegisterNativeModal(isMounted);

  // Default to the dark sheet surface; derive the handle/close chrome from the
  // background's luminance so it reads on both dark and (legacy) light sheets.
  const sheetBg = backgroundColor ?? colors.surface.elevated;
  const onDark = relativeLuminance(sheetBg) < 0.4;
  const handleColor = onDark ? "rgba(255,255,255,0.26)" : "rgba(0,0,0,0.14)";
  const closeDiscBg = onDark ? "rgba(255,255,255,0.12)" : "#FFFFFF";
  const closeDiscBorder = onDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.06)";
  const closeIconColor = onDark ? colors.text.primary : "#1C1B1F";

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
            if (onAfterClose) {
              runOnJS(onAfterClose)();
            }
          }
        },
      );
    }
  }, [visible, windowHeight, translateY, onAfterClose]);

  if (!isMounted) return null;

  return (
    <Modal
      transparent
      animationType="none"
      visible={isMounted}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {closeOnBackdropPress ? (
          <TouchableWithoutFeedback onPress={onClose}>
            <View style={styles.backgroundTouchableArea} />
          </TouchableWithoutFeedback>
        ) : (
          <View style={styles.backgroundTouchableArea} />
        )}

        <Animated.View
          style={[
            styles.modal,
            { backgroundColor: sheetBg },
            hasBottomSafePadding && { paddingBottom: Math.max(insets.bottom, 20) },
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
          {showHandle && <View style={[styles.handle, { backgroundColor: handleColor }]} />}
          {showCloseButton && (
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: closeDiscBg, borderColor: closeDiscBorder }]}
              onPress={onClose}
            >
              <MaterialCommunityIcons name="close" size={20} color={closeIconColor} />
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
  },
  handle: {
    position: "absolute",
    top: 12,
    alignSelf: "center",
    width: 44,
    height: 5,
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
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
});
