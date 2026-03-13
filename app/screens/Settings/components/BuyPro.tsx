import {
  CompositeNavigationProp,
  useNavigation,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons"; // Switched to MaterialCommunity for better icons
import { AcademyStackParamList } from "../../../navigators/stacks/AcademyStack/types";
import { SettingsStackParamList } from "../../../navigators/stacks/SettingsStack/types";
import { theme } from "../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../util/functions/parseStyles";

interface BuyProProps {
  onLayoutCapture?: (event: any) => void;
}

const BuyPro: React.FC<BuyProProps> = ({ onLayoutCapture }) => {
  // Navigation Types
  type SettingsNav = NativeStackNavigationProp<SettingsStackParamList>;
  type AcademyNav = NativeStackNavigationProp<AcademyStackParamList>;
  type CrossNavigationProp = CompositeNavigationProp<SettingsNav, AcademyNav>;

  const navigation = useNavigation<CrossNavigationProp>();

  // PLAIN ENGLISH SALES COPY
  // Focus: Simplicity, Freedom, and Belonging
  const copy = {
    badge: "EARLY BIRD OFFER",
    title: "Unlock Everything",
    subtitle:
      "Remove daily limits. Get the freedom to practice as much as you want.",
    cta: "Upgrade to Pro",
  };

  // MAPPED BENEFITS (High-Converting Short Copy)
  const benefits = [
    { text: "Break the Limit (No Daily Caps)", icon: "infinity" },
    { text: "Master the Real World (AI Calls)", icon: "robot" },
    { text: "Your Personalized Roadmap", icon: "map-check" },
    { text: "See the Unseen Progress", icon: "chart-line" },
    { text: "Expertise on Demand (All Tutorials)", icon: "play-circle" },
  ];

  return (
    <LinearGradient
      onLayout={(event) => {
        if (onLayoutCapture) onLayoutCapture(event);
      }}
      colors={["#1E1B4B", "#312E81", "#1E1B4B"]} // Deep indigo / Midnight blue
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      {/* Decorative Glow */}
      <View style={styles.glowOrb} />

      {/* Badge */}
      <View style={styles.badgeContainer}>
        <Icon name="crown" size={12} color="#F59E0B" />
        <Text style={styles.badgeText}>EXCLUSIVE OFFER</Text>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Go Premium.</Text>
        <Text style={styles.subtitle}>
          Remove limits and unlock your true potential with clinical-grade
          tools.
        </Text>
      </View>

      {/* Benefits Grid (Compact) */}
      <View style={styles.benefitsGrid}>
        {benefits.slice(0, 3).map((benefit, index) => (
          <View key={index} style={styles.benefitItem}>
            <Icon
              name={benefit.icon}
              size={14}
              color="#FFF"
              style={{ opacity: 0.8 }}
            />
            <Text style={styles.benefitText}>{benefit.text}</Text>
          </View>
        ))}
      </View>

      {/* CTA Button */}
      <TouchableOpacity
        style={styles.ctaButton}
        activeOpacity={0.9}
        onPress={() => navigation.navigate("PremiumModal" as any)}
      >
        <LinearGradient
          colors={["#F59E0B", "#D97706"]}
          style={styles.ctaGradient}
        >
          <Text style={styles.ctaText}>Explore Premium</Text>
        </LinearGradient>
      </TouchableOpacity>
    </LinearGradient>
  );
};

export default React.memo(BuyPro);

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingVertical: 32,
    ...parseShadowStyle(theme.shadow.elevation4),
    position: "relative",
    overflow: "hidden",
    gap: 20,
  },
  glowOrb: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    filter: "blur(20px)",
  },
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.2)",
  },
  badgeText: {
    ...parseTextStyle(theme.typography.BodyDetails),
    fontWeight: "900",
    color: "#F59E0B",
    fontSize: 10,
    letterSpacing: 1,
  },
  header: {
    gap: 8,
  },
  title: {
    ...parseTextStyle(theme.typography.Heading2),
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900",
  },
  subtitle: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    lineHeight: 20,
  },
  benefitsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 8,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  benefitText: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 12,
  },
  ctaButton: {
    marginTop: 12,
    borderRadius: 100,
    overflow: "hidden",
    ...parseShadowStyle(theme.shadow.elevation3),
  },
  ctaGradient: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
});
