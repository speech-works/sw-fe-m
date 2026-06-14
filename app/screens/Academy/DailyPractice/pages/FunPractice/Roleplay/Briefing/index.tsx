// Redesigned Roleplay Briefing
// FORCE REFRESH BUNDLER - SYSTEM SYNC 1
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ScreenView from "../../../../../../../components/ScreenView";
import {
  RoleplayFDPStackNavigationProp,
  RoleplayFDPStackParamList,
} from "../../../../../../../navigators/stacks/ExploreStack/DailyPracticeStack/FunPracticeStack/RoleplayPracticeStack/types";
import { theme } from "../../../../../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../../../util/functions/parseStyles";

import { getExposurePracticeById, getFunPracticeById } from "../../../../../../../api/dailyPractice";
import { RolePlayData } from "../../../../../../../api/dailyPractice/types";

import { useUserStore } from "../../../../../../../stores/user";

const Briefing = () => {
  console.log("RoleplayBriefing MOUNTED");
  const navigation =
    useNavigation<
      RoleplayFDPStackNavigationProp<keyof RoleplayFDPStackParamList>
    >();
  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = 60;
  const route =
    useRoute<RouteProp<RoleplayFDPStackParamList, "RoleplayBriefing">>();
  const { title: initialTitle, description: initialDesc, roleplay: initialRoleplay, id } = route.params;
  const { user } = useUserStore();
  const [hardMode, setHardMode] = React.useState(false);
  const canUseHardMode = (user?.fearedSounds?.length ?? 0) > 0;

  const [loading, setLoading] = React.useState(!initialRoleplay);
  const [data, setData] = React.useState({
    title: initialTitle,
    description: initialDesc,
    roleplay: initialRoleplay as RolePlayData | undefined,
  });

  React.useEffect(() => {
    if (!data.roleplay && id) {
      const fetchRoleplay = async () => {
        try {
          // Try fetching as Exposure Practice (Ordering Coffee, Job Interview)
          const practice = await getExposurePracticeById(id);
          const rawStage = (practice.socialChallengeData || practice.practiceData || practice.interviewPracticeData)?.stage;
          const rawScenario = (practice.socialChallengeData || practice.practiceData || practice.interviewPracticeData)?.scenario;

          if (rawStage && rawScenario) {
            setData({
              title: practice.name,
              description: practice.description,
              roleplay: {
                scenario: {
                  scenarioDetails: rawScenario.scenarioDetails,
                  tips: rawScenario.tips,
                  duration: rawScenario.duration,
                  availableRoles: [
                    {
                      roleName: rawStage.userRole,
                      roleDescription: "The role you will be playing.",
                      fontAwesomeIcon: "user",
                    },
                    {
                      roleName: rawStage.npcRole,
                      roleDescription: "The character you will interact with.",
                      fontAwesomeIcon: "user-tie",
                    },
                  ],
                },
                stages: [rawStage as any],
              },
            });
          }
        } catch (e) {
          // Fallback to Fun Practice
          try {
            const funPractice = await getFunPracticeById(id);
            if (funPractice.rolePlayData) {
              setData({
                title: funPractice.name,
                description: funPractice.description,
                roleplay: funPractice.rolePlayData,
              });
            }
          } catch (err) {
            console.error("Failed to fetch roleplay", err);
          }
        } finally {
          setLoading(false);
        }
      };
      fetchRoleplay();
    }
  }, [id, hardMode]);

  const { title, description, roleplay } = data;

  console.log("Briefing Params:", JSON.stringify(route.params, null, 2));

  if (loading || !roleplay) {
    return (
      <ScreenView style={styles.screenView}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text>Loading briefing...</Text>
        </View>
      </ScreenView>
    );
  }

  const scenarioDescription = roleplay.scenario.scenarioDetails;
  const tips = roleplay.scenario.tips;
  const roles = roleplay.scenario.availableRoles;

  const moveToChat = (selectedRoleName: string) => {
    // Navigate to Chat
    navigation.navigate("RoleplayChat", {
      id,
      title,
      roleplay,
      selectedRoleName,
      packContext: route.params.packContext,
    });
  };

  return (
    <ScreenView style={styles.screenView}>
      <BlurView
        intensity={80}
        tint="light"
        style={[
          styles.topNavigationContainer,
          { paddingTop: insets.top + 10, height: HEADER_HEIGHT + insets.top },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="chevron-left" size={16} color={theme.colors.text.title} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Briefing Practice</Text>
        <View style={{ width: 32 }} />
      </BlurView>

      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: HEADER_HEIGHT + insets.top + 20 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroSectionMinimal}>
            <Text style={styles.heroTitleMinimal}>{title}</Text>
            <Text style={styles.heroDescriptionMinimal}>{description}</Text>
          </View>

          {/* Scenario Details Section */}
          <View style={styles.scenarioCardLight}>
            <View style={styles.scenarioCardHeaderLight}>
              <Icon name="bookmark" size={14} color="#EA580C" />
              <Text style={styles.scenarioCardTitleLight}>THE SCENARIO</Text>
            </View>

            <Text style={styles.scenarioCardTextLight}>{scenarioDescription}</Text>

            <View style={styles.scenarioDurationPillLight}>
              <Icon name="clock" size={12} color="#C2410C" />
              <Text style={styles.scenarioDurationTextLight}>
                {roleplay.scenario.duration} mins
              </Text>
            </View>
            
            <View style={styles.scenarioWatermarkLight} pointerEvents="none">
              <Icon name="book-open" size={140} color="#FFF7ED" />
            </View>
          </View>

          {/* Tips Section */}
          <View style={styles.timelineSection}>
            <Text style={styles.sectionHeadingMinimal}>Tips</Text>
            <View style={styles.timelineContainer}>
              {tips.map((tip, index, arr) => (
                <View key={index} style={styles.timelineItem}>
                  <View style={styles.timelineTrack}>
                    <View style={styles.timelineDot} />
                    {index !== arr.length - 1 && (
                      <View style={styles.timelineLine} />
                    )}
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineText}>{tip}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Role Selection */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeadingMinimal}>Choose Your Role</Text>
            <View style={styles.roleList}>
              {roles.map((role) => (
                <TouchableOpacity
                  key={role.roleName}
                  onPress={() => moveToChat(role.roleName)}
                  style={styles.roleCard}
                  activeOpacity={0.8}
                >
                  <View style={styles.roleIconContainer}>
                    <Icon
                      size={20}
                      name={role.fontAwesomeIcon}
                      color="#EA580C"
                    />
                  </View>
                  <View style={styles.roleInfo}>
                    <Text style={styles.roleName}>{role.roleName}</Text>
                    <Text style={styles.roleDesc} numberOfLines={2}>
                      {role.roleDescription}
                    </Text>
                  </View>
                  <Icon name="chevron-right" size={14} color="#94A3B8" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    </ScreenView>
  );
};

export default Briefing;

const styles = StyleSheet.create({
  screenView: {
    flex: 1,
    paddingBottom: 0,
    backgroundColor: "#FAFAFA",
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    gap: 32,
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 80, // Matches fixed briefing screens (Interview/Social Challenge)
  },
  topNavigationContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
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
  headerRight: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerHardModeButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.8)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  headerHardModeActive: {
    backgroundColor: "#FFF7ED",
    borderColor: "rgba(234, 88, 12, 0.3)",
  },
  activeDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EA580C",
    borderWidth: 1.5,
    borderColor: "#FFF",
  },
  // Minimal Styles
  heroSectionMinimal: {
    marginBottom: 32,
  },
  heroTitleMinimal: {
    ...parseTextStyle(theme.typography.Heading1),
    fontSize: 40,
    color: '#111827',
    marginBottom: 12,
    letterSpacing: -1,
    lineHeight: 48,
  },
  heroDescriptionMinimal: {
    ...parseTextStyle(theme.typography.Body),
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
  },
  // Light Warm Scenario Card
  scenarioCardLight: {
    backgroundColor: "#FFFFFF",
    borderRadius: 32,
    marginBottom: 40,
    padding: 32,
    gap: 20,
    borderWidth: 1,
    borderColor: "#FFEDD5", // Soft warm border
    ...parseShadowStyle(theme.shadow.elevation1),
    overflow: "hidden",
  },
  scenarioCardHeaderLight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  scenarioCardTitleLight: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "#EA580C",
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  scenarioCardTextLight: {
    ...parseTextStyle(theme.typography.Body),
    color: "#374151",
    lineHeight: 28,
    fontSize: 17,
  },
  scenarioDurationPillLight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
  },
  scenarioDurationTextLight: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "#C2410C",
    fontWeight: "700",
  },
  scenarioWatermarkLight: {
    position: "absolute",
    right: -30,
    bottom: -30,
    zIndex: 0,
    transform: [{ rotate: "-15deg" }],
  },
  sectionHeadingMinimal: {
    ...parseTextStyle(theme.typography.Heading2),
    fontSize: 22,
    color: '#111827',
    marginBottom: 16,
  },
  
  // Role Selection
  sectionContainer: {
    gap: 16,
  },
  roleList: {
    gap: 12,
  },
  roleCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  roleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFF7ED",
    justifyContent: "center",
    alignItems: "center",
  },
  roleInfo: {
    flex: 1,
    gap: 4,
  },
  roleName: {
    ...parseTextStyle(theme.typography.Heading3),
    fontSize: 16,
    color: theme.colors.text.title,
  },
  roleDesc: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },

  timelineSection: {
    marginTop: 16,
  },
  timelineContainer: {
    paddingLeft: 4,
  },
  timelineItem: {
    flexDirection: 'row',
  },
  timelineTrack: {
    alignItems: 'center',
    width: 20,
    marginRight: 16,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.library.blue[500],
    marginTop: 7,
    zIndex: 2,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E5E7EB',
    marginTop: 4,
    marginBottom: -4,
    zIndex: 1,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 32,
  },
  timelineText: {
    ...parseTextStyle(theme.typography.Body),
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
});
