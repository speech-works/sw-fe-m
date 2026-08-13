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
const SNAP_INTERVAL = CARD_WIDTH + CARD_GAP;

export enum PAYMENT_PLAN_TYPE {
  MONTHLY = 0,
  ANNUALLY = 1,
}

// Keep these in step with PREMIUM_SLIDES in screens/Payments — the two screens
// sell the same thing and must not quote different numbers. The figures are
// real: free is FREE_STAMINA_CONFIG (35 max at 7 per activity, about five a
// day) and paid is the level pool (80-110, about twelve); calls are 4 per 30
// days banking to 8. Both of the old values here were false in opposite
// directions ("1 / Day" understated our own free tier fivefold, "No Limits"
// promised something we do not sell).
const ALL_BENEFITS = [
  {
    id: "unrestricted",
    label: "Daily practice",
    free: "About 5 a day",
    pro: "About 12 a day",
    icon: icons.energy, // the practice bar — this benefit is about it refilling faster
    desc: "Premium roughly doubles your daily practice and refills faster, so a good session doesn't stop because the bar ran out.",
  },
  {
    id: "library",
    // Was "Clinical Library" / "clinical packs designed by Speechworks
    // experts" — two claims we can't substantiate (clinical treatment, and
    // expert authorship) on a screen that asks for money. See the matching
    // slide in screens/Payments.
    label: "Guided programs",
    free: "Preview",
    pro: "All of them",
    icon: icons.journey, // the registry's word for a pack/program
    desc: "Every program in the library, start to finish. Structured arcs that build week to week, not loose exercises.",
  },
  {
    id: "ai_calls",
    label: "Live AI calls",
    free: "Basic",
    pro: "4 a month",
    icon: icons.ai,
    desc: "Practice the call you keep putting off, with someone who won't finish your sentences. Four a month, banking up to eight.",
  },
];

