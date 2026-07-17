import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import PressableScale from "../../../../../components/PressableScale";
import {
  useTheme,
  spacing,
  radius,
  borderWidth,
  Text,
  Icon,
  icons,
  IconButton,
  Button,
  TabDock,
  TextField,
  Sheet,
} from "../../../../../design-system";
import {
  type Reminder,
  useReminderStore,
} from "../../../../../stores/reminders";
import { showSuccessBottomSheet } from "../../../../../util/functions/bottomSheet";
import { requestNotificationPermissionWithFallback } from "../../../../../util/functions/notifications";
import {
  REMINDER_TEMPLATES,
  CUSTOM_CATEGORY,
  getRandomMessage,
  type ReminderCategory,
} from "../../../../../constants/reminderTemplates";
import type { ReminderType as StoreReminderType } from "../../../../../stores/reminders";

interface ReminderProps {
  onReminderSet?: () => void;
  renderTrigger?: (onOpen: () => void) => React.ReactNode;
  /** Pre-select a category based on the practice type just completed */
  suggestedCategory?: ReminderCategory;
  /** If provided, opens in edit mode with this reminder's data */
  editReminder?: Reminder;
  /** External control: if true, opens the modal */
  isOpen?: boolean;
  /** External control: called when the modal wants to close */
  onClose?: () => void;
}

const allCategories = [
  ...REMINDER_TEMPLATES.map((t) => ({
    category: t.category,
    label: t.label,
    description: t.description,
    icon: t.icon,
    color: t.color,
    bgColor: t.bgColor,
  })),
  CUSTOM_CATEGORY,
];

