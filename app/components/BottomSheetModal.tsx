import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
  TouchableOpacity,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "../Theme/tokens";
import { parseShadowStyle } from "../util/functions/parseStyles";

const SCREEN_HEIGHT = Dimensions.get("window").height;

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
}

const BottomSheetModal: React.FC<BottomSheetModalProps> = ({
  visible,
  onClose,
  children,
  maxHeight,
  showHandle = false,
  showCloseButton = false,
}) => {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const [isMounted, setIsMounted] = useState(visible);

  // Compute a _fixed pixel height_ from maxHeight (whether it's a number or "xx%")
  const resolvedSheetHeight = React.useMemo(() => {
    if (maxHeight == null) {
      return undefined; // let content + minHeight:200 drive it
    }
    if (typeof maxHeight === "string" && maxHeight.endsWith("%")) {
      const pct = parseFloat(maxHeight) / 100;
      return SCREEN_HEIGHT * pct;
    }
    // otherwise it's a number in px
    return maxHeight;
  }, [maxHeight]);

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setIsMounted(false);
      });
    }
  }, [visible, slideAnim]);

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

        {/* 
          Now we explicitly set height: resolvedSheetHeight (if defined).
          That way, any child using flex:1 can fill that exact pixel height.
        */}
        <Animated.View
          style={[
            styles.modal,
            resolvedSheetHeight != null ? { height: resolvedSheetHeight } : {},
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          {showHandle && <View style={styles.handle} />}
          {showCloseButton && (
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <MaterialCommunityIcons
                name="close"
                size={18}
                color={theme.colors.text.title}
              />
            </TouchableOpacity>
          )}
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
};

export default BottomSheetModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  backgroundTouchableArea: {
    flex: 1,
  },
  modal: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    // padding: 24,
    // paddingBottom: 36,
    minHeight: 200,
    // NOTE: no "maxHeight" here. We are now assigning "height" explicitly if maxHeight was provided.
    overflow: "hidden",
  },
  handle: {
    width: 48,
    height: 6,
    backgroundColor: "rgba(0,0,0,0.1)",
    borderRadius: 3,
    alignSelf: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  closeBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 100,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
    ...parseShadowStyle(theme.shadow.elevation1),
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
});
