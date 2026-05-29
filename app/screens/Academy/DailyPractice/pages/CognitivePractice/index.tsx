import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import GuidedBreathingFace from "../../../../../assets/sw-faces/GuidedBreathingFace";
import MeditationFace from "../../../../../assets/sw-faces/MeditationFace";
import RewiringFace from "../../../../../assets/sw-faces/RewiringFace";
import ScreenView from "../../../../../components/ScreenView";
import PracticeCategoryProgressCard from "../../components/PracticeCategoryProgressCard";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  CDPStackNavigationProp,
  CDPStackParamList,
} from "../../../../../navigators/stacks/ExploreStack/DailyPracticeStack/CognitivePracticeStack/types";
import { usePracticeCategorySummaryStore } from "../../../../../stores/practiceCategorySummary";
import { useUserStore } from "../../../../../stores/user";
import { theme } from "../../../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../util/functions/parseStyles";

const { width } = Dimensions.get("window");

const CognitivePractice = () => {
  const navigation =
    useNavigation<CDPStackNavigationProp<keyof CDPStackParamList>>();
  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = 60;
  const { user } = useUserStore();
  const { categories, fetchSummary } = usePracticeCategorySummaryStore();

  useFocusEffect(
    React.useCallback(() => {
      if (!user?.id) {
        return;
      }

      fetchSummary(user.id).catch((error) => {
        console.error("CognitivePractice summary error:", error);
      });
    }, [fetchSummary, user?.id]),
  );

  const cognitivePracticeData = [
    {
      title: "Guided Breathing",
      subtitle: "Breathing exercise",
      onPress: () => navigation.navigate("BreathingPractice"),
      icon: <GuidedBreathingFace size={80} shouldAnimate={false} />,
      colors: ["#F9A8D4", "#DB2777"] as const, // Pink/Rose
      badge: "FREE",
    },
    {
      title: "Guided Meditation",
      subtitle: "Mindfulness",
      onPress: () => navigation.navigate("MeditationPractice"),
      icon: <MeditationFace size={80} />,
      colors: ["#A78BFA", "#7C3AED"] as const, // Violet
      badge: "FREE",
    },
    {
      title: "Reframe Thoughts",
      subtitle: "Transform negative to positive",
      onPress: () => navigation.navigate("ReframePractice"),
      icon: <RewiringFace size={80} />,
      colors: ["#818CF8", "#4F46E5"] as const, // Indigo
    },
    {
      title: "Mirror Work",
      subtitle: "Body Awareness & Feedback",
      onPress: () => navigation.navigate("MirrorWorkPrep", { practiceData: {} }),
      icon: <Icon name="camera" size={50} color="#FFFFFF" style={{ opacity: 0.8 }} />,
      colors: ["#60A5FA", "#2563EB"] as const, // Blue
    },
  ];

  const summary = categories.find(
    (category) => category.contentType === "COGNITIVE_PRACTICE",
  );

  return (
    <ScreenView style={styles.screenView}>
      {/* Aurora Mesh Background */}
      <View style={StyleSheet.absoluteFillObject}>
        <LinearGradient
          colors={["#FAF5FF", "#FFF", "#FFF"] as const} // Lavender tint
          locations={[0, 0.4, 1]}
          style={{ flex: 1 }}
        />
      </View>

      <BlurView
        intensity={80}
        tint="light"
        style={[
          styles.header,
          { paddingTop: insets.top + 10, height: HEADER_HEIGHT + insets.top },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="chevron-left" size={16} color={theme.colors.text.title} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cognitive Therapy</Text>
        <View style={{ width: 32 }} />
      </BlurView>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: HEADER_HEIGHT + insets.top + 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionSubtitle}>
          Strengthen your mind and focus with daily exercises.
        </Text>

        <View style={styles.cardsContainer}>
          {cognitivePracticeData.map((item, index) => (
            <TouchableOpacity
              key={index}
              activeOpacity={0.9}
              onPress={item.onPress}
              style={styles.cardWrapper}
            >
              <LinearGradient
                colors={item.colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientCard}
              >
                {/* Decorative Bubbles */}
                <View
                  style={[
                    styles.bubble,
                    { top: -20, right: -20, width: 80, height: 80 },
                  ]}
                />
                <View
                  style={[
                    styles.bubble,
                    {
                      bottom: 10,
                      left: 10,
                      width: 40,
                      height: 40,
                      opacity: 0.1,
                    },
                  ]}
                />

                <View style={styles.cardContent}>
                  <View>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
                  </View>
                  <View style={styles.iconContainer}>
                    <View style={styles.iconWrapper}>{item.icon}</View>
                  </View>
                </View>
                <View style={styles.playButton}>
                  <Icon name="play" size={12} color={item.colors[1]} />
                  <Text style={[styles.playText, { color: item.colors[1] }]}>
                    Start
                  </Text>
                </View>
              </LinearGradient>

              {item.badge && (
                <View style={styles.cornerBadge}>
                  <Text style={styles.cornerBadgeText}>{item.badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <PracticeCategoryProgressCard
          summary={summary ?? null}
          title="Your Focus Loop"
          subtitle="This week leads the story. Lifetime work stays visible below."
          badgeLabel="Cognitive"
          accent={{
            gradient: ["#FAF5FF", "#F3E8FF"],
            iconBg: "#F5D0FE",
            iconColor: "#A21CAF",
            badgeBg: "#F3E8FF",
            badgeBorder: "#D8B4FE",
            badgeText: "#6D28D9",
          }}
        />
      </ScrollView>
    </ScreenView>
  );
};

export default CognitivePractice;

const styles = StyleSheet.create({
  screenView: {
    flex: 1,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
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
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 10,
  },
  sectionSubtitle: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    marginBottom: 24,
    marginTop: 8,
    textAlign: "center",
  },
  cardsContainer: {
    gap: 16,
    marginBottom: 32,
  },
  cardWrapper: {
    borderRadius: 24,
    ...parseShadowStyle(theme.shadow.elevation1),
    backgroundColor: "#fff",
  },
  gradientCard: {
    borderRadius: 24,
    padding: 20,
    height: 140,
    position: "relative",
    overflow: "hidden",
    justifyContent: "space-between",
  },
  bubble: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  cardContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    zIndex: 1,
  },
  cardTitle: {
    ...parseTextStyle(theme.typography.Heading2),
    color: "#FFF",
    fontSize: 24,
    marginBottom: 4,
  },
  cardSubtitle: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "rgba(255,255,255,0.9)",
    fontWeight: "500",
  },
  iconContainer: {
    position: "absolute",
    right: -20,
    bottom: -50,
    zIndex: 0,
  },
  iconWrapper: {
    transform: [{ scale: 1.2 }, { rotate: "-10deg" }],
    opacity: 0.9,
  },
  playButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: "flex-start",
    gap: 6,
    zIndex: 2,
    ...parseShadowStyle(theme.shadow.elevation1),
    marginTop: "auto",
  },
  playText: {
    ...parseTextStyle(theme.typography.BodySmall),
    fontWeight: "700",
  },
  // Stats
  statsSection: {
    gap: 16,
  },
  statsDashboard: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  dashboardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  dashboardTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
    fontSize: 20,
  },
  dashboardSubtitle: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  streakText: {
    fontSize: 12,
    fontWeight: "700",
  },
  dashboardGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8, // Reduced from 12
  },
  statIconWrapper: {
    width: 36, // Reduced from 44
    height: 36, // Reduced from 44
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statValueBig: {
    fontFamily: "Outfit-Bold",
    fontSize: 24,
    fontWeight: "700",
    color: theme.colors.text.title,
    lineHeight: 28,
  },
  statLabelSmall: {
    fontSize: 10,
    color: theme.colors.text.disabled,
    fontWeight: "500",
    flexWrap: "wrap",
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: theme.colors.library.gray[300],
    marginHorizontal: 8, // Reduced from 16
  },
  cornerBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#10B981", // Stylish green (Emerald 500)
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 10,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  cornerBadgeText: {
    color: "#FFF",
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
  },
});
