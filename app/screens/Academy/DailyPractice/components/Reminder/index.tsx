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
import { MaterialCommunityIcons } from "@expo/vector-icons";
import BottomSheetModal from "../../../../../components/BottomSheetModal";
import { ScrollView } from "react-native";
import Button from "../../../../../components/Button";
import {
  type Reminder,
  useReminderStore,
} from "../../../../../stores/reminders";
import { theme } from "../../../../../Theme/tokens";
import { requestNotificationPermissionWithFallback } from "../../../../../util/functions/notifications";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../util/functions/parseStyles";
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
        <Text style={styles.modalTiteText}>What would you like</Text>
        <Text style={styles.modalTiteText}>to be reminded about?</Text>
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.categoryList}
        showsVerticalScrollIndicator={false}
      >
        {allCategories.map((cat) => (
          <TouchableOpacity
            key={cat.category}
            style={[
              styles.categoryCard,
              { borderColor: `${cat.color}30` },
            ]}
            onPress={() => handleCategorySelect(cat.category)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.categoryIconContainer,
                { backgroundColor: cat.bgColor },
              ]}
            >
              <MaterialCommunityIcons
                name={cat.icon as any}
                size={22}
                color={cat.color}
              />
            </View>
            <View style={styles.categoryTextContainer}>
              <Text style={styles.categoryLabel}>{cat.label}</Text>
              <Text style={styles.categoryDesc}>{cat.description}</Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={18}
              color="#CBD5E1"
            />
          </TouchableOpacity>
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
              style={styles.backChip}
            >
              <MaterialCommunityIcons
                name="chevron-left"
                size={18}
                color={theme.colors.text.default}
              />
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
            <Text
              style={[
                styles.headerCategoryText,
                { color: selectedTemplate.color },
              ]}
            >
              {selectedTemplate.label}
            </Text>
          </View>
        </View>
      )}

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
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Title</Text>
          <TextInput
            style={styles.input}
            placeholder="What should the reminder say?"
            placeholderTextColor={theme.colors.text.disabled}
            value={reminderTitle}
            onChangeText={setReminderTitle}
            maxLength={60}
          />
        </View>

        {/* Time Picker */}
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

        {/* Weekday Selector (Routine only) */}
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

        {/* Message / Body (Optional) */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Message (optional)</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            placeholder="Add a personal note..."
            placeholderTextColor={theme.colors.text.disabled}
            value={reminderBody}
            onChangeText={setReminderBody}
            multiline
            numberOfLines={3}
            maxLength={200}
          />
        </View>

        {/* Save Button */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSaveReminder}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[
                theme.colors.actionPrimary.default,
                "#E06B00",
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveGradient}
            >
              <Text style={styles.saveButtonText}>
                {isEditing ? "Update Reminder" : "Save Reminder"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
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
          <Button text="Set Reminder" onPress={handleOpen} />
        ))}

      <BottomSheetModal
        visible={isVisible}
        onClose={closeModal}
        maxHeight="85%"
        showCloseButton={true}
        fitContent={false}
        backgroundColor="#FFFBF5"
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
    paddingTop: 12,
  },
  modalTitleContainer: {
    marginTop: 24,
    marginBottom: 32,
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalTiteText: {
    ...parseTextStyle(theme.typography.Heading2),
    color: theme.colors.text.title,
    textAlign: "center",
    fontWeight: "800",
  },
  categoryList: {
    gap: 10,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  categoryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderRadius: 20,
    gap: 16,
  },
  categoryIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryTextContainer: {
    flex: 1,
    gap: 2,
  },
  categoryLabel: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
    fontWeight: "700",
    fontSize: 15,
  },
  categoryDesc: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
    fontSize: 13,
    opacity: 0.7,
  },

  // ─── Configure Form ─────────────────────────
  modalContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
    width: "100%",
  },
  configHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
    marginTop: 8,
  },
  backChip: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },
  headerCategoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  headerCategoryText: {
    fontSize: 13,
    fontWeight: "700",
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
    backgroundColor: "rgba(0,0,0,0.04)",
    borderRadius: 12,
    padding: 3,
    width: "100%",
    height: 44,
    marginBottom: 16,
  },
  toggleButton: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
  },
  toggleButtonActive: {
    backgroundColor: "#FFFFFF",
    ...parseShadowStyle(theme.shadow.elevation1),
    shadowOpacity: 0.08,
  },
  toggleButtonText: {
    ...parseTextStyle(theme.typography.Body),
    color: "#64748B",
    fontWeight: "600",
    fontSize: 14,
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
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
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
    borderColor: "rgba(0,0,0,0.03)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
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
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 20,
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
  },
  notesInput: {
    height: 100,
    textAlignVertical: "top",
  },
  actionButtonsContainer: {
    flexDirection: "row",
    gap: 16,
    marginTop: 12,
  },
  saveButton: {
    flex: 2,
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
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
    fontSize: 18,
    color: "#FFFFFF",
    fontWeight: "800",
  },
});
