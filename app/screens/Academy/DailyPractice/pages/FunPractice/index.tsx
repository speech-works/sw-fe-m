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
import HappyScreamFace from "../../../../../assets/sw-faces/HappyScreamFace";
import MaskedFace from "../../../../../assets/sw-faces/MaskedFace";
import TongueTwisterFace from "../../../../../assets/sw-faces/TongueTwisterFace";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ScreenView from "../../../../../components/ScreenView";
import {
  FDPStackNavigationProp,
  FDPStackParamList,
} from "../../../../../navigators/stacks/AcademyStack/DailyPracticeStack/FunPracticeStack/types";
import { usePracticeStatsStore } from "../../../../../stores/practiceStats";
import { theme } from "../../../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../util/functions/parseStyles";
import { formatDuration } from "../../../../../util/functions/time";

const { width } = Dimensions.get("window");

const FunPractice = () => {
  const navigation =
    useNavigation<FDPStackNavigationProp<keyof FDPStackParamList>>();

  const { practiceStats } = usePracticeStatsStore();
  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = 60;

  const funPracticeData = [
    {
      title: "Tongue Twisters",
      subtitle: "Fun speech challenges",
      onPress: () => navigation.navigate("TwisterPracticeStack"),
      icon: <TongueTwisterFace size={80} />,
      colors: ["#34D399", "#059669"] as const, // Emerald
      accentColor: "#FFF",
    },
    {
      title: "Role Play",
      subtitle: "Practice situational speech",
      onPress: () => navigation.navigate("RoleplayPracticeStack"),
      icon: <MaskedFace size={80} />,
      colors: ["#60A5FA", "#2563EB"] as const, // Blue
      accentColor: "#FFF",
    },
    {
      title: "Character Voice",
      subtitle: "Fun voice effects",
      onPress: () => navigation.navigate("CharacterVoicePracticeStack"),
      icon: <HappyScreamFace size={80} />,
      colors: ["#2DD4BF", "#0F766E"] as const, // Teal
      accentColor: "#FFF",
    },
  ];

  const stats = practiceStats.find(
    (stat) => stat.contentType === "FUN_PRACTICE",
  );

  return (
    <ScreenView style={styles.screenView}>
      {/* Aurora Mesh Background */}
      <View style={StyleSheet.absoluteFillObject}>
        <LinearGradient
          colors={["#ECFEFF", "#FFF", "#FFF"] as const} // Cyan tint
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
        <Text style={styles.headerTitle}>Fun Practice</Text>
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
          Express yourself with fun and engaging exercises.
        </Text>

        <View style={styles.cardsContainer}>
          {funPracticeData.map((item, index) => (
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
            colors={["#F0FDFA", "#F0F9FF"] as const} // Cyan/Sky
            style={styles.statsDashboard}
          >
            <View style={styles.dashboardHeader}>
              <View>
                <Text style={styles.dashboardTitle}>Your Progress</Text>
                <Text style={styles.dashboardSubtitle}>
                  Keep finding your voice!
                </Text>
              </View>
              <View
                style={[
                  styles.streakBadge,
                  { backgroundColor: "#CCFBF1", borderColor: "#5EEAD4" },
                ]}
              >
                <Icon name="star" size={14} color="#0D9488" />
                <Text style={[styles.streakText, { color: "#0F766E" }]}>
                  Expressive
                </Text>
              </View>
            </View>

            <View style={styles.dashboardGrid}>
              {/* Completed Count */}
              <View style={styles.statItem}>
                <View
                  style={[
                    styles.statIconWrapper,
                    { backgroundColor: "#CCFBF1" },
                  ]}
                >
                  <Icon name="check-double" size={18} color="#0D9488" />
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
                    activities done
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
                    { backgroundColor: "#E0F2FE" },
                  ]}
                >
                  <Icon
                    name="hourglass-half"
                    size={18}
                    color={theme.colors.library.blue[600]}
                  />
                </View>
                <View style={{ flex: 1 }}>
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

export default FunPractice;

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
});
