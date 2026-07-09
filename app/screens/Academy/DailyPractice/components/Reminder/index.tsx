import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import BottomSheetModal from "../../../../../components/BottomSheetModal";
import PressableScale from "../../../../../components/PressableScale";
import {
  useTheme,
  spacing,
  radius,
  borderWidth,
  Text,
  Icon,
  icons,
  Button,
  Segmented,
  TextField,
} from "../../../../../design-system";
import {
  type Reminder,
  useReminderStore,
} from "../../../../../stores/reminders";
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

const ONE_TIME_LABEL = "One Time";
const ROUTINE_LABEL = "Routine";

const ReminderModal = ({
  onReminderSet,
  renderTrigger,
  suggestedCategory,
  editReminder,
  isOpen,
  onClose: onCloseProp,
}: ReminderProps) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
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
        Alert.alert("Updated", "Your reminder has been updated!");
      } else {
        await addReminder(reminderData);
        Alert.alert("Success", "Your reminder has been set!");
      }
      if (onReminderSet) onReminderSet();
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
  const renderCategoryPicker = () => (
    <View style={styles.categoryContainer}>
      <View style={styles.modalTitleContainer}>
        <Text variant="h2" color="primary" center>
          What would you like
        </Text>
        <Text variant="h2" color="primary" center>
          to be reminded about?
        </Text>
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.categoryList}
        showsVerticalScrollIndicator={false}
      >
        {allCategories.map((cat) => (
          <PressableScale
            key={cat.category}
            scaleTo={0.98}
            onPress={() => handleCategorySelect(cat.category)}
            style={[
              styles.categoryCard,
              {
                backgroundColor: colors.surface.default,
                borderColor: colors.border.default,
              },
            ]}
          >
            <View
              style={[styles.categoryIconContainer, { backgroundColor: cat.bgColor }]}
            >
              {/* Category glyphs are MaterialCommunityIcons names from the reminder
                  constants (not DS registry keys) — rendered via the vendor set,
                  keeping the exact per-category icon. */}
              <MaterialCommunityIcons
                name={cat.icon as any}
                size={22}
                color={cat.color}
              />
            </View>
            <View style={styles.categoryTextContainer}>
              <Text variant="title" color="primary">
                {cat.label}
              </Text>
              <Text variant="bodySm" color="secondary">
                {cat.description}
              </Text>
            </View>
            <Icon name={icons.chevronRight} size={18} color={colors.text.tertiary} />
          </PressableScale>
        ))}
      </ScrollView>
    </View>
  );

  // ─── Configure Form (Step 2) ──────────────────────────────
  const renderConfigureForm = () => (
    <View style={styles.modalContent}>
      {/* Header with category badge */}
      {selectedTemplate && (
        <View style={styles.configHeader}>
          {!isEditing && (
            <TouchableOpacity
              onPress={() => setStep("pick")}
              style={[styles.backChip, { backgroundColor: colors.surface.control }]}
            >
              <Icon name={icons.back} size={18} color={colors.text.primary} />
            </TouchableOpacity>
          )}
          <View
            style={[
              styles.headerCategoryBadge,
              { backgroundColor: selectedTemplate.bgColor },
            ]}
          >
            <MaterialCommunityIcons
              name={selectedTemplate.icon as any}
              size={16}
              color={selectedTemplate.color}
            />
            <Text variant="label" color={selectedTemplate.color}>
              {selectedTemplate.label}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.toggleContainer}>
        <Segmented
          options={[ONE_TIME_LABEL, ROUTINE_LABEL]}
          value={reminderType === "ONE_TIME" ? ONE_TIME_LABEL : ROUTINE_LABEL}
          onChange={(opt) =>
            setReminderType(opt === ONE_TIME_LABEL ? "ONE_TIME" : "ROUTINE")
          }
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        nestedScrollEnabled={true}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContainer,
          { paddingBottom: Math.max(insets.bottom, 40) },
        ]}
      >
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
                  themeVariant="dark"
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
                themeVariant="dark"
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
      </ScrollView>
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

      <BottomSheetModal
        visible={isVisible}
        onClose={closeModal}
        maxHeight="85%"
        showCloseButton={true}
        fitContent={false}
        backgroundColor={colors.surface.elevated}
      >
        {step === "pick" ? renderCategoryPicker() : renderConfigureForm()}
      </BottomSheetModal>
    </React.Fragment>
  );
};

export default ReminderModal;

const styles = StyleSheet.create({
  // ─── Category Picker ────────────────────────
  categoryContainer: {
    flex: 1,
    paddingTop: spacing.md,
  },
  modalTitleContainer: {
    marginTop: spacing["2xl"],
    marginBottom: spacing["3xl"],
    alignItems: "center",
    paddingHorizontal: spacing["2xl"],
  },
  scrollView: {
    flex: 1,
  },
  categoryList: {
    gap: spacing.sm,
    paddingHorizontal: spacing["2xl"],
    paddingBottom: spacing["4xl"],
  },
  categoryCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: radius.chip,
    gap: spacing.lg,
    borderWidth: borderWidth.thin,
  },
  categoryIconContainer: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryTextContainer: {
    flex: 1,
    gap: spacing.xxs,
  },

  // ─── Configure Form ─────────────────────────
  modalContent: {
    flex: 1,
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing.md,
    width: "100%",
  },
  configHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.xl,
    marginTop: spacing.sm,
  },
  backChip: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCategoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.chip,
  },
  scrollContainer: {
    gap: spacing["2xl"],
    paddingBottom: spacing["4xl"],
  },
  toggleContainer: {
    width: "100%",
    marginBottom: spacing.lg,
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
