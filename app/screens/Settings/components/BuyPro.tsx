import {
  CompositeNavigationProp,
  useNavigation,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { ExploreStackParamList } from "../../../navigators/stacks/ExploreStack/types";
import { SettingsStackParamList } from "../../../navigators/stacks/SettingsStack/types";
import { PAYMENTS_ENABLED } from "../../../constants/features";
import {
  useTheme,
  spacing,
  radius,
  borderWidth,
  gradients,
  Text,
  Icon,
  icons,
  type IconName,
} from "../../../design-system";

interface BuyProProps {
  onLayoutCapture?: (event: any) => void;
}

const BuyPro: React.FC<BuyProProps> = ({ onLayoutCapture }) => {
  type SettingsNav = NativeStackNavigationProp<SettingsStackParamList>;
  type ExploreNav = NativeStackNavigationProp<ExploreStackParamList>;
  type CrossNavigationProp = CompositeNavigationProp<SettingsNav, ExploreNav>;

  const { colors, elevation } = useTheme();
  const navigation = useNavigation<CrossNavigationProp>();

  // Hidden while monetization is dormant (no in-app billing wired yet).
  if (!PAYMENTS_ENABLED) return null;

  const copy = {
    badge: "EXCLUSIVE OFFER",
    title: "Go Premium.",
    subtitle:
      "Unlock your potential with clinical-grade tools and ultimate freedom.",
    cta: "Explore Premium",
  };

  const benefits: { text: string; icon: IconName }[] = [
    { text: "No Daily Caps", icon: icons.unlimited },
    { text: "AI Calls", icon: icons.ai },
    { text: "Personal Roadmap", icon: icons.roadmap },
  ];

  return (
    <LinearGradient
      onLayout={(event) => onLayoutCapture?.(event)}
      colors={gradients.premiumSlate.colors}
      start={gradients.premiumSlate.start}
      end={gradients.premiumSlate.end}
      style={[styles.container, { borderColor: colors.border.default }, elevation.e3]}
    >
      {/* Decorative Orbs */}
      <View
        style={[
          styles.glowOrb,
          { top: -40, right: -40, backgroundColor: colors.premium.orbCyan, opacity: 0.1 },
        ]}
      />
      <View
        style={[
          styles.glowOrb,
          { bottom: -30, left: -30, backgroundColor: colors.premium.orbPurple, opacity: 0.08 },
        ]}
      />

      {/* Badge */}
      <View
        style={[
          styles.badgeContainer,
          { backgroundColor: colors.premium.goldTint, borderColor: colors.premium.goldBorder },
        ]}
      >
        <Icon name={icons.pro} size={12} color={colors.premium.gold} />
        <Text variant="label" color={colors.premium.gold}>
          {copy.badge}
        </Text>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Text variant="h2" color={colors.text.primary}>
          {copy.title}
        </Text>
        <Text variant="bodySm" color={colors.text.secondary}>
          {copy.subtitle}
        </Text>
      </View>

      {/* Benefits Grid */}
      <View style={styles.benefitsGrid}>
        {benefits.map((benefit, index) => (
          <View
            key={index}
            style={[
              styles.benefitItem,
              { backgroundColor: colors.border.hairline, borderColor: colors.border.hairline },
            ]}
          >
            <Icon name={benefit.icon} size={14} color={colors.text.primary} style={styles.benefitIcon} />
            <Text variant="caption" color={colors.text.primary}>
              {benefit.text}
            </Text>
          </View>
        ))}
      </View>

      {/* CTA Button */}
      <TouchableOpacity
        style={[styles.ctaButton, elevation.e2]}
        activeOpacity={0.9}
        onPress={() => navigation.navigate("PremiumModal" as any)}
      >
        <LinearGradient
          colors={gradients.premiumGold.colors}
          start={gradients.premiumGold.start}
          end={gradients.premiumGold.end}
          style={styles.ctaGradient}
        >
          <Text variant="title" color={colors.text.primary}>
            {copy.cta}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </LinearGradient>
  );
};

export default React.memo(BuyPro);

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.card,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing["3xl"],
    paddingBottom: spacing["2xl"],
    position: "relative",
    overflow: "hidden",
    gap: spacing.xl,
    borderWidth: borderWidth.thin,
  },
  glowOrb: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: radius.full,
  },
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    gap: spacing.xs,
    borderWidth: borderWidth.thin,
  },
  header: {
    gap: spacing.sm,
  },
  benefitsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: borderWidth.thin,
  },
  benefitIcon: {
    opacity: 0.9,
  },
  ctaButton: {
    marginTop: spacing.md,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  ctaGradient: {
    paddingVertical: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
});
