import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  TextInput,
  Alert,
} from "react-native";
import React, { useState, useEffect } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
import { theme } from "../../../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../util/functions/parseStyles";
import BottomSheetModal from "../../../../../components/BottomSheetModal";
import Button from "../../../../../components/Button";
import CustomScrollView from "../../../../../components/CustomScrollView";
import {
  useReminderStore,
  ReminderType as StoreReminderType,
} from "../../../../../stores/reminders"; // Import store and ReminderType alias
import { registerForNotifications } from "../../../../../util/functions/notifications";

interface ReminderProps {
  onReminderSet?: () => void;
}

const Reminder = ({ onReminderSet }: ReminderProps) => {
  // Use Zustand store action
  const addReminder = useReminderStore((state) => state.addReminder);

  const [isVisible, setIsVisible] = useState(false);
  const [reminderType, setReminderType] =
    useState<StoreReminderType>("ONE_TIME"); // Changed to match store's ReminderType

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<Date>(new Date());
  const [selectedWeekDays, setSelectedWeekDays] = useState<number[]>([]); // 0=Sun, 6=Sat

  const [reminderNotes, setReminderNotes] = useState<string>("");

  // Helper to format date for display (MM/DD/YYYY)
  const getFormattedDate = (date: Date) => {
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  // Helper to format time for display (HH:MM)
  const getFormattedTime = (date: Date) => {
    const hrs = date.getHours().toString().padStart(2, "0");
    const mins = date.getMinutes().toString().padStart(2, "0");
    return `${hrs}:${mins}`;
  };

  // Whenever the modal opens, default “date”→ tomorrow and “time”→ now
  useEffect(() => {
    if (isVisible) {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1); // Set to tomorrow

      setSelectedDate(tomorrow);
      setSelectedTime(now); // Keep current time

      // Reset notes and weekdays when opening the modal
      setReminderNotes("");
      setSelectedWeekDays([]);
      setReminderType("ONE_TIME"); // Default to one-time on open
    }
  }, [isVisible]);

  const closeModal = () => {
    setIsVisible(false);
    // State is reset by useEffect when modal opens again, or by explicit resets in handleSaveReminder if needed
  };

  const handleSaveReminder = async () => {
    // 1. Request notification permissions first
    const hasPermissions = await registerForNotifications();
    if (!hasPermissions) {
      Alert.alert(
        "Permissions Required",
        "Please enable notification permissions in your device settings to receive reminders."
      );
      return; // Stop the process if permissions are not granted
    }

    // 2. Validate inputs before saving
    const now = new Date();
    const reminderDateTime = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
      selectedTime.getHours(),
      selectedTime.getMinutes()
    );

    if (
      reminderType === "ONE_TIME" &&
      reminderDateTime.getTime() <= now.getTime()
    ) {
      Alert.alert(
        "Invalid Date/Time",
        "One-time reminders must be set for a future date and time. Please adjust."
      );
      return;
    }

    if (reminderType === "ROUTINE" && selectedWeekDays.length === 0) {
      Alert.alert(
        "No Days Selected",
        "Please select at least one day for a routine reminder."
      );
      return;
    }

    // 3. Prepare reminder object for the Zustand store
    const reminderData = {
      type: reminderType,
      // Format date as 'YYYY-MM-DD'
      date: selectedDate.toISOString().split("T")[0],
      // Format time as 'HH:MM'
      time: getFormattedTime(selectedTime),
      notes: reminderNotes.trim() || undefined, // Store as undefined if notes are empty
      weekDays: reminderType === "ROUTINE" ? selectedWeekDays : undefined, // Only include for routine
    };

    // 4. Call the Zustand store action to add the reminder
    try {
      await addReminder(reminderData);
      Alert.alert("Success", "Your reminder has been set!");
      if (onReminderSet) {
        onReminderSet();
      }
      closeModal(); // Close modal on successful save
    } catch (error) {
      console.error("Failed to save reminder:", error);
      Alert.alert(
        "Error",
        "There was an error setting your reminder. Please try again."
      );
    }
  };

  const toggleWeekDay = (dayIndex: number) => {
    setSelectedWeekDays((prev) => {
      if (prev.includes(dayIndex)) {
        return prev.filter((d) => d !== dayIndex);
      } else {
        return [...prev, dayIndex].sort((a, b) => a - b); // Keep sorted for consistency
      }
    });
  };

  const onChangeDate = (_: any, date?: Date) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  const onChangeTime = (_: any, time?: Date) => {
    if (time) {
      setSelectedTime(time);
    }
  };

  // Weekday display letters (0=Sun, 6=Sat)
  const weekDayLetters = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <React.Fragment>
      <Button text="Set Reminder" onPress={() => setIsVisible(true)} />

      <BottomSheetModal
        visible={isVisible}
        onClose={closeModal}
        maxHeight="80%"
      >
        <View style={styles.modalContent}>
          <View style={styles.modalTitleContainer}>
            <Text style={styles.modalTiteText}>Set Reminder</Text>
            <Text style={styles.modalDescText}>
              Select a time to receive notification
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
            contentContainerStyle={styles.scrollContainer}
          >
            <>
              <View style={styles.pickerSection}>
                {/* Date picker only for "One Time" reminders */}
                {reminderType === "ONE_TIME" && (
                  <>
                    <Text style={styles.inputLabel}>Date</Text>
                    <DateTimePicker
                      value={selectedDate}
                      mode="date"
                      display={Platform.OS === "ios" ? "inline" : "default"}
                      onChange={onChangeDate}
                      minimumDate={new Date()} // Prevent selecting past dates
                      maximumDate={new Date(2100, 11, 31)}
                      style={styles.datePicker}
                    />
                  </>
                )}

                <Text style={[styles.inputLabel, { marginTop: 16 }]}>Time</Text>
                <DateTimePicker
                  value={selectedTime}
                  mode="time"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  is24Hour={true} // Ensure 24-hour format
                  onChange={onChangeTime}
                  style={styles.timePicker}
                />
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
                  placeholder="Focus on breath control exercises"
                  value={reminderNotes}
                  onChangeText={setReminderNotes}
                  multiline
                  numberOfLines={4}
                  maxLength={200} // Optional: limit notes length
                />
              </View>

              <View style={styles.actionButtonsContainer}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={closeModal}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSaveReminder}
                >
                  <Text style={styles.saveButtonText}>Save Reminder</Text>
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
    paddingVertical: 24,
    width: "100%",
    gap: 32,
  },
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
  scrollView: {
    flex: 1,
  },
  scrollContainer: {
    gap: 16,
    alignItems: "center",
  },

  toggleContainer: {
    flexDirection: "row",
    backgroundColor: theme.colors.background.default,
    borderRadius: 24,
    overflow: "hidden",
    alignSelf: "center",
    width: "80%",
    height: 48,
  },
  toggleButton: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 24,
  },
  toggleButtonActive: {
    backgroundColor: theme.colors.actionPrimary.default,
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  toggleButtonText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
  },
  toggleButtonTextActive: {
    color: theme.colors.text.onDark,
    fontWeight: "bold",
  },
  pickerSection: {
    width: "100%",
    alignItems: "center",
    gap: 8,
  },
  inputLabel: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
    marginBottom: 4,
    alignSelf: "flex-start",
  },

  datePicker: {
    width: "100%",
  },
  timePicker: {
    width: "100%",
  },
  inputSection: {
    width: "100%",
    gap: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: "center",
  },
  notesInput: {
    height: 100,
    textAlignVertical: "top",
  },
  actionButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    gap: 16,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: theme.colors.background.light,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.border.default,
  },
  cancelButtonText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
  },
  saveButton: {
    flex: 1,
    backgroundColor: theme.colors.actionPrimary.default,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  saveButtonText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.onDark,
    fontWeight: "bold",
  },

  repeatContainer: {
    width: "100%",
    alignItems: "flex-start",
    marginBottom: 16,
    gap: 12,
  },
  repeatLabel: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
    marginBottom: 8,
  },
  weekDaysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20, // Half of width/height for perfect circle
    borderWidth: 1, // Added border for better visual separation when not active
    borderColor: theme.colors.border.default,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background.default,
  },
  dayButtonActive: {
    backgroundColor: theme.colors.actionPrimary.default,
    borderColor: theme.colors.actionPrimary.default,
  },
  dayButtonText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
  dayButtonTextActive: {
    color: theme.colors.text.onDark,
    fontWeight: "bold",
  },
});
