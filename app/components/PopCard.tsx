import React from "react";
import {
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  View,
  ViewProps,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export interface PopCardProps {
  /** Controls visibility of the modal */
  visible: boolean;
  /** Fired when the user requests to close the modal */
  onClose: () => void;
  /** Content of the card */
  children: React.ReactNode;
  /** The background color of the card. Defaults to the purple from the inspiration. */
  color?: string;
  /** Custom styles for the content container */
  contentStyle?: ViewProps["style"];
}

/**
 * A reusable bottom sheet component.
 * It features a clickable backdrop to close, and a clean rounded top.
 */
export function PopCard({
  visible,
  onClose,
  children,
  color = "#1C1C1E", // Elevated dark mode surface
  contentStyle,
}: PopCardProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        
        {/* Main content area */}
        <ScrollView
          bounces={false}
          showsVerticalScrollIndicator={false}
          style={[
            styles.content,
            {
              backgroundColor: color,
              maxHeight: SCREEN_HEIGHT * 0.8,
            },
            contentStyle,
          ]}
          contentContainerStyle={{
            paddingBottom: Math.max(insets.bottom + 20, 40),
          }}
        >
          {children}
        </ScrollView>
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
  content: {
    width: "100%",
    paddingHorizontal: 24,
    paddingTop: 32,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
});
