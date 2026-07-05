import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Dimensions,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { SUBSCRIPTION_PRICING } from "../../constants/pricing";
import CustomScrollView from "../../components/CustomScrollView";
import { SafeAreaView } from "react-native-safe-area-context";
import { PAYMENTS_ENABLED } from "../../constants/features";
import {
  Text as DSText,
  Icon,
  type IconName,
  icons,
  Sheet,
  useTheme,
  makeStyles,
  spacing,
  radius,
  withAlpha,
} from "../../design-system";
import { track } from "../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../util/analytics/analyticsEvents";

export enum PAYMENT_PLAN_TYPE {
  MONTHLY = 0,
  ANNUALLY = 1,
}

const SubscribeScreen = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = useStyles();
  const [paymentPlan, setPaymentPlan] = useState<PAYMENT_PLAN_TYPE>(
    PAYMENT_PLAN_TYPE.ANNUALLY,
  );
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [loading] = useState(false);
  const [showTestModeModal, setShowTestModeModal] = useState(false);
  const selectedPlanSummary =
    paymentPlan === PAYMENT_PLAN_TYPE.MONTHLY
      ? `${SUBSCRIPTION_PRICING.plans.monthly.headline}${SUBSCRIPTION_PRICING.plans.monthly.periodLabel}`
      : `${SUBSCRIPTION_PRICING.plans.annual.headline}${SUBSCRIPTION_PRICING.plans.annual.periodLabel}, ${SUBSCRIPTION_PRICING.plans.annual.billedYearlyCopy.toLowerCase()}`;

  const sheetTranslateY = useSharedValue(Dimensions.get("window").height);

  const animatedSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  useEffect(() => {
    sheetTranslateY.value = withTiming(0, {
      duration: 350,
      easing: Easing.bezier(0.33, 1, 0.68, 1),
    });
    // Track paywall view on mount — captures every impression regardless of plan selection
    track(ANALYTICS_EVENTS.PAYWALL_VIEWED);
  }, []);

  const handlePayment = async () => {
    // TODO(payments): reconnect billing via Apple In-App Purchase (StoreKit) +
    // Google Play Billing — NOT a third-party web processor like Razorpay, which
    // is disallowed for digital goods on the App Store / Play Store. This screen
    // is dormant and unreachable while PAYMENTS_ENABLED is false.
    setShowTestModeModal(true);
  };

  return (
    <View style={styles.mainContainer}>
      <Animated.View style={[{ flex: 1 }, animatedSheetStyle]}>
        <SafeAreaView
          style={styles.screenView}
          edges={["top", "left", "right"]}
        >
          {/* Background Layer */}
          <View style={StyleSheet.absoluteFillObject}>
            <LinearGradient
              colors={[
                colors.background.canvas,
                colors.surface.default,
                colors.background.canvas,
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ flex: 1 }}
            />
            {/* Glow Orbs */}
            <View
              style={[
                styles.glowOrb,
                {
                  top: -50,
                  right: -50,
                  backgroundColor: colors.accent.info,
                  opacity: 0.1,
                },
              ]}
            />
            <View
              style={[
                styles.glowOrb,
                {
                  bottom: 100,
                  left: -50,
                  width: 250,
                  height: 250,
                  backgroundColor: colors.accent.purple,
                  opacity: 0.08,
                },
              ]}
            />
          </View>

          {/* Header NavBar */}
          <View style={styles.navBar}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Icon name={icons.close} size={20} color={colors.text.onInverse} />
            </TouchableOpacity>
          </View>

          <CustomScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Hero Section */}
            <View style={styles.heroContainer}>
              <View style={styles.badgeGlass}>
                <View style={styles.badgeInner}>
                  <Icon name={icons.pro} size={12} color={colors.premium.gold} />
                  <DSText variant="caption" style={styles.badgeText}>
                    PREMIUM ACCESS
                  </DSText>
                </View>
              </View>
              <DSText variant="h1" color="primary" center style={styles.heroTitle}>
                Control Your Voice.
              </DSText>
              <DSText
                variant="body"
                color="secondary"
                center
                style={styles.heroSubtitle}
              >
                Unlock the clinically-proven power of Speechworks and turn your
                limitations into strengths.
              </DSText>
            </View>

            {/* Feature Carousel */}
            <View style={styles.carouselSection}>
              <DSText
                variant="h3"
                color="primary"
                center
                style={styles.carouselHeader}
              >
                Experience the Difference
              </DSText>
              <ScrollView
                horizontal
                pagingEnabled={false}
                showsHorizontalScrollIndicator={false}
                onScroll={(e) => {
                  const x = e.nativeEvent.contentOffset.x;
                  const snapInterval = SCREEN_WIDTH * 0.8 + 16;
                  const index = Math.round(x / snapInterval);
                  if (index !== carouselIndex) setCarouselIndex(index);
                }}
                scrollEventThrottle={16}
                style={styles.carousel}
                snapToInterval={SCREEN_WIDTH * 0.8 + 16}
                snapToAlignment="start"
                decelerationRate="fast"
                contentContainerStyle={{
                  paddingHorizontal:
                    (SCREEN_WIDTH - (SCREEN_WIDTH * 0.8 + 16)) / 2 + 8,
                }}
              >
                {[
                  {
                    label: "Perf. Intelligence",
                    free: "Limited",
                    pro: "Deep Audit",
                    icon: "bar-chart-2",
                    desc: "Deep tracking across 5 clinical domains with weekly breakthrough reports.",
                  },
                  {
                    label: "Daily Activities",
                    free: "1 / Day",
                    pro: "No Limits",
                    icon: "calendar",
                    desc: "Progress shouldn't be gated. Practice as much as you need to reach your goals.",
                  },
                  {
                    label: "Real-World Practice",
                    free: "Basic",
                    pro: "Full Access",
                    icon: "bot",
                    desc: "Simulate pressure with AI phone calls and social challenge drills.",
                  },
                  {
                    label: "Stamina System",
                    free: "Static",
                    pro: "Smart Refill",
                    icon: "zap",
                    desc: "Passive regeneration means you're always ready for a breakthrough.",
                  },
                  {
                    label: "Clinical Depth",
                    free: "Preview",
                    pro: "Full Access",
                    icon: "layers",
                    desc: "Unlock the entire library of clinical packs designed by Speechworks.",
                  },
                ].map((slide, i) => (
                  <View key={i} style={styles.carouselSlide}>
                    <View style={styles.slideInner}>
                      <View style={styles.watermarkIcon}>
                        <Icon
                          name={slide.icon as IconName}
                          size={120}
                          color={colors.premium.gold}
                          style={{ opacity: 0.03 }}
                        />
                      </View>
                      <View style={styles.iconCircle}>
                        <Icon
                          name={slide.icon as IconName}
                          size={28}
                          color={colors.premium.gold}
                        />
                      </View>
                      <DSText variant="h3" color="primary" style={styles.slideTitle}>
                        {slide.label}
                      </DSText>
                      <DSText
                        variant="bodySm"
                        color="secondary"
                        style={styles.slideDesc}
                      >
                        {slide.desc}
                      </DSText>

                      <View style={styles.compareRow}>
                        <View style={styles.compareCol}>
                          <DSText
                            variant="caption"
                            color="tertiary"
                            style={styles.compareLabel}
                          >
                            FREE
                          </DSText>
                          <DSText
                            variant="bodySm"
                            color="secondary"
                            style={styles.compareValue}
                          >
                            {slide.free}
                          </DSText>
                        </View>
                        <View style={styles.compareDivider} />
                        <View style={styles.compareCol}>
                          <DSText
                            variant="caption"
                            style={[styles.compareLabel, { color: colors.premium.gold }]}
                          >
                            PRO
                          </DSText>
                          <DSText
                            variant="bodySm"
                            color="primary"
                            style={styles.compareValue}
                          >
                            {slide.pro}
                          </DSText>
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
              </ScrollView>

              <View style={styles.paginationDots}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      carouselIndex === i
                        ? styles.activeDot
                        : styles.inactiveDot,
                    ]}
                  />
                ))}
              </View>
            </View>

            {/* Narrative Note */}
            <View style={styles.noteContainer}>
              <View style={styles.noteWatermark}>
                <Icon
                  name="users"
                  size={180}
                  color={colors.premium.gold}
                  style={{ opacity: 0.02 }}
                />
              </View>
              <Icon
                name="message-square"
                size={40}
                color={colors.premium.gold}
                style={{ opacity: 0.2, marginBottom: spacing.lg }}
              />
              <DSText variant="title" color="primary" center style={styles.noteText}>
                We built Premium because progress shouldn't be limited by a
                timer. It's the commitment you make to your future self—having
                the right support when anxiety hits and the real data to prove
                you’re winning.
              </DSText>
              <View style={styles.noteSignature}>
                <View style={styles.signatureLine} />
                <DSText variant="caption" style={styles.signatureText}>
                  The Speechworks Team
                </DSText>
                <View style={styles.signatureLine} />
              </View>
            </View>

            {/* Pricing Selection */}
            <View style={styles.pricingSection}>
              <DSText
                variant="h2"
                color="primary"
                center
                style={styles.pricingTitle}
              >
                Simple Pricing
              </DSText>
              <DSText
                variant="bodySm"
                color="tertiary"
                center
                style={styles.pricingSubtitle}
              >
                Choose the plan that fits your growth journey
              </DSText>

              <View style={styles.plansGap}>
                {/* Annual */}
                <TouchableOpacity
                  onPress={() => setPaymentPlan(PAYMENT_PLAN_TYPE.ANNUALLY)}
                  activeOpacity={0.9}
                  disabled={loading}
                  style={[
                    styles.planCard,
                    paymentPlan === PAYMENT_PLAN_TYPE.ANNUALLY
                      ? styles.activePlanCard
                      : styles.inactivePlanCard,
                  ]}
                >
                  {paymentPlan === PAYMENT_PLAN_TYPE.ANNUALLY && (
                    <LinearGradient
                      colors={[colors.premium.gold, colors.premium.goldDeep]}
                      style={styles.bestValueBadge}
                    >
                      <DSText
                        variant="caption"
                        style={styles.bestValueText}
                      >
                        BEST VALUE
                      </DSText>
                    </LinearGradient>
                  )}
                  <View style={styles.planHeader}>
                    <View
                      style={[
                        styles.radio,
                        paymentPlan === PAYMENT_PLAN_TYPE.ANNUALLY &&
                        styles.radioActive,
                      ]}
                    >
                      {paymentPlan === PAYMENT_PLAN_TYPE.ANNUALLY && (
                        <View style={styles.radioInner} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.planNameRow}>
                        <DSText
                          variant="title"
                          color="primary"
                          style={styles.planName}
                        >
                          Annual Membership
                        </DSText>
                        <View style={styles.savingsBadge}>
                          <DSText
                            variant="caption"
                            style={styles.savingsText}
                          >
                            SAVE {SUBSCRIPTION_PRICING.plans.annual.savingsPercent}%
                          </DSText>
                        </View>
                      </View>
                      <DSText
                        variant="h3"
                        color="primary"
                        style={styles.planPrice}
                      >
                        {SUBSCRIPTION_PRICING.plans.annual.headline}
                        <DSText
                          variant="bodySm"
                          color="tertiary"
                          style={styles.pricePeriod}
                        >
                          {SUBSCRIPTION_PRICING.plans.annual.periodLabel}
                        </DSText>
                      </DSText>
                      <DSText
                        variant="caption"
                        color="tertiary"
                        style={styles.planSubtext}
                      >
                        {SUBSCRIPTION_PRICING.plans.annual.billedYearlyCopy}
                      </DSText>
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Monthly */}
                <TouchableOpacity
                  onPress={() => setPaymentPlan(PAYMENT_PLAN_TYPE.MONTHLY)}
                  activeOpacity={0.9}
                  disabled={loading}
                  style={[
                    styles.planCard,
                    paymentPlan === PAYMENT_PLAN_TYPE.MONTHLY
                      ? styles.activePlanCard
                      : styles.inactivePlanCard,
                  ]}
                >
                  <View style={styles.planHeader}>
                    <View
                      style={[
                        styles.radio,
                        paymentPlan === PAYMENT_PLAN_TYPE.MONTHLY &&
                        styles.radioActive,
                      ]}
                    >
                      {paymentPlan === PAYMENT_PLAN_TYPE.MONTHLY && (
                        <View style={styles.radioInner} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <DSText
                        variant="title"
                        color="primary"
                        style={styles.planName}
                      >
                        Monthly Explorer
                      </DSText>
                      <DSText
                        variant="h3"
                        color="primary"
                        style={styles.planPrice}
                      >
                        {SUBSCRIPTION_PRICING.plans.monthly.headline}
                        <DSText
                          variant="bodySm"
                          color="tertiary"
                          style={styles.pricePeriod}
                        >
                          {SUBSCRIPTION_PRICING.plans.monthly.periodLabel}
                        </DSText>
                      </DSText>
                      <DSText
                        variant="caption"
                        color="tertiary"
                        style={styles.planSubtext}
                      >
                        {SUBSCRIPTION_PRICING.plans.monthly.supportingCopy}
                      </DSText>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </CustomScrollView>

          {/* Persistent Footer */}
          <View style={styles.footer}>
            {PAYMENTS_ENABLED ? (
              <>
                <TouchableOpacity
                  style={[
                    styles.upgradeBtnWrapper,
                    loading && { opacity: 0.7 },
                  ]}
                  activeOpacity={0.85}
                  onPress={handlePayment}
                  disabled={loading}
                  accessibilityRole="button"
                  accessibilityLabel="Upgrade to Speechworks Premium"
                >
                  <LinearGradient
                    colors={[colors.premium.gold, colors.premium.goldDeep]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.upgradeBtn}
                  >
                    {loading ? (
                      <ActivityIndicator color={colors.text.inverse} />
                    ) : (
                      <DSText
                        variant="title"
                        style={styles.upgradeBtnText}
                      >
                        {paymentPlan === PAYMENT_PLAN_TYPE.ANNUALLY
                          ? "Start 7-Day Free Trial"
                          : "Unlock Full Access"}
                      </DSText>
                    )}
                    <LinearGradient
                      colors={[withAlpha(colors.surface.inverse, 0.15), "transparent"]}
                      style={StyleSheet.absoluteFill}
                    />
                  </LinearGradient>
                </TouchableOpacity>
                <View style={styles.guaranteeRow}>
                  <Icon
                    name="shield"
                    size={14}
                    color={colors.text.tertiary}
                  />
                  <DSText
                    variant="caption"
                    color="tertiary"
                    style={styles.guaranteeText}
                  >
                    Secure Payment • No Questions Asked Refund
                  </DSText>
                </View>
              </>
            ) : (
              <DSText
                variant="caption"
                color="tertiary"
                center
                style={styles.guaranteeText}
              >
                Premium is coming soon — there's nothing to purchase yet.
              </DSText>
            )}
          </View>
        </SafeAreaView>
      </Animated.View>

      <Sheet
        visible={showTestModeModal}
        onClose={() => setShowTestModeModal(false)}
      >
        <View style={styles.testModeModalContent}>
          <View style={styles.testModeIconWrap}>
            <Icon name="alert-circle" size={28} color={colors.text.accent} />
          </View>
          <DSText variant="h2" color="primary" center style={styles.testModeTitle}>
            You&apos;re in test mode
          </DSText>
          <DSText variant="body" color="secondary" center style={styles.testModeBody}>
            Payments are disabled right now while we finish the setup. Current
            pricing is {selectedPlanSummary}.
          </DSText>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setShowTestModeModal(false)}
            style={styles.testModeButtonWrap}
          >
            <LinearGradient
              colors={[colors.action.primary, colors.action.primaryPressed]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.testModeButton}
            >
              <DSText
                variant="title"
                style={styles.testModeButtonText}
              >
                Got it
              </DSText>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Sheet>
    </View>
  );
};

