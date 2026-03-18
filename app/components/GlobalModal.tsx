import React, { useEffect, useState } from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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

import { navigationRef } from "../util/functions/navigation";
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
  const insets = useSafeAreaInsets();
  const { events, clear } = useEventStore();
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
  }, [events, clear]);

  return (
    <BottomSheetModal
      visible={modalVisible}
      onClose={() => setModalVisible(false)}
      showCloseButton={true}
      fitContent={true}
      hasBottomSafePadding={false}
      maxHeight={modalType === "success" ? undefined : "90%"}
      backgroundColor={
        modalType === "upsell"
          ? "#F5F0EA"
          : modalType === "error"
            ? theme.colors.feedback.error
            : "white"
      }
    >
      {modalType === "error" && <BgPattern_DriftingPieces />}
      {modalType === "success" && <BgPattern_GradientSpheres />}
      {(modalType === "upsell" || modalType === "error") && (
          <View
            style={[
              styles.warningBanner,
              modalType === "error" && {
                backgroundColor: theme.colors.feedback.error,
                paddingBottom: Math.max(insets.bottom, 18),
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

            <View style={styles.bannerTextContainer}>
              <View style={styles.bannerTextContent}>
                <Text style={styles.bannerTitle}>{modalTitle}</Text>
                <Text style={styles.bannerMessage}>{modalMessage}</Text>
              </View>
            </View>
          </View>
        )}

      {modalType === "success" && (
        <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 32) }]}>
          <Text style={styles.modalTitle}>{modalTitle}</Text>
          <Text style={styles.modalMessage}>{modalMessage}</Text>
          <View style={styles.faceWrapper}>
            <Animated.View style={animatedFaceStyle}>
              <HappyScreamFace size={120} />
            </Animated.View>
          </View>
        </View>
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
                    title: "Unlimited Exercises",
                    subtitle: "ACCESS",
                    icon: "infinity",
                    description: "Practice without restriction.",
                  },
                  {
                    title: "AI Calls Feature",
                    subtitle: "MASTERY",
                    icon: "phone-alt",
                    description: "Real telephonic simulations.",
                  },
                  {
                    title: "Full Access Library",
                    subtitle: "LIBRARY",
                    icon: "folder-open",
                    description: "Tutorials by expert SLPs.",
                  },
                ].map((benefit, index) => (
                  <View
                    key={index}
                    style={[
                      styles.premiumBenefitCard,
                      {
                        width: CARD_WIDTH,
                      },
                    ]}
                  >
                    <View style={styles.cardGradient}>
                      <View style={styles.cardHeader}>
                        <View style={styles.glassyBadge}>
                          <Text style={styles.premiumCardSubtitle}>
                            {benefit.subtitle}
                          </Text>
                        </View>
                        <Text style={styles.premiumCardTitle}>
                          {benefit.title}
                        </Text>
                        <Text style={styles.premiumCardDescription}>
                          {benefit.description}
                        </Text>
                      </View>

                      {/* Subtle Watermark Icon */}
                      <View style={styles.cardWatermarkContainer}>
                        <Icon
                          name={benefit.icon}
                          size={100}
                          color="#D4AF37"
                          style={styles.watermarkIcon}
                        />
                      </View>
                    </View>
                  </View>
                ))}
              </ScrollView>

              <View style={[styles.ctaGroupContainer, { paddingBottom: Math.max(insets.bottom, 40) }]}>
                <View style={styles.ctaGroup}>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => {
                      setModalVisible(false);
                      navigationRef.navigate("PremiumModal" as never);
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
    </BottomSheetModal>
  );
};

export default GlobalModal;

