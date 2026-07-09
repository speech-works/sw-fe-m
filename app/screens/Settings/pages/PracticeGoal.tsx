import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import PressableScale from "../../../components/PressableScale";
import {
  getUserPreferences,
  updateUserPreferences,
} from "../../../api/settings/userPreference";
import { PracticeGoalType } from "../../../api/settings/userPreference/types";
import { useUserStore } from "../../../stores/user";
import { SettingsStackNavigationProp } from "../../../navigators/stacks/SettingsStack/types";
import {
  useTheme,
  spacing,
  radius,
  Text,
  Icon,
  Page,
  Spinner,
  IconName,
} from "../../../design-system";

const practiceGoalTypeData: { name: string; desc: string; icon: IconName }[] = [
  {
    name: "Time based",
    desc: "Set a daily time target like 20 mins",
    icon: "clock",
  },
  {
    name: "Task based",
    desc: "Set a goal to complete a number of tasks",
    icon: "check-square",
  },
];

const PracticeGoal = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<SettingsStackNavigationProp<"PracticeGoal">>();
  const { user } = useUserStore();
  const [selectedGoalType, setSelectedGoalType] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchPreferences = async () => {
      try {
        const pref = await getUserPreferences(user.id);
        if (pref?.practiceGoalType) {
          if (pref.practiceGoalType === PracticeGoalType.TASK_BASED) {
            setSelectedGoalType("Task based");
          } else if (pref.practiceGoalType === PracticeGoalType.TIME_BASED) {
            setSelectedGoalType("Time based");
          }
        }
      } catch (error) {
        console.error("Error fetching preferences:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPreferences();
  }, [user]);

  const handleGoalChange = async (goalName: string) => {
    if (!user) return;
    setIsSaving(true);
    try {
      let practiceGoalType = PracticeGoalType.TASK_BASED;
      if (goalName === "Time based") {
        practiceGoalType = PracticeGoalType.TIME_BASED;
      }
      await updateUserPreferences(user.id, { practiceGoalType });
      setSelectedGoalType(goalName);
      navigation.goBack();
    } catch (error) {
      console.error("Error updating goal type:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Page
        title="Practice Goal"
        description="How would you like to track your progress? Choose a goal type that fits your daily routine."
        onBack={() => navigation.goBack()}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Spinner size="large" />
          </View>
        ) : (
          <View style={styles.goalListContainer}>
            {practiceGoalTypeData.map((goal) => {
              const selected = selectedGoalType === goal.name;
              return (
                <PressableScale
                  key={goal.name}
                  disabled={isSaving}
                  onPress={() => handleGoalChange(goal.name)}
                  style={[
                    styles.goalCard,
                    {
                      backgroundColor: selected
                        ? colors.action.primaryTint
                        : colors.surface.default,
                      borderColor: selected
                        ? colors.action.primary
                        : colors.border.default,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.goalIconContainer,
                      { backgroundColor: colors.surface.control },
                    ]}
                  >
                    <Icon name={goal.icon} size={22} color={colors.text.primary} />
                  </View>
                  <View style={styles.goalDescContainer}>
                    <Text variant="title">{goal.name}</Text>
                    <Text variant="bodySm" color="secondary">
                      {goal.desc}
                    </Text>
                  </View>
                  {selected ? (
                    <Icon name="check-circle" size={22} color={colors.text.accent} />
                  ) : null}
                </PressableScale>
              );
            })}
          </View>
        )}
      </Page>

      {isSaving && <Spinner fullscreen />}
    </>
  );
};

export default PracticeGoal;

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  goalListContainer: {
    gap: spacing.lg,
  },
  goalCard: {
    width: "100%",
    borderRadius: radius.card,
    paddingVertical: 20,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1.5,
  },
  goalIconContainer: {
    height: 48,
    width: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.input,
  },
  goalDescContainer: {
    gap: 4,
    flex: 1,
  },
});
