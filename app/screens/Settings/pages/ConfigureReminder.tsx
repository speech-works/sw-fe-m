import React, { useState, useEffect } from "react";
import { StyleSheet, View, TouchableOpacity, Platform } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";

import {
  useReminderStore,
  ReminderType as StoreReminderType,
} from "../../../stores/reminders";
import { ReminderCategory } from "../../../constants/reminderTemplates";
import { requestNotificationPermissionWithFallback } from "../../../util/functions/notifications";
import { showSuccessBottomSheet } from "../../../util/functions/bottomSheet";
import {
  useTheme,
  spacing,
  radius,
  borderWidth,
  hitTarget,
  Page,
  TabDock,
  TextField,
  Button,
  Dialog,
  Text,
  icons,
} from "../../../design-system";

const CATEGORY_LABELS: Record<ReminderCategory, string> = {
  DAILY_PRACTICE: "Daily Practice",
  BREATHING: "Breathing",
  READING: "Reading",
  CHALLENGE: "Challenge",
  MOOD_CHECKIN: "Mood Check-in",
  CUSTOM: "Custom Reminder",
};

const DEFAULT_REMINDER_TITLES: Record<ReminderCategory, string> = {
  DAILY_PRACTICE: "Time to practice",
  BREATHING: "Breathe with us",
  READING: "Ready to read?",
  CHALLENGE: "Daily Challenge is ready",
  MOOD_CHECKIN: "How are you feeling?",
  CUSTOM: "Custom Reminder",
};

const DAYS_OF_WEEK = ["S", "M", "T", "W", "T", "F", "S"];

const getFormattedDate = (date: Date) => {
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
};

