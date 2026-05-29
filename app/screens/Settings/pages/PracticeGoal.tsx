import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/FontAwesome5";
import { BlurView } from "expo-blur";
import {
  getUserPreferences,
  updateUserPreferences,
} from "../../../api/settings/userPreference";
import { PracticeGoalType } from "../../../api/settings/userPreference/types";
import ScreenView from "../../../components/ScreenView";
import { useUserStore } from "../../../stores/user";
import { theme } from "../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../util/functions/parseStyles";
import { LinearGradient } from "expo-linear-gradient";

import { SettingsStackNavigationProp } from "../../../navigators/stacks/SettingsStack/types";

const PracticeGoal = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<SettingsStackNavigationProp<"PracticeGoal">>();
  const { user } = useUserStore();
  const [selectedGoalType, setSelectedGoalType] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const practiceGoalTypeData = [
    {
      name: "Time based",
      desc: "Set a daily time target like 20 mins",
      icon: "clock",
    },
    {
      name: "Task based",
      desc: "Set a goal to complete a number of tasks",
      icon: "tasks",
    },
  ];

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
    <ScreenView style={styles.screenView}>
      <View style={StyleSheet.absoluteFillObject}>
        <LinearGradient
          colors={[theme.colors.library.orange[100], "#FFF"]}
          style={{ flex: 1 }}
        />
      </View>

      <BlurView
        intensity={80}
        tint="light"
        style={[
          styles.header,
          { paddingTop: insets.top + 10, height: 60 + insets.top },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="chevron-left" size={16} color={theme.colors.text.title} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Practice Goal</Text>
        <View style={{ width: 32 }} />
      </BlurView>

      <View style={[styles.container, { paddingTop: 60 + insets.top + 16 }]}>
        <Text style={styles.description}>
          How would you like to track your progress? Choose a goal type that fits
          your daily routine.
        </Text>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="large"
              color={theme.colors.actionPrimary.default}
            />
          </View>
        ) : (
          <View style={styles.goalListContainer}>
            {practiceGoalTypeData.map((goal, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.goalCard,
                  selectedGoalType === goal.name && styles.selectedGoalCard,
                ]}
                disabled={isSaving}
                onPress={() => handleGoalChange(goal.name)}
              >
                <View
                  style={[
                    styles.goalIconContainer,
                    selectedGoalType === goal.name && styles.selectedGoalIconContainer,
                  ]}
                >
                  <Icon
                    solid
                    name={goal.icon}
                    size={24}
                    color={
                      selectedGoalType === goal.name
                        ? theme.colors.library.orange[800]
                        : theme.colors.actionPrimary.default
                    }
                  />
                </View>
                <View style={styles.goalDescContainer}>
                  <Text
                    style={[
                      styles.goalNameText,
                      selectedGoalType === goal.name && styles.selectedCardText,
                    ]}
                  >
                    {goal.name}
                  </Text>
                  <Text
                    style={[
                      styles.goalDetailText,
                      selectedGoalType === goal.name && styles.selectedCardText,
                    ]}
                  >
                    {goal.desc}
                  </Text>
                </View>
                {selectedGoalType === goal.name && (
                  <Icon
                    name="check-circle"
                    size={20}
                    color={theme.colors.library.orange[600]}
                    solid
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
      {isSaving && (
        <View style={styles.savingOverlay}>
          <ActivityIndicator size="large" color="#FFF" />
        </View>
      )}
    </ScreenView>
  );
};

const styles = StyleSheet.create({
  screenView: {
    paddingBottom: 0,
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
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  description: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
    marginBottom: 24,
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  goalListContainer: {
    gap: 16,
  },
  goalCard: {
    width: "100%",
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  selectedGoalCard: {
    backgroundColor: "#FFF7ED",
    borderColor: theme.colors.library.orange[200],
  },
  goalIconContainer: {
    height: 48,
    width: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#FFF7ED",
  },
  selectedGoalIconContainer: {
    backgroundColor: "#FFEDD5",
  },
  goalDescContainer: {
    gap: 4,
    flex: 1,
  },
  goalNameText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
    fontWeight: "700",
  },
  goalDetailText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
  selectedCardText: {
    color: theme.colors.library.orange[800],
  },
  savingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
});

export default PracticeGoal;
