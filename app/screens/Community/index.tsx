import React, { useEffect, useState } from "react";
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import CustomScrollView from "../../components/CustomScrollView";
import ScreenView from "../../components/ScreenView";
import {
  parseTextStyle,
  parseShadowStyle,
} from "../../util/functions/parseStyles";
import { theme } from "../../Theme/tokens";

const { width } = Dimensions.get("window");

// Mock Data for the Current Tier
const CURRENT_TIER = {
  name: "THE FIRST 100 PIONEERS",
  totalSpots: 100,
  filledSpots: 64,
  perks: [
    "Connect with Experts & Peers",
    "Earn Pioneer Recognition",
    "Direct the Product Vision",
    "Free with Annual Pro",
  ],
};

const GOLD_GRADIENT = ["#D4AF37", "#996515"] as const;

const Community = () => {
  const navigation = useNavigation<any>();

  // Animation for the glow effect
  const glowOpacity = useSharedValue(0.3);
  const progressWidth = useSharedValue(0);

  useEffect(() => {
    // Elegant pulsing glow
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 2000 }),
        withTiming(0.3, { duration: 2000 }),
      ),
      -1,
      true,
    );

    // Animate the progress bar
    progressWidth.value = withTiming(
      (CURRENT_TIER.filledSpots / CURRENT_TIER.totalSpots) * 100,
      { duration: 2000 },
    );
  }, []);

  const animatedGlow = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const animatedProgress = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  return (
    <ScreenView style={styles.screenView}>
      <CustomScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* Subtle Branding */}
          <Animated.View
            entering={FadeInDown.duration(800).delay(100)}
            style={styles.brandingHeader}
          >
            <View style={styles.brandingDot} />
            <Text style={styles.brandingText}>MEMBERS ONLY</Text>
          </Animated.View>

          {/* Scarcity Hero */}
          <Animated.View
            entering={FadeInDown.duration(1000).delay(200)}
            style={styles.heroSection}
          >
            <Text style={styles.heroTitle}>Your journey</Text>
            <Text style={styles.heroTitle}>can guide</Text>
            <Text style={[styles.heroTitle, styles.heroTitleAccent]}>
              others.
            </Text>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.duration(1000).delay(300)}
            style={styles.subtextSection}
          >
            <Text style={styles.subtext}>
              Connect directly with vetted therapists and peers who understand.
              This is the first curated space of its kind. Become a founding
              member to offer support, shape our culture, and protect this
              community's integrity.
            </Text>
          </Animated.View>

          {/* Digital Tracker Card */}
          <Animated.View
            entering={FadeInDown.duration(1000).delay(400)}
            style={styles.trackerCard}
          >
            <View style={styles.trackerTop}>
              <Text style={styles.trackerLabel}>{CURRENT_TIER.name}</Text>
              <Text style={styles.liveIndicator}>• LIVE</Text>
            </View>

            <View style={styles.countContainer}>
              <Text style={styles.countNumber}>{CURRENT_TIER.filledSpots}</Text>
              <Text style={styles.countTotal}>/ {CURRENT_TIER.totalSpots}</Text>
              <Text style={styles.countLabel}>FOUNDING SEATS RESERVED</Text>
            </View>

            {/* Glowing Progress Indicator */}
            <View style={styles.progressContainer}>
              <View style={styles.progressTrack}>
                <Animated.View
                  style={[styles.progressFill, animatedProgress]}
                />
                {/* Glow Overlay */}
                <Animated.View
                  style={[styles.progressGlow, animatedProgress, animatedGlow]}
                />
              </View>
            </View>

            <Text style={styles.spotsLeft}>
              ONLY {CURRENT_TIER.totalSpots - CURRENT_TIER.filledSpots}{" "}
              RESERVATIONS LEFT
            </Text>
          </Animated.View>

          {/* Benefits List */}
          <Animated.View
            entering={FadeInDown.duration(1000).delay(500)}
            style={styles.benefitsSection}
          >
            <Text style={styles.benefitsTitle}>EXCLUSIVE BENEFITS</Text>
            <View style={styles.benefitsList}>
              {CURRENT_TIER.perks.map((perk, index) => (
                <View key={index} style={styles.benefitItem}>
                  <View style={styles.benefitIconWrapper}>
                    <Icon name="crown-outline" size={18} color="#D4AF37" />
                  </View>
                  <Text style={styles.benefitText}>{perk}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        </View>

        {/* GO PRO CTA - Integrated Layout */}
        <Animated.View
          entering={FadeInUp.duration(800).delay(600)}
          style={styles.ctaContainer}
        >
          <TouchableOpacity
            style={styles.ctaButton}
            activeOpacity={0.9}
            onPress={() => navigation.navigate("PremiumModal")}
          >
            <LinearGradient
              colors={GOLD_GRADIENT}
              style={styles.ctaGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.ctaText}>GET PRO & RESERVE SPOT</Text>
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.ctaFooterText}>
            Requires Annual Pro Subscription. Cancel anytime.
          </Text>
        </Animated.View>
      </CustomScrollView>
    </ScreenView>
  );
};

