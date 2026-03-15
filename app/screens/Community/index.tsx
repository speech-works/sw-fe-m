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
  withTiming,
} from "react-native-reanimated";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import CustomScrollView from "../../components/CustomScrollView";
import ScreenView from "../../components/ScreenView";
import { parseTextStyle } from "../../util/functions/parseStyles";
import { theme } from "../../Theme/tokens";

const { width } = Dimensions.get("window");

// Mock Data for the Current Tier
const CURRENT_TIER = {
  name: "The First 100 Pioneers",
  totalSpots: 100,
  filledSpots: 64,
  perks: [
    "Direct voice access to the founding team",
    "Lifetime 'Pioneer' status & badge",
    "Priority access to new AI models",
  ],
};

const Community = () => {
  // Animation value for the progress bar
  const progressWidth = useSharedValue(0);

  useEffect(() => {
    // Animate the progress bar on mount
    progressWidth.value = withTiming(
      (CURRENT_TIER.filledSpots / CURRENT_TIER.totalSpots) * 100,
      { duration: 1500 },
    );
  }, []);

  const animatedProgressStyle = useAnimatedStyle(() => {
    return {
      width: `${progressWidth.value}%`,
    };
  });

  // State for button to show interaction
  const [hasRequested, setHasRequested] = useState(false);

  return (
    <ScreenView style={styles.screenView}>
      <CustomScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* Top Subtle Header */}
          <Animated.View
            entering={FadeInDown.duration(600).delay(100)}
            style={styles.topHeader}
          >
            <Text style={styles.topHeaderText}>SPEECHWORKS</Text>
            <Text style={styles.topHeaderSub}>COMMUNITY (BETA)</Text>
          </Animated.View>

          {/* Massive Editorial Hero */}
          <Animated.View
            entering={FadeInDown.duration(800).delay(200)}
            style={styles.heroSection}
          >
            <Text style={styles.heroText}>Speech is</Text>
            <Text style={styles.heroText}>a journey.</Text>
            <Text style={[styles.heroText, styles.heroTextItalic]}>
              Not a destination.
            </Text>
          </Animated.View>

          {/* The Mission Statement */}
          <Animated.View
            entering={FadeInDown.duration(800).delay(300)}
            style={styles.missionSection}
          >
            <Text style={styles.missionText}>
              We are building a private sanctuary for those committed to
              mastering their voice. No noise, no judgment. Just authentic
              growth alongside driven peers.
            </Text>
          </Animated.View>

          {/* The Tier Tracker */}
          <Animated.View
            entering={FadeInDown.duration(800).delay(400)}
            style={styles.trackerSection}
          >
            <View style={styles.trackerHeader}>
              <Text style={styles.tierName}>{CURRENT_TIER.name}</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>INVITE ONLY</Text>
              </View>
            </View>

            <View style={styles.progressCounterContainer}>
              <Text style={styles.progressNumberMain}>
                {String(CURRENT_TIER.filledSpots).padStart(3, "0")}
              </Text>
              <Text style={styles.progressNumberTotal}>
                / {CURRENT_TIER.totalSpots}
              </Text>
            </View>

            {/* Stark Progress Bar */}
            <View style={styles.progressBarTrack}>
              <Animated.View
                style={[styles.progressBarFill, animatedProgressStyle]}
              />
            </View>
            <Text style={styles.progressCaption}>
              Spots remaining in current tier.
            </Text>
          </Animated.View>

          {/* The Perks */}
          <Animated.View
            entering={FadeInDown.duration(800).delay(500)}
            style={styles.perksSection}
          >
            <Text style={styles.perksTitle}>TIER BENEFITS</Text>
            <View style={styles.perksList}>
              {CURRENT_TIER.perks.map((perk, index) => (
                <View key={index} style={styles.perkItem}>
                  <Icon
                    name="check"
                    size={20}
                    color={theme.colors.text.title}
                  />
                  <Text style={styles.perkText}>{perk}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        </View>
      </CustomScrollView>

      {/* Fixed Footer CTA */}
      <Animated.View
        entering={FadeInUp.duration(600).delay(600)}
        style={styles.footerCTA}
      >
        <TouchableOpacity
          style={[styles.ctaButton, hasRequested && styles.ctaButtonSuccess]}
          activeOpacity={0.8}
          onPress={() => setHasRequested(true)}
        >
          <Text
            style={[
              styles.ctaButtonText,
              hasRequested && styles.ctaButtonTextSuccess,
            ]}
          >
            {hasRequested ? "REQUEST RECEIVED" : "APPLY FOR ACCESS"}
          </Text>
          {hasRequested && (
            <Icon
              name="check-circle"
              size={20}
              color={"#FFFFFF"}
              style={{ marginLeft: 8 }}
            />
          )}
        </TouchableOpacity>
        {!hasRequested && (
          <Text style={styles.ctaFooterText}>
            Review process typically takes 24 hours.
          </Text>
        )}
      </Animated.View>
    </ScreenView>
  );
};

const styles = StyleSheet.create({
  screenView: {
    backgroundColor: "#FFFFFF", // Pure white for stark contrast
  },
  scrollContent: {
    paddingBottom: 160, // Space for fixed footer
  },
  container: {
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  topHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 60,
  },
  topHeaderText: {
    ...parseTextStyle(theme.typography.LabelSmall),
    fontWeight: "800",
    letterSpacing: 2,
    color: theme.colors.text.title,
  },
  topHeaderSub: {
    ...parseTextStyle(theme.typography.LabelSmall),
    fontWeight: "600",
    color: theme.colors.text.disabled,
  },
  heroSection: {
    marginBottom: 40,
  },
  heroText: {
    fontSize: 48,
    fontWeight: "900",
    color: theme.colors.text.title,
    lineHeight: 56,
    letterSpacing: -1,
  },
  heroTextItalic: {
    fontStyle: "italic",
    color: theme.colors.text.disabled, // Subtle contrast
  },
  missionSection: {
    marginBottom: 60,
  },
  missionText: {
    ...parseTextStyle(theme.typography.BodyLarge),
    color: theme.colors.text.default,
    lineHeight: 28,
    maxWidth: "90%",
  },
  trackerSection: {
    marginBottom: 60,
    backgroundColor: theme.colors.surface.default,
    padding: 24, // Added padding since it's now wrapped in a surface
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
  },
  trackerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  tierName: {
    ...parseTextStyle(theme.typography.Heading4),
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#111215", // Stark black badge
    borderRadius: 4,
  },
  statusText: {
    ...parseTextStyle(theme.typography.LabelSmall),
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  progressCounterContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 16,
  },
  progressNumberMain: {
    fontSize: 56,
    fontWeight: "900",
    color: theme.colors.text.title,
    fontVariant: ["tabular-nums"], // Keeps characters aligned
    letterSpacing: -2,
  },
  progressNumberTotal: {
    fontSize: 24,
    fontWeight: "600",
    color: theme.colors.text.disabled,
    marginLeft: 4,
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: theme.colors.border.default,
    width: "100%",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 12,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#111215", // Stark black fill
    borderRadius: 2,
  },
  progressCaption: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.disabled,
  },
  perksSection: {
    marginBottom: 40,
  },
  perksTitle: {
    ...parseTextStyle(theme.typography.Label),
    fontWeight: "800",
    letterSpacing: 1.5,
    color: theme.colors.text.disabled,
    marginBottom: 20,
  },
  perksList: {
    gap: 16,
  },
  perkItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  perkText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
    flex: 1,
    fontWeight: "500",
  },
  footerCTA: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    padding: 24,
    paddingBottom: 40,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.default,
  },
  ctaButton: {
    backgroundColor: "#111215", // Stark black
    paddingVertical: 20,
    borderRadius: 12, // Slightly rounded for touch friendliness
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginBottom: 12,
  },
  ctaButtonSuccess: {
    backgroundColor: theme.colors.library.green[600],
  },
  ctaButtonText: {
    color: "#FFFFFF",
    ...parseTextStyle(theme.typography.BodyLarge),
    fontWeight: "800",
    letterSpacing: 1,
  },
  ctaButtonTextSuccess: {
    color: "#FFFFFF",
  },
  ctaFooterText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.disabled,
    textAlign: "center",
  },
});

export default Community;
