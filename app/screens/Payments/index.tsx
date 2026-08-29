import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
import { PaywallPager } from "./PaywallPager";

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
  // Read directly rather than through `SafeAreaView`. The old layout wrapped
  // everything in one and ALSO carried a bare `marginTop: 64` on the card — and
  // the 64 was doing all the work: the inset resolved to 0 here, so the moment
  // the margin was replaced by a real header the close control sat on top of
  // the clock. Padding the header explicitly is the version that cannot be
  // wrong by coincidence.
  const insets = useSafeAreaInsets();
  // Height of the pinned footer, so the scroll view can clear it exactly.
  // Starts at a sane guess so the first frame is never wrong by a whole screen.
  const [footerHeight, setFooterHeight] = useState(220);
  const [paymentPlan, setPaymentPlan] = useState<PAYMENT_PLAN_TYPE>(
    PAYMENT_PLAN_TYPE.ANNUALLY,
  );
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
  // The honest anchor (12 × monthly) is no longer printed as a struck-through
  // "was". It still does its work through `annualSavingsPct` below, which is
  // derived from it: the yearly pill carries a SAVE tag instead. Showing BOTH
  // a strike and a percentage is the same discount claimed twice, and in a
  // currency we cannot price `resolvePriceDisplay` withholds the anchor, which
  // silently withholds the tag too. That is the correct failure.
  // Derived, so it must be formatted in the SAME currency the prices resolved to.
  const annualPerMonthLabel =
    (annual?.priceAmount != null
      ? formatCurrency(annual.priceAmount / 12, annual.currencyCode)
      : null) ?? "—";
  // Read off the pair ACTUALLY on screen. ₹1499-vs-₹2388 is 37% but
  // $34.99-vs-$59.88 is 42%, so computing this from the INR book (as it did)
  // under-claimed the saving to every dollar buyer.
  const annualSavingsPct = annual ? (savingPercentFor(annual) ?? 0) : 0;
  // Is there a REAL price for the plan currently selected?
  //
  // Every label above falls back to an em-dash placeholder, and `GET
  // /users/me/offers` failing is a perfectly ordinary event (reviewers sit
  // behind datacenter networks). Without this guard the button is disabled but
  // still READS "Get Premium · —/yr", directly above "— per year. Renews
  // automatically unless cancelled...". That is an auto-renewing subscription
  // offered with no price attached, which is exactly what Guideline 3.1.2
  // forbids, and it looks like a bug to everyone else.
  const priceKnown =
    paymentPlan === PAYMENT_PLAN_TYPE.ANNUALLY
      ? !!annual?.price
      : !!monthly?.price;

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
        <View style={styles.safe}>
          {/* ── THE CLOSE CONTROL, WHERE EVERY OTHER SHEET PUTS IT ────────
              On the BACKDROP above the card, not inside it. That is the app's
              sheet contract — see `Sheet`'s `right` prop and the canonical
              call in `TagPickerSheet` — and this screen was the one surface
              breaking it, with an X floating over its own first page.

              The geometry is copied from `Sheet`'s header rather than re-
              derived: a 44pt row on the 16pt screen gutter with a 16pt gap
              down to the card. Two of those numbers used to live here as a
              bare `marginTop: 64` on the card below, which was the right
              distance by coincidence and had nothing in it.

              It also hands 64pt back to the pages. `PaywallPager` was holding
              that much clear at the top of every page purely so the headline
              would not run under this button. */}
          <View
            style={[
              styles.sheetHeader,
              { paddingTop: Math.max(insets.top, spacing.md) },
            ]}
          >
            <IconButton
              name={icons.close}
              onPress={() => navigation.goBack()}
              accessibilityLabel="Close"
            />
          </View>

          <View style={styles.screenView}>
          {/* ── THE OFFER ─────────────────────────────────────────────────
              Three pages and one room. `PaywallPager` owns the ground, the
              atmosphere, the close control and the pages; this screen keeps
              everything that touches money.

              What it replaced: a single vertical column that required a
              scroll to reach the price, on a screen whose whole job is to
              show a price. Before that, a four-slide carousel most readers
              never swiped.

              The dock is passed IN rather than rendered by the pager, so the
              purchase call, the store guard and the 3.1.2 disclosure all stay
              in one file with the offer they describe. */}
          <PaywallPager
            dockHeight={footerHeight}
            monthlyLabel={monthlyLabel}
            annualPerMonthLabel={annualPerMonthLabel}
            annualLabel={annualLabel}
            annualSavingsPct={annualSavingsPct}
            plan={paymentPlan === PAYMENT_PLAN_TYPE.ANNUALLY ? "annual" : "monthly"}
            onPickMonthly={() => setPaymentPlan(PAYMENT_PLAN_TYPE.MONTHLY)}
            onPickAnnual={() => setPaymentPlan(PAYMENT_PLAN_TYPE.ANNUALLY)}
            priceKnown={priceKnown}
            disabled={loading}
            dock={
              /* The SafeAreaView above deliberately omits the bottom edge, so
                 under edge-to-edge this would sit under the nav bar with the
                 purchase CTA in it. 0 on iOS. */
              <View
                style={[
                  styles.footer,
                  { paddingBottom: spacing["2xl"] + navBarInset },
                ]}
                onLayout={(e) => setFooterHeight(e.nativeEvent.layout.height)}
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
                  accessibilityLabel="Start Speechworks membership"
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
                        {!priceKnown
                          ? "Pricing unavailable"
                          : paymentPlan === PAYMENT_PLAN_TYPE.ANNUALLY
                            // "Membership", not "Premium". The eyebrow above
                            // says MEMBERSHIP, the entitlement is called
                            // membership, the day-28 sheet says "Keep my
                            // access" — this button was the last place still
                            // calling it Premium, and a product with two names
                            // on one screen reads as two products.
                            ? `Start membership · ${annualLabel}/yr`
                            : `Start membership · ${monthlyLabel}/mo`}
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
                    Secure payment. Cancel anytime.
                  </DSText>
                </View>

                {/* App Store Guideline 3.1.2 requires all of this ON the
                    purchase surface, in the binary: what renews, when it
                    renews, and functional links to the Terms of Use and the
                    Privacy Policy. Title / length / price are already on the
                    plan cards above; the renewal mechanics were missing
                    entirely, and neither link existed anywhere but the
                    sign-in screen. */}
                {/* Only with a real price. The renewal terms and the amount are
                    one disclosure, not two, so a placeholder here would be a
                    subscription sold without its price. See `priceKnown`. */}
                {priceKnown && (
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
                )}

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
                Membership isn't available yet.
              </DSText>
            )}
              </View>
            }
          />
          </View>
        </View>
      </Animated.View>

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
  // `background.sunken`, which is what `Sheet` paints its backdrop with. It was
  // `overlay.scrim` — indistinguishable here, because nothing is rendered
  // behind this screen for a scrim to darken, and wrong the moment somebody
  // makes this a transparent presentation.
  mainContainer: {
    flex: 1,
    backgroundColor: c.background.sunken,
  },
  safe: { flex: 1 },
  // Copied from `Sheet`'s own header, not re-derived from tokens.
  sheetHeader: {
    minHeight: size.backBtn,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: space.screenX,
    paddingBottom: space.groupGap,
  },
  // The card. `marginTop: 64` is gone — the header above is the gap now, and it
  // has a control in it.
  screenView: {
    flex: 1,
    backgroundColor: c.background.canvas,
    borderTopLeftRadius: radius.pill,
    borderTopRightRadius: radius.pill,
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
    paddingTop: spacing.sm,
    paddingBottom: spacing["2xl"],
    paddingHorizontal: spacing["2xl"],
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
