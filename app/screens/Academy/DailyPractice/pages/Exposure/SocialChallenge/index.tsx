import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import CustomScrollView, {
    SHADOW_BUFFER,
} from "../../../../../../components/CustomScrollView";
import ScreenView from "../../../../../../components/ScreenView";
import {
    SCEDPStackNavigationProp,
    SCEDPStackParamList,
} from "../../../../../../navigators/stacks/AcademyStack/DailyPracticeStack/ExposureStack/SocialChallengeStack/types";
import { theme } from "../../../../../../Theme/tokens";
import {
    parseShadowStyle,
    parseTextStyle,
} from "../../../../../../util/functions/parseStyles";

import { getExposurePracticeByType } from "../../../../../../api/dailyPractice";
import {
    ExposurePractice,
    ExposurePracticeType,
} from "../../../../../../api/dailyPractice/types";

const SocialChallenge = () => {
  const [socialChallengesList, setSocialChallengesList] = useState<
    ExposurePractice[]
  >([]);

  // Calm/Cool Palette - Blue/Teal/Indigo
  const SC_THEMES = [
    { bg: ["#EFF6FF", "#DBEAFE"], text: "#1E3A8A", icon: "#2563EB" }, // Blue
    { bg: ["#ECFEFF", "#CFFAFE"], text: "#0E7490", icon: "#06B6D4" }, // Cyan
    { bg: ["#EEF2FF", "#E0E7FF"], text: "#3730A3", icon: "#6366F1" }, // Indigo
    { bg: ["#F0F9FF", "#E0F2FE"], text: "#0369A1", icon: "#0EA5E9" }, // Sky
    { bg: ["#FAFAFA", "#F5F5F5"], text: "#404040", icon: "#737373" }, // Neutral
  ];

  // Pseudo-random bubble variations
  const BUBBLE_POSITIONS = [
    [
      { top: -20, right: -20, width: 90, height: 90 },
      { bottom: -10, left: 10, width: 40, height: 40 },
    ],
    [
      { bottom: -30, right: -10, width: 100, height: 100 },
      { top: 10, left: -20, width: 50, height: 50 },
    ],
    [
      { top: -40, left: -20, width: 110, height: 110 },
      { bottom: 20, right: -10, width: 30, height: 30 },
    ],
    [
      { top: 10, right: -50, width: 120, height: 120 },
      { bottom: -20, left: -20, width: 60, height: 60 },
    ],
    [
      { bottom: -40, left: 40, width: 80, height: 80 },
      { top: -20, right: 10, width: 40, height: 40 },
    ],
  ];

  useEffect(() => {
    const fetchSCDetails = async () => {
      const socialChallenges = await getExposurePracticeByType(
        ExposurePracticeType.SOCIAL_CHALLENGE_SIMULATION
      );
      setSocialChallengesList(socialChallenges);
    };
    fetchSCDetails();
  }, []);

  const navigation =
    useNavigation<SCEDPStackNavigationProp<keyof SCEDPStackParamList>>();

  return (
    <ScreenView style={styles.screenView}>
      <View style={StyleSheet.absoluteFillObject}>
        <LinearGradient
          colors={["#FFF7ED", "#FFF7ED", "#FFFFFF"] as const}
          locations={[0, 0.6, 1]} // Extended orange tint to 60%
          style={{ flex: 1 }}
        />
      </View>

      <View style={styles.container}>
        <View style={styles.topNavigationContainer}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Icon
              name="chevron-left"
              size={16}
              color={theme.colors.text.title}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Social Challenges</Text>
          <View style={{ width: 32 }} />
        </View>

        <CustomScrollView contentContainerStyle={styles.scrollContent}>
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.heroIconContainer}>
              <LinearGradient
                colors={["#60A5FA", "#2563EB"]} // Blue Gradient
                style={StyleSheet.absoluteFill}
              />
              <Icon name="users" size={32} color="#FFF" />
            </View>
            <View style={styles.heroTextContainer}>
              <Text style={styles.heroTitle}>Conquer Anxiety</Text>
              <Text style={styles.heroSubtitle}>
                Navigate tricky social situations with poise.
              </Text>
            </View>
          </View>

          {/* Grid Layout */}
          <View style={styles.rpGrid}>
            {socialChallengesList.map((sc, i) => {
              const theme = SC_THEMES[i % SC_THEMES.length];
              const bubbleConfig =
                BUBBLE_POSITIONS[i % BUBBLE_POSITIONS.length];

              return (
                <TouchableOpacity
                  key={sc.id}
                  style={styles.gridItemWrapper}
                  activeOpacity={0.9}
                  onPress={() => {
                    navigation.navigate("SCBriefing", {
                      sc,
                    });
                  }}
                >
                  <LinearGradient
                    colors={theme.bg as any}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.rpCardGradient}
                  >
                    {/* Organic Random Bubbles */}
                    <View
                      style={[
                        styles.bubble,
                        bubbleConfig[0],
                        { backgroundColor: theme.icon, opacity: 0.08 },
                      ]}
                    />
                    <View
                      style={[
                        styles.bubble,
                        bubbleConfig[1],
                        { backgroundColor: theme.icon, opacity: 0.05 },
                      ]}
                    />

                    {/* Watermark Number */}
                    <View style={styles.watermarkContainer}>
                      <Text
                        style={[styles.watermarkText, { color: theme.icon }]}
                      >
                        {(i + 1).toString().padStart(2, "0")}
                      </Text>
                    </View>

                    <View style={styles.textContainer}>
                      <Text style={[styles.titleText, { color: theme.text }]}>
                        {sc.name}
                      </Text>
                      <Text
                        style={[
                          styles.descText,
                          { color: theme.text, opacity: 0.8 },
                        ]}
                        numberOfLines={2}
                      >
                        {sc.description}
                      </Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </View>
        </CustomScrollView>
      </View>
    </ScreenView>
  );
};

export default SocialChallenge;

const styles = StyleSheet.create({
  screenView: {
    paddingBottom: 0,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    gap: 32,
    flexGrow: 1,
    padding: SHADOW_BUFFER,
    paddingBottom: 120, // Scroll clearance
  },
  topNavigationContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.6)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  headerTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
    fontWeight: "600",
  },
  heroSection: {
    alignItems: "center",
    gap: 24,
    marginTop: 10,
  },
  heroIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    backgroundColor: "#3B82F6",
    ...parseShadowStyle(theme.shadow.elevation1),
    borderWidth: 2,
    borderColor: "#FFF",
  },
  heroTextContainer: {
    alignItems: "center",
    gap: 8,
  },
  heroTitle: {
    ...parseTextStyle(theme.typography.Heading2),
    fontSize: 28,
    color: theme.colors.text.title,
    textAlign: "center",
    fontWeight: "800",
  },
  heroSubtitle: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    textAlign: "center",
  },

  // Grid Styles
  rpGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 24,
  },
  gridItemWrapper: {
    width: "100%",
    marginBottom: 16,
    ...parseShadowStyle(theme.shadow.elevation1),
    borderRadius: 24,
  },
  rpCardGradient: {
    minHeight: 160,
    borderRadius: 24,
    padding: 24,
    paddingHorizontal: 28,
    justifyContent: "center",
    gap: 16,
    position: "relative",
    overflow: "hidden",
  },
  bubble: {
    position: "absolute",
    borderRadius: 999,
    zIndex: 0,
  },
  watermarkContainer: {
    position: "absolute",
    right: -10,
    bottom: -20,
    zIndex: 0,
    opacity: 0.1,
  },
  watermarkText: {
    fontSize: 96,
    fontWeight: "900",
    includeFontPadding: false,
    letterSpacing: -4,
  },
  textContainer: {
    gap: 8,
    alignItems: "flex-start",
    zIndex: 1,
    maxWidth: "85%",
  },
  titleText: {
    ...parseTextStyle(theme.typography.Heading3),
    fontSize: 20,
    fontWeight: "800",
    textAlign: "left",
  },
  descText: {
    ...parseTextStyle(theme.typography.BodySmall),
    fontSize: 13,
    textAlign: "left",
    lineHeight: 18,
  },
});
