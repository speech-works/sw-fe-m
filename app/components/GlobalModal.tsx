import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import BgPattern_404 from "../assets/sw-bg/BgPattern_404";
import BgPattern_GradientSpheres from "../assets/sw-bg/BgPattern_GradientSpheres";
import ErrorFace from "../assets/sw-faces/ErrorFace";
import ExplorerFace from "../assets/sw-faces/ExplorerFace";
import HappyScreamFace from "../assets/sw-faces/HappyScreamFace";
import { useEventStore } from "../stores/events";
import { EVENT_NAMES } from "../stores/events/constants";
import { theme } from "../Theme/tokens";
import { parseTextStyle } from "../util/functions/parseStyles";
import BottomSheetModal from "./BottomSheetModal";
import { useTourGuideController } from "rn-tourguide";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";

const GlobalModal = () => {
  const { events, clear } = useEventStore();
  const { getCurrentStep } = useTourGuideController();
  const isTourActive = !!getCurrentStep();
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<
    "error" | "success" | "upsell" | null
  >(null);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");

  const translateY = useSharedValue(0);

  useEffect(() => {
    if (modalVisible) {
      translateY.value = withRepeat(
        withTiming(-10, {
          duration: 3500,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true,
      );
    } else {
      translateY.value = 0;
    }
  }, [modalVisible]);

  const animatedFaceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  useEffect(() => {
    if (!events || events.length === 0) return;
    // Suppress popups during app tours
    if (isTourActive) return;

    for (const event of events) {
      if (
        event.name === EVENT_NAMES.SHOW_ERROR_MODAL ||
        event.name === EVENT_NAMES.SHOW_SUCCESS_MODAL ||
        event.name === EVENT_NAMES.SHOW_STAMINA_UPSELL
      ) {
        console.log(`[GlobalModal] Handling event: ${event.name}`);

        let type: "error" | "success" | "upsell" = "error";
        if (event.name === EVENT_NAMES.SHOW_SUCCESS_MODAL) type = "success";
        if (event.name === EVENT_NAMES.SHOW_STAMINA_UPSELL) type = "upsell";

        // Extract content with fallbacks for triggerToast compatibility
        const title =
          event.detail.modalTitle ||
          event.detail.title ||
          (type === "error"
            ? "Something went wrong"
            : type === "upsell"
              ? "Practice Limit Reached"
              : "Success");

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
  }, [events, clear, isTourActive]);

  return (
    <BottomSheetModal
      visible={modalVisible}
      onClose={() => setModalVisible(false)}
      maxHeight="45%"
    >
      {modalType === "error" ? (
        <BgPattern_404 />
      ) : (
        <BgPattern_GradientSpheres />
      )}
      <View style={styles.handle} />
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>{modalTitle}</Text>
        <Text style={styles.modalMessage}>{modalMessage}</Text>
        <Animated.View style={animatedFaceStyle}>
          {modalType === "error" ? (
            <ErrorFace size={152} />
          ) : modalType === "upsell" ? (
            <ExplorerFace size={152} shouldAnimate loop={false} />
          ) : (
            <HappyScreamFace size={152} />
          )}
        </Animated.View>
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
