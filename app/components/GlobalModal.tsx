import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
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
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import Icon from "react-native-vector-icons/FontAwesome5";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import TherapistFace from "../assets/sw-faces/TherapistFace";

const GlobalModal = () => {
  const navigation = useNavigation<any>();
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
        event.name === EVENT_NAMES.SHOW_STAMINA_UPSELL ||
        event.name === EVENT_NAMES.SHOW_PREMIUM_UPSELL
      ) {
        console.log(`[GlobalModal] Handling event: ${event.name}`);

        let type: "error" | "success" | "upsell" = "error";
        if (event.name === EVENT_NAMES.SHOW_SUCCESS_MODAL) type = "success";
        if (
          event.name === EVENT_NAMES.SHOW_STAMINA_UPSELL ||
          event.name === EVENT_NAMES.SHOW_PREMIUM_UPSELL
        )
          type = "upsell";

        // Extract content with fallbacks for triggerToast compatibility
        let title =
          event.detail?.modalTitle ||
          event.detail?.title ||
          (type === "error"
            ? "Something went wrong"
            : type === "upsell"
              ? "Practice Limit Reached"
              : "Success");

        let message =
          event.detail?.errorMessage ||
          event.detail?.message ||
          event.detail?.desc ||
          "";

        // Specific overrides for Premium Upsell
        if (event.name === EVENT_NAMES.SHOW_PREMIUM_UPSELL) {
          title = "Master Speech Management";
          message =
            "Learn advanced tools and strategies directly from expert SLPs.";
        }

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
      maxHeight={modalType === "upsell" ? "92%" : "55%"}
      showCloseButton={true}
    >
      {modalType === "error" ? (
        <BgPattern_404 />
      ) : (
        <BgPattern_GradientSpheres />
      )}
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>{modalTitle}</Text>
        <Text style={styles.modalMessage}>{modalMessage}</Text>
        <Animated.View style={animatedFaceStyle}>
          {modalType === "error" ? (
            <ErrorFace size={152} />
          ) : modalType === "upsell" ? (
            <TherapistFace size={152} shouldAnimate />
          ) : (
            <HappyScreamFace size={152} />
          )}
        </Animated.View>

        {modalType === "upsell" && (
          <>
            {/* Mini Pro Benefits */}
            <View style={styles.upsellBenefits}>
              {[
                "Unlimited AI Speech Analysis",
                "Deep Performance Analytics",
                "Personalized Growth Plan",
                "Exclusive Pro Content",
              ].map((benefit, index) => (
                <View key={index} style={styles.upsellBenefitRow}>
                  <View style={styles.upsellCheckIcon}>
                    <Icon name="check" size={8} color="#FFF" />
                  </View>
                  <Text style={styles.upsellBenefitText}>{benefit}</Text>
                </View>
              ))}
            </View>

            {/* CTA Button */}
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                setModalVisible(false);
                navigation.navigate("PremiumModal" as never);
              }}
              style={styles.upsellButtonContainer}
            >
              <LinearGradient
                colors={[theme.colors.library.orange[400], "#DB2777"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.upsellButton}
              >
                <Text style={styles.upsellButtonText}>
                  Start My 7-Day Free Trial
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.trustRow}>
              <Icon
                name="shield-alt"
                size={10}
                color={theme.colors.text.disabled}
              />
              <Text style={styles.trustText}>
                30-Day Money-Back Guarantee • Cancel Anytime
              </Text>
            </View>
          </>
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
    paddingTop: 96,
    paddingBottom: 40,
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
  upsellBenefits: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: 20,
    padding: 20,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.8)",
  },
  upsellBenefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  upsellCheckIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.actionPrimary.default,
    alignItems: "center",
    justifyContent: "center",
  },
  upsellBenefitText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.title,
    fontWeight: "500",
  },
  upsellButtonContainer: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 10,
  },
  upsellButton: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  upsellButtonText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: "#FFF",
    fontSize: 16,
  },
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
  },
  trustText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.disabled,
    fontSize: 10,
  },
});
