import { useNavigation } from "@react-navigation/native";
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
import AuthorFace from "../../../../../assets/sw-faces/AuthorFace";
import PoetFace from "../../../../../assets/sw-faces/PoetFace";
import StorytellerFace from "../../../../../assets/sw-faces/StorytellerFace";
import ScreenView from "../../../../../components/ScreenView";
import {
    RDPStackNavigationProp,
    RDPStackParamList,
} from "../../../../../navigators/stacks/AcademyStack/DailyPracticeStack/ReadingPracticeStack/types";
import { usePracticeStatsStore } from "../../../../../stores/practiceStats";
import { theme } from "../../../../../Theme/tokens";
import {
    parseShadowStyle,
    parseTextStyle,
} from "../../../../../util/functions/parseStyles";
import { formatDuration } from "../../../../../util/functions/time";

const { width } = Dimensions.get("window");

const ReadingPractice = () => {
  const navigation =
    useNavigation<RDPStackNavigationProp<keyof RDPStackParamList>>();

  const { practiceStats } = usePracticeStatsStore();

  const readingPracticeData = [
    {
      title: "Stories",
      subtitle: "Short stories & tales",
      onPress: () => navigation.navigate("StoryPractice"),
      icon: <StorytellerFace size={80} />,
      colors: [theme.colors.library.orange[400], "#F43F5E"] as const, // Orange to Rose
      accentColor: "#FFF",
      iconStyle: { right: -10, bottom: -10 },
    },
    {
      title: "Poems",
      subtitle: "Verses & rhymes",
      onPress: () => navigation.navigate("PoemPractice"),
      icon: <PoetFace size={80} />,
      colors: ["#A78BFA", "#7C3AED"] as const, // Violet
      accentColor: "#FFF",
      iconStyle: { right: -5, bottom: -10 },
    },
    {
      title: "Quotes",
      subtitle: "Inspirational quotes",
      onPress: () => navigation.navigate("QuotePractice"),
      icon: <AuthorFace size={80} />,
      colors: ["#34D399", "#059669"] as const, // Emerald
      accentColor: "#FFF",
      iconStyle: { right: -10, bottom: -10 },
    },
  ];

  const stats = practiceStats.find(
    (stat) => stat.contentType === "READING_PRACTICE"
  );

  return (
    <ScreenView style={styles.screenView}>
      {/* Aurora Mesh Background */}
      <View style={StyleSheet.absoluteFillObject}>
        <LinearGradient
          colors={["#FFF7ED", "#FFF", "#FFF"] as const}
          locations={[0, 0.4, 1]}
          style={{ flex: 1 }}
        />
      </View>

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="chevron-left" size={16} color={theme.colors.text.title} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reading Practice</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionSubtitle}>
          Choose your favorite way to read and practice speech.
        </Text>

        <View style={styles.cardsContainer}>
          {readingPracticeData.map((item, index) => (
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
            </TouchableOpacity>
          ))}
        </View>

        {/* Activity Stats Dashboard */}
        <View style={styles.statsSection}>
          <LinearGradient
            colors={["#F8FAFC", "#F1F5F9"] as const}
            style={styles.statsDashboard}
          >
            <View style={styles.dashboardHeader}>
              <View>
                <Text style={styles.dashboardTitle}>Your Progress</Text>
                <Text style={styles.dashboardSubtitle}>
                  Keep up the momentum!
                </Text>
              </View>
              <View style={styles.streakBadge}>
                <Icon name="fire" size={14} color="#F59E0B" />
                <Text style={styles.streakText}>Active</Text>
              </View>
            </View>

            <View style={styles.dashboardGrid}>
              {/* Completed Count */}
              <View style={styles.statItem}>
                <View
                  style={[
                    styles.statIconWrapper,
                    { backgroundColor: "#DBEAFE" },
                  ]}
                >
                  <Icon
                    name="check-double"
                    size={18}
                    color={theme.colors.library.blue[600]}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.statValueBig}>
                    {stats?.itemsCompleted || 0}
                  </Text>
                  <Text
                    style={styles.statLabelSmall}
                    adjustsFontSizeToFit
                    numberOfLines={2}
                  >
                    readings completed
                  </Text>
                </View>
              </View>

              {/* Divider */}
              <View style={styles.statDivider} />

              {/* Time Spent */}
              <View style={styles.statItem}>
                <View
                  style={[
                    styles.statIconWrapper,
                    { backgroundColor: "#DCFCE7" },
                  ]}
                >
                  <Icon
                    name="hourglass-half"
                    size={18}
                    color={theme.colors.library.green[600]}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  {/* Handle duration formatting gracefully if 0 */}
                  <Text style={styles.statValueBig}>
                    {stats?.totalTime
                      ? formatDuration(stats.totalTime).split(" ")[0]
                      : "0m"}
                  </Text>
                  <Text
                    style={styles.statLabelSmall}
                    adjustsFontSizeToFit
                    numberOfLines={2}
                  >
                    practice time
                  </Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>
      </ScrollView>
    </ScreenView>
  );
};

export default ReadingPractice;

const styles = StyleSheet.create({
  screenView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
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
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120, // Increased to clear bottom nav
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
    backgroundColor: "#fff", // Fallback
  },
  gradientCard: {
    borderRadius: 24,
    padding: 20,
    height: 140, // Fixed height for consistency
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
    // To allow transforming checks if needed
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
    marginTop: "auto", // Push to bottom
  },
  playText: {
    ...parseTextStyle(theme.typography.BodySmall),
    fontWeight: "700",
  },

  // Stats Dashboard
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
    backgroundColor: "#FEF3C7", // Light Amber
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FCD34D",
  },
  streakText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#B45309",
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
    fontSize: 24, // Kept large for impact
    fontWeight: "700",
    color: theme.colors.text.title,
    lineHeight: 28,
  },
  statLabelSmall: {
    fontSize: 10,
    color: theme.colors.text.disabled,
    fontWeight: "500",
    // Removed uppercase to save space
    flexWrap: "wrap",
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: theme.colors.library.gray[300],
    marginHorizontal: 8, // Reduced from 16
  },
});
