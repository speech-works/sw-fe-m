import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useEventStore } from "../stores/events";
import { EVENT_NAMES } from "../stores/events/constants";
import BottomSheetModal from "./BottomSheetModal";
import { theme } from "../Theme/tokens";
import { parseTextStyle } from "../util/functions/parseStyles";
import BgPattern_404 from "../assets/sw-bg/BgPattern_404";
import ErrorFace from "../assets/sw-faces/ErrorFace";
import HappyScreamFace from "../assets/sw-faces/HappyScreamFace";

const GlobalModal = () => {
  const { events, clear } = useEventStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<"error" | "success" | null>(null);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");

  useEffect(() => {
    if (!events || events.length === 0) return;

    for (const event of events) {
      if (
        event.name === EVENT_NAMES.SHOW_ERROR_MODAL ||
        event.name === EVENT_NAMES.SHOW_SUCCESS_MODAL
      ) {
        console.log(`[GlobalModal] Handling event: ${event.name}`);
        const type =
          event.name === EVENT_NAMES.SHOW_ERROR_MODAL ? "error" : "success";

        // Extract content with fallbacks for triggerToast compatibility
        const title =
          event.detail.modalTitle ||
          event.detail.title ||
          (type === "error" ? "Something went wrong" : "Success");

        const message =
          event.detail.errorMessage ||
          event.detail.message ||
          event.detail.desc ||
          "";

        setModalType(type);
        setModalTitle(title);
        setModalMessage(message);
        setModalVisible(true);

        // Clear the event so it doesn't process again
        clear(event.name);
      }
    }
  }, [events, clear]);

  return (
    <BottomSheetModal
      visible={modalVisible}
      onClose={() => setModalVisible(false)}
      maxHeight="45%"
    >
      <BgPattern_404 />
      <View style={styles.handle} />
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>{modalTitle}</Text>
        <Text style={styles.modalMessage}>{modalMessage}</Text>
        {modalType === "error" ? (
          <ErrorFace size={152} />
        ) : (
          <HappyScreamFace size={152} />
        )}
      </View>
    </BottomSheetModal>
  );
};

export default GlobalModal;

const styles = StyleSheet.create({
  modalContent: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    gap: 20,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#E2E8F0",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    position: "absolute",
    top: 0,
    zIndex: 10,
  },
  modalTitle: {
    color: theme.colors.text.title,
    ...parseTextStyle(theme.typography.Heading3),
    textAlign: "center",
  },
  modalMessage: {
    color: theme.colors.text.default,
    ...parseTextStyle(theme.typography.Body),
    textAlign: "center",
    lineHeight: 22,
    maxWidth: "85%",
  },
});