export default function ConfigureReminder() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors, scheme } = useTheme();

  const reminderId = route.params?.reminderId;
  const initialCategory = (route.params?.category as ReminderCategory) || "DAILY_PRACTICE";

  const { reminders, addReminder, updateReminder, removeReminder } = useReminderStore();

  // Form state
  const [selectedCategory, setSelectedCategory] = useState<ReminderCategory>(initialCategory);
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderType, setReminderType] = useState<StoreReminderType>("ROUTINE");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<Date>(new Date());
  const [selectedWeekDays, setSelectedWeekDays] = useState<number[]>([]);

  // For Android Pickers
  const [showAndroidTimePicker, setShowAndroidTimePicker] = useState(false);
  const [showAndroidDatePicker, setShowAndroidDatePicker] = useState(false);

  // Alert / confirm state
  const [promptVisible, setPromptVisible] = useState(false);
  const [promptConfig, setPromptConfig] = useState<{
    title: string;
    message: string;
    primaryLabel: string;
    primaryAction: () => void;
    secondaryLabel?: string;
    isDestructive?: boolean;
  }>({
    title: "",
    message: "",
    primaryLabel: "OK",
    primaryAction: () => {},
  });

  useEffect(() => {
    if (reminderId) {
      const existing = reminders.find((r) => r.id === reminderId);
      if (existing) {
        setSelectedCategory(existing.category);
        setReminderTitle(existing.title);
        setReminderType(existing.type);

        const [h, m] = existing.time.split(":").map(Number);
        const t = new Date();
        t.setHours(h, m, 0, 0);
        setSelectedTime(t);

        if (existing.type === "ONE_TIME" && existing.date) {
          const [mo, d, y] = existing.date.split("/").map(Number);
          setSelectedDate(new Date(y, mo - 1, d));
        } else if (existing.type === "ROUTINE") {
          setSelectedWeekDays(existing.weekDays || []);
        }
      }
    } else {
      setReminderTitle(DEFAULT_REMINDER_TITLES[initialCategory]);
    }
  }, [reminderId, reminders, initialCategory]);

  const toggleDay = (dayIndex: number) => {
    setSelectedWeekDays((prev) => {
      if (prev.includes(dayIndex)) {
        return prev.filter((d) => d !== dayIndex);
      }
      return [...prev, dayIndex].sort((a, b) => a - b);
    });
  };

  const handleSave = async () => {
    const hasPermission = await requestNotificationPermissionWithFallback();
    if (!hasPermission) return;

    if (reminderType === "ROUTINE" && selectedWeekDays.length === 0) {
      setPromptConfig({
        title: "Invalid Routine",
        message: "Please select at least one day for your routine.",
        primaryLabel: "Got it",
        primaryAction: () => {},
      });
      setPromptVisible(true);
      return;
    }

    const timeStr = `${selectedTime.getHours().toString().padStart(2, "0")}:${selectedTime.getMinutes().toString().padStart(2, "0")}`;

    const payload = {
      title: reminderTitle.trim() || DEFAULT_REMINDER_TITLES[selectedCategory],
      category: selectedCategory,
      type: reminderType,
      date: reminderType === "ONE_TIME" ? getFormattedDate(selectedDate) : "",
      time: timeStr,
      weekDays: reminderType === "ROUTINE" ? selectedWeekDays : undefined,
      active: true,
    };

    try {
      if (reminderId) {
        await updateReminder(reminderId, payload);
      } else {
        await addReminder(payload);
      }
      // Back to the list, then a success moment over it (the global OutcomeModal,
      // with its disc pop). ConfigureReminder is a screen, not a sheet, so there's
      // no stacked-native-modal concern here.
      navigation.goBack();
      showSuccessBottomSheet(
        reminderId ? "Reminder Updated" : "Reminder Set",
        reminderId
          ? "Your changes have been saved."
          : "We'll remind you at the time you picked.",
      );
    } catch (error: any) {
      setPromptConfig({
        title: "Error",
        message: error.message || "Failed to save reminder",
        primaryLabel: "OK",
        primaryAction: () => {},
      });
      setPromptVisible(true);
    }
  };

  const handleDelete = () => {
    setPromptConfig({
      title: "Delete Reminder",
      message: "Are you sure you want to delete this reminder?",
      primaryLabel: "Delete",
      isDestructive: true,
      primaryAction: async () => {
        await removeReminder(reminderId);
        navigation.goBack();
      },
      secondaryLabel: "Cancel",
    });
    setPromptVisible(true);
  };

  const isConfirm = !!promptConfig.secondaryLabel;

  return (
    <>
      <Page
        title={CATEGORY_LABELS[selectedCategory]}
        onBack={() => navigation.goBack()}
        keyboardAvoiding
        footer={<Button label="Save Reminder" onPress={handleSave} />}
      >
        {/* One-time vs routine */}
        <TabDock
          inline
          fitContent
          accessibilityLabel="Reminder type"
          surfaceColor={colors.surface.control}
          items={[
            { key: "ONE_TIME", label: "One Time", icon: icons.oneTime },
            { key: "ROUTINE", label: "Routine", icon: icons.routine },
          ]}
          activeKey={reminderType}
          onSelect={(k) => setReminderType(k as StoreReminderType)}
        />

        {/* Title */}
        <View style={styles.field}>
          <Text variant="label" color="tertiary" style={styles.label}>
            TITLE
          </Text>
          <TextField
            value={reminderTitle}
            onChangeText={setReminderTitle}
            placeholder="Reminder title..."
          />
        </View>

        {/* Date (one-time only) */}
        {reminderType === "ONE_TIME" ? (
          <View style={styles.field}>
            <Text variant="label" color="tertiary" style={styles.label}>
              DATE
            </Text>
            <View style={[styles.pickerCard, { backgroundColor: colors.surface.default }]}>
              {Platform.OS === "ios" ? (
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display="default"
                  themeVariant={scheme === "dark" ? "dark" : "light"}
                  onChange={(_, d) => d && setSelectedDate(d)}
                  minimumDate={new Date()}
                />
              ) : (
                <TouchableOpacity
                  style={[styles.androidPickerButton, { backgroundColor: colors.surface.control }]}
                  onPress={() => setShowAndroidDatePicker(true)}
                >
                  <Text variant="body">{selectedDate.toLocaleDateString()}</Text>
                </TouchableOpacity>
              )}
              {Platform.OS === "android" && showAndroidDatePicker ? (
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display="default"
                  minimumDate={new Date()}
                  onChange={(_, d) => {
                    setShowAndroidDatePicker(false);
                    if (d) setSelectedDate(d);
                  }}
                />
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Time */}
        <View style={styles.field}>
          <Text variant="label" color="tertiary" style={styles.label}>
            TIME
          </Text>
          <View style={[styles.pickerCard, { backgroundColor: colors.surface.default }]}>
            {Platform.OS === "ios" ? (
              <DateTimePicker
                value={selectedTime}
                mode="time"
                display="spinner"
                themeVariant={scheme === "dark" ? "dark" : "light"}
                onChange={(_, d) => d && setSelectedTime(d)}
                style={styles.iosTimeSpinner}
              />
            ) : (
              <TouchableOpacity
                style={[styles.androidPickerButton, { backgroundColor: colors.surface.control }]}
                onPress={() => setShowAndroidTimePicker(true)}
              >
                <Text variant="body">
                  {selectedTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </TouchableOpacity>
            )}
            {Platform.OS === "android" && showAndroidTimePicker ? (
              <DateTimePicker
                value={selectedTime}
                mode="time"
                display="default"
                onChange={(_, d) => {
                  setShowAndroidTimePicker(false);
                  if (d) setSelectedTime(d);
                }}
              />
            ) : null}
          </View>
        </View>

        {/* Repeat (routine only) */}
        {reminderType === "ROUTINE" ? (
          <View style={styles.field}>
            <Text variant="label" color="tertiary" style={styles.label}>
              REPEAT ON
            </Text>
            <View style={styles.daysRow}>
              {DAYS_OF_WEEK.map((day, i) => {
                const isActive = selectedWeekDays.includes(i);
                return (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.dayButton,
                      {
                        backgroundColor: isActive
                          ? colors.action.primary
                          : colors.surface.control,
                        borderColor: isActive
                          ? colors.border.selected
                          : colors.border.default,
                      },
                    ]}
                    onPress={() => toggleDay(i)}
                  >
                    <Text
                      variant="bodySm"
                      color={isActive ? colors.action.onPrimary : "secondary"}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* Delete (edit mode only) */}
        {reminderId ? (
          <Button
            label="Delete Reminder"
            variant="danger"
            leftIcon="trash-2"
            onPress={handleDelete}
          />
        ) : null}
      </Page>

      {/* Alert / confirm */}
      <Dialog
        visible={promptVisible}
        onClose={() => setPromptVisible(false)}
        title={promptConfig.title}
        message={promptConfig.message}
        cancelLabel={isConfirm ? promptConfig.secondaryLabel : promptConfig.primaryLabel}
        confirmLabel={isConfirm ? promptConfig.primaryLabel : undefined}
        destructive={promptConfig.isDestructive}
        onConfirm={
          isConfirm
            ? () => {
                promptConfig.primaryAction();
                setPromptVisible(false);
              }
            : undefined
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    width: "100%",
  },
  label: {
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  pickerCard: {
    borderRadius: radius.card,
    padding: spacing.lg,
    alignItems: "center",
  },
  androidPickerButton: {
    width: "100%",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.input,
    alignItems: "center",
  },
  iosTimeSpinner: {
    height: 160,
  },
  daysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayButton: {
    width: hitTarget.min,
    height: hitTarget.min,
    borderRadius: radius.full,
    borderWidth: borderWidth.thin,
    alignItems: "center",
    justifyContent: "center",
  },
});
