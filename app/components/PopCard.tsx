import React from "react";
import {
  Dimensions,
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import FAIcon from "react-native-vector-icons/FontAwesome5";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export interface PopCardProps {
  /** Controls visibility of the modal */
  visible: boolean;
  /** Fired when the user requests to close the modal */
  onClose: () => void;
  /** Content of the card */
  children: React.ReactNode;
  /** The background color of the card. Defaults to the purple from the inspiration. */
  color?: string;
  /** The background color of the close button. */
  closeButtonColor?: string;
  /** Custom styles for the content container */
  contentStyle?: ViewProps["style"];
}

/**
 * A reusable bottom sheet component that features a distinctive cutout at the top center
 * for the close button, inspired by the provided design reference.
 */
export function PopCard({
  visible,
  onClose,
  children,
  color = "#6E45E2", // Default purple matching inspiration
  closeButtonColor = "#2C2C2E",
  contentStyle,
}: PopCardProps) {
  const insets = useSafeAreaInsets();

  // We construct an SVG path for the top edge.
  // It has a flat top, rounded outer corners (radius 32), and a center notch for the close button.
  const cornerRadius = 32;
  const notchDepth = 36;
  const h = notchDepth + 2; // Extra height to overlap the View below to prevent 1px gap
  const w = SCREEN_WIDTH;

  const path = `
    M 0,${h}
    L 0,${cornerRadius}
    A ${cornerRadius},${cornerRadius} 0 0 1 ${cornerRadius},0
    L ${w / 2 - 45},0
    C ${w / 2 - 15},0 ${w / 2 - 32},${notchDepth} ${w / 2},${notchDepth}
    C ${w / 2 + 32},${notchDepth} ${w / 2 + 15},0 ${w / 2 + 45},0
    L ${w - cornerRadius},0
    A ${cornerRadius},${cornerRadius} 0 0 1 ${w},${cornerRadius}
    L ${w},${h}
    Z
  `;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.container}>
          {/* Top SVG Edge with Notch */}
          <View style={{ height: h, width: w }}>
            <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
              <Path d={path} fill={color} />
            </Svg>

            {/* Close Button positioned precisely inside the notch */}
            <TouchableOpacity
              style={[
                styles.closeButton,
                { backgroundColor: closeButtonColor },
              ]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <FAIcon name="times" size={14} color="#A0A0A0" />
            </TouchableOpacity>
          </View>

          {/* Main content area */}
          <View
            style={[
              styles.content,
              {
                backgroundColor: color,
                paddingBottom: Math.max(insets.bottom + 20, 40),
              },
              contentStyle,
            ]}
          >
            {children}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  container: {
    width: "100%",
  },
  content: {
    width: "100%",
    paddingHorizontal: 24,
  },
  closeButton: {
    position: "absolute",
    top: 4, // Aligns button vertically inside the 36px deep notch
    alignSelf: "center",
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    // Optional shadow for the close button to make it pop like the inspiration
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
});
