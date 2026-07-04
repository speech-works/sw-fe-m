import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import PressableScale from "../../../components/PressableScale";
import {
  Text,
  Icon,
  icons,
  useTheme,
  withAlpha,
  spacing,
  space,
  radius,
} from "../../../design-system";

export type PromoVariant = "onboarding" | "impactAssessment" | "mood";

/** Keys of `colors.accent`/`accentOn` — a solid vivid fill + its AA-correct dark ink. */
type AccentKey = "success" | "warning" | "purple";

interface VariantConfig {
  accentKey: AccentKey;
  title: string;
  subtitle: string;
  cta: string;
}

const VARIANTS: Record<PromoVariant, VariantConfig> = {
  onboarding: {
    accentKey: "success",
    title: "Complete Profile",
    subtitle: "Finish setting up to get your personalized plan",
    cta: "Continue Setup",
  },
  impactAssessment: {
    accentKey: "warning",
    title: "Unlock Your Profile",
    subtitle: "", // always overridden with the live question count
    cta: "Continue Assessment",
  },
  mood: {
    accentKey: "purple",
    title: "How are you feeling?",
    subtitle: "Track your mood to unlock insights",
    cta: "Check In",
  },
};

export interface PromoCardProps {
  variant: PromoVariant;
  onPress: () => void;
  /** Overrides the variant's default subtitle (e.g. Impact's live question count). */
  subtitle?: string;
  /** Optional progress row (onboarding / impact). */
  progress?: { leftLabel: string; percentage: number };
  style?: StyleProp<ViewStyle>;
}

/**
 * The single Home promo/nudge card — a flat, solid vivid-accent banner matching the
 * Explore card language (`PracticeGrid` / `LibrarySection`): a `colors.accent` fill,
 * AA-correct `accentOn` ink, an `h2` title, subtle ink-circle texture,
 * and a dark-island CTA. No illustrations — sleek and content-first. The whole card is
 * the tap target; the CTA pill is a visual affordance.
 */
export const PromoCard: React.FC<PromoCardProps> = ({
  variant,
  onPress,
  subtitle,
  progress,
  style,
}) => {
  const { colors } = useTheme();
  const v = VARIANTS[variant];
  const fill = colors.accent[v.accentKey];
  const ink = colors.accentOn[v.accentKey];

  return (
    <PressableScale
      scaleTo={0.98}
      onPress={onPress}
      style={[styles.shadow, { shadowColor: colors.shadow }, style]}
    >
      <View style={[styles.fill, { backgroundColor: fill }]}>
        {/* Subtle ink-circle texture (the Explore banner pattern) — depth without art. */}
        <View
          style={[styles.blobA, { backgroundColor: withAlpha(ink, 0.1) }]}
          pointerEvents="none"
        />
        <View
          style={[styles.blobB, { backgroundColor: withAlpha(ink, 0.1) }]}
          pointerEvents="none"
        />

        {/* Message */}
        <View>
          <Text variant="h2" color={ink} style={styles.title}>
            {v.title}
          </Text>
          <Text variant="body" color={ink}>
            {subtitle ?? v.subtitle}
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {progress ? (
            <View style={styles.progress}>
              <View style={styles.progressLabels}>
                <Text variant="bodySm" color={ink}>
                  {progress.leftLabel}
                </Text>
                <Text variant="bodySm" color={ink}>
                  {Math.round(progress.percentage)}%
                </Text>
              </View>
              <View style={[styles.track, { backgroundColor: withAlpha(ink, 0.28) }]}>
                <View
                  style={[
                    styles.fillBar,
                    { backgroundColor: ink, width: `${progress.percentage}%` },
                  ]}
                />
              </View>
            </View>
          ) : null}

          {/* Primary action = a solid dark island on the bright fill. */}
          <View style={[styles.cta, { backgroundColor: colors.action.secondary }]}>
            <Icon name={icons.play} size={14} color={colors.action.onSecondary} />
            <Text variant="title" color={colors.action.onSecondary}>
              {v.cta}
            </Text>
          </View>
        </View>
      </View>
    </PressableScale>
  );
};

export default PromoCard;

const styles = StyleSheet.create({
  shadow: {
    borderRadius: radius.card,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  fill: {
    height: 260,
    borderRadius: radius.card,
    overflow: "hidden",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing["3xl"],
    paddingBottom: spacing["2xl"],
    justifyContent: "space-between",
  },
  blobA: {
    position: "absolute",
    top: -40,
    right: -30,
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  blobB: {
    position: "absolute",
    bottom: -20,
    right: 40,
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  title: {
    marginBottom: space.titleSub,
  },
  actions: {
    gap: space.groupGap,
  },
  progress: {
    gap: space.inlineGap,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  track: {
    height: 6,
    borderRadius: radius.xs,
    overflow: "hidden",
  },
  fillBar: {
    height: "100%",
    borderRadius: radius.xs,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: space.inlineGap,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
});
