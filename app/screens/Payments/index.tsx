import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  View,
  Dimensions,
  Platform,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getOffers, type MembershipOffer } from "../../api";
import {
  confirmMembershipGrant,
  purchaseProductById,
  playUpgradeChangeInfo,
  pollMembershipUntil,
  purchasesAvailable,
  manageSubscriptions,
  openStoreSubscriptions,
} from "../../services/purchases";
import {
  paywallView,
  purchaseConfirmed,
  type PlanKey,
} from "../../util/functions/paywallView";
import {
  size,
  Text as DSText,
  Icon,
  IconButton,
  icons,
  Sheet,
  space,
  useTheme,
  useNavBarInset,
  makeStyles,
  ForceDark,
  spacing,
  radius,
  withAlpha,
  palette,
} from "../../design-system";
import { track } from "../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../util/analytics/analyticsEvents";
import { useUserStore } from "../../stores/user";
import { planPeriodEnd } from "../../util/functions/membership";
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
import { PlanOffer } from "./PlanOffer";
import {
  MEMBERSHIP_CONFIRMING_LINE,
  OTHER_ACCOUNT,
  offersPaused,
  productAttemptKey,
  PURCHASES_PAUSED_LINE,
} from "../../services/purchaseSettlement";
import { PaymentProblemLink } from "../../components/PaymentProblemLink";
import { OtherAccountNotice } from "../../components/OtherAccountNotice";
import { OutcomeSheet } from "../../components/OutcomeModal";
import {
  showSuccessBottomSheet,
  showErrorBottomSheet,
} from "../../util/functions/bottomSheet";
import { haptics } from "../../design-system/haptics";

export enum PAYMENT_PLAN_TYPE {
  MONTHLY = 0,
  ANNUALLY = 1,
}

/** Caption-sized legal links need help reaching a 44pt target. */
const LEGAL_HIT_SLOP = { top: 10, bottom: 10, left: 8, right: 8 };


