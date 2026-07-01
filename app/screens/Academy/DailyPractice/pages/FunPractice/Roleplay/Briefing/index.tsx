// Redesigned Roleplay Briefing
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import React from "react";
import { StyleSheet, View } from "react-native";
import FAIcon from "react-native-vector-icons/FontAwesome5";
import PressableScale from "../../../../../../../components/PressableScale";
import {
  RoleplayFDPStackNavigationProp,
  RoleplayFDPStackParamList,
} from "../../../../../../../navigators/stacks/ExploreStack/DailyPracticeStack/FunPracticeStack/RoleplayPracticeStack/types";
import {
  Page,
  Text,
  Icon,
  icons,
  Surface,
  useTheme,
  spacing,
  radius,
} from "../../../../../../../design-system";

import {
  getExposurePracticeById,
  getFunPracticeById,
} from "../../../../../../../api/dailyPractice";
import { RolePlayData } from "../../../../../../../api/dailyPractice/types";

const Briefing = () => {
  console.log("RoleplayBriefing MOUNTED");
  const navigation =
    useNavigation<
      RoleplayFDPStackNavigationProp<keyof RoleplayFDPStackParamList>
    >();
  const { colors } = useTheme();
  const route =
    useRoute<RouteProp<RoleplayFDPStackParamList, "RoleplayBriefing">>();
  const { title: initialTitle, description: initialDesc, roleplay: initialRoleplay, id } = route.params;
  const [hardMode] = React.useState(false);

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
      <Page title="Briefing" onBack={() => navigation.goBack()}>
        <View style={styles.loadingContainer}>
          <Text variant="body" color="secondary">
            Loading briefing...
          </Text>
        </View>
      </Page>
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
    <Page
      title={title}
      description={description}
      onBack={() => navigation.goBack()}
    >
      {/* Scenario Details Section */}
      <Surface
        level="default"
        rounded="card"
        padded={spacing.xl}
        style={styles.scenarioCard}
      >
        <View style={styles.scenarioHeader}>
          <Icon name="bookmark" size={14} color={colors.action.primary} />
          <Text variant="label" color="primary">
            THE SCENARIO
          </Text>
        </View>

        <Text variant="body" color="secondary" style={styles.scenarioText}>
          {scenarioDescription}
        </Text>

        <View
          style={[
            styles.durationPill,
            { backgroundColor: colors.action.primaryTint },
          ]}
        >
          <Icon name={icons.duration} size={12} color={colors.action.primary} />
          <Text variant="caption" color="link">
            {roleplay.scenario.duration} mins
          </Text>
        </View>
      </Surface>

      {/* Tips Section */}
      <View>
        <Text variant="h3" color="primary" style={styles.sectionHeading}>
          Tips
        </Text>
        {tips.map((tip, index, arr) => (
          <View key={index} style={styles.tipRow}>
            <View style={styles.tipTrack}>
              <View
                style={[
                  styles.tipDot,
                  { backgroundColor: colors.action.primary },
                ]}
              />
              {index !== arr.length - 1 && (
                <View
                  style={[
                    styles.tipLine,
                    { backgroundColor: colors.border.default },
                  ]}
                />
              )}
            </View>
            <Text variant="body" color="secondary" style={styles.tipText}>
              {tip}
            </Text>
          </View>
        ))}
      </View>

      {/* Role Selection */}
      <View style={styles.sectionContainer}>
        <Text variant="h3" color="primary" style={styles.sectionHeading}>
          Choose Your Role
        </Text>
        <View style={styles.roleList}>
          {roles.map((role) => (
            <PressableScale
              key={role.roleName}
              onPress={() => moveToChat(role.roleName)}
              scaleTo={0.98}
              style={styles.roleCardWrapper}
            >
              <View
                style={[
                  styles.roleCard,
                  { backgroundColor: colors.surface.default },
                ]}
              >
                <View
                  style={[
                    styles.roleIconContainer,
                    { backgroundColor: colors.action.primaryTint },
                  ]}
                >
                  <FAIcon
                    size={20}
                    name={role.fontAwesomeIcon}
                    color={colors.action.primary}
                  />
                </View>
                <View style={styles.roleInfo}>
                  <Text variant="title" color="primary">
                    {role.roleName}
                  </Text>
                  <Text variant="bodySm" color="secondary" numberOfLines={2}>
                    {role.roleDescription}
                  </Text>
                </View>
                <Icon
                  name={icons.chevronRight}
                  size={14}
                  color={colors.text.tertiary}
                />
              </View>
            </PressableScale>
          ))}
        </View>
      </View>
    </Page>
  );
};

export default Briefing;

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  // Scenario Card
  scenarioCard: {
    gap: spacing.lg,
    overflow: "hidden",
  },
  scenarioHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  scenarioText: {
    lineHeight: 26,
  },
  durationPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.chip,
  },
  sectionHeading: {
    marginBottom: spacing.lg,
  },
  // Role Selection
  sectionContainer: {
    gap: spacing.lg,
  },
  roleList: {
    gap: spacing.md,
  },
  roleCardWrapper: {
    borderRadius: radius.card,
  },
  roleCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
    gap: spacing.lg,
    borderRadius: radius.card,
  },
  roleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  roleInfo: {
    flex: 1,
    gap: spacing.xxs,
  },
  // Tips timeline
  tipRow: {
    flexDirection: "row",
  },
  tipTrack: {
    alignItems: "center",
    width: 20,
    marginRight: spacing.lg,
  },
  tipDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 7,
  },
  tipLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
    marginBottom: -4,
  },
  tipText: {
    flex: 1,
    paddingBottom: spacing["2xl"],
    lineHeight: 24,
  },
});
