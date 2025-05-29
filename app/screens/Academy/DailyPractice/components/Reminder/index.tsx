import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  TextInput,
} from "react-native";
import React, { useState, useEffect } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
import { theme } from "../../../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../util/functions/parseStyles";
import BottomSheetModal from "../../../../../components/BottomSheetModal"; // update the path as needed
import Button from "../../../../../components/Button";
import CustomScrollView from "../../../../../components/CustomScrollView";

interface ReminderProps {
  onReminderSet?: () => void;
}

const Reminder = ({ onReminderSet }: ReminderProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [reminderType, setReminderType] = useState<"One Time" | "Routine">(
    "One Time"
  );

  // We’ll keep these two states as JavaScript Date objects:
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<Date>(new Date());

  const [selectedWeekDays, setSelectedWeekDays] = useState<number[]>([]);

  // If you still want to store “formatted” strings to log or send to your backend,
  // you can derive them just before saving. We’ll keep these here just for display/logging:
  const [reminderDateString, setReminderDateString] = useState<string>("");
  const [reminderTimeString, setReminderTimeString] = useState<string>("");

  const [reminderNotes, setReminderNotes] = useState<string>("");

  // Whenever the modal opens, default “date”→ tomorrow and “time”→ now
  useEffect(() => {
    if (isVisible) {
      // Tomorrow’s date:
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);

      // Current time (we’ll keep hours/minutes from “now”)
      const currentTime = new Date(now);

      setSelectedDate(tomorrow);
      setSelectedTime(currentTime);

      // Also initialize the formatted strings:
      const month = (tomorrow.getMonth() + 1).toString().padStart(2, "0");
      const day = tomorrow.getDate().toString().padStart(2, "0");
      const year = tomorrow.getFullYear();
      setReminderDateString(`${month}/${day}/${year}`);

      const hrs = currentTime.getHours().toString().padStart(2, "0");
      const mins = currentTime.getMinutes().toString().padStart(2, "0");
      setReminderTimeString(`${hrs}:${mins}`);

      // Clear notes, type resets handled in closeModal
    }
  }, [isVisible]);

  const closeModal = () => {
    setIsVisible(false);
    setReminderNotes("");
    setReminderType("One Time");
    // We don't need to explicitly reset `selectedDate` or `selectedTime` here,
    // because the useEffect above will overwrite them when opening again.
  };

  const handleSaveReminder = () => {
    // Compose formatted strings one more time in case user adjusted pickers:
    const pickedDate = selectedDate;
    const month = (pickedDate.getMonth() + 1).toString().padStart(2, "0");
    const day = pickedDate.getDate().toString().padStart(2, "0");
    const year = pickedDate.getFullYear();
    const finalDateString = `${month}/${day}/${year}`;

    const pickedTime = selectedTime;
    const hrs = pickedTime.getHours().toString().padStart(2, "0");
    const mins = pickedTime.getMinutes().toString().padStart(2, "0");
    const finalTimeString = `${hrs}:${mins}`;

    console.log({
      reminderType,
      reminderDate: finalDateString,
      reminderTime: finalTimeString,
      reminderNotes,
      repeatOn: reminderType === "Routine" ? selectedWeekDays : [],
    });

    if (onReminderSet) {
      onReminderSet();
    }
    closeModal();
  };

  const toggleWeekDay = (dayIndex: number) => {
    setSelectedWeekDays((prev) => {
      if (prev.includes(dayIndex)) {
        return prev.filter((d) => d !== dayIndex);
      } else {
        return [...prev, dayIndex];
      }
    });
  };

  // Handlers for changing date/time via the native picker
  const onChangeDate = (_: any, date?: Date) => {
    if (Platform.OS === "android") {
      // On Android, the picker is a dialog; “date” is only passed when the user confirms.
      setSelectedDate(date!);

      // Update formatted string immediately
      const month = (date!.getMonth() + 1).toString().padStart(2, "0");
      const day = date!.getDate().toString().padStart(2, "0");
      const year = date!.getFullYear();
      setReminderDateString(`${month}/${day}/${year}`);
    } else {
      // On iOS (inline), “date” is always provided as user scrolls
      setSelectedDate(date!);
      const month = (date!.getMonth() + 1).toString().padStart(2, "0");
      const day = date!.getDate().toString().padStart(2, "0");
      const year = date!.getFullYear();
      setReminderDateString(`${month}/${day}/${year}`);
    }
  };

  const onChangeTime = (_: any, time?: Date) => {
    if (Platform.OS === "android") {
      setSelectedTime(time!);
      const hrs = time!.getHours().toString().padStart(2, "0");
      const mins = time!.getMinutes().toString().padStart(2, "0");
      setReminderTimeString(`${hrs}:${mins}`);
    } else {
      setSelectedTime(time!);
      const hrs = time!.getHours().toString().padStart(2, "0");
      const mins = time!.getMinutes().toString().padStart(2, "0");
      setReminderTimeString(`${hrs}:${mins}`);
    }
  };

  return (
    <React.Fragment>
      {/* Button to open the reminder modal */}
      <Button text="Set Reminder" onPress={() => setIsVisible(true)} />

      {/* BottomSheetModal for setting the reminder */}
      <BottomSheetModal
        visible={isVisible}
        onClose={closeModal}
        maxHeight="80%"
      >
        <View style={styles.modalContent}>
          {/* Title + Subtitle */}
          <View style={styles.modalTitleContainer}>
            <Text style={styles.modalTiteText}>Set Reminder</Text>
            <Text style={styles.modalDescText}>
              Select a time to receive notification
            </Text>
          </View>

          {/* One Time / Routine Toggle */}
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                reminderType === "One Time" && styles.toggleButtonActive,
              ]}
              onPress={() => setReminderType("One Time")}
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  reminderType === "One Time" && styles.toggleButtonTextActive,
                ]}
              >
                One Time
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                reminderType === "Routine" && styles.toggleButtonActive,
              ]}
              onPress={() => setReminderType("Routine")}
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  reminderType === "Routine" && styles.toggleButtonTextActive,
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
              {/* NATIVE PICKERS */}
              <View style={styles.pickerSection}>
                {/* DATE */}
                <Text style={styles.inputLabel}>Date</Text>
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display={Platform.OS === "ios" ? "inline" : "default"}
                  onChange={onChangeDate}
                  maximumDate={new Date(2100, 11, 31)}
                  minimumDate={new Date(1900, 0, 1)}
                  style={styles.datePicker} // only has effect on iOS inline
                />

                {/* TIME */}
                <Text style={[styles.inputLabel, { marginTop: 16 }]}>Time</Text>
                <DateTimePicker
                  value={selectedTime}
                  mode="time"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  is24Hour
                  onChange={onChangeTime}
                  style={styles.timePicker} // only has effect on iOS inline
                />
              </View>

              {/* REPEAT DAYS */}

              {reminderType === "Routine" && (
                <View style={styles.repeatContainer}>
                  <Text style={styles.repeatLabel}>Repeat On</Text>
                  <View style={styles.weekDaysRow}>
                    {["S", "M", "T", "W", "T", "F", "S"].map(
                      (letter, index) => {
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
                      }
                    )}
                  </View>
                </View>
              )}

              {/* Notes */}
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Notes (optional)</Text>
                <TextInput
                  style={[styles.input, styles.notesInput]}
                  placeholder="Focus on breath control exercises"
                  value={reminderNotes}
                  onChangeText={setReminderNotes}
                  multiline
                  numberOfLines={4}
                />
              </View>

              {/* Action Buttons */}
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
    flex: 1, // ← forces ScrollView to fill all vertical space under the title
  },
  scrollContainer: {
    gap: 16,
    alignItems: "center",
    // NO flex:1 here—let content size itself
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
    //paddingHorizontal: 24,
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
    //paddingHorizontal: 24,
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
    // paddingHorizontal: 24,
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
    // paddingHorizontal: 24,
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
    borderRadius: "50%",
    //borderWidth: 1,
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