export default SubscribeScreen;

const SCREEN_WIDTH = Dimensions.get("window").width;

const useStyles = makeStyles((c) => ({
  mainContainer: {
    flex: 1,
    backgroundColor: c.overlay.scrim,
  },
  screenView: {
    flex: 1,
    backgroundColor: c.background.canvas,
    borderTopLeftRadius: radius.pill,
    borderTopRightRadius: radius.pill,
    marginTop: 64,
    overflow: "hidden",
  },
  scrollContent: {
    paddingTop: 46,
    paddingBottom: 180,
  },
  glowOrb: {
    position: "absolute",
    borderRadius: 200,
    width: 300,
    height: 300,
  },
  navBar: {
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    position: "relative",
    zIndex: 10,
  },
  backButton: {
    position: "absolute",
    right: 20,
    top: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: c.surface.inverse,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: c.border.hairline,
  },
  // Hero
  heroContainer: {
    alignItems: "center",
    paddingHorizontal: spacing["2xl"],
    marginTop: spacing["2xl"],
    marginBottom: spacing["4xl"],
  },
  badgeGlass: {
    backgroundColor: c.surface.control,
    borderRadius: 100,
    padding: 1,
    marginBottom: spacing.xl,
  },
  badgeInner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: c.premium.goldTint,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 100,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: c.premium.goldBorder,
  },
  badgeText: {
    color: c.premium.gold,
    letterSpacing: 2,
  },
  heroTitle: {
    letterSpacing: -1,
    marginBottom: spacing.lg,
  },
  heroSubtitle: {
    paddingHorizontal: 10,
  },
  // Carousel
  carouselSection: {
    marginBottom: spacing["5xl"],
  },
  carouselHeader: {
    marginBottom: spacing["2xl"],
  },
  carousel: {
    overflow: "visible",
  },
  carouselSlide: {
    width: SCREEN_WIDTH * 0.8,
    marginHorizontal: spacing.sm,
  },
  slideInner: {
    padding: spacing["2xl"],
    borderRadius: 32,
    borderWidth: 1,
    borderColor: c.border.default,
    backgroundColor: c.surface.control,
    overflow: "hidden",
    height: 340, // Uniform height for benefit cards
    justifyContent: "space-between",
  },
  watermarkIcon: {
    position: "absolute",
    right: -20,
    bottom: -20,
    transform: [{ rotate: "-15deg" }],
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: c.premium.goldTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: c.premium.goldBorder,
  },
  slideTitle: {
    marginBottom: spacing.md,
  },
  slideDesc: {
    marginBottom: spacing["2xl"],
  },
  compareRow: {
    flexDirection: "row",
    backgroundColor: c.background.sunken,
    borderRadius: 20,
    padding: spacing.lg,
    alignItems: "center",
  },
  compareCol: {
    flex: 1,
    alignItems: "center",
  },
  compareLabel: {
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  compareValue: {
    // value type styling from variant
  },
  compareDivider: {
    width: 1,
    height: 30,
    backgroundColor: c.border.strong,
  },
  paginationDots: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: spacing["2xl"],
    gap: spacing.sm,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  activeDot: {
    width: 20,
    backgroundColor: c.premium.gold,
  },
  inactiveDot: {
    width: 6,
    backgroundColor: c.border.strong,
  },
  // Note
  noteContainer: {
    marginHorizontal: spacing["2xl"],
    backgroundColor: c.surface.default,
    padding: spacing["3xl"],
    borderRadius: 32,
    borderWidth: 1,
    borderColor: c.border.default,
    alignItems: "center",
    marginBottom: 64,
  },
  noteWatermark: {
    position: "absolute",
    bottom: -30,
    right: -30,
  },
  noteText: {
    lineHeight: 28,
    fontStyle: "italic",
    marginBottom: spacing["2xl"],
  },
  noteSignature: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  signatureLine: {
    width: 30,
    height: 1,
    backgroundColor: c.premium.gold,
    opacity: 0.3,
  },
  signatureText: {
    color: c.premium.gold,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  // Pricing
  pricingSection: {
    paddingHorizontal: spacing["2xl"],
  },
  pricingTitle: {
    marginBottom: spacing.sm,
  },
  pricingSubtitle: {
    marginBottom: spacing["3xl"],
  },
  plansGap: {
    gap: spacing.lg,
  },
  planCard: {
    borderRadius: radius.card,
    padding: spacing["2xl"],
    borderWidth: 2,
    position: "relative",
    height: 145, // Uniform height for pricing cards
    justifyContent: "center",
  },
  activePlanCard: {
    backgroundColor: c.premium.goldTint,
    borderColor: c.premium.gold,
  },
  inactivePlanCard: {
    backgroundColor: c.surface.default,
    borderColor: c.border.default,
  },
  bestValueBadge: {
    position: "absolute",
    top: -12,
    right: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 100,
  },
  bestValueText: {
    color: c.text.onInverse,
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: c.border.strong,
    alignItems: "center",
    justifyContent: "center",
  },
  radioActive: {
    borderColor: c.premium.gold,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: c.premium.gold,
  },
  planNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  planName: {
    // name type styling from variant
  },
  savingsBadge: {
    backgroundColor: c.premium.gold,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  savingsText: {
    color: c.text.onInverse,
  },
  planPrice: {
    // price type styling from variant
  },
  pricePeriod: {
    // period type styling from variant
  },
  planSubtext: {
    marginTop: spacing.xs,
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: spacing["2xl"],
    paddingBottom: spacing["2xl"],
    paddingHorizontal: spacing["2xl"],
    backgroundColor: c.background.canvas,
    borderTopWidth: 1,
    borderTopColor: c.border.strong,
  },
  upgradeBtnWrapper: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: spacing.lg,
  },
  upgradeBtn: {
    paddingVertical: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  upgradeBtnText: {
    color: c.text.inverse,
    letterSpacing: 0.5,
  },
  btnShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "50%",
  },
  guaranteeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  guaranteeText: {
    // guarantee type styling from variant
  },
  testModeModalContent: {
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing["3xl"],
    paddingBottom: spacing["2xl"],
    alignItems: "center",
  },
  testModeIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: c.action.primaryTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  testModeTitle: {
    marginBottom: 10,
  },
  testModeBody: {
    lineHeight: 24,
  },
  testModeButtonWrap: {
    width: "100%",
    marginTop: spacing["2xl"],
    borderRadius: 18,
    overflow: "hidden",
  },
  testModeButton: {
    paddingVertical: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  testModeButtonText: {
    color: c.action.onPrimary,
  },
}));
// bundle refresh
