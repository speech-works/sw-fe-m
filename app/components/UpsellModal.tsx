import React, { useEffect, useState } from "react";
import {
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEventStore } from "../stores/events";
import { EVENT_NAMES } from "../stores/events/constants";
import { navigationRef } from "../util/functions/navigation";
import { purchasesAvailable } from "../services/purchases";
import { useMembershipPrice } from "../hooks/useMembershipPrice";
import { BenefitRows } from "./membership/BenefitRows";
import {
  HEADLINE_FOR,
  PROGRAMS_NOTE,
  leadBenefitFor,
  orderBenefitsFor,
} from "../services/membershipOffer";
// Deliberately the DARK elevation set: the premium card is gold-on-slate in both
// schemes, so its inner shadows stay dark-tuned (see design-system/elevation.ts).
import { elevationDark } from "../design-system/elevation";
// Same reason as `elevationDark`: this card is a fixed SLATE surface in both
// schemes, so its foreground must stay the dark scheme's light-on-dark ink. The
// live `colors.text.primary` flips to near-black on paper and would vanish.
import { darkColors } from "../design-system/semantic/dark";
import {
  size,
  Gradient,
  Icon,
  icons,
  radius,
  spacing,
  typography,
  useTheme,
  withAlpha,
} from "../design-system";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH * 0.82;
const CARD_GAP = 12;

/** Height of the fixed buy footer, which floats over the scroll view. */
const FOOTER_CLEARANCE = 180;

export enum PAYMENT_PLAN_TYPE {
  MONTHLY = 0,
  ANNUALLY = 1,
}



const styles = StyleSheet.create({
  // ── The benefits block that replaced the carousel ───────────────────────
  benefitsSection: { paddingHorizontal: 20, gap: 10 },
  /**
   * The lead benefit. Tinted gold rather than the neutral fill the other rows
   * use, so which one is the argument is obvious before any word is read.
   */
  heroBenefit: {
    borderRadius: radius.card,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  heroBenefitTitle: {
    ...typography.h3,
    // Two lines is the realistic worst case for these labels at the largest
    // accessibility sizes; the card grows rather than clipping.
    letterSpacing: -0.3,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    borderRadius: radius.input,
    borderWidth: 1,
    padding: spacing.md,
  },
  benefitRowText: { flex: 1, gap: 2 },
  benefitRowTitle: { ...typography.label },
  benefitRowDesc: { ...typography.caption },
  priceLine: { alignItems: "center", gap: 2, marginTop: spacing.xs },
  priceMain: { ...typography.h2 },
  priceUnit: { ...typography.body },
  priceSub: { ...typography.caption, textAlign: "center" },
  programsNote: {
    ...typography.caption,
    textAlign: "center",
    marginTop: spacing.xs,
  },

  // Upsell Full Page Styles (Matched with SubscribeScreen)
  portalContainer: {
    flex: 1,
    marginTop: 64,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    overflow: "hidden",
  },
  portalScrollContent: {
    // Clearance for the fixed buy footer. It is a real number rather than a
    // measured height because the footer never changes shape, and a scroll
    // view that pads itself from a layout callback flickers on first paint.
    paddingBottom: FOOTER_CLEARANCE,
  },
  glowOrb: {
    position: "absolute",
    borderRadius: radius.full,
    width: 300,
    height: 300,
  },
  navBar: {
    paddingTop: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    position: "relative", // Changed from absolute
    zIndex: 10,
  },
  backButton: {
    position: "absolute",
    right: 20,
    top: 16,
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  heroContainer: {
    alignItems: "center",
    paddingHorizontal: 24,
    marginTop: 24, // Reduced from 80
    marginBottom: 40,
  },
  badgeGlass: {
    borderRadius: radius.full,
    padding: 1,
    marginBottom: spacing.xl,
  },
  badgeInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    gap: spacing.sm,
    borderWidth: 1,
  },
  // `eyebrow` rather than a 10pt "900": a numeric weight >= 700 drops Inter for
  // synthetic-bold Roboto on Android (see typography.ts).
  badgeText: typography.eyebrow,
  heroTitle: {
    ...typography.screenTitle,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  heroSubtitle: {
    ...typography.body,
    textAlign: "center",
    paddingHorizontal: spacing.sm,
  },
  carouselSection: {
    marginBottom: 40,
  },
  carousel: {
    paddingVertical: 8,
  },
  carouselContent: {
    paddingHorizontal: (SCREEN_WIDTH - CARD_WIDTH) / 2,
  },
  carouselSlide: {
    width: CARD_WIDTH,
    marginRight: CARD_GAP,
  },
  slideInner: {
    padding: spacing.lg,
    borderRadius: radius.chip,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    height: 100,
  },
  slideIconContainer: {
    width: 48,
    height: 48,
    borderRadius: radius.input,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.lg,
  },
  slideContent: {
    flex: 1,
  },
  slideTitle: {
    ...typography.title,
    marginBottom: spacing.xxs,
  },
  slideDesc: typography.caption,
  paginationDots: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
    gap: 8,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  activeDot: { width: 20 },
  inactiveDot: { width: 6 },
  buyProFooterFixed: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    zIndex: 10,
  },
  buyProCtaButton: {
    width: "100%",
    borderRadius: radius.chip,
    overflow: "hidden",
    marginBottom: 16,
  },
  buyProCtaGradient: {
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },
  buyProCtaText: {
    ...typography.h3,
    zIndex: 1,
  },
  buyProBtnShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "50%",
  },
  buyProTrustRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  buyProTrustText: typography.caption,
});

