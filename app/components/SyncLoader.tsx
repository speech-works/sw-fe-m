import React from "react";
import { Modal, StyleSheet, View } from "react-native";
import { useSessionStore } from "../stores/session";
import LoadingScreen from "./Loading";
import { parseShadowStyle } from "../util/functions/parseStyles";
import { theme } from "../Theme/tokens";

const SyncLoader: React.FC = () => {
  const isSyncing = useSessionStore((state) => state.isSyncing);

  return (
    <Modal
      transparent
      visible={isSyncing}
      animationType="fade"
      onShow={() => console.log(">> SyncLoader: Showing...")}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <LoadingScreen message="Syncing practice sessions…" isNested />
        </View>
      </View>
    </Modal>
  );
};

export default SyncLoader;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    backgroundColor: "white",
    padding: 40,
    borderRadius: 24,
    width: "85%",
    maxWidth: 340,
    justifyContent: "center",
    alignItems: "center",
    ...parseShadowStyle(theme.shadow.elevation3),
  },
});
