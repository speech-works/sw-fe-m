import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  TextInput,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Icon from "react-native-vector-icons/FontAwesome5";
import DateTimePicker from "@react-native-community/datetimepicker";

import { theme } from "../../../Theme/tokens";
import { parseTextStyle, parseShadowStyle } from "../../../util/functions/parseStyles";
import { 
  useReminderStore, 
  Reminder, 
  ReminderType as StoreReminderType 
} from "../../../stores/reminders";
import { 
  ReminderCategory, 
  REMINDER_TEMPLATES, 
  CUSTOM_CATEGORY 
} from "../../../constants/reminderTemplates";
import { requestNotificationPermissionWithFallback } from "../../../util/functions/notifications";
import ScreenView from "../../../components/ScreenView";

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
    desc: "Log your daily fluency feelings",
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
  
  const { reminders, addReminder, updateReminder } = useReminderStore();

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
      Alert.alert("Invalid Routine", "Please select at least one day for your routine.");
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
      Alert.alert("Error", error.message || "Failed to save reminder");
    }
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
          <LinearGradient
            colors={[theme.colors.actionPrimary.default, "#E06B00"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveGradient}
          >
            <Text style={styles.saveButtonText}>Save Reminder</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScreenView style={styles.container}>
      <View style={StyleSheet.absoluteFillObject}>
        <LinearGradient colors={["#F8FAFC", "#FFFFFF"]} style={{ flex: 1 }} />
      </View>

      <View style={[styles.topNavigation, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="chevron-left" size={14} color={theme.colors.text.title} />
        </TouchableOpacity>
        <Text style={styles.topNavigationText}>{reminderId ? "Edit Reminder" : "Configure"}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 40) }]}
      >
        {/* Category Header */}
        <View style={styles.categoryHeader}>
          <View style={[styles.categoryIconCircle, { backgroundColor: CATEGORY_META[selectedCategory].color + "15" }]}>
            <MaterialCommunityIcons 
              name={CATEGORY_META[selectedCategory].icon as any} 
              size={28} 
              color={CATEGORY_META[selectedCategory].color} 
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.categoryHeaderLabel}>{CATEGORY_META[selectedCategory].label}</Text>
            <Text style={styles.categoryHeaderDesc}>{CATEGORY_META[selectedCategory].desc}</Text>
          </View>
        </View>

        {renderConfigureForm()}
      </ScrollView>
    </ScreenView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 0,
  },
  topNavigation: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 8,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.8)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  topNavigationText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
    fontWeight: "800",
  },
  scrollContent: {
    paddingHorizontal: 24,
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
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryHeaderLabel: {
    ...parseTextStyle(theme.typography.Heading3),
    fontSize: 18,
    color: theme.colors.text.title,
    fontWeight: "800",
  },
  categoryHeaderDesc: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "#64748B",
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 16,
    padding: 4,
    width: "100%",
    height: 48,
    marginBottom: 32,
  },
  toggleButton: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
  },
  toggleButtonActive: {
    backgroundColor: theme.colors.actionPrimary.default,
    ...parseShadowStyle(theme.shadow.elevation2),
  },
  toggleButtonText: {
    ...parseTextStyle(theme.typography.Body),
    color: "#64748B",
    fontWeight: "600",
    fontSize: 14,
  },
  toggleButtonTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  inputLabel: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "#94A3B8",
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  titleInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
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
    borderRadius: 21,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  dayButtonActive: {
    backgroundColor: theme.colors.actionPrimary.default,
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  dayButtonText: {
    ...parseTextStyle(theme.typography.Body),
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
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
    ...parseShadowStyle(theme.shadow.elevation3),
  },
  saveGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  saveButtonText: {
    ...parseTextStyle(theme.typography.Heading3),
    fontSize: 17,
    color: "#FFFFFF",
    fontWeight: "800",
  },
});