const UpsellModal = () => {
  // Hidden while monetization is dormant — no upsell prompts until billing ships.
  //
  // The guard that used to sit HERE now sits below the hook block, which is
  // what the previous TODO on this line asked for. Doing it early rather than
  // "when billing ships" was the point: 15 of the 64 lint errors that kept
  // `npm run lint` out of CI came from this one component, and a permanently
  // red report is how a genuine conditional-hook crash in Onboarding stayed
  // invisible.
  //
  // The gate is `purchasesAvailable()`, not the raw PAYMENTS_ENABLED flag: it
  // additionally requires a RevenueCat key for THIS platform, so a build that
  // cannot actually charge never shows an upsell. Both are read from
  // `Constants.expoConfig.extra` at runtime (app/constants/features.ts) and
  // are fixed for the process lifetime — so this is stable to call in render,
  // but it was never the compile-time constant an older note here claimed.
  //
  // OutOfStaminaController gates on the SAME predicate, inverted. Exactly one
  // of the two consumes SHOW_STAMINA_UPSELL — change one and you must change
  // the other, or the event fires twice or not at all.
  const insets = useSafeAreaInsets();
  // ABOVE the `purchasesAvailable()` early return, with the other hooks. Putting
  // it below makes it a CONDITIONAL hook — the exact class of bug the note on
  // that guard is about.
  const { colors } = useTheme();
  const { events, clear } = useEventStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [modalTag, setModalTag] = useState("");
  const [modalCta, setModalCta] = useState("See what you get");

  const [orderedBenefits, setOrderedBenefits] =
    useState<ReturnType<typeof orderBenefitsFor>>(() => orderBenefitsFor(""));

  // ── THE PRICE, ON THE SHEET ITSELF ──────────────────────────────────────
  // This screen used to name no price at all, so anybody weighing it up had to
  // tap through to find out. That is a step in the funnel that exists only
  // because the number was somewhere else, and it reads as withholding.
  //
  // Every figure is the STORE'S OWN localized string, through the same hook the
  // Payments screen uses, so the two can never quote different numbers. A buyer
  // in Ohio sees dollars.
  //
  // ABOVE the purchasesAvailable() early return, with the other hooks. Hooks
  // cannot be called conditionally, and this file already learned that once.
  const price = useMembershipPrice();

  const upsellOpacity = useSharedValue(0);
  const upsellTranslateY = useSharedValue(Dimensions.get("window").height);

  const animatedBackdropStyle = useAnimatedStyle(() => ({
    opacity: upsellOpacity.value,
  }));

  const animatedSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: upsellTranslateY.value }],
  }));

  useEffect(() => {
    if (!purchasesAvailable()) return;
    if (modalVisible) {
      const duration = 350;
      const easing = Easing.bezier(0.33, 1, 0.68, 1);
      upsellOpacity.value = withTiming(1, { duration, easing });
      upsellTranslateY.value = withTiming(0, { duration, easing });
    } else {
      const duration = 250;
      const easing = Easing.in(Easing.quad);
      upsellOpacity.value = withTiming(0, { duration, easing });
      upsellTranslateY.value = withTiming(Dimensions.get("window").height, {
        duration,
        easing,
      });
    }
  }, [modalVisible]);

  useEffect(() => {
    if (!purchasesAvailable()) return;
    if (!events || events.length === 0) return;

    for (const event of events) {
      if (
        event.name === EVENT_NAMES.SHOW_STAMINA_UPSELL ||
        event.name === EVENT_NAMES.SHOW_PREMIUM_UPSELL ||
        event.name === EVENT_NAMES.SHOW_LIBRARY_UPSELL
      ) {
        let title =
          event.detail?.modalTitle ||
          event.detail?.title ||
          "Practice Limit Reached";
        let message =
          event.detail?.errorMessage ||
          event.detail?.message ||
          event.detail?.desc ||
          "";
        let tag =
          event.detail?.modalTag || event.detail?.tag || "MEMBERSHIP";

        // ── THE HEADLINE FOLLOWS THE LEAD BENEFIT ────────────────────────
        // This used to hardcode one headline for both the premium and library
        // triggers, and that headline named "Guided programs" — a benefit
        // membership does not include (see MEMBERSHIP_BENEFITS above). The
        // sentence is now derived from whichever benefit is leading, so the
        // top of the sheet and the first thing under it can never disagree.
        const lead = leadBenefitFor(event.name);
        if (
          event.name === EVENT_NAMES.SHOW_PREMIUM_UPSELL ||
          event.name === EVENT_NAMES.SHOW_LIBRARY_UPSELL
        ) {
          title = HEADLINE_FOR[lead].title;
          message = HEADLINE_FOR[lead].message;
        }

        setModalTitle(title);
        setModalMessage(message);
        setModalTag(tag);

        // One ordering rule, in one tested function. The sort this replaces
        // was a chain of comparator branches naming benefit ids that no longer
        // exist ("unrestricted", "stamina"), so two of its three cases were
        // already dead and it silently did nothing.
        setOrderedBenefits(orderBenefitsFor(event.name));

        // One label, because all three tapped the same button: this navigates
        // to PremiumModal, it does not buy anything. "Unlock Entire Library" /
        // "Unlock Stamina" both promised the tap would unlock something, and
        // what actually happens is a pricing screen opens.
        setModalCta("See what you get");

        setModalVisible(true);
        clear(event.name);
      }
    }
  }, [events, clear]);

  /**
   * EVERY hook must stay ABOVE this line — that is the whole point of moving
   * it down here. While payments are dormant this still renders nothing, and
   * both effects above return early, so behaviour is identical to when the
   * guard sat at the top of the component.
   */
  if (!purchasesAvailable()) return null;

  const gold = colors.premium;
  const onGround = darkColors.text.primary;

  // The lead benefit and the two supporting it. Split here rather than in the
  // JSX so the render reads as "hero, then the rest" and cannot get them out
  // of order.
  // Only the LEAD is needed now: BenefitRows does its own ordering from the id,
  // so the sheet no longer has to know what the other two are.
  const [heroBenefit] = orderedBenefits;

  /**
   * The premium tier's gold-on-slate identity is DELIBERATELY outside the orange
   * system (`palette.ts` scopes it to this card) — but it has tokens, and this
   * file used to retype them: 13 hex literals and 17 rgba() calls, one of which
   * (`#B8860B`) was in no palette at all. The identity is scheme-invariant, so
   * these resolve to the same values in both schemes; reading them means the
   * tier can be restyled from one place.
   */
  const renderPortalContent = () => (
    <View style={[styles.portalContainer, { backgroundColor: gold.ground }]}>
      <View style={StyleSheet.absoluteFillObject}>
        <Gradient token="premiumGround" style={{ flex: 1 }} />
        <View
          style={[
            styles.glowOrb,
            {
              top: -50,
              right: -50,
              backgroundColor: colors.premium.orbCyan,
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
              backgroundColor: colors.premium.orbPurple,
              opacity: 0.08,
            },
          ]}
        />
      </View>

      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={() => setModalVisible(false)}
          style={[
            styles.backButton,
            {
              backgroundColor: withAlpha(onGround, 0.1),
              borderColor: withAlpha(onGround, 0.15),
            },
          ]}
        >
          <Icon name={icons.close} size={size.icon} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.portalScrollContent,
          // The footer sits ON TOP of the scroll view, so its height has to be
          // added to the inset rather than replace it. Writing `paddingBottom:
          // insets.bottom` here silently overrode the clearance above, and on
          // any phone with no home indicator that inset is 0: the last benefit,
          // the PRICE and the programs note were all parked behind the button
          // with no way to scroll to them.
          { paddingTop: 46, paddingBottom: FOOTER_CLEARANCE + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroContainer}>
          <View style={[styles.badgeGlass, { backgroundColor: withAlpha(onGround, 0.05) }]}>
            <View
              style={[
                styles.badgeInner,
                { backgroundColor: gold.goldTint, borderColor: gold.goldBorder },
              ]}
            >
              <Icon name={icons.pro} size={size.iconXs} color={colors.premium.gold} />
              <Text style={[styles.badgeText, { color: gold.gold }]}>{modalTag}</Text>
            </View>
          </View>
          <Text style={[styles.heroTitle, { color: onGround }]}>{modalTitle}</Text>
          <Text style={[styles.heroSubtitle, { color: withAlpha(onGround, 0.7) }]}>
            {modalMessage}
          </Text>
        </View>

        {/* ── WHAT MEMBERSHIP INCLUDES ────────────────────────────────────
            This was a horizontal carousel of three cards with pagination dots.
            Two problems, both costing sales:

            1. Each card was a SEPARATE argument, so a person saw one and left.
               Most never swiped, which meant most never learned that the other
               two benefits existed at all.
            2. It gave the three equal weight, when one of them is the entire
               reason to buy. Call length is the only column where membership
               wins by a wide margin.

            It then became a big gold hero card with two dimmer rows beneath —
            which fixed the swiping but left this sheet and the Payments screen
            behind it drawing the same three facts in two different shapes. One
            product should not change appearance when the buyer moves one screen
            closer to paying. Both now render `BenefitRows`.

            The lead is still emphasis, not omission: all three are on screen,
            and which one is raised depends on what the person just hit. See
            leadBenefitFor.
        */}
        <View style={styles.benefitsSection}>
          <BenefitRows leadId={heroBenefit.id} long />

          {/* ── PRICE ───────────────────────────────────────────────────────
              Shown as a per-month figure with the billed total right beside it.
              The small number is the one people compare, and putting the real
              charge next to it is what keeps that honest rather than a trick.

              Hidden entirely when no price is known: the offers call failing is
              ordinary, and a subscription offered with no price attached is
              what Guideline 3.1.2 forbids. An em dash where a price should be
              also just looks broken. */}
          {price.priceKnown && (
            <View style={styles.priceLine}>
              <Text style={[styles.priceMain, { color: onGround }]}>
                {price.annualPerMonthLabel}
                <Text style={[styles.priceUnit, { color: withAlpha(onGround, 0.5) }]}>
                  {" "}a month
                </Text>
              </Text>
              <Text style={[styles.priceSub, { color: withAlpha(onGround, 0.45) }]}>
                Billed yearly at {price.annualLabel}. Monthly is {price.monthlyLabel}.
              </Text>
            </View>
          )}

          {/* The line that stops somebody buying membership for the library.
              Quiet on purpose: it is an expectation, not a benefit. */}
          <Text style={[styles.programsNote, { color: withAlpha(onGround, 0.4) }]}>
            {PROGRAMS_NOTE}
          </Text>
        </View>
      </ScrollView>

      <View
        style={[
          styles.buyProFooterFixed,
          {
            paddingBottom: Math.max(insets.bottom, 4),
            backgroundColor: withAlpha(gold.ground, 0.95),
            borderTopColor: withAlpha(onGround, 0.1),
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            setModalVisible(false);
            setTimeout(() => {
              navigationRef.navigate("PremiumModal" as never);
            }, 300);
          }}
          style={[styles.buyProCtaButton, elevationDark.e2]}
        >
          <Gradient token="premiumGold" style={styles.buyProCtaGradient}>
            {/* Dark slate ink on the gold fill (8.49:1). This label was white,
                which is 2.10:1 on `premium.gold` — the same dark-on-bright rule
                the rest of the app follows, on the one screen that sells. */}
            <Text style={[styles.buyProCtaText, { color: colors.premium.onGold }]}>
              {modalCta}
            </Text>
            <Gradient
              colors={[withAlpha(colors.text.primary, 0.15), "transparent"]}
              style={StyleSheet.absoluteFill}
            />
          </Gradient>
        </TouchableOpacity>
        <View style={styles.buyProTrustRow}>
          <Icon
            name={icons.locked}
            size={size.iconXs}
            color={withAlpha(colors.text.primary, 0.4)}
          />
          {/* Not Apple Pay / Google Pay — this is StoreKit and Play Billing.
              Naming a payment product we don't use is factually wrong on a
              purchase screen, and Apple rejects Apple Pay claims for IAP. */}
          <Text style={[styles.buyProTrustText, { color: withAlpha(onGround, 0.4) }]}>
            {Platform.OS === "ios"
              ? "Secure payment through the App Store"
              : "Secure payment through Google Play"}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        { zIndex: 1000, backgroundColor: colors.overlay.scrim },
        animatedBackdropStyle,
      ]}
      pointerEvents={modalVisible ? "auto" : "none"}
    >
      <Animated.View style={[{ flex: 1 }, animatedSheetStyle]}>
        {renderPortalContent()}
      </Animated.View>
    </Animated.View>
  );
};

export default UpsellModal;
