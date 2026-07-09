import React from "react";
import { Modal, View } from "react-native";
import { useSessionStore } from "../stores/session";
import LoadingScreen from "./Loading";
import { makeStyles } from "../design-system";

const SyncLoader: React.FC = () => {
  const isSyncing = useSessionStore((state) => state.isSyncing);
  const styles = useStyles();

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

const useStyles = makeStyles((c, t) => ({
  overlay: {
    flex: 1,
    backgroundColor: c.overlay.scrim,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    backgroundColor: c.surface.elevated,
    padding: t.spacing["4xl"],
    borderRadius: t.radius.card,
    width: "85%",
    maxWidth: 340,
    justifyContent: "center",
    alignItems: "center",
    ...t.elevation.e3,
  },
}));
