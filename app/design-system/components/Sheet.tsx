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
import { radius, space, size } from "../primitives/scale";
import { Text } from "./Text";

const { height: SCREEN_H } = Dimensions.get("window");

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Optional header title (left), shown under the grab handle. */
  title?: string;
  /** Optional header actions (right) — typically one or two <IconButton>s. */
  right?: React.ReactNode;
  /** Override the sheet surface color (e.g. an accent for a themed guide). */
  color?: string;
  contentStyle?: ViewStyle;
}

/** Bottom-sheet modal: scrim closes, grab handle, optional title/actions header,
 * pill-radius top, scrolls to 85%. */
export const Sheet: React.FC<SheetProps> = ({
  visible,
  onClose,
  children,
  title,
  right,
  color,
  contentStyle,
}) => {
  const { colors, elevation } = useTheme();
  const insets = useSafeAreaInsets();
  const hasHeader = !!(title || right);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: colors.background.sunken }}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        {/* Header floats ABOVE the sheet card, on the backdrop — title left,
         * config actions right (mirrors the reference's header band). */}
        {hasHeader ? (
          <View style={styles.header}>
            {title ? <Text variant="h2">{title}</Text> : <View />}
            {right ? <View style={styles.actions}>{right}</View> : null}
          </View>
        ) : null}

        <View
          style={[
            {
              backgroundColor: color ?? colors.surface.elevated,
              borderTopLeftRadius: radius.pill,
              borderTopRightRadius: radius.pill,
              paddingHorizontal: space.screenX,
              paddingTop: hasHeader ? space.screenX : 12,
              paddingBottom: Math.max(insets.bottom + 16, 32),
              maxHeight: SCREEN_H * 0.85,
            },
            elevation.e3,
            contentStyle,
          ]}
        >
          {!hasHeader ? (
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
          ) : null}

          <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: size.backBtn,
    paddingHorizontal: space.screenX,
    paddingBottom: space.groupGap,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.inlineGap,
  },
});
