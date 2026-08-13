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
import CustomScrollView from "../../components/CustomScrollView";
import { SafeAreaView } from "react-native-safe-area-context";
import { getOffers, type MembershipOffer } from "../../api";
import {
  purchaseProductById,
  pollWalletUntil,
  purchasesAvailable,
} from "../../services/purchases";
import {
  showSuccessBottomSheet,
  showErrorBottomSheet,
} from "../../util/functions/bottomSheet";
import {
  size,
  Text as DSText,
  Icon,
  type IconName,
  icons,
  Sheet,
  useTheme,
  useNavBarInset,
  makeStyles,
  spacing,
  radius,
  withAlpha,
} from "../../design-system";
import { track } from "../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../util/analytics/analyticsEvents";
import { useStorePrices } from "../../hooks/useStorePrices";
import { useRestorePurchases } from "../../hooks/useRestorePurchases";
import { handleLinkPress } from "../../util/functions/externalLinks";
import {
  PRIVACY_POLICY_URL,
  TERMS_OF_USE_URL,
} from "../Auth/constants";
import {
  resolvePriceDisplay,
  formatCurrency,
  deriveAnchor,
  savingPercentFor,
} from "../../services/priceDisplay";

export enum PAYMENT_PLAN_TYPE {
  MONTHLY = 0,
  ANNUALLY = 1,
}

/** Caption-sized legal links need help reaching a 44pt target. */
const LEGAL_HIT_SLOP = { top: 10, bottom: 10, left: 8, right: 8 };

/**
 * The premium carousel. Hoisted out of the JSX so the pagination dots can be
 * derived from it: they used to be a hardcoded [0,1,2,3,4], which meant
 * removing a slide left a fifth dot that could never light up.
 */
const PREMIUM_SLIDES = [
  {
    // Was: "Deep tracking across 5 clinical domains with weekly
    // breakthrough reports." That sold something we could not
    // deliver — the five domain scores were written twice per
    // user, both inside the first three days, so the numbers
    // were frozen for the entire life of the subscription. The
    // clinical view has been removed for exactly that reason.
    //
    // What replaces it is real, daily, and already built: how
    // much you practised, on how many days, across which kinds
    // of practice, and how that week compares to the last.
    //
    // THE COLUMNS MATCH ON PURPOSE — DO NOT RE-SPLIT THEM.
    // The replacement promised `free: "This week"` /
    // `pro: "Full history"`, and that was the SECOND unbacked
    // claim on this one row inside a month: `ProgressDetail`
    // has no entitlement check of any kind, so the lifetime tab
    // has always been free to everybody. Rather than build a
    // gate to make the sentence true, we made the sentence
    // true — deliberately. Gating somebody's own evidence that
    // they are getting better is the wrong lever to pull on
    // people whose problem is avoidance: the week they most
    // need to see it is the week they have practised least and
    // are likeliest to let a subscription lapse.
    //
    // If the business ever does want history behind Pro, that
    // is a real entitlement check in `ProgressDetail`, not a
    // word change here.
    label: "Your progress",
    free: "All of it",
    pro: "All of it",
    icon: "bar-chart-2",
    desc: "Every session and day you've built, weekly and lifetime. Yours either way. We don't hold your own history back.",
  },
  {
    // The numbers here are REAL and must stay that way.
    // They read "1 / Day" and "No Limits", and both were false:
    // the free bar is FREE_STAMINA_CONFIG (35 max, 41 min per
    // point) at 7 per activity, which is about five a day, and
    // paid is the level pool (80-110, 15-18 min per point),
    // which is about twelve. So we were understating our own
    // free tier fivefold and promising an unlimited we do not
    // sell. "Five to twelve, and it refills faster" is both
    // true and a better sell to an audience that has been
    // promised things before. If the stamina tiers in
    // sw-be-2 config/LevelStages.ts change, change these.
    label: "Daily practice",
    free: "About 5 a day",
    pro: "About 12 a day",
    icon: "calendar",
    desc: "Free gives you around five activities a day. Premium roughly doubles that and refills faster, so a good session doesn't stop because the bar ran out.",
  },
  {
    // 4 credits per 30 days with a bank cap of 8 — see
    // MEMBERSHIP_CREDIT_GRANT in sw-be-2 config/ProductCatalog.ts
    // and MEMBERSHIP_BANK_CAP in services/wallet.service.ts.
    label: "Live AI calls",
    free: "Basic",
    pro: "4 a month",
    icon: "bot",
    desc: "Practice the call you keep putting off, with someone who won't finish your sentences. Four a month, and unused ones bank up to eight.",
  },
  {
    // Was "Clinical Depth" / "clinical packs". They are guided
    // programs, not clinical treatment, and calling them
    // clinical is both a claim we can't back and a category
    // Apple reads as medical.
    label: "Guided programs",
    free: "Preview",
    pro: "All of them",
    icon: "layers",
    desc: "Every program in the library, start to finish. Structured arcs that build week to week, not a pile of loose exercises you have to sequence yourself.",
  },
];

