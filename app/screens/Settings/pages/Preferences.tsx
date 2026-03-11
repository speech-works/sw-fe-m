import DateTimePicker from "@react-native-community/datetimepicker";
import { useNavigation } from "@react-navigation/native";
import { format } from "date-fns";
import React, { useEffect, useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import {
  getUserPreferences,
  updateUserPreferences,
} from "../../../api/settings/userPreference";
import { PracticeGoalType } from "../../../api/settings/userPreference/types";
import BottomSheetModal from "../../../components/BottomSheetModal";
import CustomScrollView from "../../../components/CustomScrollView";
import ScreenView from "../../../components/ScreenView";
import TimeSelector from "../../../components/TimeSelector";
import { useUserStore } from "../../../stores/user";
import { theme } from "../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../util/functions/parseStyles";

import { LinearGradient } from "expo-linear-gradient";

type SettingType = "GOAL" | "TIMER" | null;

const Preferences = () => {
  const navigation = useNavigation();
  const { user } = useUserStore();
  const [targetMins, setTargetMins] = useState(15);
  const [taskCount, setTaskCount] = useState(3);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [openSettingType, setOpenSettingType] = useState<SettingType>(null);
  const [selectedGoalType, setSelectedGoalType] = useState("");
  const [reminderTime, setReminderTime] = useState<Date | null>();
  const [showAndroidTimePicker, setShowAndroidTimePicker] = useState(false);

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
    <View style={styles.goalListContainer}>
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
      <ScreenView style={[styles.screenView, { paddingHorizontal: 0 }]}>
        {/* Background Gradient */}
        <View style={StyleSheet.absoluteFillObject}>
          <LinearGradient
            colors={[theme.colors.library.orange[100], "#FFF"]}
            locations={[0, 1]}
            style={{ flex: 1 }}
          />
        </View>

        <View style={styles.container}>
          <View style={styles.topNavigation}>
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
            <Text style={styles.topNavigationText}>Preferences</Text>
            <View style={{ width: 32 }} />
          </View>
          <CustomScrollView contentContainerStyle={styles.scrollView}>
            {/* Preferred Time Card */}
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                setOpenSettingType("TIMER");
                if (Platform.OS === "android") {
                  setShowAndroidTimePicker(true);
                } else {
                  setIsModalVisible(true);
                }
              }}
              style={styles.card}
            >
              <View style={styles.textContainer}>
                <Text style={styles.titleText}>Preferred Practice Time</Text>
                <Text style={styles.descText}>When should we remind you?</Text>
              </View>
              <View style={styles.valueRow}>
                {reminderTime && (
                  <Text style={styles.valueText}>
                    {format(reminderTime, "hh:mm a")}
                  </Text>
                )}
              </View>
            </TouchableOpacity>

            {/* Goal Type Card */}
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                setOpenSettingType("GOAL");
                setIsModalVisible(true);
              }}
              style={styles.card}
            >
              <View style={styles.textContainer}>
                <Text style={styles.titleText}>Practice Goal Type</Text>
                <Text style={styles.descText}>
                  How would you like to train?
                </Text>
              </View>
              <View style={styles.valueRow}>
                <Text style={styles.valueText}>{selectedGoalType}</Text>
              </View>
            </TouchableOpacity>

            {/* Dynamic Goal Limit Cards */}
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
                      size={14}
                      color={theme.colors.library.orange[600]}
                    />
                  </TouchableOpacity>
                  <Text style={styles.valueTextLarge}>{targetMins}</Text>
                  <TouchableOpacity
                    onPress={handleDecrementTargetMins}
                    style={styles.chevronButton}
                  >
                    <Icon
                      name="chevron-down"
                      size={14}
                      color={theme.colors.library.orange[600]}
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
                      size={14}
                      color={theme.colors.library.orange[600]}
                    />
                  </TouchableOpacity>
                  <Text style={styles.valueTextLarge}>{taskCount}</Text>
                  <TouchableOpacity
                    onPress={handleDecrementTaskCount}
                    style={styles.chevronButton}
                  >
                    <Icon
                      name="chevron-down"
                      size={14}
                      color={theme.colors.library.orange[600]}
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
      {showAndroidTimePicker && (
        <DateTimePicker
          value={reminderTime || new Date()}
          mode="time"
          display="default"
          is24Hour={true}
          onChange={(event, date) => {
            setShowAndroidTimePicker(false);
            if (date) {
              setReminderTime(date);
            }
          }}
        />
      )}
    </>
  );
};

export default Preferences;

const styles = StyleSheet.create({
  screenView: {
    paddingBottom: 0,
  },
  container: {
    gap: 24,
    flex: 1,
    paddingTop: 8,
  },
  topNavigation: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 24,
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
  topNavigationText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
    marginTop: 2,
  },
  scrollView: {
    gap: 16,
    paddingHorizontal: 16, // Match header alignment
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  textContainer: {
    gap: 6,
    flex: 1,
  },
  titleText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.library.orange[800],
    fontWeight: "700",
    fontSize: 18,
  },
  descText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.library.gray[500],
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    // Removed background and padding for clean look
  },
  valueText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.library.orange[800],
    fontWeight: "600",
  },
  valueTextLarge: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.library.orange[800],
    minWidth: 32,
    textAlign: "center",
  },
  valueControlContainer: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    backgroundColor: "rgba(255,247,237, 1)", // Soft Orange
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  chevronButton: {
    padding: 8,
  },

  // modal
  modalTitleContainer: {
    gap: 4,
    alignItems: "center",
    marginBottom: 8, // Match ContactSupport wrapper top padding logic
  },
  modalTiteText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title, // Keep title standard
  },
  modalDescText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
  modalContent: {
    paddingVertical: 24,
    paddingHorizontal: 20, // Match ContactSupport
    width: "100%",
    flex: 1,
    flexDirection: "column",
    gap: 24,
    backgroundColor: "#fff", // White background
  },
  goalListContainer: {
    gap: 16,
    alignItems: "center",
    width: "100%",
  },
  goalCard: {
    width: "100%",
    borderRadius: 24,
    padding: 20, // Match ContactSupport
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F1F5F9", // Match ContactSupport
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  disabledCard: {
    backgroundColor: "#F8FAFC",
    borderColor: "transparent",
    elevation: 0,
    shadowColor: "transparent",
    opacity: 0.8,
  },
  disabledText: {
    color: theme.colors.text.disabled,
  },
  selectedGoalCard: {
    backgroundColor: "#FFF7ED",
    borderColor: theme.colors.library.orange[200],
  },
  selectedCardText: {
    color: theme.colors.library.orange[800],
    fontWeight: "700",
  },
  goalIconContainer2: {
    height: 44,
    width: 44,
  },
  disabledIconContainer: {
    backgroundColor: theme.colors.library.gray[200],
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
  goalIconContainer: {
    height: 44,
    width: 44,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: "#FFF7ED", // Light orange bg
  },
});