const styles = StyleSheet.create({
  // Upsell Full Page Styles (Matched with SubscribeScreen)
  portalContainer: {
    flex: 1,
    marginTop: 64,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    overflow: "hidden",
  },
  portalScrollContent: {
    paddingBottom: 180,
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
  const [modalCta, setModalCta] = useState("See what's included");

  const [carouselIndex, setCarouselIndex] = useState(0);
  const [orderedBenefits, setOrderedBenefits] = useState(ALL_BENEFITS);

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
          event.detail?.modalTag || event.detail?.tag || "PREMIUM ACCESS";

        if (
          event.name === EVENT_NAMES.SHOW_PREMIUM_UPSELL ||
          event.name === EVENT_NAMES.SHOW_LIBRARY_UPSELL
        ) {
          // Was "Master Speech Management" / "…directly from expert SLPs."
          // Two problems: "master" frames speech as something to be conquered,
          // which is the framing this product exists to avoid; and the expert
          // authorship is a credential claim we cannot back (the same claim was
          // already cut from the benefits list below).
          title = "Take it into a real conversation";
          message =
            "Guided programs, and live calls to try a technique before the day you need it.";
        }

        setModalTitle(title);
        setModalMessage(message);
        setModalTag(tag);

        // Dynamic Reordering Logic
        const newOrder = [...ALL_BENEFITS].sort((a, b) => {
          if (event.name === EVENT_NAMES.SHOW_STAMINA_UPSELL) {
            // Prioritize Stamina/Practice
            if (a.id === "unrestricted") return -1;
            if (b.id === "unrestricted") return 1;
            if (a.id === "stamina") return -1;
            if (b.id === "stamina") return 1;
          } else if (event.name === EVENT_NAMES.SHOW_PREMIUM_UPSELL) {
            // Prioritize AI Calls then Library
            if (a.id === "ai_calls") return -1;
            if (b.id === "ai_calls") return 1;
            if (a.id === "library") return -1;
            if (b.id === "library") return 1;
          } else if (event.name === EVENT_NAMES.SHOW_LIBRARY_UPSELL) {
            // Prioritize Library then AI Calls
            if (a.id === "library") return -1;
            if (b.id === "library") return 1;
            if (a.id === "ai_calls") return -1;
            if (b.id === "ai_calls") return 1;
          }
          return 0;
        });
        setOrderedBenefits(newOrder);

        // One label, because all three tapped the same button: this navigates
        // to PremiumModal, it does not buy anything. "Unlock Entire Library" /
        // "Unlock Stamina" both promised the tap would unlock something, and
        // what actually happens is a pricing screen opens.
        setModalCta("See what's included");

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
  const onSlate = darkColors.text.primary;

  /**
   * The premium tier's gold-on-slate identity is DELIBERATELY outside the orange
   * system (`palette.ts` scopes it to this card) — but it has tokens, and this
   * file used to retype them: 13 hex literals and 17 rgba() calls, one of which
   * (`#B8860B`) was in no palette at all. The identity is scheme-invariant, so
   * these resolve to the same values in both schemes; reading them means the
   * tier can be restyled from one place.
   */
  const renderPortalContent = () => (
    <View style={[styles.portalContainer, { backgroundColor: gold.slate }]}>
      <View style={StyleSheet.absoluteFillObject}>
        <Gradient token="premiumSlate" style={{ flex: 1 }} />
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
              backgroundColor: withAlpha(onSlate, 0.1),
              borderColor: withAlpha(onSlate, 0.15),
            },
          ]}
        >
          <Icon name={icons.close} size={size.icon} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.portalScrollContent,
          { paddingTop: 46, paddingBottom: insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroContainer}>
          <View style={[styles.badgeGlass, { backgroundColor: withAlpha(onSlate, 0.05) }]}>
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
          <Text style={[styles.heroTitle, { color: onSlate }]}>{modalTitle}</Text>
          <Text style={[styles.heroSubtitle, { color: withAlpha(onSlate, 0.7) }]}>
            {modalMessage}
          </Text>
        </View>

        <View style={styles.carouselSection}>
          <ScrollView
            horizontal
            pagingEnabled={false}
            decelerationRate="fast"
            snapToInterval={SNAP_INTERVAL}
            snapToAlignment="center"
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const x = e.nativeEvent.contentOffset.x;
              const index = Math.round(x / SNAP_INTERVAL);
              if (index !== carouselIndex) setCarouselIndex(index);
            }}
            scrollEventThrottle={16}
            style={styles.carousel}
            contentContainerStyle={styles.carouselContent}
          >
            {orderedBenefits.map((benefit) => (
              <View key={benefit.id} style={styles.carouselSlide}>
                <View
                  style={[
                    styles.slideInner,
                    {
                      backgroundColor: withAlpha(onSlate, 0.04),
                      borderColor: withAlpha(onSlate, 0.08),
                    },
                  ]}
                >
                  <View style={[styles.slideIconContainer, { backgroundColor: withAlpha(onSlate, 0.06) }]}>
                    <Icon name={benefit.icon} size={size.tabIcon} color={colors.premium.gold} />
                  </View>
                  <View style={styles.slideContent}>
                    <Text style={[styles.slideTitle, { color: onSlate }]}>{benefit.label}</Text>
                    <Text style={[styles.slideDesc, { color: withAlpha(onSlate, 0.45) }]}>
                      {benefit.desc}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
          <View style={styles.paginationDots}>
            {orderedBenefits.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  carouselIndex === i
                    ? [styles.activeDot, { backgroundColor: gold.gold }]
                    : [styles.inactiveDot, { backgroundColor: withAlpha(onSlate, 0.2) }],
                ]}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      <View
        style={[
          styles.buyProFooterFixed,
          {
            paddingBottom: Math.max(insets.bottom, 4),
            backgroundColor: withAlpha(gold.slate, 0.95),
            borderTopColor: withAlpha(onSlate, 0.1),
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
          <Text style={[styles.buyProTrustText, { color: withAlpha(onSlate, 0.4) }]}>
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