const SubscribeScreen = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = useStyles();
  const navBarInset = useNavBarInset();
  const [paymentPlan, setPaymentPlan] = useState<PAYMENT_PLAN_TYPE>(
    PAYMENT_PLAN_TYPE.ANNUALLY,
  );
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [membership, setMembership] = useState<MembershipOffer | null>(null);
  const [showTestModeModal, setShowTestModeModal] = useState(false);
  // Guideline 3.1.1 — shared with Settings so there is one restore path.
  const { restoring, restore } = useRestorePurchases();

  // Prices come from the server (GET /users/me/offers), never a hardcoded
  // literal — a stale price in a button is how a user ends up charged something
  // other than what they were shown (the exact class of bug that damaged
  // competitors' reviews). The membership block carries both product ids.
  useEffect(() => {
    let cancelled = false;
    getOffers()
      .then((o) => {
        if (!cancelled) setMembership(o.membership);
      })
      .catch((e) => console.error("[Payments] Failed to load offers:", e));
    return () => {
      cancelled = true;
    };
  }, []);

  // Display strings, INR-first (matching the pack shop). Computed from the live
  // offer so the annual savings badge can never disagree with the prices shown.
  const { prices: storePrices } = useStorePrices([
    membership?.productId,
    membership?.annualProductId,
  ]);
  const monthly = membership
    ? resolvePriceDisplay({
      store: storePrices[membership.productId],
      inr: membership.priceInr,
      usd: membership.priceUsd,
    })
    : null;
  const annual = membership
    ? resolvePriceDisplay({
      store: storePrices[membership.annualProductId],
      // Annual has no "was" PRODUCT — its honest anchor is 12 × the monthly
      // one, exactly as the backend derives it. Scaling the STORE's monthly
      // figure keeps that same sum in the buyer's own currency, so the strike
      // now works in every country rather than just INR/USD.
      anchorStore: deriveAnchor(storePrices[membership.productId], 12),
      inr: membership.annualPriceInr,
      usd: membership.annualPriceUsd,
      anchorInr: membership.annualAnchorInr,
      anchorUsd: membership.annualAnchorUsd,
    })
    : null;
  const monthlyLabel = monthly?.price ?? "—";
  const annualLabel = annual?.price ?? "—";
  // Annual's honest anchor = 12 × monthly, struck through beside the annual price.
  // resolvePriceDisplay withholds it entirely in a currency we cannot price, so
  // a GBP buyer sees the real annual price with no bogus rupee "was" beside it.
  const annualAnchorLabel = annual?.anchor ?? "—";
  const annualDiscounted = !!annual?.anchor;
  // Derived, so it must be formatted in the SAME currency the prices resolved to.
  const annualPerMonthLabel =
    (annual?.priceAmount != null
      ? formatCurrency(annual.priceAmount / 12, annual.currencyCode)
      : null) ?? "—";
  // Read off the pair ACTUALLY on screen. ₹1499-vs-₹2388 is 37% but
  // $34.99-vs-$59.88 is 42%, so computing this from the INR book (as it did)
  // under-claimed the saving to every dollar buyer.
  const annualSavingsPct = annual ? (savingPercentFor(annual) ?? 0) : 0;
  const selectedPlanSummary =
    paymentPlan === PAYMENT_PLAN_TYPE.MONTHLY
      ? `${monthlyLabel}/month`
      : `${annualLabel}/year`;

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
    if (!membership) return;
    // Payments not wired for this build/platform yet (flag off, or no store key
    // configured): explain gently rather than surface a red error. Billing is
    // Apple In-App Purchase (StoreKit) + Google Play Billing via RevenueCat —
    // never a third-party web processor, which stores disallow for digital goods.
    if (!purchasesAvailable()) {
      setShowTestModeModal(true);
      return;
    }

    const isAnnual = paymentPlan === PAYMENT_PLAN_TYPE.ANNUALLY;
    const productId = isAnnual
      ? membership.annualProductId
      : membership.productId;

    // Payment funnel for the membership paywall. `catalogKey: "membership"`
    // separates it from pack purchases; `amountInr` is omitted because
    // membership is store-priced (StoreKit / Play Billing) and not necessarily
    // in INR — better absent than fabricated.
    const payProps = {
      planId: productId,
      catalogKey: "membership",
      plan: isAnnual ? "annual" : "monthly",
    };
    track(ANALYTICS_EVENTS.PAYMENT_STARTED, payProps);

    setLoading(true);
    try {
      const outcome = await purchaseProductById(productId);
      if (outcome.status === "purchased") {
        track(ANALYTICS_EVENTS.PAYMENT_COMPLETED, payProps);
        // The entitlement is granted by the RevenueCat webhook, not the purchase
        // call itself — poll our own backend until "membership" appears.
        const wallet = await pollWalletUntil((w) =>
          w.entitlements.includes("membership"),
        );
        if (wallet) {
          showSuccessBottomSheet("You're in", "Your access is active.");
          navigation.goBack();
        } else {
          showErrorBottomSheet(
            "Almost there",
            "Your purchase went through but is still being confirmed. It should appear shortly.",
          );
        }
      } else {
        // "error" or "cancelled" — `reason` separates a store failure from a
        // user backing out, so an abandonment isn't read as a payment failure.
        track(ANALYTICS_EVENTS.PAYMENT_FAILED, {
          ...payProps,
          reason: outcome.status === "error" ? outcome.message : outcome.status,
        });
        if (outcome.status === "error") {
          showErrorBottomSheet("Purchase didn't complete", outcome.message);
        }
        // "cancelled" → the user backed out at the store sheet; stay silent.
      }
    } catch (error) {
      console.error("[Payments] Purchase failed:", error);
      track(ANALYTICS_EVENTS.PAYMENT_FAILED, { ...payProps, reason: "exception" });
      showErrorBottomSheet(
        "Purchase didn't complete",
        "Nothing has been charged. Please try again in a moment.",
      );
    } finally {
      setLoading(false);
    }
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
              <Icon name={icons.close} size={size.icon} color={colors.text.onInverse} />
            </TouchableOpacity>
          </View>

          <CustomScrollView
            contentContainerStyle={[
              styles.scrollContent,
              // The pinned footer grew by the nav bar (see below), so its
              // clearance has to grow too or the last card hides behind it.
              { paddingBottom: 180 + navBarInset },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {/* Hero Section */}
            <View style={styles.heroContainer}>
              <View style={styles.badgeGlass}>
                <View style={styles.badgeInner}>
                  <Icon name={icons.pro} size={size.iconXs} color={colors.premium.gold} />
                  <DSText variant="eyebrow" style={styles.badgeText}>
                    PREMIUM ACCESS
                  </DSText>
                </View>
              </View>
              {/* Was "Control Your Voice." Control over speech output is
                  fluency's cousin, and making it the headline promise on the
                  screen that asks for money is the one thing this product
                  refuses to sell. "Say it anyway" is the approach principle
                  instead: it promises nothing about how the speech will
                  sound. */}
              <DSText variant="h1" color="primary" center style={styles.heroTitle}>
                Say it anyway.
              </DSText>
              {/* Capability, not efficacy. This read "the clinically-proven
                  power of Speechworks" — an unsubstantiated efficacy claim
                  (App Store 1.4.1 / 2.3.1), and one this codebase spends real
                  effort avoiding everywhere else (see the NEVER A FLUENCY
                  CLAIM rule in constants/reminderTemplates.ts). Say what the
                  user gets to do; never what it will do to their speech. */}
              {/* The hero hooks; it does not list features. Naming a
                  behaviour the reader already recognises in themselves is the
                  most persuasive honest move available to us, and the carousel
                  below carries the specifics. */}
              <DSText
                variant="body"
                color="secondary"
                center
                style={styles.heroSubtitle}
              >
                You already rehearse the sentence in your head. This gives you
                somewhere to do it on purpose.
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
                {PREMIUM_SLIDES.map((slide, i) => (
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
                          size={size.iconLg}
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
                {PREMIUM_SLIDES.map((_, i) => (
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
              {/* "the real data to prove you're winning" implied a scoreboard,
                  and the only number a reader would picture is the one we
                  deliberately refuse to keep. The closing line gives something
                  up on purpose: against an audience that has been sold cures,
                  admitting what we will not promise is the most convincing
                  sentence on the screen. */}
              <DSText variant="title" color="primary" center style={styles.noteText}>
                We built Premium because five activities a day runs out fast
                when you&apos;re actually working at this. You get the full
                library, room to keep going, and calls to practice the
                conversations you&apos;d otherwise avoid. You get more chances to do the hard thing.
              </DSText>
              <View style={styles.noteSignature}>
                <View style={styles.signatureLine} />
                <DSText variant="eyebrow" style={styles.signatureText}>
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
                        {annualSavingsPct > 0 && (
                          <View style={styles.savingsBadge}>
                            <DSText
                              variant="caption"
                              style={styles.savingsText}
                            >
                              SAVE {annualSavingsPct}%
                            </DSText>
                          </View>
                        )}
                      </View>
                      <DSText
                        variant="h3"
                        color="primary"
                        style={styles.planPrice}
                      >
                        {annualDiscounted ? (
                          <DSText
                            variant="bodySm"
                            color="tertiary"
                            style={styles.annualStrike}
                          >
                            {annualAnchorLabel}{"  "}
                          </DSText>
                        ) : null}
                        {annualLabel}
                        <DSText
                          variant="bodySm"
                          color="tertiary"
                          style={styles.pricePeriod}
                        >
                          /year
                        </DSText>
                      </DSText>
                      <DSText
                        variant="caption"
                        color="tertiary"
                        style={styles.planSubtext}
                      >
                        Billed annually · {annualPerMonthLabel}/mo
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
                        {monthlyLabel}
                        <DSText
                          variant="bodySm"
                          color="tertiary"
                          style={styles.pricePeriod}
                        >
                          /month
                        </DSText>
                      </DSText>
                      <DSText
                        variant="caption"
                        color="tertiary"
                        style={styles.planSubtext}
                      >
                        Billed monthly
                      </DSText>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </CustomScrollView>

          {/* Persistent Footer — the SafeAreaView above deliberately omits the
              bottom edge, so under edge-to-edge this absolute footer would sit
              under the nav bar with the purchase CTA in it. 0 on iOS. */}
          <View
            style={[
              styles.footer,
              { paddingBottom: spacing["2xl"] + navBarInset },
            ]}
          >
            {/* purchasesAvailable(), not the raw PAYMENTS_ENABLED flag. With
                the flag alone, an iOS build with no RevenueCat key rendered
                "Get Premium · ₹1,499/yr" and then answered the tap with a
                "you're in test mode" sheet — advertising a price we cannot
                charge, which is an App Store 2.1 rejection. Now a build that
                can't sell says so instead of showing a button. */}
            {purchasesAvailable() ? (
              <>
                <TouchableOpacity
                  style={[
                    styles.upgradeBtnWrapper,
                    (loading || !membership) && { opacity: 0.7 },
                  ]}
                  activeOpacity={0.85}
                  onPress={handlePayment}
                  disabled={loading || !membership}
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
                          ? `Get Premium · ${annualLabel}/yr`
                          : `Get Premium · ${monthlyLabel}/mo`}
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
                    size={size.iconInline}
                    color={colors.text.tertiary}
                  />
                  {/* A subscription can be cancelled anytime via the store, so
                      this is both accurate and store-compliant. We deliberately
                      do NOT promise a "no questions asked refund": refunds are
                      adjudicated by Apple/Google, not us, and advertising refund
                      terms the platform controls is a store-review risk. */}
                  <DSText
                    variant="caption"
                    color="tertiary"
                    style={styles.guaranteeText}
                  >
                    Secure Payment • Cancel Anytime
                  </DSText>
                </View>

                {/* App Store Guideline 3.1.2 requires all of this ON the
                    purchase surface, in the binary: what renews, when it
                    renews, and functional links to the Terms of Use and the
                    Privacy Policy. Title / length / price are already on the
                    plan cards above; the renewal mechanics were missing
                    entirely, and neither link existed anywhere but the
                    sign-in screen. */}
                <DSText
                  variant="caption"
                  color="tertiary"
                  center
                  style={styles.renewalDisclosure}
                >
                  {paymentPlan === PAYMENT_PLAN_TYPE.ANNUALLY
                    ? `${annualLabel} per year. Renews automatically unless cancelled 24 hours before the period ends.`
                    : `${monthlyLabel} per month. Renews automatically unless cancelled 24 hours before the period ends.`}
                </DSText>

                <View style={styles.legalRow}>
                  <TouchableOpacity
                    onPress={restore}
                    disabled={restoring}
                    hitSlop={LEGAL_HIT_SLOP}
                    accessibilityRole="button"
                    accessibilityLabel="Restore purchases"
                  >
                    <DSText variant="caption" color="tertiary" style={styles.legalLink}>
                      {restoring ? "Restoring…" : "Restore Purchases"}
                    </DSText>
                  </TouchableOpacity>
                  <DSText variant="caption" color="tertiary">
                    ·
                  </DSText>
                  <TouchableOpacity
                    onPress={() => handleLinkPress(TERMS_OF_USE_URL)}
                    hitSlop={LEGAL_HIT_SLOP}
                    accessibilityRole="link"
                    accessibilityLabel="Terms of Use"
                  >
                    <DSText variant="caption" color="tertiary" style={styles.legalLink}>
                      Terms of Use
                    </DSText>
                  </TouchableOpacity>
                  <DSText variant="caption" color="tertiary">
                    ·
                  </DSText>
                  <TouchableOpacity
                    onPress={() => handleLinkPress(PRIVACY_POLICY_URL)}
                    hitSlop={LEGAL_HIT_SLOP}
                    accessibilityRole="link"
                    accessibilityLabel="Privacy Policy"
                  >
                    <DSText variant="caption" color="tertiary" style={styles.legalLink}>
                      Privacy Policy
                    </DSText>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <DSText
                variant="caption"
                color="tertiary"
                center
                style={styles.guaranteeText}
              >
                Premium isn't available yet.
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
            <Icon name="alert-circle" size={size.iconLg} color={colors.text.accent} />
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
    borderRadius: radius.full,
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
    borderRadius: radius.full,
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
    borderRadius: radius.full,
    padding: 1,
    marginBottom: spacing.xl,
  },
  badgeInner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: c.premium.goldTint,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: c.premium.goldBorder,
  },
  badgeText: {
    color: c.premium.gold,
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
    borderRadius: radius.sheet,
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
    borderRadius: radius.chip,
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
    borderRadius: radius.chip,
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
    borderRadius: radius.sheet,
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
    borderRadius: radius.full,
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
    borderRadius: radius.full,
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
    borderRadius: radius.full,
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
    borderRadius: radius.xs,
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
  annualStrike: {
    textDecorationLine: "line-through",
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
    borderRadius: radius.chip,
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
  renewalDisclosure: {
    marginTop: spacing.sm,
    // Required disclosure, so it must stay legible — not shrunk below the
    // caption ramp to win back vertical space.
    lineHeight: 16,
  },
  legalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  legalLink: {
    textDecorationLine: "underline",
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
    borderRadius: radius.full,
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
    borderRadius: radius.input,
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