const SubscribeScreenBody = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = useStyles();
  const navBarInset = useNavBarInset();
  const user = useUserStore((s) => s.user);
  const setUser = useUserStore((s) => s.setUser);
  const fetchUser = useUserStore((s) => s.fetchUser);
  // The store plan's own period end, never free-month days (planPeriodEnd).
  const endsAt = planPeriodEnd(user);
  const renewalDateText = endsAt
    ? endsAt.toLocaleDateString(undefined, {
        // "short": "Renews 27 November 2026" did not fit the plan card.
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;
  // Read directly rather than through `SafeAreaView`. The old layout wrapped
  // everything in one and ALSO carried a bare `marginTop: 64` on the card — and
  // the 64 was doing all the work: the inset resolved to 0 here, so the moment
  // the margin was replaced by a real header the close control sat on top of
  // the clock. Padding the header explicitly is the version that cannot be
  // wrong by coincidence.
  const insets = useSafeAreaInsets();
  // Height of the pinned footer, so the scroll view can clear it exactly.
  // Starts at a sane guess so the first frame is never wrong by a whole screen.
  // The card the reader tapped. Null until they tap one, and then
  // `paywallView` picks the default: annual when it can be bought, else
  // monthly, else their current plan.
  const [picked, setPicked] = useState<PlanKey | null>(null);
  const [loading, setLoading] = useState(false);
  // The store took the money. From here the buy and upgrade buttons stay off
  // for as long as this screen is open, whatever our server says or how long
  // it takes to say it: a second tap is a second charge.
  const [storeCharged, setStoreCharged] = useState(false);
  // The server lists this attempt's product, bought since it started, as
  // another Speechworks account's. The screen stays open with the "Paid on
  // your other account" words in place of the buy button, a small "Check
  // again" (a grant that arrives always wins) and the "Problem with a
  // payment?" link below. Never "it should appear shortly". Holds the attempt
  // so "Check again" asks about the same plan and product.
  const [paidElsewhere, setPaidElsewhere] = useState<{
    plan: PlanKey;
    productId: string;
    confirmed: { title: string; message: string };
  } | null>(null);
  const [recheckingElsewhere, setRecheckingElsewhere] = useState(false);
  const [membership, setMembership] = useState<MembershipOffer | null>(null);
  // The server's emergency stop (offers.purchasesPaused). While true, no buy
  // or upgrade button and no store sheet. Manage and Restore keep working.
  const [purchasesPaused, setPurchasesPaused] = useState(false);
  const [showTestModeModal, setShowTestModeModal] = useState(false);
  // Guideline 3.1.1 — shared with Settings so there is one restore path.
  // Every result on this screen (purchase, upgrade, restore) is shown HERE.
  // On iOS this screen is a native modal, and the app-wide result sheet cannot
  // appear over it: the message was lost, and taps stayed blocked after the
  // screen closed (10 Nov 2026). `closeAfter`: close the plan screen once the
  // person dismisses the message (a finished purchase).
  const [screenResult, setScreenResult] = useState<{
    type: "success" | "error";
    title: string;
    message: string;
    closeAfter?: boolean;
  } | null>(null);
  // Kept apart from the result so the words stay put while the sheet slides out.
  const [resultOpen, setResultOpen] = useState(false);
  // False once this screen is gone. A purchase or restore that finishes after
  // the person closed the screen must still say what happened (10 Nov 2026).
  const mountedRef = useRef(true);
  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    [],
  );
  // The result on screen right now, read without waiting for a re-render.
  const shownResultRef = useRef<{ closeAfter?: boolean } | null>(null);
  const showResult = (
    type: "success" | "error",
    title: string,
    message: string,
    closeAfter = false,
  ) => {
    if (!mountedRef.current) {
      // Screen already closed: nothing is above the app any more, so the
      // app-wide sheet can show it. That sheet buzzes on errors by itself.
      if (type === "error") showErrorBottomSheet(title, message);
      else showSuccessBottomSheet(title, message);
      return;
    }
    // Never let a later result (a restore) replace a finished purchase's
    // message: that would hide "You're in" and keep the screen open.
    if (shownResultRef.current?.closeAfter && !closeAfter) return;
    if (type === "error") haptics.error();
    shownResultRef.current = { closeAfter };
    setScreenResult({ type, title, message, closeAfter });
    setResultOpen(true);
  };
  const { restoring, restore } = useRestorePurchases({
    success: (title, message) => showResult("success", title, message),
    error: (title, message) => showResult("error", title, message),
  });

  // Prices come from the server (GET /users/me/offers), never a hardcoded
  // literal — a stale price in a button is how a user ends up charged something
  // other than what they were shown (the exact class of bug that damaged
  // competitors' reviews). The membership block carries both product ids.
  // The paywall decides from `user.membership`, so read it fresh. A plan
  // bought or ended since the app opened would otherwise show the old cards.
  useEffect(() => {
    void fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    let cancelled = false;
    getOffers()
      .then((o) => {
        if (cancelled) return;
        setMembership(o.membership);
        setPurchasesPaused(offersPaused(o));
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
  // The honest anchor (12 × monthly) is no longer printed as a struck-through
  // "was". It still does its work through `annualSavingsPct` below, which is
  // derived from it: the yearly pill carries a SAVE tag instead. Showing BOTH
  // a strike and a percentage is the same discount claimed twice, and in a
  // currency we cannot price `resolvePriceDisplay` withholds the anchor, which
  // silently withholds the tag too. That is the correct failure.
  // Derived, so it is formatted in the SAME currency the prices resolved to.
  const annualPerMonthLabel =
    annual?.priceAmount != null
      ? formatCurrency(annual.priceAmount / 12, annual.currencyCode)
      : null;
  // Read off the pair ACTUALLY on screen. ₹1499-vs-₹2388 is 37% but
  // $34.99-vs-$59.88 is 42%, so computing this from the INR book (as it did)
  // under-claimed the saving to every dollar buyer.
  const annualSavingsPct = annual ? (savingPercentFor(annual) ?? 0) : 0;
  // Is there a REAL price for each plan?
  //
  // Every label above falls back to an em-dash placeholder, and `GET
  // /users/me/offers` failing is a perfectly ordinary event (reviewers sit
  // behind datacenter networks). Without this guard the button is disabled but
  // still READS "Get Premium · —/yr", directly above "— per year. Renews
  // automatically unless cancelled...". That is an auto-renewing subscription
  // offered with no price attached, which is exactly what Guideline 3.1.2
  // forbids, and it looks like a bug to everyone else.
  const monthlyKnown = !!monthly?.price;
  const annualKnown = !!annual?.price;

  /**
   * ── EVERY DECISION ON THIS SCREEN COMES FROM HERE ────────────────────────
   * Which cards can be picked, which one is, what the button says and does,
   * and the lines above it. Pure and tested (util/functions/paywallView.ts),
   * so nothing below decides on its own.
   */
  const view = paywallView({
    membership: user?.membership,
    platformOS: Platform.OS,
    picked,
    monthlyLabel,
    annualLabel,
    monthlyKnown,
    annualKnown,
    annualSavingsPct,
    endDateText: renewalDateText,
  });
  // The plan the renewal text describes: the one being bought, which for an
  // upgrade is annual whatever card looks picked.
  const selectedPlan = view.cta.kind === "upgrade" ? "annual" : view.selectedPlan;
  const priceKnown =
    selectedPlan === "annual"
      ? annualKnown
      : selectedPlan === "monthly"
        ? monthlyKnown
        : false;
  const cta = view.cta;
  // Paused only hides the two buttons that open a store sheet.
  const sellingPaused =
    purchasesPaused && (cta.kind === "buy" || cta.kind === "upgrade");
  const isAutoRenewingMember = view.disclosure === "current";

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

  /**
   * After the store says the purchase went through. Our server stays the
   * source of truth, but the screen never waits on it with a live buy button:
   * confirmed or not, the plan screen closes.
   *
   * Confirmed: the fresh user goes in the store and they get the success
   * sheet. Not confirmed in time (the webhook is slow): refresh the user so
   * the rest of the app catches up as soon as it lands, and say honestly that
   * it went through and is still being confirmed. The message shows on this
   * screen, and the screen closes when the person dismisses it (the app-wide
   * sheet cannot appear over this screen on iOS, see `screenResult`).
   */
  const finishAfterStorePurchase = (
    fresh: Awaited<ReturnType<typeof pollMembershipUntil>>,
    confirmed: { title: string; message: string },
    pendingMessage: string,
  ) => {
    if (fresh) {
      setUser(fresh);
      showResult("success", confirmed.title, confirmed.message, true);
    } else {
      void fetchUser();
      showResult("success", "Almost there", pendingMessage, true);
    }
  };

  const handlePayment = async () => {
    if (!membership || cta.kind !== "buy" || !cta.plan || storeCharged) return;
    if (purchasesPaused) return;
    // Payments not wired for this build/platform yet (flag off, or no store key
    // configured): explain gently rather than surface a red error. Billing is
    // Apple In-App Purchase (StoreKit) + Google Play Billing via RevenueCat —
    // never a third-party web processor, which stores disallow for digital goods.
    if (!purchasesAvailable()) {
      setShowTestModeModal(true);
      return;
    }

    const isAnnual = cta.plan === "annual";
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
        setStoreCharged(true);
        track(ANALYTICS_EVENTS.PAYMENT_COMPLETED, payProps);
        // The grant comes from the RevenueCat webhook, not the purchase call
        // itself, so poll our own backend. On the membership's PLAN, not the
        // wallet's "membership" entitlement: somebody on free days already has
        // that, and the wait used to end before the purchase had been seen.
        const bought: PlanKey = isAnnual ? "annual" : "monthly";
        const confirmed = { title: "You're in", message: "Your access is active." };
        const fresh = await confirmMembershipGrant(
          (m) => purchaseConfirmed(m, bought),
          { attemptKey: productAttemptKey(productId) },
        );
        if (fresh === OTHER_ACCOUNT) {
          setPaidElsewhere({ plan: bought, productId, confirmed });
          return;
        }
        finishAfterStorePurchase(
          fresh,
          confirmed,
          MEMBERSHIP_CONFIRMING_LINE,
        );
      } else {
        // "error" or "cancelled" — `reason` separates a store failure from a
        // user backing out, so an abandonment isn't read as a payment failure.
        track(ANALYTICS_EVENTS.PAYMENT_FAILED, {
          ...payProps,
          reason: outcome.status === "error" ? outcome.message : outcome.status,
        });
        if (outcome.status === "error") {
          showResult("error", "Purchase didn't complete", outcome.message);
        }
        // "cancelled" → the user backed out at the store sheet; stay silent.
      }
    } catch (error) {
      console.error("[Payments] Purchase failed:", error);
      track(ANALYTICS_EVENTS.PAYMENT_FAILED, { ...payProps, reason: "exception" });
      showResult(
        "error",
        "Purchase didn't complete",
        "Nothing has been charged. Please try again in a moment.",
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Monthly→Annual upgrade. Apple handles this natively: the annual subscription
   * starts immediately, and Apple prorates/refunds the unused monthly days.
   * Google Play does the same only when told which plan is being replaced,
   * which is what `playUpgradeChangeInfo` supplies on Android.
   * RevenueCat sends a PRODUCT_CHANGE webhook which our backend already handles.
   */
  /**
   * "Check again" under the other-account notice. A grant that arrives always
   * wins: it takes the normal success path. Anything else keeps the notice.
   */
  const recheckPaidElsewhere = async () => {
    if (!paidElsewhere || recheckingElsewhere) return;
    setRecheckingElsewhere(true);
    try {
      const fresh = await confirmMembershipGrant(
        (m) => purchaseConfirmed(m, paidElsewhere.plan),
        {
          userInitiated: true,
          attemptKey: productAttemptKey(paidElsewhere.productId),
        },
      );
      if (fresh && fresh !== OTHER_ACCOUNT) {
        setPaidElsewhere(null);
        finishAfterStorePurchase(fresh, paidElsewhere.confirmed, MEMBERSHIP_CONFIRMING_LINE);
      }
    } finally {
      setRecheckingElsewhere(false);
    }
  };

  const handleUpgradeToAnnual = async () => {
    if (!membership || storeCharged || purchasesPaused) return;
    if (!purchasesAvailable()) {
      setShowTestModeModal(true);
      return;
    }

    const productId = membership.annualProductId;
    const payProps = {
      planId: productId,
      catalogKey: "membership",
      plan: "annual",
      upgradeFrom: "monthly",
    };
    track(ANALYTICS_EVENTS.PAYMENT_STARTED, payProps);

    // Google Play keeps Monthly and Annual as separate subscriptions, so the
    // upgrade has to name the monthly plan it replaces or Play starts a second
    // one beside it. Null on iOS, where the subscription group swaps them.
    const googleProductChangeInfo = playUpgradeChangeInfo({
      platformOS: Platform.OS,
      membership: user?.membership,
      monthlyProductId: membership.productId,
    });

    setLoading(true);
    try {
      const outcome = await purchaseProductById(productId, {
        googleProductChangeInfo,
      });
      if (outcome.status === "purchased") {
        setStoreCharged(true);
        track(ANALYTICS_EVENTS.PAYMENT_COMPLETED, payProps);
        const confirmed = {
          title: "Done",
          message: "You are now on the yearly plan.",
        };
        const fresh = await confirmMembershipGrant(
          (m) => purchaseConfirmed(m, "annual"),
          { attemptKey: productAttemptKey(productId) },
        );
        if (fresh === OTHER_ACCOUNT) {
          setPaidElsewhere({ plan: "annual", productId, confirmed });
          return;
        }
        finishAfterStorePurchase(
          fresh,
          confirmed,
          "Your upgrade went through but is still being confirmed. It should appear shortly.",
        );
      } else {
        track(ANALYTICS_EVENTS.PAYMENT_FAILED, {
          ...payProps,
          reason: outcome.status === "error" ? outcome.message : outcome.status,
        });
        if (outcome.status === "error") {
          showResult("error", "Upgrade didn't complete", outcome.message);
        }
      }
    } catch (error) {
      console.error("[Payments] Upgrade failed:", error);
      track(ANALYTICS_EVENTS.PAYMENT_FAILED, { ...payProps, reason: "exception" });
      showResult(
        "error",
        "Upgrade didn't complete",
        "Nothing has been charged. Please try again in a moment.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.mainContainer}>
      <Animated.View style={[{ flex: 1 }, animatedSheetStyle]}>
        <View style={styles.safe}>
          <View style={styles.screenView}>
          {/* One page for everyone (PlanOffer, founder pick K3). It replaced
              the three swipe pages, which cut the plans off at large text.
              Restore and close sit on its orange layer (10 Nov 2026). */}
          {/* The dock is passed IN, so the purchase call, the store guard
              and the 3.1.2 disclosure stay in this file with the offer. */}
          <PlanOffer
            monthlyLabel={monthlyLabel}
            annualLabel={annualLabel}
            annualPerMonthLabel={annualPerMonthLabel}
            topInset={Math.max(insets.top, spacing.md)}
            header={
              <View style={styles.sheetHeader}>
                {/* Restore at the top, where people look for it. Off while a
                    payment is being confirmed, so a restore result cannot
                    cross the purchase result. */}
                {purchasesAvailable() ? (
                  <TouchableOpacity
                    onPress={restore}
                    disabled={restoring || loading}
                    hitSlop={LEGAL_HIT_SLOP}
                    accessibilityRole="button"
                    accessibilityLabel="Restore purchases"
                  >
                    <DSText variant="label" color={palette.ink.canvas}>
                      {restoring ? "Restoring…" : "Restore"}
                    </DSText>
                  </TouchableOpacity>
                ) : (
                  <View />
                )}
                <IconButton
                  name={icons.close}
                  variant="ghost"
                  color={palette.ink.canvas}
                  onPress={() => navigation.goBack()}
                  accessibilityLabel="Close"
                />
              </View>
            }
            annualSavingsPct={annualSavingsPct}
            cards={view.cards}
            onPickMonthly={() => setPicked("monthly")}
            onPickAnnual={() => setPicked("annual")}
            priceKnown={monthlyKnown && annualKnown}
            disabled={loading || storeCharged || purchasesPaused}
            dock={
              /* The SafeAreaView above deliberately omits the bottom edge, so
                 under edge-to-edge this would sit under the nav bar with the
                 purchase CTA in it. 0 on iOS. */
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
                {/* ── WHAT THEY HAVE TO KNOW BEFORE PAYING ────────────────
                    Body size, primary ink, directly above the button: free
                    days ending, a payment that failed, a plan on the other
                    store. Never a grey caption below the fold. */}
                {paidElsewhere ? (
                  <View style={styles.notices}>
                    <OtherAccountNotice headingVariant="title" center />
                    <TouchableOpacity
                      onPress={() => void recheckPaidElsewhere()}
                      disabled={recheckingElsewhere}
                      activeOpacity={0.7}
                      style={styles.secondaryCta}
                      accessibilityRole="button"
                      accessibilityLabel="Check again"
                    >
                      {recheckingElsewhere ? (
                        <ActivityIndicator color={colors.text.secondary} />
                      ) : (
                        <DSText
                          variant="label"
                          color="secondary"
                          style={styles.managePlanLink}
                        >
                          Check again
                        </DSText>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : view.notices.length > 0 ? (
                  <View style={styles.notices}>
                    {view.notices.map((line) => (
                      <DSText key={line} variant="body" color="primary" center>
                        {line}
                      </DSText>
                    ))}
                  </View>
                ) : null}

                {/* ── PRIMARY CTA ─────────────────────────────────────────
                    From `view.cta`, which follows the server's actions:
                    buy:       "Start membership · ₹X/yr"  → handlePayment
                    upgrade:   "Switch to yearly · ₹X/yr"  → handleUpgradeToAnnual
                    manage:    "Manage Subscription"        → manageSubscriptions
                    openStore: "Open Google Play"           → that store's page
                    none:      no button at all */}
                {sellingPaused ? (
                  <DSText variant="body" color="primary" center>
                    {PURCHASES_PAUSED_LINE}
                  </DSText>
                ) : paidElsewhere && (cta.kind === "buy" || cta.kind === "upgrade") ? null : cta.kind !== "none" ? (
                  <TouchableOpacity
                    style={[
                      styles.upgradeBtnWrapper,
                      (!cta.enabled || loading || ((storeCharged || !membership) && (cta.kind === "buy" || cta.kind === "upgrade"))) && { opacity: 0.7 },
                    ]}
                    activeOpacity={0.85}
                    onPress={
                      cta.kind === "manage"
                        ? manageSubscriptions
                        : cta.kind === "openStore"
                          ? () => openStoreSubscriptions(cta.url)
                          : cta.kind === "upgrade"
                            ? handleUpgradeToAnnual
                            : handlePayment
                    }
                    disabled={
                      !cta.enabled ||
                      loading ||
                      ((storeCharged || !membership) &&
                        (cta.kind === "buy" || cta.kind === "upgrade"))
                    }
                    accessibilityRole="button"
                    accessibilityLabel={cta.a11y}
                  >
                    <LinearGradient
                      colors={[palette.orange[300], palette.orange[400]]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.upgradeBtn}
                    >
                      {loading ? (
                        <ActivityIndicator color={palette.orange.on} />
                      ) : (
                        <DSText
                          variant="title"
                          style={styles.upgradeBtnText}
                          maxFontSizeMultiplier={1.3}
                        >
                          {cta.label}
                        </DSText>
                      )}
                      <LinearGradient
                        colors={[withAlpha(colors.surface.inverse, 0.15), "transparent"]}
                        style={StyleSheet.absoluteFill}
                      />
                    </LinearGradient>
                  </TouchableOpacity>
                ) : null}

                {/* ── SECONDARY CTA (upgrade only) ────────────────────────
                    A text link to manage/cancel the current monthly plan. */}
                {view.showManageLink ? (
                  <TouchableOpacity
                    onPress={manageSubscriptions}
                    activeOpacity={0.7}
                    style={styles.secondaryCta}
                    accessibilityRole="button"
                    accessibilityLabel="Manage current monthly plan"
                  >
                    <DSText
                      variant="label"
                      color="tertiary"
                      style={styles.managePlanLink}
                    >
                      Manage current plan
                    </DSText>
                  </TouchableOpacity>
                ) : null}

                {/* Members only: their plan status. For a buyer it was one
                    more line on a screen that needs fewer (founder pick F). */}
                {view.guaranteeIsMember ? (
                <View style={styles.guaranteeRow}>
                    <Icon
                      name={view.guaranteeIsMember ? "check-circle" : "shield"}
                      size={size.iconInline}
                      color={view.guaranteeIsMember ? colors.premium.gold : colors.text.tertiary}
                    />
                    <DSText
                      variant="caption"
                      color={view.guaranteeIsMember ? "primary" : "tertiary"}
                      style={styles.guaranteeText}
                    >
                      {view.guarantee}
                    </DSText>
                  </View>
                ) : null}

                {/* App Store Guideline 3.1.2 requires all of this ON the
                    purchase surface, in the binary: what renews, when it
                    renews, and functional links to the Terms of Use and the
                    Privacy Policy. */}
                {isAutoRenewingMember ? (
                  <DSText
                    variant="caption"
                    color="tertiary"
                    center
                    style={styles.renewalDisclosure}
                  >
                    {renewalDateText
                      ? `Billed through your app store account. Renews automatically on ${renewalDateText} unless cancelled in store settings at least 24 hours before.`
                      : "Tap above to view, change, or cancel your active subscription in App Store settings."}
                  </DSText>
                ) : view.disclosure === "plan" && priceKnown && !sellingPaused ? (
                  <DSText
                    variant="caption"
                    color="tertiary"
                    center
                    style={styles.renewalDisclosure}
                    maxFontSizeMultiplier={1.4}
                  >
                    {/* The price and period are in the selected plan row
                        right above the button, so this line does not repeat
                        them (founder, 10 Nov 2026). */}
                    Renews automatically unless cancelled 24 hours before the period ends.
                  </DSText>
                ) : null}

                <View style={styles.legalRow}>
                  <TouchableOpacity
                    onPress={() => handleLinkPress(TERMS_OF_USE_URL)}
                    hitSlop={LEGAL_HIT_SLOP}
                    accessibilityRole="link"
                    accessibilityLabel="Terms of Use"
                  >
                    <DSText variant="caption" color="tertiary" style={styles.legalLink} maxFontSizeMultiplier={1.4}>
                      Terms
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
                    <DSText variant="caption" color="tertiary" style={styles.legalLink} maxFontSizeMultiplier={1.4}>
                      Privacy
                    </DSText>
                  </TouchableOpacity>
                  <DSText variant="caption" color="tertiary">
                    ·
                  </DSText>
                  {/* Short names, one row: the four links used to take three
                      lines at large text (10 Nov 2026). */}
                  <PaymentProblemLink product="Membership" label="Payment help" maxFontSizeMultiplier={1.4} />
                </View>
              </>
            ) : (
              <DSText
                variant="caption"
                color="tertiary"
                center
                style={styles.guaranteeText}
              >
                Membership isn't available yet.
              </DSText>
            )}
              </View>
            }
          />
          </View>
        </View>
      </Animated.View>

      <OutcomeSheet
        visible={resultOpen}
        type={screenResult?.type ?? "success"}
        title={screenResult?.title ?? ""}
        message={screenResult?.message ?? ""}
        onClose={() => setResultOpen(false)}
        onDismissed={() => {
          const closeAfter = shownResultRef.current?.closeAfter;
          shownResultRef.current = null;
          if (!closeAfter) return;
          // Wait one frame: on iOS, closing this sheet's native modal and the
          // plan screen (also a native modal) in the same update can freeze
          // touches.
          requestAnimationFrame(() => navigation.goBack());
        }}
      />

      <Sheet
        visible={showTestModeModal}
        onClose={() => setShowTestModeModal(false)}
      >
        <View style={styles.testModeModalContent}>
          <View style={styles.testModeIconWrap}>
            <Icon name="alert-circle" size={size.iconLg} color={colors.text.accent} />
          </View>
          {/* This said "You're in test mode. Payments are disabled while we
              finish the setup." — internal language pointed at a user, naming
              a mode they are not in and a setup that is not their business.
              What a person needs from this moment: what happened, that they
              were not charged, and what to do. */}
          <DSText variant="h2" color="primary" center style={styles.testModeTitle}>
            Purchases aren&apos;t available
          </DSText>
          <DSText variant="body" color="secondary" center style={styles.testModeBody}>
            The store can&apos;t be reached right now, so nothing has been
            charged. Please try again in a little while.
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

/**
 * ===========================================================================
 * THE PAYWALL IS A DARK ROOM, IN BOTH SCHEMES
 * ---------------------------------------------------------------------------
 * `ForceDark` wraps the whole screen, so every token the subtree reads (the
 * backdrop, the sheet, all three pager grounds, the benefit cards, the bars,
 * the plan block and the legal type) resolves to its DARK value regardless of
 * the reader's scheme.
 *
 * ── WHY THIS IS A FIX AND NOT A PREFERENCE ─────────────────────────────────
 * Pages two and three were already painted on grounds that never change with
 * the scheme: one hardcoded literal, and `premium.ground`, which is invariant
 * by design because the tier is gold-on-obsidian in both. Their text, though,
 * asked for `text.primary` and `text.tertiary`, which DO change, and on paper
 * those are a warm near-black. A light-scheme reader got the poster at 1.1:1
 * against the ground and the plan block at 3.1:1. Not "a bit washed out":
 * gone.
 *
 * The alternative was to thread an invariant ink family through
 * `MarkedHeadline`, `BenefitRows`, `CallLengthHero`, `PlanPills` and the dock,
 * five components that have no other reason to know about the scheme, and to
 * leave the same trap armed for the sixth thing somebody adds here. The
 * wrapper says the true thing once instead: this screen is dark by design.
 *
 * ── THE BOUNDARY HAS TO BE OUTSIDE THE COMPONENT ───────────────────────────
 * `SubscribeScreenBody` reads the theme through `useTheme` and `makeStyles`,
 * both of which resolve from context. Wrapping from inside the component would
 * put the provider BELOW those calls and the screen's own styles would keep
 * the reader's real scheme while its children flipped, which is the same class
 * of half-applied theme this is meant to end. Hence the two components.
 *
 * `ForceDark`'s own note says it is for surfaces that are dark BY DESIGN and
 * not a migration escape hatch. This qualifies on the first count: the pager
 * interpolates three invariant grounds and the tier it sells is invariant too.
 * ===========================================================================
 */
const SubscribeScreen = () => (
  <ForceDark>
    <SubscribeScreenBody />
  </ForceDark>
);

export default SubscribeScreen;


const useStyles = makeStyles((c) => ({
  // `overlay.scrim`: this screen IS a transparent presentation, so the app
  // behind shows through, dimmed, like every other sheet. In light mode the
  // solid dark backdrop also left the dark clock and battery on black
  // (L1, founder pick B, 10 Nov 2026).
  mainContainer: {
    flex: 1,
    backgroundColor: c.overlay.scrim,
  },
  safe: { flex: 1 },
  // Copied from `Sheet`'s own header, not re-derived from tokens.
  sheetHeader: {
    minHeight: size.backBtn,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.screenX,
    paddingBottom: space.groupGap,
  },
  // The card. `marginTop: 64` is gone — the header above is the gap now, and it
  // has a control in it.
  // Full screen: the orange layer runs up under the status bar (K3).
  screenView: {
    flex: 1,
    backgroundColor: c.premium.ground,
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
  // ── The offer column ────────────────────────────────────────────────────
  // One rhythm down the whole screen: `block` is the only vertical gap, so the
  // figure, the rows and the plans sit on the same beat. The old screen used a
  // different bottom margin per section (2xl, 5xl, 4xl) and the spacing read as
  // accidental, because it was.
  offerHead: {
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing["2xl"],
    gap: spacing.md,
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
  offerTitle: {
    letterSpacing: -1,
  },
  block: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  programsNote: {
    marginTop: spacing.md,
  },
  // Footer
  footer: {
    // NOT absolutely positioned any more. It used to be, and once it moved
    // inside the pager's dock that made it escape the dock's flow: it covered
    // the swipe cue and the segment bar completely, and the dock measured
    // itself as if the footer were not there, so the pages ran underneath it.
    //
    // No background or top border either. The dock behind it paints the LIVE
    // interpolated ground, and a fixed canvas fill here would sit as a visible
    // slab against the slate on the last page.
    paddingTop: spacing.xl,
    paddingBottom: spacing["2xl"],
    paddingHorizontal: spacing["2xl"],
  },
  upgradeBtnWrapper: {
    borderRadius: radius.chip,
    overflow: "hidden",
    marginBottom: spacing.lg,
  },
  secondaryCta: {
    alignItems: "center",
    paddingVertical: spacing.sm,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
  },
  managePlanLink: {
    textDecorationLine: "underline",
  },
  upgradeBtn: {
    paddingVertical: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  upgradeBtnText: {
    color: palette.orange.on,
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
  notices: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  renewalDisclosure: {
    marginTop: spacing.md,
    // Required disclosure, so it must stay legible — not shrunk below the
    // caption ramp to win back vertical space. No fixed lineHeight: at large
    // text a fixed 16 made the lines overlap.
  },
  legalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.md,
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