const styles = StyleSheet.create({
  screenView: {
    backgroundColor: "#0A0A0B", // Deep charcoal/black
  },
  scrollContent: {
    paddingBottom: 120, // Reduced to avoid hiding behind dock
  },
  container: {
    paddingHorizontal: 28,
    paddingTop: 60,
  },
  brandingHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 40,
    gap: 8,
  },
  brandingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#D4AF37", // Gold dot for premium
  },
  brandingText: {
    ...parseTextStyle(theme.typography.LabelSmall),
    color: "rgba(255,255,255,0.6)",
    letterSpacing: 2,
    fontWeight: "700",
  },
  heroSection: {
    marginBottom: 24,
  },
  heroTitle: {
    fontSize: 48,
    fontWeight: "900",
    color: "#FFFFFF",
    lineHeight: 52,
    letterSpacing: -1.5,
  },
  heroTitleAccent: {
    color: "#D4AF37", // Gold highlight
  },
  subtextSection: {
    marginBottom: 40,
  },
  subtext: {
    fontSize: 16,
    color: "rgba(255,255,255,0.5)",
    lineHeight: 26,
    fontWeight: "400",
  },
  trackerCard: {
    backgroundColor: "rgba(212, 175, 55, 0.03)", // Translucent gold hint
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.1)",
    marginBottom: 40,
  },
  trackerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  trackerLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 1.5,
  },
  liveIndicator: {
    fontSize: 10,
    fontWeight: "900",
    color: "#D4AF37",
    letterSpacing: 1,
  },
  countContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
    marginBottom: 20,
  },
  countNumber: {
    fontSize: 64,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -2,
    lineHeight: 70,
  },
  countTotal: {
    fontSize: 24,
    fontWeight: "700",
    color: "rgba(255,255,255,0.2)",
    marginLeft: 8,
  },
  countLabel: {
    width: "100%",
    fontSize: 11,
    fontWeight: "800",
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 1,
    marginTop: -4,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressTrack: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#D4AF37",
    borderRadius: 2,
    zIndex: 1,
  },
  progressGlow: {
    position: "absolute",
    height: "100%",
    backgroundColor: "#D4AF37",
    borderRadius: 2,
    shadowColor: "#D4AF37",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 10,
  },
  spotsLeft: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.3)",
    letterSpacing: 0.5,
  },
  benefitsSection: {
    marginBottom: 20,
  },
  benefitsTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(255,255,255,0.3)",
    letterSpacing: 2,
    marginBottom: 24,
  },
  benefitsList: {
    gap: 20,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  benefitIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(212, 175, 55, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  benefitText: {
    fontSize: 15,
    fontWeight: "500",
    color: "rgba(255,255,255,0.8)",
    flex: 1,
  },
  ctaContainer: {
    padding: 28,
    paddingTop: 0,
    paddingBottom: 20, // Reduced gap for tighter layout
  },
  ctaButton: {
    height: 64,
    borderRadius: 16,
    overflow: "hidden",
    ...parseShadowStyle(theme.shadow.elevation4),
  },
  ctaGradient: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  ctaFooterText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "rgba(255,255,255,0.4)",
    textAlign: "center",
    marginTop: 16,
  },
});

export default Community;
