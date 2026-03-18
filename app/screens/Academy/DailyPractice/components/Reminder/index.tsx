import DateTimePicker from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BottomSheetModal from "../../../../../components/BottomSheetModal";
import Button from "../../../../../components/Button";
import CustomScrollView from "../../../../../components/CustomScrollView";
import {
  ReminderType as StoreReminderType,
  useReminderStore,
} from "../../../../../stores/reminders";
import { theme } from "../../../../../Theme/tokens";
import { registerForNotifications } from "../../../../../util/functions/notifications";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../util/functions/parseStyles";

interface ReminderProps {
  onReminderSet?: () => void;
  renderTrigger?: (onOpen: () => void) => React.ReactNode;
}

const Reminder = ({ onReminderSet, renderTrigger }: ReminderProps) => {
  const insets = useSafeAreaInsets();
  const addReminder = useReminderStore((state) => state.addReminder);
  const [isVisible, setIsVisible] = useState(false);
  const [reminderType, setReminderType] =
    useState<StoreReminderType>("ONE_TIME");

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<Date>(new Date());
  const [selectedWeekDays, setSelectedWeekDays] = useState<number[]>([]);
  const [reminderNotes, setReminderNotes] = useState<string>("");

  const getFormattedDate = (date: Date) => {
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const getFormattedTime = (date: Date) => {
    const hrs = date.getHours().toString().padStart(2, "0");
    const mins = date.getMinutes().toString().padStart(2, "0");
    return `${hrs}:${mins}`;
  };

  useEffect(() => {
    if (isVisible) {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      setSelectedDate(tomorrow);
      setSelectedTime(now);
      setReminderNotes("");
      setSelectedWeekDays([]);
      setReminderType("ONE_TIME");
    }
  }, [isVisible]);

  const closeModal = () => {
    setIsVisible(false);
  };

  const handleSaveReminder = async () => {
    const hasPermissions = await registerForNotifications();
    if (!hasPermissions) {
      Alert.alert(
        "Permissions Required",
        "Please enable notification permissions in your device settings.",
      );
      return;
    }

    const now = new Date();
    const reminderDateTime = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
      selectedTime.getHours(),
      selectedTime.getMinutes(),
    );

    if (
      reminderType === "ONE_TIME" &&
      reminderDateTime.getTime() <= now.getTime()
    ) {
      Alert.alert(
        "Invalid Date/Time",
        "One-time reminders must be in the future.",
      );
      return;
    }

    if (reminderType === "ROUTINE" && selectedWeekDays.length === 0) {
      Alert.alert("No Days Selected", "Please select at least one day.");
      return;
    }

    const reminderData = {
      type: reminderType,
      date: selectedDate.toISOString().split("T")[0],
      time: getFormattedTime(selectedTime),
      notes: reminderNotes.trim() || undefined,
      weekDays: reminderType === "ROUTINE" ? selectedWeekDays : undefined,
    };

    try {
      await addReminder(reminderData);
      Alert.alert("Success", "Your reminder has been set!");
      if (onReminderSet) onReminderSet();
      closeModal();
    } catch (error) {
      console.error("Failed to save reminder:", error);
      Alert.alert("Error", "Could not save reminder. Please try again.");
    }
  };

  const toggleWeekDay = (dayIndex: number) => {
    setSelectedWeekDays((prev) => {
      if (prev.includes(dayIndex)) {
        return prev.filter((d) => d !== dayIndex);
      } else {
        return [...prev, dayIndex].sort((a, b) => a - b);
      }
    });
  };

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const isAndroid = Platform.OS === "android";

  const onChangeDate = (event: any, date?: Date) => {
    if (isAndroid) setShowDatePicker(false);
    if (event.type === "dismissed") return;
    if (date) setSelectedDate(date);
  };

  const onChangeTime = (event: any, time?: Date) => {
    if (isAndroid) setShowTimePicker(false);
    if (event.type === "dismissed") return;
    if (time) setSelectedTime(time);
  };

  const weekDayLetters = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <React.Fragment>
      {renderTrigger ? (
        renderTrigger(() => setIsVisible(true))
      ) : (
        <Button text="Set Reminder" onPress={() => setIsVisible(true)} />
      )}

      <BottomSheetModal
        visible={isVisible}
        onClose={closeModal}
        maxHeight="80%"
        showCloseButton={true}
        fitContent={true}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalTitleContainer}>
            <Text style={styles.modalTiteText}>Set Reminder</Text>
            <Text style={styles.modalDescText}>
              Set a time to build your daily habit
            </Text>
          </View>

          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                reminderType === "ONE_TIME" && styles.toggleButtonActive,
              ]}
              onPress={() => setReminderType("ONE_TIME")}
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  reminderType === "ONE_TIME" && styles.toggleButtonTextActive,
                ]}
              >
                One Time
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                reminderType === "ROUTINE" && styles.toggleButtonActive,
              ]}
              onPress={() => setReminderType("ROUTINE")}
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  reminderType === "ROUTINE" && styles.toggleButtonTextActive,
                ]}
              >
                Routine
              </Text>
            </TouchableOpacity>
          </View>

          <CustomScrollView
            style={styles.scrollView}
            nestedScrollEnabled={true}
            contentContainerStyle={[
              styles.scrollContainer,
              { paddingBottom: Math.max(insets.bottom, 40) },
            ]}
          >
            <>
              <View style={styles.pickerSection}>
                {reminderType === "ONE_TIME" && (
                  <View style={{ width: "100%" }}>
                    <Text style={styles.inputLabel}>Date</Text>
                    {isAndroid ? (
                      <TouchableOpacity
                        onPress={() => setShowDatePicker(true)}
                        style={styles.androidPickerButton}
                      >
                        <Text style={styles.androidPickerText}>
                          {getFormattedDate(selectedDate)}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <DateTimePicker
                        value={selectedDate}
                        mode="date"
                        display="inline"
                        onChange={onChangeDate}
                        minimumDate={new Date()}
                        maximumDate={new Date(2100, 11, 31)}
                        style={styles.datePicker}
                      />
                    )}
                    {isAndroid && showDatePicker && (
                      <DateTimePicker
                        value={selectedDate}
                        mode="date"
                        display="default"
                        onChange={onChangeDate}
                        minimumDate={new Date()}
                      />
                    )}
                  </View>
                )}

                <View style={{ width: "100%", marginTop: 16 }}>
                  <Text style={styles.inputLabel}>Time</Text>
                  {isAndroid ? (
                    <TouchableOpacity
                      onPress={() => setShowTimePicker(true)}
                      style={styles.androidPickerButton}
                    >
                      <Text style={styles.androidPickerText}>
                        {getFormattedTime(selectedTime)}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <DateTimePicker
                      value={selectedTime}
                      mode="time"
                      display="spinner"
                      is24Hour={true}
                      onChange={onChangeTime}
                      style={styles.timePicker}
                    />
                  )}
                  {isAndroid && showTimePicker && (
                    <DateTimePicker
                      value={selectedTime}
                      mode="time"
                      display="default"
                      is24Hour={true}
                      onChange={onChangeTime}
                    />
                  )}
                </View>
              </View>

              {reminderType === "ROUTINE" && (
                <View style={styles.repeatContainer}>
                  <Text style={styles.repeatLabel}>Repeat On</Text>
                  <View style={styles.weekDaysRow}>
                    {weekDayLetters.map((letter, index) => {
                      const isSelected = selectedWeekDays.includes(index);
                      return (
                        <TouchableOpacity
                          key={index}
                          onPress={() => toggleWeekDay(index)}
                          style={[
                            styles.dayButton,
                            isSelected && styles.dayButtonActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.dayButtonText,
                              isSelected && styles.dayButtonTextActive,
                            ]}
                          >
                            {letter}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Notes (optional)</Text>
                <TextInput
                  style={[styles.input, styles.notesInput]}
                  placeholder="Focus on breath control..."
                  placeholderTextColor={theme.colors.text.disabled}
                  value={reminderNotes}
                  onChangeText={setReminderNotes}
                  multiline
                  numberOfLines={4}
                  maxLength={200}
                />
              </View>

              <View style={styles.actionButtonsContainer}>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSaveReminder}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[
                      theme.colors.actionPrimary.default,
                      theme.colors.library.orange[500],
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.saveGradient}
                  >
                    <Text style={styles.saveButtonText}>Save Reminder</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </>
          </CustomScrollView>
        </View>
      </BottomSheetModal>
    </React.Fragment>
  );
};

export default Reminder;

const styles = StyleSheet.create({
  modalContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
    width: "100%",
  },
  modalTitleContainer: {
    marginTop: 8,
    marginBottom: 32,
    alignItems: "center",
    gap: 8,
  },
  modalTiteText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
    textAlign: "center",
  },
  modalDescText: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: theme.colors.text.default,
    textAlign: "center",
    opacity: 0.7,
  },
  scrollView: {
    flex: 1,
  },
  scrollContainer: {
    gap: 24,
    paddingBottom: 40,
  },
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 30,
    padding: 4,
    width: "100%",
    height: 56,
  },
  toggleButton: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 26,
  },
  toggleButtonActive: {
    backgroundColor: "#FFFFFF",
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  toggleButtonText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.disabled,
    fontWeight: "600",
  },
  toggleButtonTextActive: {
    color: theme.colors.text.title,
    fontWeight: "700",
  },
  pickerSection: {
    width: "100%",
    gap: 20,
  },
  inputLabel: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
    fontWeight: "700",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontSize: 11,
  },
  datePicker: {
    width: "100%",
    alignSelf: "center",
  },
  timePicker: {
    width: "100%",
    alignSelf: "center",
  },
  androidPickerButton: {
    width: "100%",
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF", // Changed from #F8FAFC
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "flex-start",
  },
  androidPickerText: {
    ...parseTextStyle(theme.typography.Heading3),
    fontSize: 18,
    color: theme.colors.text.title,
    fontWeight: "500",
  },
  repeatContainer: {
    width: "100%",
    gap: 12,
  },
  repeatLabel: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
    fontWeight: "700",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontSize: 11,
  },
  weekDaysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  dayButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  dayButtonActive: {
    backgroundColor: theme.colors.actionPrimary.default,
    borderColor: theme.colors.actionPrimary.default,
  },
  dayButtonText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.disabled,
    fontWeight: "600",
  },
  dayButtonTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  inputSection: {
    width: "100%",
    gap: 8,
  },
  input: {
    backgroundColor: "#FFFFFF", // Changed from #F8FAFC
    borderWidth: 1, // Added border for visibility
    borderColor: "#E2E8F0", // Added border for visibility
    borderRadius: 20,
    padding: 20,
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
  },
  notesInput: {
    height: 120,
    textAlignVertical: "top",
  },
  actionButtonsContainer: {
    flexDirection: "row",
    gap: 16,
    marginTop: 12,
  },
  cancelButton: {
    flex: 1,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  cancelButtonText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.disabled,
    fontWeight: "600",
  },
  saveButton: {
    flex: 2,
    height: 56,
    borderRadius: 28,
    overflow: "hidden", // Clip gradient
    ...parseShadowStyle(theme.shadow.elevation2),
  },
  saveGradient: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  saveButtonText: {
    ...parseTextStyle(theme.typography.Heading3),
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
