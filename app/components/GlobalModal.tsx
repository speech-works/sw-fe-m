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
import SlotMachineFace from "../assets/sw-faces/SlotMachineFace";
import { BlurView } from "expo-blur";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const CARD_WIDTH = Math.min(SCREEN_WIDTH * 0.45, 180);
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
    if (isTourActive) return;

    for (const event of events) {
      if (
        event.name === EVENT_NAMES.SHOW_ERROR_MODAL ||
        event.name === EVENT_NAMES.SHOW_SUCCESS_MODAL ||
        event.name === EVENT_NAMES.SHOW_STAMINA_UPSELL ||
        event.name === EVENT_NAMES.SHOW_PREMIUM_UPSELL
      ) {
        let type: "error" | "success" | "upsell" = "error";
        if (event.name === EVENT_NAMES.SHOW_SUCCESS_MODAL) type = "success";
        if (
          event.name === EVENT_NAMES.SHOW_STAMINA_UPSELL ||
          event.name === EVENT_NAMES.SHOW_PREMIUM_UPSELL
        )
          type = "upsell";

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

        if (event.name === EVENT_NAMES.SHOW_PREMIUM_UPSELL) {
          title = "Master Speech Management";
          message =
            "Learn advanced tools and strategies directly from expert SLPs.";
        }

        setModalType(type);
        setModalTitle(title);
        setModalMessage(message);
        setModalVisible(true);
        clear(event.name);
      }
    }
  }, [events, clear, isTourActive]);

  return (
    <BottomSheetModal
      visible={modalVisible}
      onClose={() => setModalVisible(false)}
      maxHeight={modalType === "upsell" ? "77%" : "55%"}
      showCloseButton={true}
    >
      <View style={{ flex: 1 }}>
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
            <View style={styles.faceWatermark}>
              {modalType === "upsell" || modalType === "error" ? (
                <SlotMachineFace
                  size={160}
                  transparentBg
                  shouldAnimate
                  targetNumber="404"
                />
              ) : (
                <HappyScreamFace size={160} />
              )}
            </View>

            {/* Subtle Legibility Overlay (Horizontal Scrim) */}
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.25)", "transparent"]}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
            />

            <View style={styles.bannerTextContent}>
              <Text style={styles.bannerTitle}>{modalTitle}</Text>
              <Text style={styles.bannerMessage}>{modalMessage}</Text>
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
              <View style={styles.watermarkContainer} pointerEvents="none">
                <Icon
                  name="crown"
                  size={140}
                  color="#D4AF37"
                  style={styles.watermark1}
                />
                <Icon
                  name="gem"
                  size={100}
                  color="#D4AF37"
                  style={styles.watermark2}
                />
              </View>
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
                    subtitle: "Daily Flow",
                    icon: "infinity",
                    colors: [
                      "rgba(255, 255, 255, 0.05)",
                      "rgba(255, 255, 255, 0.01)",
                    ],
                    borderColor: "rgba(212, 175, 55, 0.15)",
                  },
                  {
                    title: "AI Calls",
                    subtitle: "Real-time",
                    icon: "phone-alt",
                    colors: [
                      "rgba(255, 255, 255, 0.05)",
                      "rgba(255, 255, 255, 0.01)",
                    ],
                    borderColor: "rgba(212, 175, 55, 0.15)",
                  },
                  {
                    title: "Expert",
                    subtitle: "Clinical Tracks",
                    icon: "user-md",
                    colors: [
                      "rgba(255, 255, 255, 0.05)",
                      "rgba(255, 255, 255, 0.01)",
                    ],
                    borderColor: "rgba(212, 175, 55, 0.15)",
                  },
                ].map((benefit, index) => (
                  <View
                    key={index}
                    style={[
                      styles.premiumBenefitCard,
                      {
                        width: CARD_WIDTH,
                        borderColor: benefit.borderColor,
                        borderWidth: 1,
                      },
                    ]}
                  >
                    <LinearGradient
                      colors={benefit.colors as any}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.cardGradient}
                    >
                      <View style={styles.cardHeader}>
                        <View style={styles.glassyBadge}>
                          <Text style={styles.premiumCardSubtitle}>
                            {benefit.subtitle}
                          </Text>
                        </View>
                        <Text style={styles.premiumCardTitle}>
                          {benefit.title}
                        </Text>
                      </View>

                      <View style={styles.iconBox}>
                        <Icon name={benefit.icon} size={22} color="#D4AF37" />
                      </View>
                    </LinearGradient>
                  </View>
                ))}
              </ScrollView>

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
                      colors={["#D4AF37", "#B8860B", "#996515"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.upsellButton}
                    >
                      <Text style={styles.upsellButtonText}>
                        Unlock Full Access
                      </Text>
                      <View style={styles.btnShine} />
                    </LinearGradient>
                  </TouchableOpacity>

                  <View style={styles.trustRow}>
                    <Icon name="shield-alt" size={12} color="#10B981" />
                    <Text style={styles.trustText}>
                      Cancel anytime. 30-day money-back guarantee.
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>
      </View>
    </BottomSheetModal>
  );
};