const styles = StyleSheet.create({
  faceWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    zIndex: 10,
  },
  modalContent: {
    paddingTop: 54,
    paddingBottom: 32,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  modalTitle: {
    color: theme.colors.text.default,
    ...parseTextStyle(theme.typography.Heading2),
    textAlign: "center",
    marginBottom: 8,
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
    minHeight: 140, // Increased to accommodate 54px top space
    paddingTop: 54,
    paddingBottom: 18,
    paddingLeft: 12,
    paddingRight: 24,
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 4,
    overflow: "hidden",
    position: "relative",
  },
  bannerTextContainer: {
    alignItems: "flex-start",
    zIndex: 2,
    width: "100%",
  },
  bannerTextContent: {
    alignItems: "flex-start",
    //backgroundColor: "rgba(0, 0, 0, 0.44)", // Restored as backdrop is needed for white text legibility
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 18,
    borderRadius: 16,
    maxWidth: "75%", // Further increased to fit larger 20px title on one line
  },
  faceWatermark: {
    position: "absolute",
    bottom: -32,
    right: -10, // Shifted further right to avoid collision with larger text
    zIndex: 1,
    opacity: 1, // Balanced for visibility
  },
  bannerTitle: {
    color: "#FFF",
    ...parseTextStyle(theme.typography.Heading2),
    fontSize: 20, // Increased from 18px for better readability while fitting one line
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.2, // Tighter to ensure single-line fit
    textAlign: "left",
    textShadowColor: "rgba(0, 0, 0, 0.25)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  bannerMessage: {
    color: "rgba(255, 255, 255, 0.75)", // Greyish/Transparent white for contrast
    ...parseTextStyle(theme.typography.BodyDetails), // Smaller typography token
    textAlign: "left",
    fontSize: 13, // Increased from 11px for better readability
    lineHeight: 16, // Adjusted for 13px font
    maxWidth: "95%",
    marginTop: 2,
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  upsellSection: {
    width: SCREEN_WIDTH,
    alignItems: "center",
    marginTop: 0,
    marginBottom: 0,
    backgroundColor: "#F5F0EA",
    paddingTop: 40,
    paddingBottom: 0, // Removed to avoid doubling with ctaGroupContainer
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
    opacity: 0.05,
  },
  watermark2: {
    position: "absolute",
    bottom: 20,
    right: -20,
    transform: [{ rotate: "15deg" }],
    opacity: 0.04,
  },

  premiumBenefitsContainer: {
    paddingLeft: 20,
    paddingRight: 40,
    gap: 12,
    marginBottom: 24,
    zIndex: 2,
  },
  premiumBenefitCard: {
    aspectRatio: 1.05, // Original proportions restored
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#D4AF37",
    ...parseShadowStyle(theme.shadow.elevation4),
  },
  cardGradient: {
    flex: 1,
    padding: 16, // Reduced from 18/24 for better content fit coverage
    justifyContent: "flex-start",
    position: "relative",
  },
  cardWatermarkContainer: {
    position: "absolute",
    right: -10,
    bottom: -10,
    opacity: 0.1,
    transform: [{ rotate: "-15deg" }],
  },
  watermarkIcon: {
    // Subtle Large Icon
  },
  cardHeader: {
    zIndex: 2,
    gap: 0,
  },
  glassyBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#D4AF37",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    marginBottom: 8, // Reduced from 12 to save vertical space
  },
  premiumCardSubtitle: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: "#FFFFFF",
    fontWeight: "900",
    textTransform: "uppercase",
    fontSize: 9,
    letterSpacing: 2,
  },
  premiumCardTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    color: "#1A202C",
    fontSize: 16, // Balanced for the 1.05 aspect ratio and tight spacing
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: 20, // Tightened from 24 to save space for description
    marginBottom: 4, // Tightened from 8 to fit descriptions below
  },
  premiumCardDescription: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: "rgba(26, 32, 44, 0.7)",
    fontSize: 12, // Sufficient for readability while fitting 3 lines
    lineHeight: 16, // Tightened from 18 for compact description wrapping
    fontWeight: "500",
    maxWidth: "95%",
  },

  ctaGroupContainer: {
    width: "100%",
    paddingHorizontal: 20,
    marginTop: 8,
    zIndex: 2,
    backgroundColor: "#F5F0EA", // Explicit background to ensure no gaps
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
    color: theme.colors.text.default,
    fontSize: 10,
    fontWeight: "500",
  },
});
