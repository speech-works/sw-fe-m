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
import InterviewFace from "../../../../../assets/sw-faces/InterviewFace";
import RoboticPhoneFace from "../../../../../assets/sw-faces/RoboticPhoneFace";
import WiseFace from "../../../../../assets/sw-faces/WiseFace";
import ScreenView from "../../../../../components/ScreenView";
import {
    EDPStackNavigationProp,
    EDPStackParamList,
} from "../../../../../navigators/stacks/AcademyStack/DailyPracticeStack/ExposureStack/types";
import { usePracticeStatsStore } from "../../../../../stores/practiceStats";
import { theme } from "../../../../../Theme/tokens";
import {
    parseShadowStyle,
    parseTextStyle,
} from "../../../../../util/functions/parseStyles";
import { formatDuration } from "../../../../../util/functions/time";

const { width } = Dimensions.get("window");

const Exposure = () => {
  const navigation =
    useNavigation<EDPStackNavigationProp<keyof EDPStackParamList>>();

  const { practiceStats } = usePracticeStatsStore();

  const exposureData = [
    {
      title: "Social Challenges",
      subtitle: "Practice uneasy conversations",
      onPress: () => navigation.navigate("SocialChallengeStack"),
      icon: <WiseFace size={80} />,
      colors: ["#FBBF24", "#D97706"] as const, // Amber
      disabled: false,
    },
    {
      title: "Interview Simulation",
      subtitle: "AI-powered practice",
      onPress: () => navigation.navigate("InterviewSimulationStack"),
      icon: <InterviewFace size={80} />,
      colors: ["#FB7185", "#E11D48"] as const, // Rose/Red
      disabled: false,
    },
    {
      title: "AI Phone Calls",
      subtitle: "Speak freely, without hesitation",
      onPress: () => navigation.navigate("PhoneCallScreen" as any),
      icon: <RoboticPhoneFace size={80} />,
      colors: ["#F472B6", "#DB2777"] as const, // Pink
      disabled: false,
    },
    {
      title: "Secondary Behaviors",
      subtitle: "Coming soon",
      onPress: () => navigation.navigate("SecondaryBehaviorsStack"),
      icon: <Icon name="socks" size={40} color="#94A3B8" />,
      colors: ["#E2E8F0", "#94A3B8"] as const, // Gray
      disabled: true,
    },
    {
      title: "Random Questions",
      subtitle: "Coming soon",
      onPress: () => {},
      icon: <Icon name="question" size={40} color="#94A3B8" />,
      colors: ["#E2E8F0", "#94A3B8"] as const, // Gray
      disabled: true,
    },
  ];

  const stats = practiceStats.find(
    (stat) => stat.contentType === "EXPOSURE_PRACTICE"
  );

  return (
    <ScreenView style={styles.screenView}>
      {/* Aurora Mesh Background */}
      <View style={StyleSheet.absoluteFillObject}>
        <LinearGradient
          colors={["#FFF1F2", "#FFF", "#FFF"] as const} // Rose tint
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
        <Text style={styles.headerTitle}>Exposure</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionSubtitle}>
          Face your fears and build confidence with real-world scenarios.
        </Text>

        <View style={styles.cardsContainer}>
          {exposureData.map((item, index) => (
            <TouchableOpacity
              key={index}
              activeOpacity={0.9}
              onPress={item.onPress}
              disabled={item.disabled}
              style={[styles.cardWrapper, item.disabled && { opacity: 0.8 }]}
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
                    <Text
                      style={[
                        styles.cardTitle,
                        item.disabled && { color: "#475569" },
                      ]}
                    >
                      {item.title}
                    </Text>
                    <Text
                      style={[
                        styles.cardSubtitle,
                        item.disabled && { color: "#64748B" },
                      ]}
                    >
                      {item.subtitle}
                    </Text>
                  </View>
                  <View style={styles.iconContainer}>
                    <View
                      style={[
                        styles.iconWrapper,
                        item.disabled && {
                          transform: [{ scale: 1 }],
                          opacity: 0.5,
                        },
                      ]}
                    >
                      {item.icon}
                    </View>
                  </View>
                </View>

                {!item.disabled ? (
                  <View style={styles.playButton}>
                    <Icon name="play" size={12} color={item.colors[1]} />
                    <Text style={[styles.playText, { color: item.colors[1] }]}>
                      Start
                    </Text>
                  </View>
                ) : (
                  <View style={styles.lockButton}>
                    <Icon name="lock" size={12} color="#64748B" />
                    <Text style={[styles.playText, { color: "#64748B" }]}>
                      Locked
                    </Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        {/* Activity Stats Dashboard */}
        <View style={styles.statsSection}>
          <LinearGradient
            colors={["#FFF1F2", "#FFFBEB"] as const} // Rose/Amber
            style={styles.statsDashboard}
          >
            <View style={styles.dashboardHeader}>
              <View>
                <Text style={styles.dashboardTitle}>Your Progress</Text>
                <Text style={styles.dashboardSubtitle}>Every step counts.</Text>
              </View>
              <View
                style={[
                  styles.streakBadge,
                  { backgroundColor: "#FFE4E6", borderColor: "#FDA4AF" },
                ]}
              >
                <Icon name="fire-alt" size={14} color="#E11D48" />
                <Text style={[styles.streakText, { color: "#BE123C" }]}>
                  Courageous
                </Text>
              </View>
            </View>

            <View style={styles.dashboardGrid}>
              {/* Completed Count */}
              <View style={styles.statItem}>
                <View
                  style={[
                    styles.statIconWrapper,
                    { backgroundColor: "#FFE4E6" },
                  ]}
                >
                  <Icon name="check-double" size={18} color="#E11D48" />
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
                    challenges won
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
                    { backgroundColor: "#FEF3C7" },
                  ]}
                >
                  <Icon name="hourglass-half" size={18} color="#D97706" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.statValueBig}>
                    {stats?.totalTime
                      ? formatDuration(stats?.totalTime).split(" ")[0]
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

export default Exposure;

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
    paddingBottom: 120,
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
  lockButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.5)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: "flex-start",
    gap: 6,
    zIndex: 2,
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
});
