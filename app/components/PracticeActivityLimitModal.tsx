import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import BgPattern_404 from "../assets/sw-bg/BgPattern_404";
import BgPattern_GradientSpheres from "../assets/sw-bg/BgPattern_GradientSpheres";
import ErrorFace from "../assets/sw-faces/ErrorFace";
import HappyScreamFace from "../assets/sw-faces/HappyScreamFace";
import { useEventStore } from "../stores/events";
import { EVENT_NAMES } from "../stores/events/constants";
import { theme } from "../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../util/functions/parseStyles";
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

const PracticeActivityLimitModal = () => {
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
        console.log(`[GlobalBottomSheet] Handling event: ${event.name}`);

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
      {modalType === "error" && <BgPattern_404 />}
      {modalType === "success" && <BgPattern_GradientSpheres />}

      {modalType === "upsell" && (
        <View style={styles.warningBanner}>
          <Text style={styles.bannerTitle}>{modalTitle}</Text>
          <Text style={styles.bannerMessage}>{modalMessage}</Text>
        </View>
      )}

      <View
        style={[
          styles.modalContent,
          modalType === "upsell" && { paddingTop: 24 },
        ]}
      >
        {modalType !== "upsell" && (
          <>
            <Text style={styles.modalTitle}>{modalTitle}</Text>
            <Text style={styles.modalMessage}>{modalMessage}</Text>
          </>
        )}
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
            {/* Value Proposition */}
            <View style={styles.upsellBadge}>
              <Text style={styles.upsellBadgeText}>MOST POPULAR</Text>
            </View>

            {/* Mini Pro Benefits - Pill Style */}
            <View style={styles.upsellBenefitsGrid}>
              {[
                { label: "Break Daily Caps", icon: "infinity" },
                { label: "AI Phone Calls", icon: "robot" },
                { label: "Clinical Roadmap", icon: "map-check" },
                { label: "Expert Tutorials", icon: "play-circle" },
              ].map((benefit, index) => (
                <View key={index} style={styles.upsellBenefitPill}>
                  <View style={styles.pillIconBox}>
                    <Icon
                      name={benefit.icon}
                      size={10}
                      color={theme.colors.actionPrimary.default}
                    />
                  </View>
                  <Text style={styles.upsellBenefitText}>{benefit.label}</Text>
                </View>
              ))}
            </View>

            {/* CTA Button + Trust Row grouped so trust text stays close to button */}
            <View style={styles.ctaGroup}>
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
                    Unlock Your Full Potential
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
            </View>
          </>
        )}
      </View>
    </BottomSheetModal>
  );
};

export default PracticeActivityLimitModal;

const styles = StyleSheet.create({
  modalContent: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    gap: 16,
    paddingHorizontal: 24,
    paddingTop: 80,
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
  warningBanner: {
    backgroundColor: "#FF5858", // Red from Community screen
    paddingTop: 56, // Clearance for handle and close button
    paddingBottom: 32,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  bannerTitle: {
    color: "#FFF",
    ...parseTextStyle(theme.typography.Heading2),
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    textAlign: "center",
  },
  bannerMessage: {
    color: "rgba(255, 255, 255, 0.95)",
    ...parseTextStyle(theme.typography.Body),
    textAlign: "center",
    lineHeight: 22,
    fontWeight: "500",
    maxWidth: "90%",
  },
  upsellBadge: {
    backgroundColor: theme.colors.library.gray[100],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 4,
    marginTop: 8,
  },
  upsellBadgeText: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: theme.colors.text.disabled,
    fontWeight: "700",
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  upsellBenefitsGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
    marginBottom: 12,
  },
  upsellBenefitPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 100,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    backgroundColor: theme.colors.library.gray[100],
  },
  pillIconBox: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.library.gray[200],
    alignItems: "center",
    justifyContent: "center",
  },
  upsellBenefitText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
    fontWeight: "600",
    fontSize: 11,
  },
  ctaGroup: {
    width: "100%",
    gap: 8,
  },
  upsellButtonContainer: {
    width: "100%",
    borderRadius: 20,
    overflow: "hidden",
    ...parseShadowStyle(theme.shadow.elevation2),
  },
  upsellButton: {
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  upsellButtonText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 4,
  },
  trustText: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: theme.colors.text.disabled,
    fontSize: 10,
    fontWeight: "500",
  },
});
