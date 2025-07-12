import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import React, { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import ScreenView from "../../../components/ScreenView";
import CustomScrollView from "../../../components/CustomScrollView";
import { theme } from "../../../Theme/tokens";
import Icon from "react-native-vector-icons/FontAwesome5";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../util/functions/parseStyles";
import BottomSheetModal from "../../../components/BottomSheetModal";
import TimeSelector from "../../../components/TimeSelector";
import { format } from "date-fns";
import {
  getUserPreferences,
  updateUserPreferences,
} from "../../../api/settings/userPreference";
import { useUserStore } from "../../../stores/user";
import { PracticeGoalType } from "../../../api/settings/userPreference/types";

type SettingType = "GOAL" | "TIMER" | null;

const ProgressDetail = () => {
  const navigation = useNavigation();
  const { user } = useUserStore();
  const [targetMins, setTargetMins] = useState(15);
  const [taskCount, setTaskCount] = useState(3);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [openSettingType, setOpenSettingType] = useState<SettingType>(null);
  const [selectedGoalType, setSelectedGoalType] = useState("");
  const [reminderTime, setReminderTime] = useState<Date | null>();

  const closeModal = () => setIsModalVisible(false);

  const handleGoalChange = async (goalText: string) => {
    console.log("handle goal change", { goalText });
    if (!user) return;
    let practiceGoalType = PracticeGoalType.TASK_BASED;
    if (goalText === "Time based") {
      practiceGoalType = PracticeGoalType.TIME_BASED;
    }
    await updateUserPreferences(user?.id, { practiceGoalType });
    setSelectedGoalType(goalText);
  };

  const handleIncrementTargetMins = async () => {
    if (!user) return;
    setTargetMins((prevMins) => {
      const dailyPracticeLimitMinutes = prevMins + 5;
      updateUserPreferences(user.id, { dailyPracticeLimitMinutes });
      return dailyPracticeLimitMinutes;
    });
  };

  const handleDecrementTargetMins = async () => {
    if (!user) return;
    setTargetMins((prevMins) => {
      const dailyPracticeLimitMinutes = Math.max(5, prevMins - 5);
      updateUserPreferences(user.id, { dailyPracticeLimitMinutes });
      return dailyPracticeLimitMinutes;
    });
  };

  const handleIncrementTaskCount = async () => {
    if (!user) return;
    setTaskCount((prevMins) => {
      const dailyTaskCount = prevMins + 1;
      updateUserPreferences(user.id, { dailyTaskCount });
      return dailyTaskCount;
    });
  };

  const handleDecrementTaskCount = async () => {
    if (!user) return;
    setTaskCount((prevMins) => {
      const dailyTaskCount = Math.max(5, prevMins - 1);
      updateUserPreferences(user.id, { dailyTaskCount });
      return dailyTaskCount;
    });
  };

  const practiceGoalTypeData: Array<{
    name: string;
    desc: string;
    icon: string;
    disabled?: boolean;
  }> = [
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

  const SelectGoalType = () => (
    <View style={styles.goalListContanier}>
      {practiceGoalTypeData.map((goal, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.goalCard,
            selectedGoalType === goal.name && styles.selectedGoalCard,
            goal.disabled && styles.disabledCard,
          ]}
          disabled={goal.disabled}
          onPress={() => {
            if (goal.disabled) return;
            handleGoalChange(goal.name);
            setSelectedGoalType(goal.name);
            closeModal();
          }}
        >
          <View
            style={[
              styles.goalIconContainer,
              styles.goalIconContainer2,
              goal.disabled ? styles.disabledIconContainer : null,
            ]}
          >
            <Icon
              solid
              name={goal.icon}
              size={24}
              color={
                goal.disabled
                  ? theme.colors.library.gray[100]
                  : theme.colors.actionPrimary.default
              }
            />
          </View>
          <View style={styles.goalDescContainer}>
            <Text
              style={[
                styles.goalNameText,
                goal.disabled && styles.disabledText,
                selectedGoalType === goal.name &&
                  !goal.disabled &&
                  styles.selectedCardText,
              ]}
            >
              {goal.name}
            </Text>
            <Text
              style={[
                styles.goalDetailText,
                goal.disabled && styles.disabledText,
                selectedGoalType === goal.name &&
                  !goal.disabled &&
                  styles.selectedCardText,
              ]}
            >
              {goal.disabled ? "coming soon" : goal.desc}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  useEffect(() => {
    if (!user) return;
    const fetchPreferences = async () => {
      const pref = await getUserPreferences(user.id);
      if (!pref) return;
      const {
        practiceReminderTime,
        practiceGoalType,
        dailyPracticeLimitMinutes,
        dailyTaskCount,
      } = pref;
      if (practiceReminderTime) setReminderTime(new Date(practiceReminderTime));
      if (practiceGoalType) {
        if (practiceGoalType === PracticeGoalType.TASK_BASED) {
          setSelectedGoalType("Task based");
        } else if (practiceGoalType === PracticeGoalType.TIME_BASED) {
          setSelectedGoalType("Time based");
        }
      }
      if (dailyPracticeLimitMinutes) setTargetMins(dailyPracticeLimitMinutes);
      if (dailyTaskCount) setTaskCount(dailyTaskCount);
    };
    fetchPreferences();
  }, [user]);

  useEffect(() => {
    if (!reminderTime || !user) return;

    // Fix: Normalize the reminder time to a constant date (e.g., Jan 1, 1970)
    const normalizedTime = new Date(reminderTime);
    normalizedTime.setFullYear(1970, 0, 1); // Jan 1, 1970

    updateUserPreferences(user.id, {
      practiceReminderTime: normalizedTime,
    });
  }, [reminderTime]);

  return (
    <>
      <ScreenView style={styles.screenView}>
        <View style={styles.container}>
          <TouchableOpacity
            style={styles.topNavigation}
            onPress={() => navigation.goBack()}
          >
            <Icon
              name="chevron-left"
              size={16}
              color={theme.colors.text.default}
            />
            <Text style={styles.topNavigationText}>Preferences</Text>
          </TouchableOpacity>
          <CustomScrollView contentContainerStyle={styles.scrollView}>
            <View style={styles.card}>
              <View style={styles.textContainer}>
                <Text style={styles.titleText}>Preferred Practice Time</Text>
                <Text style={styles.descText}>When should we remind you?</Text>
              </View>
              <TouchableOpacity
                style={styles.preferredTimeValue}
                onPress={() => {
                  setOpenSettingType("TIMER");
                  setIsModalVisible(true);
                }}
              >
                {reminderTime && (
                  <Text style={styles.valueText}>
                    {format(reminderTime, "hh:mm a")}
                  </Text>
                )}

                <Icon
                  name="chevron-right"
                  size={12}
                  color={theme.colors.actionPrimary.default}
                />
              </TouchableOpacity>
            </View>
            <View style={styles.card}>
              <View style={styles.textContainer}>
                <Text style={styles.titleText}>Practice Goal Type</Text>
                <Text style={styles.descText}>
                  How would you like to train?
                </Text>
              </View>
              <TouchableOpacity
                style={styles.preferredTimeValue}
                onPress={() => {
                  setOpenSettingType("GOAL");
                  setIsModalVisible(true);
                }}
              >
                <Text style={styles.valueText}>{selectedGoalType}</Text>
                <Icon
                  name="chevron-right"
                  size={12}
                  color={theme.colors.actionPrimary.default}
                />
              </TouchableOpacity>
            </View>
            {selectedGoalType === "Time based" && (
              <View style={styles.card}>
                <View style={styles.textContainer}>
                  <Text style={styles.titleText}>Daily practice limit</Text>
                  <Text style={styles.descText}>
                    Set your target practice minutes
                  </Text>
                </View>
                <View style={styles.valueControlContainer}>
                  <TouchableOpacity
                    onPress={handleIncrementTargetMins}
                    style={styles.chevronButton}
                  >
                    <Icon
                      name="chevron-up"
                      size={12}
                      color={theme.colors.actionPrimary.default}
                    />
                  </TouchableOpacity>
                  <Text style={styles.valueText}>{targetMins}</Text>
                  <TouchableOpacity
                    onPress={handleDecrementTargetMins}
                    style={styles.chevronButton}
                  >
                    <Icon
                      name="chevron-down"
                      size={12}
                      color={theme.colors.actionPrimary.default}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            {selectedGoalType === "Task based" && (
              <View style={styles.card}>
                <View style={styles.textContainer}>
                  <Text style={styles.titleText}>Daily task count</Text>
                  <Text style={styles.descText}>
                    e.g., complete 3 tasks/day
                  </Text>
                </View>
                <View style={styles.valueControlContainer}>
                  <TouchableOpacity
                    onPress={handleIncrementTaskCount}
                    style={styles.chevronButton}
                  >
                    <Icon
                      name="chevron-up"
                      size={12}
                      color={theme.colors.actionPrimary.default}
                    />
                  </TouchableOpacity>
                  <Text style={styles.valueText}>{taskCount}</Text>
                  <TouchableOpacity
                    onPress={handleDecrementTaskCount}
                    style={styles.chevronButton}
                  >
                    <Icon
                      name="chevron-down"
                      size={12}
                      color={theme.colors.actionPrimary.default}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </CustomScrollView>
        </View>
      </ScreenView>
      <BottomSheetModal
        visible={isModalVisible}
        onClose={closeModal}
        maxHeight="70%"
      >
        <View style={styles.modalContent}>
          <View style={styles.modalTitleContainer}>
            <Text style={styles.modalTiteText}>{openSettingType}</Text>
          </View>
          {openSettingType === "GOAL" && <SelectGoalType />}
          {openSettingType === "TIMER" && (
            <TimeSelector
              onTimeChange={(time) => {
                setReminderTime(time);
                closeModal();
              }}
              initialTime={reminderTime || new Date()}
            />
          )}
        </View>
      </BottomSheetModal>
    </>
  );
};

export default ProgressDetail;

const styles = StyleSheet.create({
  screenView: {
    paddingBottom: 0,
  },
  container: {
    gap: 32,
    flex: 1,
  },
  topNavigation: {
    position: "relative",
    top: 0,
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  topNavigationText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },
  scrollView: {
    gap: 16,
    paddingVertical: 16,
  },
  card: {
    gap: 16,
    backgroundColor: theme.colors.surface.elevated,
    ...parseShadowStyle(theme.shadow.elevation1),
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  textContainer: {
    gap: 4,
  },
  titleText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
  },
  descText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
    fontWeight: "400",
  },
  valueText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.actionPrimary.default,
    marginHorizontal: 8,
  },
  valueControlContainer: {
    flexDirection: "column",
    alignItems: "center",
    width: 75,
  },
  chevronButton: {
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  preferredTimeValue: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  // modal
  modalTitleContainer: {
    gap: 12,
    alignItems: "center",
  },
  modalTiteText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },
  modalDescText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
  modalContent: {
    paddingVertical: 24,
    width: "100%",
    flex: 1,
    flexDirection: "column",
    gap: 32,
  },
  goalListContanier: {
    gap: 16,
    alignItems: "center",
    width: "100%",
  },
  goalCard: {
    width: "100%",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: theme.colors.surface.elevated,
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  disabledCard: {
    backgroundColor: theme.colors.surface.disabled,
    opacity: 1,
    elevation: 0, // Android
    shadowColor: "transparent", // iOS
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  disabledText: {
    color: theme.colors.text.disabled,
  },
  selectedGoalCard: {
    backgroundColor: theme.colors.actionPrimary.default,
  },
  selectedCardText: {
    color: theme.colors.text.onDark,
    fontWeight: "600",
  },
  goalIconContainer2: {
    height: 40,
    width: 40,
  },
  disabledIconContainer: {
    backgroundColor: theme.colors.library.gray[200],
  },
  goalDescContainer: {
    gap: 4,
  },
  goalNameText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
  },
  goalDetailText: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: theme.colors.text.default,
  },
  goalIconContainer: {
    height: 40,
    width: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: theme.colors.surface.default,
  },
});