const ReminderModal = ({
  onReminderSet,
  renderTrigger,
  suggestedCategory,
  editReminder,
  isOpen,
  onClose: onCloseProp,
}: ReminderProps) => {
  const { colors, scheme } = useTheme();
  const addReminder = useReminderStore((state) => state.addReminder);
  const updateReminder = useReminderStore((state) => state.updateReminder);
  const canAddMore = useReminderStore((state) => state.canAddMore);

  // Use external control if provided, otherwise internal
  const [internalVisible, setInternalVisible] = useState(false);
  const isVisible = isOpen !== undefined ? isOpen : internalVisible;

  // Step management: "pick" = category picker, "configure" = form
  const [step, setStep] = useState<"pick" | "configure">("pick");
  const [selectedCategory, setSelectedCategory] =
    useState<ReminderCategory | null>(null);
  const [reminderType, setReminderType] =
    useState<StoreReminderType>("ROUTINE");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<Date>(new Date());
  const [selectedWeekDays, setSelectedWeekDays] = useState<number[]>([]);
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderBody, setReminderBody] = useState("");

  const isEditing = !!editReminder;

  // Success feedback is deferred until the sheet has fully dismissed. The success
  // toast is the global OutcomeModal (a native Modal); firing it while this Sheet
  // (also a native Modal) is still up stacks two native modals and freezes touch on
  // iOS. We stash the message here and fire it from the Sheet's onDismissed.
  const pendingSuccessRef = useRef<{ title: string; message: string } | null>(null);

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

  const getStorageDate = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Reset state when modal opens
  useEffect(() => {
    if (isVisible) {
      if (editReminder) {
        // Edit mode — pre-fill from existing reminder
        setStep("configure");
        setSelectedCategory(editReminder.category);
        setReminderType(editReminder.type);
        setReminderTitle(editReminder.title);
        setReminderBody(editReminder.body || "");
        setSelectedWeekDays(editReminder.weekDays || []);

        const [h, m] = editReminder.time.split(":").map(Number);
        const time = new Date();
        time.setHours(h, m, 0, 0);
        setSelectedTime(time);

        if (editReminder.type === "ONE_TIME") {
          const [y, mo, d] = editReminder.date.split("-").map(Number);
          setSelectedDate(new Date(y, mo - 1, d));
        }
      } else if (suggestedCategory) {
        // Auto-select from Done screen context
        handleCategorySelect(suggestedCategory);
      } else {
        // Fresh — show picker
        resetForm();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);

  const resetForm = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    setStep("pick");
    setSelectedCategory(null);
    setReminderType("ROUTINE");
    setSelectedDate(tomorrow);
    setSelectedTime(now);
    setSelectedWeekDays([]);
    setReminderTitle("");
    setReminderBody("");
  };

  const handleCategorySelect = (category: ReminderCategory) => {
    setSelectedCategory(category);
    setStep("configure");

    if (category !== "CUSTOM") {
      const { message } = getRandomMessage(category);
      setReminderTitle(message.title);
      setReminderBody(message.body);
    } else {
      setReminderTitle("");
      setReminderBody("");
    }

    // Set sensible defaults
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    setSelectedDate(tomorrow);
    setSelectedTime(now);
    setSelectedWeekDays([]);
    setReminderType("ROUTINE");
  };

  const closeModal = () => {
    if (onCloseProp) {
      onCloseProp();
    } else {
      setInternalVisible(false);
    }
  };

  // Fires once the sheet has fully animated out — safe to show the success toast now.
  const firePendingSuccess = () => {
    const pending = pendingSuccessRef.current;
    if (pending) {
      pendingSuccessRef.current = null;
      showSuccessBottomSheet(pending.title, pending.message);
    }
  };

  const handleSaveReminder = async () => {
    const hasPermissions = await requestNotificationPermissionWithFallback();
    if (!hasPermissions) {
      return;
    }

    if (!reminderTitle.trim()) {
      Alert.alert("Title Required", "Please enter a title for your reminder.");
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
      title: reminderTitle.trim(),
      body: reminderBody.trim() || undefined,
      category: selectedCategory || ("CUSTOM" as ReminderCategory),
      type: reminderType,
      date: getStorageDate(selectedDate),
      time: getFormattedTime(selectedTime),
      weekDays: reminderType === "ROUTINE" ? selectedWeekDays : undefined,
      active: true,
    };

    try {
      if (isEditing && editReminder) {
        await updateReminder(editReminder.id, reminderData);
        pendingSuccessRef.current = {
          title: "Reminder Updated",
          message: "Your changes have been saved.",
        };
      } else {
        await addReminder(reminderData);
        pendingSuccessRef.current = {
          title: "Reminder Set",
          message: "We'll remind you at the time you picked.",
        };
      }
      if (onReminderSet) onReminderSet();
      // Close first; the success toast fires from the Sheet's onDismissed (avoids
      // stacking two native modals, which freezes touch on iOS).
      closeModal();
    } catch (error: any) {
      console.error("Failed to save reminder:", error);
      Alert.alert(
        "Error",
        error?.message || "Could not save reminder. Please try again.",
      );
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

  // Get the selected template for styling
  const selectedTemplate = selectedCategory
    ? allCategories.find((c) => c.category === selectedCategory)
    : null;

  const handleOpen = () => {
    if (!isEditing && !canAddMore()) {
      Alert.alert(
        "Limit Reached",
        "You've set 3 reminders — that's a solid routine! Delete one to add a new one.",
      );
      return;
    }
    setInternalVisible(true);
  };

  // ─── Category Picker (Step 1) ─────────────────────────────
  const getCategoryAccent = (cat: ReminderCategory): keyof typeof colors.accent => {
    switch (cat) {
      case "DAILY_PRACTICE":
        return "warning";
      case "BREATHING":
        return "info";
      case "READING":
        return "purple";
      case "CHALLENGE":
        return "danger";
      case "MOOD_CHECKIN":
        return "success";
      case "CUSTOM":
      default:
        return "lime";
    }
  };

  const renderCategoryPicker = () => (
    <View>
      <View style={styles.modalTitleContainer}>
        <Text variant="h2" color="primary" center>
          What would you like
        </Text>
        <Text variant="h2" color="primary" center>
          to be reminded about?
        </Text>
      </View>
      <View style={styles.categoryList}>
        {allCategories.map((cat) => {
          const accent = getCategoryAccent(cat.category);
          const bg = colors.accent[accent];
          const on = colors.accentOn[accent];

          return (
            <PressableScale
              key={cat.category}
              scaleTo={0.98}
              onPress={() => handleCategorySelect(cat.category)}
              style={[
                styles.categoryCard,
                { backgroundColor: bg },
              ]}
            >
              <View style={styles.categoryIconContainer}>
                <MaterialCommunityIcons
                  name={cat.icon as any}
                  size={28}
                  color={on}
                />
              </View>
              <View style={styles.categoryTextContainer}>
                <Text variant="title" color={on}>
                  {cat.label}
                </Text>
                <Text variant="bodySm" color={on} style={{ opacity: 0.85 }}>
                  {cat.description}
                </Text>
              </View>
              <Icon name={icons.chevronRight} size={20} color={on} />
            </PressableScale>
          );
        })}
      </View>
    </View>
  );

  // ─── Configure Form (Step 2) ──────────────────────────────
  const renderConfigureForm = () => (
    <View style={styles.formContainer}>
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

      <View style={styles.formFields}>
        {/* Title Input (Mandatory) */}
        <TextField
          label="TITLE"
          placeholder="What should the reminder say?"
          value={reminderTitle}
          onChangeText={setReminderTitle}
          maxLength={60}
        />

        {/* Time Picker */}
        <View style={styles.pickerSection}>
          {reminderType === "ONE_TIME" && (
            <View style={{ width: "100%" }}>
              <Text variant="label" color="tertiary" style={styles.inputLabel}>
                DATE
              </Text>
              {isAndroid ? (
                <TouchableOpacity
                  onPress={() => setShowDatePicker(true)}
                  style={[styles.androidPickerButton, { backgroundColor: colors.surface.control }]}
                >
                  <Text variant="h3" color="primary">
                    {getFormattedDate(selectedDate)}
                  </Text>
                </TouchableOpacity>
              ) : (
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display="inline"
                  themeVariant={scheme === "dark" ? "dark" : "light"}
                  accentColor={colors.action.primary}
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

          <View style={{ width: "100%", marginTop: spacing.lg }}>
            <Text variant="label" color="tertiary" style={styles.inputLabel}>
              TIME
            </Text>
            {isAndroid ? (
              <TouchableOpacity
                onPress={() => setShowTimePicker(true)}
                style={[styles.androidPickerButton, { backgroundColor: colors.surface.control }]}
              >
                <Text variant="h3" color="primary">
                  {getFormattedTime(selectedTime)}
                </Text>
              </TouchableOpacity>
            ) : (
              <DateTimePicker
                value={selectedTime}
                mode="time"
                display="spinner"
                is24Hour={true}
                themeVariant={scheme === "dark" ? "dark" : "light"}
                accentColor={colors.action.primary}
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

        {/* Weekday Selector (Routine only) */}
        {reminderType === "ROUTINE" && (
          <View style={styles.repeatContainer}>
            <Text variant="label" color="tertiary" style={styles.inputLabel}>
              REPEAT ON
            </Text>
            <View style={styles.weekDaysRow}>
              {weekDayLetters.map((letter, index) => {
                const isSelected = selectedWeekDays.includes(index);
                return (
                  <TouchableOpacity
                    key={index}
                    onPress={() => toggleWeekDay(index)}
                    style={[
                      styles.dayButton,
                      {
                        backgroundColor: isSelected
                          ? colors.action.primary
                          : colors.surface.control,
                        borderColor: isSelected
                          ? colors.border.selected
                          : colors.border.default,
                      },
                    ]}
                  >
                    <Text
                      variant="bodySm"
                      color={isSelected ? colors.action.onPrimary : colors.text.tertiary}
                    >
                      {letter}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Message / Body (Optional) */}
        <TextField
          label="MESSAGE (OPTIONAL)"
          placeholder="Add a personal note..."
          value={reminderBody}
          onChangeText={setReminderBody}
          multiline
          numberOfLines={3}
          maxLength={200}
        />

        {/* Save Button */}
        <View style={styles.actionButtonsContainer}>
          <Button
            variant="primary"
            label={isEditing ? "Update Reminder" : "Save Reminder"}
            onPress={handleSaveReminder}
          />
        </View>
      </View>
    </View>
  );

  return (
    <React.Fragment>
      {/* Only render trigger when NOT externally controlled */}
      {isOpen === undefined &&
        (renderTrigger ? (
          renderTrigger(handleOpen)
        ) : (
          <Button label="Set Reminder" onPress={handleOpen} />
        ))}

      <Sheet
        visible={isVisible}
        onClose={closeModal}
        onDismissed={firePendingSuccess}
        title={step === "configure" && selectedTemplate ? selectedTemplate.label : undefined}
        right={
          step === "configure" && !isEditing ? (
            <>
              <IconButton name={icons.back} onPress={() => setStep("pick")} />
              <IconButton name={icons.close} onPress={closeModal} />
            </>
          ) : (
            <IconButton name={icons.close} onPress={closeModal} />
          )
        }
      >
        {step === "pick" ? renderCategoryPicker() : renderConfigureForm()}
      </Sheet>
    </React.Fragment>
  );
};

export default ReminderModal;

const styles = StyleSheet.create({
  // ─── Category Picker ────────────────────────
  modalTitleContainer: {
    marginTop: spacing["2xl"],
    marginBottom: spacing["3xl"],
    alignItems: "center",
  },
  categoryList: {
    gap: spacing.sm,
  },
  categoryCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: radius.card,
    gap: spacing.lg,
  },
  categoryIconContainer: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryTextContainer: {
    flex: 1,
    gap: spacing.xxs,
  },

  // ─── Configure Form ─────────────────────────
  formContainer: {
    gap: spacing.xl,
  },
  formFields: {
    gap: spacing["2xl"],
  },
  pickerSection: {
    width: "100%",
    gap: spacing.xl,
  },
  inputLabel: {
    marginBottom: spacing.sm,
    textTransform: "uppercase",
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
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.input,
    alignItems: "flex-start",
  },
  repeatContainer: {
    width: "100%",
    gap: spacing.md,
  },
  weekDaysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  dayButton: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    borderWidth: borderWidth.thin,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonsContainer: {
    marginTop: spacing.md,
  },
});
