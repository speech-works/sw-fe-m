import React from "react";
import {
  Modal,
  View,
  Pressable,
  ScrollView,
  StyleSheet,
  ViewStyle,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../useTheme";
import { radius, space } from "../primitives/scale";

const { height: SCREEN_H } = Dimensions.get("window");

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Override the sheet surface color (e.g. an accent for a themed guide). */
  color?: string;
  contentStyle?: ViewStyle;
}

/** Bottom-sheet modal: scrim closes, grab handle, pill-radius top, scrolls to 85%. */
export const Sheet: React.FC<SheetProps> = ({ visible, onClose, children, color, contentStyle }) => {
  const { colors, elevation } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: colors.overlay.scrim }}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            {
              backgroundColor: color ?? colors.surface.elevated,
              borderTopLeftRadius: radius.pill,
              borderTopRightRadius: radius.pill,
              paddingHorizontal: space.screenX,
              paddingTop: 12,
              paddingBottom: Math.max(insets.bottom + 16, 32),
              maxHeight: SCREEN_H * 0.85,
            },
            elevation.e3,
            contentStyle,
          ]}
        >
          <View
            style={{
              width: 40,
              height: 5,
              borderRadius: 9999,
              backgroundColor: colors.border.strong,
              alignSelf: "center",
              marginBottom: 16,
            }}
          />
          <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
