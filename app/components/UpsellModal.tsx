import React, { useEffect, useState } from "react";
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEventStore } from "../stores/events";
import { EVENT_NAMES } from "../stores/events/constants";
import { theme } from "../Theme/tokens";
import { parseShadowStyle } from "../util/functions/parseStyles";
import { navigationRef } from "../util/functions/navigation";
import { PAYMENTS_ENABLED } from "../constants/features";
import { LinearGradient } from "expo-linear-gradient";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
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

const ALL_BENEFITS = [
  {
    id: "unrestricted",
    label: "Unrestricted Practice",
    free: "1 / Day",
    pro: "No Limits",
    icon: "calendar-check",
    desc: "Progress shouldn't be gated. Practice as much as you need to reach your goals.",
  },
  {
    id: "library",
    label: "Clinical Library",
    free: "Preview",
    pro: "Full Access",
    icon: "folder-open",
    desc: "Unlock the entire library of clinical packs designed by Speechworks experts.",
  },
  {
    id: "ai_calls",
    label: "AI Calls",
    free: "Basic",
    pro: "Full Access",
    icon: "robot",
    desc: "Simulate pressure with AI phone calls and social challenge drills.",
  },
];

const styles = StyleSheet.create({
  // Upsell Full Page Styles (Matched with SubscribeScreen)
  portalContainer: {
    flex: 1,
    backgroundColor: "#0F172A",
    marginTop: 64,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    overflow: "hidden",
  },
  portalScrollContent: {
    paddingBottom: 180,
  },
  glowOrb: {
    position: "absolute",
    borderRadius: 200,
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
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    ...parseShadowStyle(theme.shadow.elevation1),
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  heroContainer: {
    alignItems: "center",
    paddingHorizontal: 24,
    marginTop: 24, // Reduced from 80
    marginBottom: 40,
  },
  badgeGlass: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 100,
    padding: 1,
    marginBottom: 20,
  },
  badgeInner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(212, 175, 55, 0.1)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.2)",
  },
  badgeText: {
    color: "#D4AF37",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 38,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: -1,
    marginBottom: 16,
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 10,
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
    padding: 16,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    flexDirection: "row",
    alignItems: "center",
    height: 100,
  },
  slideIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  slideContent: {
    flex: 1,
  },
  slideTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  slideDesc: {
    color: "rgba(255, 255, 255, 0.45)",
    fontSize: 12,
    lineHeight: 16,
  },
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
  activeDot: {
    width: 20,
    backgroundColor: "#D4AF37",
  },
  inactiveDot: {
    width: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  buyProFooterFixed: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 24,
    backgroundColor: "rgba(15, 23, 42, 0.95)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
    zIndex: 10,
  },
  buyProCtaButton: {
    width: "100%",
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 16,
    ...parseShadowStyle(theme.shadow.elevation2),
  },
  buyProCtaGradient: {
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },
  buyProCtaText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.5,
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
  buyProTrustText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
    fontWeight: "600",
  },
});

const UpsellModal = () => {
  // Hidden while monetization is dormant — no upsell prompts until billing ships.
  // NOTE: `PAYMENTS_ENABLED` is a compile-time constant `false`, so this guard
  // ALWAYS returns before any hook below runs — hook order is trivially stable and
  // there is no rules-of-hooks hazard (the lint warnings on the hooks below are
  // benign for this dormant component). TODO(payments): when billing ships, move
  // this guard BELOW all hooks (and add `if (!PAYMENTS_ENABLED) return;` inside each
  // effect) so the hooks run unconditionally and rules-of-hooks is satisfied.
  if (!PAYMENTS_ENABLED) return null;

  const insets = useSafeAreaInsets();
  const { events, clear } = useEventStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [modalTag, setModalTag] = useState("");
  const [modalCta, setModalCta] = useState("Unlock Full Access");

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
          title = "Master Speech Management";
          message =
            "Learn advanced tools and strategies directly from expert SLPs.";
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

        const ctaText =
          event.name === EVENT_NAMES.SHOW_PREMIUM_UPSELL
            ? "Explore Premium"
            : event.name === EVENT_NAMES.SHOW_LIBRARY_UPSELL
              ? "Unlock Entire Library"
              : "Unlock Stamina";
        setModalCta(ctaText);

        setModalVisible(true);
        clear(event.name);
      }
    }
  }, [events, clear]);

  const renderPortalContent = () => (
    <View style={styles.portalContainer}>
      <View style={StyleSheet.absoluteFillObject}>
        <LinearGradient
          colors={["#0F172A", "#1E293B", "#0F172A"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1 }}
        />
        <View
          style={[
            styles.glowOrb,
            { top: -50, right: -50, backgroundColor: "#22D3EE", opacity: 0.1 },
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
              backgroundColor: "#8B5CF6",
              opacity: 0.08,
            },
          ]}
        />
      </View>

      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={() => setModalVisible(false)}
          style={styles.backButton}
        >
          <Icon name="close" size={20} color="#000" />
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
          <View style={styles.badgeGlass}>
            <View style={styles.badgeInner}>
              <Icon name="crown" size={12} color="#D4AF37" />
              <Text style={styles.badgeText}>{modalTag}</Text>
            </View>
          </View>
          <Text style={styles.heroTitle}>{modalTitle}</Text>
          <Text style={styles.heroSubtitle}>{modalMessage}</Text>
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
            {orderedBenefits.map((benefit, i) => (
              <View key={benefit.id} style={styles.carouselSlide}>
                <View style={styles.slideInner}>
                  <View style={styles.slideIconContainer}>
                    <Icon name={benefit.icon} size={24} color="#D4AF37" />
                  </View>
                  <View style={styles.slideContent}>
                    <Text style={styles.slideTitle}>{benefit.label}</Text>
                    <Text style={styles.slideDesc}>{benefit.desc}</Text>
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
                  carouselIndex === i ? styles.activeDot : styles.inactiveDot,
                ]}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      <View
        style={[
          styles.buyProFooterFixed,
          { paddingBottom: Math.max(insets.bottom, 4) },
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
          style={styles.buyProCtaButton}
        >
          <LinearGradient
            colors={["#D4AF37", "#B8860B", "#996515"]}
            style={styles.buyProCtaGradient}
          >
            <Text style={styles.buyProCtaText}>{modalCta}</Text>
            <LinearGradient
              colors={["rgba(255,255,255,0.15)", "transparent"]}
              style={StyleSheet.absoluteFill}
            />
          </LinearGradient>
        </TouchableOpacity>
        <View style={styles.buyProTrustRow}>
          <Icon name="lock" size={12} color="rgba(255,255,255,0.4)" />
          <Text style={styles.buyProTrustText}>
            Secure payment via Apple/Google Pay
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        { zIndex: 1000, backgroundColor: "rgba(0,0,0,0.75)" },
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
