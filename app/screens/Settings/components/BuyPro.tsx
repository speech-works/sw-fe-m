import {
  CompositeNavigationProp,
  useNavigation,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { ExploreStackParamList } from "../../../navigators/stacks/ExploreStack/types";
import { SettingsStackParamList } from "../../../navigators/stacks/SettingsStack/types";
import { theme } from "../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../util/functions/parseStyles";
import { PAYMENTS_ENABLED } from "../../../constants/features";

interface BuyProProps {
  onLayoutCapture?: (event: any) => void;
}

const BuyPro: React.FC<BuyProProps> = ({ onLayoutCapture }) => {
  // Hidden while monetization is dormant (no in-app billing wired yet).
  if (!PAYMENTS_ENABLED) return null;

  type SettingsNav = NativeStackNavigationProp<SettingsStackParamList>;
  type ExploreNav = NativeStackNavigationProp<ExploreStackParamList>;
  type CrossNavigationProp = CompositeNavigationProp<SettingsNav, ExploreNav>;

  const navigation = useNavigation<CrossNavigationProp>();

  const copy = {
    badge: "EXCLUSIVE OFFER",
    title: "Go Premium.",
    subtitle:
      "Unlock your potential with clinical-grade tools and ultimate freedom.",
    cta: "Explore Premium",
  };

  const benefits = [
    { text: "No Daily Caps", icon: "infinity" },
    { text: "AI Calls", icon: "robot" },
    { text: "Personal Roadmap", icon: "map-check" },
  ];

  return (
    <LinearGradient
      onLayout={(event) => onLayoutCapture?.(event)}
      colors={["#0F172A", "#1E293B", "#0F172A"]} // Premium Dark Slate
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      {/* Decorative Orbs */}
      <View
        style={[
          styles.glowOrb,
          { top: -40, right: -40, backgroundColor: "#22D3EE", opacity: 0.1 },
        ]}
      />
      <View
        style={[
          styles.glowOrb,
          { bottom: -30, left: -30, backgroundColor: "#8B5CF6", opacity: 0.08 },
        ]}
      />

      {/* Badge */}
      <View style={styles.badgeContainer}>
        <Icon name="crown" size={12} color="#D4AF37" />
        <Text style={styles.badgeText}>{copy.badge}</Text>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.subtitle}>{copy.subtitle}</Text>
      </View>

      {/* Benefits Grid (Original Compact Style) */}
      <View style={styles.benefitsGrid}>
        {benefits.map((benefit, index) => (
          <View key={index} style={styles.benefitItem}>
            <Icon
              name={benefit.icon}
              size={14}
              color="#FFF"
              style={{ opacity: 0.9 }}
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
          colors={["#D4AF37", "#996515"]} // Metallic Gold
          style={styles.ctaGradient}
        >
          <Text style={styles.ctaText}>{copy.cta}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </LinearGradient>
  );
};

export default React.memo(BuyPro);

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 24,
    ...parseShadowStyle(theme.shadow.elevation4),
    position: "relative",
    overflow: "hidden",
    gap: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  glowOrb: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(212, 175, 55, 0.15)", // Translucent Gold
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.3)",
  },
  badgeText: {
    ...parseTextStyle(theme.typography.BodyDetails),
    fontWeight: "900",
    color: "#D4AF37",
    fontSize: 10,
    letterSpacing: 1,
  },
  header: {
    gap: 8,
  },
  title: {
    ...parseTextStyle(theme.typography.Heading2),
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.6,
  },
  subtitle: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "rgba(255, 255, 255, 0.7)",
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
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
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