export default GlobalModal;

const styles = StyleSheet.create({
  modalContent: {
    paddingBottom: 0,
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
    paddingVertical: 24, // Reduced from 32/48
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    overflow: "hidden",
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
    zIndex: 1,
    opacity: 0.35, // Balanced for visibility
  },
  bannerTitle: {
    color: "#FFF",
    ...parseTextStyle(theme.typography.Heading2),
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.25)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  bannerMessage: {
    color: "rgba(255, 255, 255, 0.95)",
    ...parseTextStyle(theme.typography.Body),
    textAlign: "center",
    lineHeight: 20,
    fontWeight: "700", // Increased for readability
    maxWidth: "95%",
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  upsellSection: {
    width: SCREEN_WIDTH,
    alignItems: "center",
    marginTop: 0,
    marginBottom: 0,
    backgroundColor: "#0F172A",
    paddingTop: 32,
    paddingBottom: 60,
    position: "relative",
    overflow: "hidden",
  },
  watermarkContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    overflow: "hidden",
  },
  watermark1: {
    position: "absolute",
    top: -20,
    left: -30,
    transform: [{ rotate: "-15deg" }],
    opacity: 0.02,
  },
  watermark2: {
    position: "absolute",
    bottom: 20,
    right: -20,
    transform: [{ rotate: "15deg" }],
    opacity: 0.015,
  },

  premiumBenefitsContainer: {
    paddingLeft: 20,
    paddingRight: 40,
    gap: 12,
    marginBottom: 24,
    zIndex: 2,
  },
  premiumBenefitCard: {
    aspectRatio: 1.05,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    overflow: "hidden",
  },
  cardGradient: {
    flex: 1,
    padding: 18,
    justifyContent: "space-between",
    position: "relative",
  },
  iconBox: {
    alignSelf: "flex-end",
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(212, 175, 55, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.2)",
    zIndex: 2,
  },
  cardHeader: {
    zIndex: 2,
    gap: 6,
  },
  glassyBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(212, 175, 55, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.2)",
  },
  premiumCardSubtitle: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: "#D4AF37",
    fontWeight: "900",
    textTransform: "uppercase",
    fontSize: 9,
    letterSpacing: 1.5,
  },
  premiumCardTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
  },

  ctaGroupContainer: {
    width: "100%",
    paddingHorizontal: 20,
    marginTop: 8,
    zIndex: 2,
  },
  ctaGroup: {
    width: "100%",
    alignItems: "center",
    gap: 16,
  },
  upsellButtonContainer: {
    width: "100%",
    borderRadius: 24,
    overflow: "hidden",
    ...parseShadowStyle(theme.shadow.elevation4),
  },
  upsellButton: {
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },
  btnShine: {
    position: "absolute",
    top: 0,
    left: "-100%",
    width: "50%",
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.2)",
    transform: [{ skewX: "-25deg" }],
  },
  upsellButtonText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: "#FFF",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    opacity: 0.8,
  },
  trustText: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "500",
  },
});
