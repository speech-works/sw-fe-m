import DateTimePicker from "@react-native-community/datetimepicker";
import { useNavigation } from "@react-navigation/native";
import { format } from "date-fns";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  hasNotificationPermission,
  registerForNotifications,
  syncPreferredPracticeReminder,
} from "../../../util/functions/notifications";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../util/functions/parseStyles";

import { LinearGradient } from "expo-linear-gradient";

type SettingType = "GOAL" | "TIMER" | null;

const Preferences = () => {
  const insets = useSafeAreaInsets();
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

  const normalizeReminderTime = (time: Date) => {
    const normalizedTime = new Date(time);
    normalizedTime.setFullYear(1970, 0, 1); // Jan 1, 1970
    return normalizedTime;
  };

  const handleReminderTimeSelected = async (time: Date) => {
    if (!user) return;

    const hasPermissions = await registerForNotifications();
    if (!hasPermissions) {
      Alert.alert(
        "Permissions Required",
        "Please enable notification permissions in your device settings.",
      );
      return;
    }

    try {
      await syncPreferredPracticeReminder(time);
      await updateUserPreferences(user.id, {
        practiceReminderTime: normalizeReminderTime(time),
      });
      setReminderTime(time);
    } catch (error) {
      console.error("Failed to save preferred practice time:", error);
      Alert.alert(
        "Error",
        "Could not save your reminder time. Please try again.",
      );
    }
  };

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
      if (practiceReminderTime) {
        const nextReminderTime = new Date(practiceReminderTime);
        setReminderTime(nextReminderTime);

        try {
          if (await hasNotificationPermission()) {
            await syncPreferredPracticeReminder(nextReminderTime);
          }
        } catch (error) {
          console.error("Failed to sync preferred practice reminder:", error);
        }
      }
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
              style={styles.cardWrapper}
            >
              <LinearGradient
                colors={["#EBCBF5", "#D8A7F0"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardGradient}
              >
                <View style={styles.watermarkContainer}>
                  <Icon
                    name="clock"
                    size={120}
                    color="rgba(255,255,255,0.15)"
                  />
                </View>
                <View style={styles.cardHeader}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>SCHEDULE</Text>
                  </View>
                  <Text style={styles.cardTitle}>Preferred Practice Time</Text>
                  <Text style={styles.cardDesc}>
                    When should we remind you?
                  </Text>
                </View>
                <View style={styles.cardFooter}>
                  {reminderTime && (
                    <View style={styles.valueControlContainer}>
                      <Text style={styles.valueTextLarge}>
                        {format(reminderTime, "hh:mm a")}
                      </Text>
                    </View>
                  )}
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* Goal Type Card */}
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                setOpenSettingType("GOAL");
                setIsModalVisible(true);
              }}
              style={styles.cardWrapper}
            >
              <LinearGradient
                colors={["#FFD8B5", "#FFAB76"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardGradient}
              >
                <View style={styles.watermarkContainer}>
                  <Icon
                    name="tasks"
                    size={120}
                    color="rgba(255,255,255,0.15)"
                  />
                </View>
                <View style={styles.cardHeader}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>PRACTICE GOAL</Text>
                  </View>
                  <Text style={styles.cardTitle}>Practice Goal Type</Text>
                  <Text style={styles.cardDesc}>
                    How would you like to train?
                  </Text>
                </View>
                <View style={styles.cardFooter}>
                  <View style={styles.valueControlContainer}>
                    <Text style={styles.valueTextLarge}>
                      {selectedGoalType}
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* Dynamic Goal Limit Cards */}
            {selectedGoalType === "Time based" && (
              <View style={styles.cardWrapper}>
                <LinearGradient
                  colors={["#Cbf0f0", "#98E6E6"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.cardGradient}
                >
                  <View style={styles.watermarkContainer}>
                    <Icon
                      name="hourglass-half"
                      size={120}
                      color="rgba(255,255,255,0.15)"
                    />
                  </View>
                  <View style={styles.cardHeader}>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>DAILY LIMIT</Text>
                    </View>
                    <Text style={styles.cardTitle}>Daily practice limit</Text>
                    <Text style={styles.cardDesc}>
                      Set your target practice minutes
                    </Text>
                  </View>
                  <View style={styles.cardFooter}>
                    <View style={styles.valueControlRows}>
                      <TouchableOpacity
                        onPress={handleIncrementTargetMins}
                        style={styles.pillButton}
                      >
                        <Icon
                          name="plus"
                          size={12}
                          color={theme.colors.library.orange[600]}
                        />
                      </TouchableOpacity>
                      <Text
                        style={[
                          styles.valueTextLarge,
                          { marginHorizontal: 12 },
                        ]}
                      >
                        {targetMins} min
                      </Text>
                      <TouchableOpacity
                        onPress={handleDecrementTargetMins}
                        style={styles.pillButton}
                      >
                        <Icon
                          name="minus"
                          size={12}
                          color={theme.colors.library.orange[600]}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </LinearGradient>
              </View>
            )}

            {selectedGoalType === "Task based" && (
              <View style={styles.cardWrapper}>
                <LinearGradient
                  colors={["#Cbf0f0", "#98E6E6"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.cardGradient}
                >
                  <View style={styles.watermarkContainer}>
                    <Icon
                      name="check-double"
                      size={120}
                      color="rgba(255,255,255,0.15)"
                    />
                  </View>
                  <View style={styles.cardHeader}>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>TASK TARGET</Text>
                    </View>
                    <Text style={styles.cardTitle}>Daily task count</Text>
                    <Text style={styles.cardDesc}>
                      e.g., complete 3 tasks/day
                    </Text>
                  </View>
                  <View style={styles.cardFooter}>
                    <View style={styles.valueControlRows}>
                      <TouchableOpacity
                        onPress={handleIncrementTaskCount}
                        style={styles.pillButton}
                      >
                        <Icon
                          name="plus"
                          size={12}
                          color={theme.colors.library.orange[600]}
                        />
                      </TouchableOpacity>
                      <Text
                        style={[
                          styles.valueTextLarge,
                          { marginHorizontal: 12 },
                        ]}
                      >
                        {taskCount} tasks
                      </Text>
                      <TouchableOpacity
                        onPress={handleDecrementTaskCount}
                        style={styles.pillButton}
                      >
                        <Icon
                          name="minus"
                          size={12}
                          color={theme.colors.library.orange[600]}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </LinearGradient>
              </View>
            )}
          </CustomScrollView>
        </View>
      </ScreenView>
      <BottomSheetModal
        visible={isModalVisible}
        onClose={closeModal}
        maxHeight="70%"
        showCloseButton={true}
        fitContent={true}
      >
        <View
          style={[
            styles.modalContent,
            { paddingBottom: Math.max(insets.bottom, 24) },
          ]}
        >
          {(() => {
            const isTimer = openSettingType === "TIMER";
            const iconName = isTimer ? "clock" : "tasks";
            const iconColor = isTimer ? "#9333EA" : "#EA580C";
            const headerBg = isTimer ? "#F3E8FF" : "#FFF7ED";
            const title = isTimer ? "Practice Reminder" : "Practice Goal";

            return (
              <View style={[styles.modalHeader, { backgroundColor: headerBg }]}>
                <View
                  style={[
                    styles.modalIconCircle,
                    { backgroundColor: iconColor },
                  ]}
                >
                  <Icon name={iconName} size={20} color="white" solid />
                </View>
                <Text style={styles.modalTiteText}>{title}</Text>
              </View>
            );
          })()}
          {openSettingType === "GOAL" && <SelectGoalType />}
          {openSettingType === "TIMER" && (
            <TimeSelector
              onTimeChange={(time) => {
                void handleReminderTimeSelected(time);
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
          onChange={(_, date) => {
            setShowAndroidTimePicker(false);
            if (date) {
              void handleReminderTimeSelected(date);
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
    gap: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  cardWrapper: {
    borderRadius: 32,
    ...parseShadowStyle(theme.shadow.elevation2),
    overflow: "hidden",
  },
  cardGradient: {
    padding: 24,
    minHeight: 160,
    justifyContent: "space-between",
    position: "relative",
  },
  watermarkContainer: {
    position: "absolute",
    right: -20,
    bottom: -20,
    transform: [{ rotate: "-15deg" }],
    opacity: 0.8,
  },
  cardHeader: {
    zIndex: 1,
  },
  badge: {
    backgroundColor: "rgba(255,255,255,0.4)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  badgeText: {
    ...parseTextStyle(theme.typography.BodyDetails),
    fontSize: 10,
    fontWeight: "800",
    color: "rgba(0,0,0,0.6)",
    letterSpacing: 1,
  },
  cardTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    color: "rgba(0,0,0,0.8)",
    fontSize: 22,
    marginBottom: 4,
  },
  cardDesc: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "rgba(0,0,0,0.6)",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    zIndex: 1,
  },
  valueControlContainer: {
    backgroundColor: "rgba(255,255,255,0.4)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  valueControlRows: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.4)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  pillButton: {
    backgroundColor: "white",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  valueTextLarge: {
    fontSize: 18,
    fontWeight: "800",
    color: "rgba(0,0,0,0.7)",
  },

  // modal
  modalContent: {
    width: "100%",
    flex: 1,
    flexDirection: "column",
    backgroundColor: "#fff",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 40, // Increased to clear absolute handle
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    gap: 12,
  },
  modalIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTiteText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
    fontSize: 20,
    fontWeight: "800",
    flex: 1,
  },
  goalListContainer: {
    gap: 16,
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  goalCard: {
    width: "100%",
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  disabledCard: {
    backgroundColor: "#FFFFFF", // Changed from #F8FAFC
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
