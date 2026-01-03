import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React from "react";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../util/functions/parseStyles";
import { theme } from "../../../Theme/tokens";
import { LinearGradient } from "expo-linear-gradient";
import {
  CompositeNavigationProp,
  useNavigation,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SettingsStackParamList } from "../../../navigators/stacks/SettingsStack/types";
import { AcademyStackParamList } from "../../../navigators/stacks/AcademyStack/types";
import Icon from "react-native-vector-icons/MaterialCommunityIcons"; // Switched to MaterialCommunity for better icons

const BuyPro = () => {
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

  // MAPPED BENEFITS (Simple & Desirable)
  const benefits = [
    { text: "Unlimited Practice (No Daily Limits)", icon: "infinity" },
    { text: "Join the Inner Circle (Community Access)", icon: "account-group" }, // Big selling point
    { text: "Unlock All 4 Territories", icon: "map-legend" }, // Fits "World" theme
    { text: "Access Every Exercise & Game", icon: "lock-open-variant" },
    { text: "Practice Anytime (Never Wait)", icon: "clock-fast" },
  ];

  return (
    <LinearGradient
      colors={[
        "#F472B6",
        theme.colors.library.orange[400],
        theme.colors.library.orange[500],
      ]} // Pink -> Orange -> Darker Orange
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      {/* Badge */}
      <View style={styles.badgeContainer}>
        <Icon
          name="star-four-points"
          size={12}
          color={theme.colors.library.orange[500]}
        />
        <Text style={styles.badgeText}>{copy.badge}</Text>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.subtitle}>{copy.subtitle}</Text>
      </View>

      {/* Benefits List */}
      <View style={styles.benefitsContainer}>
        {benefits.map((benefit, index) => (
          <View key={index} style={styles.benefitRow}>
            <View style={styles.iconContainer}>
              <Icon name={benefit.icon} size={14} color="#4F46E5" />
            </View>
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
          colors={["#FFFFFF", "#F9FAFB"]}
          style={styles.ctaGradient}
        >
          <Text style={styles.ctaText}>{copy.cta}</Text>
          <Icon
            name="arrow-right"
            size={16}
            color="#DB2777"
            style={{ marginLeft: 8 }}
          />
        </LinearGradient>
      </TouchableOpacity>

      <Text style={styles.disclaimer}>
        Join 1,000+ early members • Cancel anytime
      </Text>
    </LinearGradient>
  );
};

export default BuyPro;

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 32, // More vertical breathing room
    ...parseShadowStyle(theme.shadow.elevation2),
    position: "relative",
    overflow: "hidden",
    gap: 24, // increased gap between sections
  },
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    gap: 6,
    marginBottom: 8, // slight increase
  },
  badgeText: {
    ...parseTextStyle(theme.typography.BodyDetails),
    fontWeight: "800",
    color: theme.colors.text.title,
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  header: {
    gap: 12, // increased gap
  },
  title: {
    ...parseTextStyle(theme.typography.Heading2),
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 34,
  },
  subtitle: {
    ...parseTextStyle(theme.typography.Body),
    color: "rgba(255,255,255,0.95)",
    fontSize: 15,
    lineHeight: 22,
  },
  benefitsContainer: {
    gap: 16, // More space between benefits
    marginTop: 12,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center", // Revert to center for better visual alignment
    gap: 16,
    width: "100%",
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    ...parseShadowStyle(theme.shadow.elevation1),
    // Removed marginTop so it centers perfectly
  },
  benefitText: {
    ...parseTextStyle(theme.typography.Body),
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 15,
    flex: 1, // Take remaining space
    flexShrink: 1, // Force wrap if too long
    lineHeight: 22, // Ensure readability for multi-line
  },
  ctaButton: {
    marginTop: 24, // Isolating CTA
    borderRadius: 100,
    overflow: "hidden",
    ...parseShadowStyle(theme.shadow.elevation2),
  },
  ctaGradient: {
    paddingVertical: 18,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  ctaText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: "#DB2777",
    fontSize: 18,
    fontWeight: "800",
  },
  disclaimer: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    marginTop: 4, // Positive margin for breathing room
    fontSize: 12,
    fontWeight: "500",
  },
});
