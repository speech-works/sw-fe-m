import React from "react";
import { Alert, StyleSheet, TouchableOpacity, View } from "react-native";
import PressableScale from "../../../../../components/PressableScale";
import { EVENT_NAMES } from "../../../../../stores/events/constants";
import { useEventStore } from "../../../../../stores/events";
import {
  IconName,
  Text,
  Icon,
  icons,
  useTheme,
  spacing,
  radius,
  size,
} from "../../../../../design-system";
import { SemanticColors } from "../../../../../design-system";

interface TechniqueCardProps {
  title: string;
  description: string;
  level: string; // "Foundation", "Build", "Deep Practice"
  hasFree: boolean;
  disabled?: boolean;
  onPressStart: () => void;
  isPaidUser?: boolean;
  variant?: "standard" | "hero";
}

/** Vivid accent role per difficulty — keeps each card distinct on the dark canvas
 *  (the PracticeGrid solid-accent recipe). */
type TechniqueAccent = keyof SemanticColors["accent"];

const getAccent = (level: string): TechniqueAccent => {
  switch (level) {
    case "Foundation":
      return "success"; // green — growth / start
    case "Build":
      return "danger"; // orange/rose — energy / building (matches "Stories")
    case "Deep Practice":
      return "purple"; // violet — deep / advanced (matches "Poems")
    default:
      return "info"; // blue — neutral fallback
  }
};

const TechniqueCard = ({
  title,
  description,
  level,
  hasFree,
  disabled,
  onPressStart,
  isPaidUser,
}: TechniqueCardProps) => {
  const { colors } = useTheme();
  const { emit } = useEventStore();
  const isLocked = !hasFree && !isPaidUser;

  const accent = getAccent(level);
  const fill = colors.accent[accent];
  const on = colors.accentOn[accent];

  const handlePress = () => {
    if (isLocked) {
      emit(EVENT_NAMES.SHOW_LIBRARY_UPSELL);
    } else {
      onPressStart();
    }
  };

  // --- Icon Mapping (registry-safe Fluent glyphs) ---
  const getIcon = (name: string): IconName => {
    const lower = name.toLowerCase();
    if (lower.includes("identification")) return "eye";
    if (lower.includes("onset")) return "wind"; // easy onsets
    if (lower.includes("continuous")) return "trending-up";
    if (lower.includes("rate")) return "clock";

    // Fallbacks by level
    if (level === "Foundation") return "sprout";
    if (level === "Build") return "layers";
    if (level === "Deep Practice") return "target";
    return "star";
  };

  const iconName = getIcon(title);

  const showSafetyInfo = () => {
    Alert.alert(
      "Deep Practice",
      "Optional, more advanced. Use gently. Stop if uncomfortable.",
      [{ text: "Got it" }],
    );
  };

  return (
    <PressableScale
      onPress={handlePress}
      disabled={disabled}
      scaleTo={0.98}
      style={styles.wrapper}
    >
      {/* Solid vivid accent fill + dark on-text — the PracticeGrid card recipe. */}
      <View
        style={[
          styles.container,
          { backgroundColor: fill },
          disabled && styles.disabledContainer,
        ]}
      >
        {/* Content row: bare on-text + a bare icon (no disc) per the bright-fill rule. */}
        <View style={styles.topRow}>
          <View style={styles.copy}>
            {hasFree && (
              <View style={[styles.freeBadge, { backgroundColor: colors.surface.default }]}>
                <Text variant="label" color="primary" style={styles.freeText}>
                  FREE
                </Text>
              </View>
            )}
            <Text variant="h3" color={on} numberOfLines={2} style={styles.title}>
              {title}
            </Text>
            <Text variant="bodySm" color={on} numberOfLines={2} style={styles.description}>
              {description.replace(/\n/g, " ").trim()}
            </Text>
          </View>

          <View style={styles.iconContainer} pointerEvents="none">
            <Icon name={isLocked ? "lock" : iconName} size={size.icon} color={on} />
          </View>
        </View>

        {/* Bottom row: level marker (bare) + an enclosed Start chip (surface island). */}
        <View style={styles.bottomRow}>
          <View style={styles.levelBadge}>
            <Text variant="label" color={on}>
              {level}
            </Text>
            {level === "Deep Practice" && (
              <TouchableOpacity onPress={showSafetyInfo} hitSlop={8}>
                <Icon name="info" size={12} color={on} style={styles.levelInfo} />
              </TouchableOpacity>
            )}
          </View>

          <View style={[styles.startChip, { backgroundColor: colors.surface.default }]}>
            <Icon name={icons.play} size={12} color={colors.text.primary} />
            <Text variant="label" color="primary">
              Start
            </Text>
          </View>
        </View>
      </View>
    </PressableScale>
  );
};

export default TechniqueCard;

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: radius.card,
  },
  container: {
    borderRadius: radius.card,
    padding: spacing.xl,
    minHeight: 150,
    overflow: "hidden",
    justifyContent: "space-between",
    gap: spacing.lg,
  },
  disabledContainer: {
    opacity: 0.7,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  copy: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  title: {
    marginBottom: spacing.xs,
  },
  description: {
    opacity: 0.9,
  },
  iconContainer: {
    justifyContent: "center",
    alignItems: "center",
    width: 44,
    height: 44,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  levelBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  levelInfo: {
    marginLeft: spacing.xs,
    opacity: 0.8,
  },
  freeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    alignSelf: "flex-start",
    marginBottom: spacing.sm,
  },
  freeText: {
    fontSize: 10,
  },
  startChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.chip,
  },
});
