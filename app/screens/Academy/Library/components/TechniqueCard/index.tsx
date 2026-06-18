import { LinearGradient } from "expo-linear-gradient";
import React, { useRef } from "react";
import {
  Alert,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { theme } from "../../../../../Theme/tokens";

import Icon from "react-native-vector-icons/FontAwesome5";
import { parseTextStyle } from "../../../../../util/functions/parseStyles";
import { useEventStore } from "../../../../../stores/events";
import { EVENT_NAMES } from "../../../../../stores/events/constants";

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

const TechniqueCard = ({
  title,
  description,
  level,
  hasFree,
  disabled,
  onPressStart,
  isPaidUser,
}: TechniqueCardProps) => {
  const { emit } = useEventStore();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const isLocked = !hasFree && !isPaidUser;

  const handlePress = () => {
    if (isLocked) {
      emit(EVENT_NAMES.SHOW_LIBRARY_UPSELL);
    } else {
      onPressStart();
    }
  };

  // --- Theme Logic ---
  const getTheme = (lvl: string) => {
    switch (lvl) {
      case "Foundation":
        return {
          colors: ["#34D399", "#059669"] as const, // Emerald (Growth/Start)
          shadow: theme.shadow.elevation1,
        };
      case "Build":
        // Orange to Rose (Energy/Building) - Matches 'Stories' from ReadingPractice
        return {
          colors: [theme.colors.library.orange[400], "#F43F5E"] as const,
          shadow: theme.shadow.elevation1,
        };
      case "Deep Practice":
        // Violet/Purple (Deep/Advanced) - Matches 'Poems'
        return {
          colors: ["#A78BFA", "#7C3AED"] as const,
          shadow: theme.shadow.elevation1,
        };
      default:
        return {
          colors: ["#94A3B8", "#64748B"] as const, // Slate
          shadow: theme.shadow.elevation1,
        };
    }
  };

  const cardTheme = getTheme(level);

  // --- Icon Mapping ---
  const getIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes("identification")) return "search";
    if (lower.includes("cancellation")) return "undo";
    if (lower.includes("pull-out")) return "sign-out-alt";
    if (lower.includes("prep")) return "layer-group"; // Prep sets
    if (lower.includes("onset")) return "feather"; // Easy onsets
    if (lower.includes("contact")) return "hand-paper"; // Light contacts
    if (lower.includes("pausing")) return "pause-circle";
    if (lower.includes("continuous")) return "wave-square";
    if (lower.includes("rate")) return "tachometer-alt";

    // Fallbacks by level
    if (level === "Foundation") return "seedling";
    if (level === "Build") return "hammer";
    if (level === "Deep Practice") return "brain";
    return "star";
  };

  const iconName = getIcon(title);

  // --- Animations ---
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const showSafetyInfo = () => {
    Alert.alert(
      "Deep Practice",
      "Optional, more advanced. Use gently. Stop if uncomfortable.",
      [{ text: "Got it" }],
    );
  };

  return (
    <Animated.View
      style={[styles.wrapper, { transform: [{ scale: scaleAnim }] }]}
    >
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        disabled={disabled}
      >
        <LinearGradient
          colors={cardTheme.colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.container, disabled && styles.disabledContainer]}
        >
          {/* Decorative Bubbles (From ReadingPractice style) */}
          <View
            style={[
              styles.bubble,
              { top: -20, right: -20, width: 80, height: 80 },
            ]}
          />
          <View
            style={[
              styles.bubble,
              { bottom: 10, left: 10, width: 40, height: 40, opacity: 0.1 },
            ]}
          />

          {/* Content Content */}
          <View style={styles.topRow}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              {/* Free Badge */}
              {hasFree && (
                <View style={styles.freeBadge}>
                  <Text style={styles.freeText}>FREE</Text>
                </View>
              )}
              <Text style={styles.title} numberOfLines={2}>
                {title}
              </Text>
              <Text style={styles.description} numberOfLines={2}>
                {description.replace(/\n/g, " ").trim()}
              </Text>
            </View>

            {/* Icon Top Right */}
            <View style={styles.iconContainer}>
              {isLocked ? (
                <View style={styles.lockBadge}>
                  <Icon name="lock" size={14} color="rgba(255,255,255,0.8)" />
                </View>
              ) : (
                <Icon name={iconName} size={20} color="rgba(255,255,255,0.9)" />
              )}
            </View>
          </View>

          {/* Bottom Row / CTA */}
          <View style={styles.bottomRow}>
            <View style={styles.badgesGroup}>
              {/* Level Badge */}
              <View style={styles.levelBadge}>
                <Text style={styles.levelText}>{level}</Text>
                {level === "Deep Practice" && (
                  <TouchableOpacity onPress={showSafetyInfo} hitSlop={8}>
                    <Icon
                      name="info-circle"
                      size={10}
                      color="#FFF"
                      style={{ marginLeft: 4, opacity: 0.8 }}
                    />
                  </TouchableOpacity>
                )}
              </View>

              {/* Free Badge */}
            </View>

            {/* Start Button */}
            <View style={styles.startPill}>
              <Icon
                name="play"
                size={10}
                color={cardTheme.colors[1]}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.startText, { color: cardTheme.colors[1] }]}>
                Start
              </Text>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default TechniqueCard;

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, // slightly more pop for colored cards
    shadowRadius: 12,
    elevation: 4,
  },
  container: {
    borderRadius: 24,
    padding: 24,
    minHeight: 150, // Ensure substantial touch area
    position: "relative",
    overflow: "hidden",
    justifyContent: "space-between",
  },
  disabledContainer: {
    opacity: 0.7,
  },
  bubble: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  title: {
    ...parseTextStyle(theme.typography.Heading3),
    color: "#FFFFFF",
    fontSize: 22,
    marginBottom: 6,
    textShadowColor: "rgba(0,0,0,0.1)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  description: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },
  iconContainer: {
    justifyContent: "center",
    alignItems: "center",
    width: 44,
    height: 44,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 14,
    transform: [{ rotate: "5deg" }],
  },
  lockBadge: {
    // Just a wrapper for the lock icon
  },

  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badgesGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  levelBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  levelText: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 11,
    letterSpacing: 0.5,
  },
  freeBadge: {
    backgroundColor: "#FEF3C7", // Pale yellow often implies premium/free/special
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  freeText: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: "#B45309", // Dark amber
    fontWeight: "800",
    fontSize: 10,
    letterSpacing: 0.5,
  },
  startPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  startText: {
    ...parseTextStyle(theme.typography.BodyDetails),
    fontWeight: "700",
    fontSize: 12,
    textTransform: "uppercase",
  },
});
