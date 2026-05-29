import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useEventStore } from "../stores/events";
import { EVENT_NAMES } from "../stores/events/constants";
import { theme } from "../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../util/functions/parseStyles";
import BottomSheetModal from "./BottomSheetModal";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

const OutcomeModal = () => {
  const { events, clear } = useEventStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<"error" | "success" | null>(null);
  const [modalTitle, setModalTitle] = useState("");
  const [modalTag, setModalTag] = useState("");
  const [modalMessage, setModalMessage] = useState("");

  useEffect(() => {
    if (!events || events.length === 0) return;

    for (const event of events) {
      if (
        event.name === EVENT_NAMES.SHOW_ERROR_MODAL ||
        event.name === EVENT_NAMES.SHOW_SUCCESS_MODAL
      ) {
        const type =
          event.name === EVENT_NAMES.SHOW_SUCCESS_MODAL ? "success" : "error";

        const title =
          event.detail?.modalTitle ||
          event.detail?.title ||
          (type === "error" ? "Something went wrong" : "Success");
        const message =
          event.detail?.errorMessage ||
          event.detail?.message ||
          event.detail?.desc ||
          "";
        const tag = event.detail?.modalTag || event.detail?.tag || "";

        setModalType(type);
        setModalTitle(title);
        setModalTag(tag);
        setModalMessage(message);
        setModalVisible(true);
        clear(event.name);
      }
    }
  }, [events, clear]);

  return (
    <BottomSheetModal
      visible={modalVisible}
      onClose={() => setModalVisible(false)}
    >
      <View style={styles.container}>
        {/* Top Handle / Indicator */}
        <View style={styles.handle} />

        {/* Close Button (White circle matching the screenshot) */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => setModalVisible(false)}
        >
          <Icon name="close" size={16} color="#000" />
        </TouchableOpacity>

        <View style={styles.content}>
          <Text style={styles.title} adjustsFontSizeToFit={true} numberOfLines={2}>
            {modalTitle}
          </Text>
          {modalTag ? <Text style={styles.subtitle}>{modalTag}</Text> : null}

          <View style={styles.divider} />

          <Text style={styles.message}>{modalMessage}</Text>

          <TouchableOpacity
            style={[
              styles.actionButton,
              modalType === "success" && { backgroundColor: theme.colors.feedback.success },
              modalType === "error" && { backgroundColor: theme.colors.feedback.error },
            ]}
            onPress={() => setModalVisible(false)}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFCF8",
    paddingTop: 12,
    paddingBottom: 32,
    paddingHorizontal: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    alignItems: "center",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E2E8F0",
    marginBottom: 20,
  },
  closeButton: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    ...parseShadowStyle(theme.shadow.elevation1),
    zIndex: 10,
  },
  content: {
    alignItems: "center",
    width: "100%",
  },
  title: {
    ...parseTextStyle(theme.typography.Heading3),
    color: "#0F172A",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    textAlign: "center",
    marginBottom: 16,
  },
  divider: {
    width: 32,
    height: 2,
    backgroundColor: "#F1F5F9",
    marginBottom: 16,
  },
  message: {
    ...parseTextStyle(theme.typography.Body),
    color: "#475569",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
    fontSize: 15,
  },
  actionButton: {
    width: "100%",
    height: 48,
    borderRadius: 14,
    backgroundColor: "#FF914D",
    alignItems: "center",
    justifyContent: "center",
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
});

export default OutcomeModal;
