import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  TextInput,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Icon from "react-native-vector-icons/FontAwesome5";
import { BlurView } from "expo-blur";
import DateTimePicker from "@react-native-community/datetimepicker";

import { theme } from "../../../Theme/tokens";
import { parseTextStyle, parseShadowStyle } from "../../../util/functions/parseStyles";
import { 
  useReminderStore, 
  ReminderType as StoreReminderType 
} from "../../../stores/reminders";
import { 
  ReminderCategory 
} from "../../../constants/reminderTemplates";
import { requestNotificationPermissionWithFallback } from "../../../util/functions/notifications";
import ScreenView from "../../../components/ScreenView";
import PromptBottomSheet from "../../../components/PromptBottomSheet";

const CATEGORY_META: Record<
  ReminderCategory,
  { label: string; icon: string; color: string; desc: string }
> = {
  DAILY_PRACTICE: {
    label: "Daily Practice",
    icon: "bullseye-arrow",
    color: "#F59E0B",
    desc: "Stay consistent with your core exercises",
  },
  BREATHING: {
    label: "Breathing",
    icon: "lungs",
    color: "#06B6D4",
    desc: "Regulate your rhythm and airflow",
  },
  READING: {
    label: "Reading",
    icon: "book-open-variant",
    color: "#8B5CF6",
    desc: "Practice reading aloud fluently",
  },
  CHALLENGE: {
    label: "Challenge",
    icon: "trophy-outline",
    color: "#EC4899",
    desc: "Push your limits with daily goals",
  },
  MOOD_CHECKIN: {
    label: "Mood Check-in",
    icon: "emoticon-outline",
    color: "#10B981",
    desc: "Log how speaking felt today",
  },
  CUSTOM: {
    label: "Custom Reminder",
    icon: "pencil-outline",
    color: "#64748B",
    desc: "Set a unique reminder for your needs",
  },
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
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

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

  // Alert State
  const [promptVisible, setPromptVisible] = useState(false);
  const [promptConfig, setPromptConfig] = useState<{
    title: string;
    message: string;
    icon?: string;
    iconColor?: string;
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
        icon: "calendar-alert",
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
      navigation.goBack();
    } catch (error: any) {
      setPromptConfig({
        title: "Error",
        message: error.message || "Failed to save reminder",
        icon: "alert-circle",
        iconColor: "#EF4444",
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
      icon: "trash-can-outline",
      iconColor: "#EF4444",
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

  const renderConfigureForm = () => (
    <View style={styles.content}>
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleButton, reminderType === "ONE_TIME" && styles.toggleButtonActive]}
          onPress={() => setReminderType("ONE_TIME")}
        >
          <Text style={[styles.toggleButtonText, reminderType === "ONE_TIME" && styles.toggleButtonTextActive]}>
            One Time
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, reminderType === "ROUTINE" && styles.toggleButtonActive]}
          onPress={() => setReminderType("ROUTINE")}
        >
          <Text style={[styles.toggleButtonText, reminderType === "ROUTINE" && styles.toggleButtonTextActive]}>
            Routine
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.inputLabel}>TITLE</Text>
      <TextInput
        style={styles.titleInput}
        value={reminderTitle}
        onChangeText={setReminderTitle}
        placeholder="Reminder title..."
        placeholderTextColor="#94A3B8"
      />

      {reminderType === "ONE_TIME" && (
        <>
          <Text style={styles.inputLabel}>DATE</Text>
          <View style={styles.pickerWrapper}>
            {Platform.OS === "ios" ? (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="default"
                onChange={(e, d) => d && setSelectedDate(d)}
                minimumDate={new Date()}
              />
            ) : (
              <TouchableOpacity
                style={styles.androidPickerButton}
                onPress={() => setShowAndroidDatePicker(true)}
              >
                <Text style={styles.androidPickerText}>
                  {selectedDate.toLocaleDateString()}
                </Text>
              </TouchableOpacity>
            )}
            {Platform.OS === "android" && showAndroidDatePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="default"
                minimumDate={new Date()}
                onChange={(e, d) => {
                  setShowAndroidDatePicker(false);
                  if (d) setSelectedDate(d);
                }}
              />
            )}
          </View>
        </>
      )}

      <Text style={styles.inputLabel}>TIME</Text>
      <View style={styles.pickerWrapper}>
        {Platform.OS === "ios" ? (
          <DateTimePicker
            value={selectedTime}
            mode="time"
            display="spinner"
            onChange={(e, d) => d && setSelectedTime(d)}
            style={{ height: 160 }}
          />
        ) : (
          <TouchableOpacity
            style={styles.androidPickerButton}
            onPress={() => setShowAndroidTimePicker(true)}
          >
            <Text style={styles.androidPickerText}>
              {selectedTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </Text>
          </TouchableOpacity>
        )}
        {Platform.OS === "android" && showAndroidTimePicker && (
          <DateTimePicker
            value={selectedTime}
            mode="time"
            display="default"
            onChange={(e, d) => {
              setShowAndroidTimePicker(false);
              if (d) setSelectedTime(d);
            }}
          />
        )}
      </View>

      {reminderType === "ROUTINE" && (
        <View style={{ marginTop: 24 }}>
          <Text style={styles.inputLabel}>REPEAT ON</Text>
          <View style={styles.daysRow}>
            {DAYS_OF_WEEK.map((day, i) => {
              const isActive = selectedWeekDays.includes(i);
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.dayButton, isActive && styles.dayButtonActive]}
                  onPress={() => toggleDay(i)}
                >
                  <Text style={[styles.dayButtonText, isActive && styles.dayButtonTextActive]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      <View style={styles.saveContainer}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.8}>
          <Text style={styles.saveButtonText}>Save Reminder</Text>
        </TouchableOpacity>

        {reminderId && (
          <TouchableOpacity 
            style={styles.deleteButton} 
            onPress={handleDelete} 
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="trash-can-outline" size={20} color="#EF4444" />
            <Text style={styles.deleteButtonText}>Delete Reminder</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <ScreenView style={styles.container}>
      <View style={StyleSheet.absoluteFillObject}>
        <LinearGradient colors={["#F8FAFC", "#FFFFFF"]} style={{ flex: 1 }} />
      </View>

      <BlurView
        intensity={80}
        tint="light"
        style={[
          styles.header,
          { paddingTop: insets.top + 10, height: 60 + insets.top },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="chevron-left" size={16} color={theme.colors.text.title} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{CATEGORY_META[selectedCategory].label}</Text>
        <View style={{ width: 32 }} />
      </BlurView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: 80, paddingBottom: Math.max(insets.bottom, 40) }]}
      >
        {renderConfigureForm()}
      </ScrollView>

      <PromptBottomSheet
        visible={promptVisible}
        onClose={() => setPromptVisible(false)}
        title={promptConfig.title}
        message={promptConfig.message}
        icon={promptConfig.icon}
        iconColor={promptConfig.iconColor}
        primaryButton={{
          label: promptConfig.primaryLabel,
          onPress: promptConfig.primaryAction,
          destructive: promptConfig.isDestructive,
        }}
        secondaryButton={promptConfig.secondaryLabel ? {
          label: promptConfig.secondaryLabel,
          onPress: () => {},
        } : undefined}
      />
    </ScreenView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
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
  headerTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 24,
    gap: 16,
    marginBottom: 32,
    ...parseShadowStyle(theme.shadow.elevation1),
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  categoryIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryHeaderLabel: {
    fontSize: 16,
    color: theme.colors.text.title,
    fontWeight: "700",
  },
  categoryHeaderDesc: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 20,
    padding: 4,
    height: 52,
    marginBottom: 32,
  },
  toggleButton: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 16,
  },
  toggleButtonActive: {
    backgroundColor: theme.colors.actionPrimary.default,
    ...parseShadowStyle(theme.shadow.elevation2),
  },
  toggleButtonText: {
    color: "#64748B",
    fontWeight: "600",
    fontSize: 14,
  },
  toggleButtonTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  inputLabel: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 4,
  },
  titleInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 20,
    height: 56,
    fontSize: 16,
    color: theme.colors.text.title,
    fontWeight: "600",
    marginBottom: 32,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  pickerWrapper: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    marginBottom: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  androidPickerButton: {
    width: "100%",
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    alignItems: "center",
  },
  androidPickerText: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.colors.text.title,
  },
  daysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  dayButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  dayButtonActive: {
    backgroundColor: theme.colors.actionPrimary.default,
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  dayButtonText: {
    color: "#64748B",
    fontWeight: "600",
  },
  dayButtonTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  saveContainer: {
    marginTop: 48,
  },
  saveButton: {
    height: 52,
    borderRadius: 16,
    backgroundColor: theme.colors.actionPrimary.default,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  saveButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 20,
    paddingVertical: 12,
  },
  deleteButtonText: {
    color: "#EF4444",
    fontWeight: "700",
  },
});
