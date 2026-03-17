import React, { useEffect, useState } from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import BgPattern_GradientSpheres from "../assets/sw-bg/BgPattern_GradientSpheres";
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
import BgPattern_DriftingPieces from "../assets/sw-bg/BgPattern_DriftingPieces";
import { ReadingFace } from "../assets/sw-faces/ReadingFace";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const CARD_WIDTH = Math.min(SCREEN_WIDTH * 0.4, 160);
const CARD_GAP = 12;

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
      maxHeight={modalType === "upsell" ? "82%" : "55%"}
      showCloseButton={true}
    >
      {modalType === "error" && <BgPattern_DriftingPieces />}
      {modalType === "success" && <BgPattern_GradientSpheres />}

      {(modalType === "upsell" || modalType === "error") && (
        <View
          style={[
            styles.warningBanner,
            modalType === "error" && {
              backgroundColor: theme.colors.feedback.error,
            },
          ]}
        >
          <View style={styles.bannerTextContent}>
            <Text style={styles.bannerTitle}>{modalTitle}</Text>
            <Text style={styles.bannerMessage}>{modalMessage}</Text>
          </View>

          {/* Face Watermark - Bottom Right */}
          <View style={styles.faceWatermark}>
            {modalType === "upsell" || modalType === "error" ? (
              <ReadingFace size={160} transparentBg shouldAnimate />
            ) : (
              <HappyScreamFace size={160} />
            )}
          </View>
        </View>
      )}

      <View style={styles.modalContent}>
        {modalType === "success" && (
          <>
            <Text style={styles.modalTitle}>{modalTitle}</Text>
            <Text style={styles.modalMessage}>{modalMessage}</Text>

            <View style={styles.faceWrapper}>
              <Animated.View style={animatedFaceStyle}>
                <HappyScreamFace size={120} />
              </Animated.View>
            </View>
          </>
        )}

        {modalType === "upsell" && (
          <View style={styles.upsellSection}>
            {/* Fresh Benefit Cards - Horizontal Scroll */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.premiumBenefitsContainer}
              decelerationRate="fast"
              snapToInterval={CARD_WIDTH + CARD_GAP}
            >
              {[
                {
                  title: "Unlimited",
                  subtitle: "Daily Practice",
                  icon: "infinity",
                },
                {
                  title: "AI Calls",
                  subtitle: "Real-time Voice",
                  icon: "phone",
                },
                {
                  title: "Roadmap",
                  subtitle: "Clinical Tracks",
                  icon: "map-marked-alt",
                },
              ].map((benefit, index) => (
                <LinearGradient
                  key={index}
                  colors={[
                    "rgba(255, 255, 255, 0.9)",
                    "rgba(255, 255, 255, 0.4)",
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.premiumBenefitCard, { width: CARD_WIDTH }]}
                >
                  <View style={styles.premiumIconBox}>
                    <Icon name={benefit.icon} size={24} color="#FF5858" />
                  </View>
                  <Text style={styles.premiumCardTitle}>{benefit.title}</Text>
                  <Text style={styles.premiumCardSubtitle}>
                    {benefit.subtitle}
                  </Text>
                </LinearGradient>
              ))}
            </ScrollView>

            {/* CTA Button + Trust Row - Wrapped in a padded container to match carousel */}
            <View style={styles.ctaGroupContainer}>
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
                      Unlock Full Access
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                <View style={styles.trustRow}>
                  <Icon
                    name="shield-alt"
                    size={14}
                    color={theme.colors.feedback.success}
                  />
                  <Text style={styles.trustText}>
                    Cancel anytime. 30-day money-back guarantee.
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </View>
    </BottomSheetModal>
  );
};

export default GlobalModal;

const styles = StyleSheet.create({
  modalContent: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  faceWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
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
  warningBanner: {
    backgroundColor: "#FF5858",
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    overflow: "hidden", // Clip the watermark
    position: "relative",
  },
  bannerTextContent: {
    alignItems: "center",
    zIndex: 2,
  },
  faceWatermark: {
    position: "absolute",
    bottom: -32,
    right: -10,
    //opacity: 0.15,
    zIndex: 1,
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
    lineHeight: 20,
    fontWeight: "500",
    maxWidth: "95%",
  },
  upsellSection: {
    width: "100%",
    alignItems: "center",
    marginTop: 20,
    backgroundColor: "#F0F4FF",
    borderRadius: 32,
    paddingVertical: 24,
  },
  premiumBenefitsContainer: {
    paddingLeft: 20,
    paddingRight: 40,
    gap: 12,
    marginBottom: 24,
  },
  premiumBenefitCard: {
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    ...parseShadowStyle(theme.shadow.elevation2),
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  premiumIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 88, 88, 0.08)", // Faint red tint matching the banner
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 88, 88, 0.15)",
  },
  premiumCardTitle: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.title,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 4,
  },
  premiumCardSubtitle: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: theme.colors.text.default,
    textAlign: "center",
    lineHeight: 14,
    fontSize: 11,
    opacity: 0.7,
  },
  ctaGroupContainer: {
    width: "100%",
    paddingHorizontal: 20, // Match carousel horizontal alignment
    marginTop: 8,
  },
  ctaGroup: {
    width: "100%",
    alignItems: "center",
    gap: 12,
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
