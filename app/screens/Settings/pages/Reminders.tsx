import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Animated,
  LayoutAnimation,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Icon from "react-native-vector-icons/FontAwesome5";
import BottomSheetModal from "../../../components/BottomSheetModal";
import ScreenView from "../../../components/ScreenView";
import {
  type Reminder as ReminderType,
  useReminderStore,
} from "../../../stores/reminders";
import { theme } from "../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../util/functions/parseStyles";
import {
  ReminderCategory,
} from "../../../constants/reminderTemplates";
import AnimatedToggle from "../../../components/AnimatedToggle";
import PromptBottomSheet from "../../../components/PromptBottomSheet";

const CATEGORY_META: Record<
  ReminderCategory,
  { label: string; icon: string; color: string; desc: string; bgColor: string }
> = {
  DAILY_PRACTICE: {
    label: "Daily Practice",
    icon: "bullseye-arrow",
    color: "#F59E0B",
    bgColor: "#FFF7ED",
    desc: "Core exercises",
  },
  BREATHING: {
    label: "Breathing",
    icon: "lungs", // Fixed icon
    color: "#06B6D4",
    bgColor: "#ECFEFF",
    desc: "Airflow rhythm",
  },
  READING: {
    label: "Reading",
    icon: "book-open-variant",
    color: "#8B5CF6",
    bgColor: "#F5F3FF",
    desc: "Read aloud",
  },
  CHALLENGE: {
    label: "Challenge",
    icon: "trophy-outline",
    color: "#EC4899",
    bgColor: "#FDF2F8",
    desc: "Daily goals",
  },
  MOOD_CHECKIN: {
    label: "Mood",
    icon: "emoticon-outline",
    color: "#10B981",
    bgColor: "#F0FDF4",
    desc: "Daily feelings",
  },
  CUSTOM: {
    label: "Custom",
    icon: "pencil-outline",
    color: "#64748B",
    bgColor: "#F8FAFC",
    desc: "Your needs",
  },
};

const Reminders = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { reminders, toggleActive, removeReminder, setAllActive } = useReminderStore();
  const [isCategorySheetVisible, setIsCategorySheetVisible] = useState(false);

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

  const isAllOn = reminders.length > 0 && reminders.every((r) => r.active);
  const isAllOff = reminders.length === 0 || reminders.every((r) => !r.active);
  const isSomeOn = !isAllOn && !isAllOff;

  const isMasterOn = isAllOn;

  const handleToggleMaster = () => {
    setAllActive(!isMasterOn);
  };

  const handleToggleIndividual = (id: string) => {
    toggleActive(id);
  };

  const handleDeleteReminder = (id: string, title: string) => {
    setPromptConfig({
      title: "Delete Reminder",
      message: `Are you sure you want to delete "${title}"?`,
      icon: "trash-can-outline",
      iconColor: "#EF4444",
      primaryLabel: "Delete",
      isDestructive: true,
      primaryAction: () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        removeReminder(id);
      },
      secondaryLabel: "Cancel",
    });
    setPromptVisible(true);
  };

  const handleCreateNew = () => {
    if (reminders.length >= 3) {
      setPromptConfig({
        title: "Reminder Limit Reached",
        message: "You can only have up to 3 reminders at a time. Please delete one of your existing reminders to create a new one.",
        icon: "alert-circle-outline",
        primaryLabel: "Got it",
        primaryAction: () => {},
      });
      setPromptVisible(true);
      return;
    }
    setIsCategorySheetVisible(true);
  };

  const handleSelectCategory = (cat: ReminderCategory) => {
    setIsCategorySheetVisible(false);
    navigation.navigate("ConfigureReminder", { category: cat });
  };

  return (
    <ScreenView style={[styles.screenView, { paddingHorizontal: 0 }]}>
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
        <Text style={styles.topNavigationText}>Reminders</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
      >
        <View style={styles.masterToggleCard}>
          <View style={styles.masterToggleRow}>
            <View style={[styles.masterToggleIcon, { backgroundColor: isMasterOn ? "#FFF7ED" : "#F1F5F9" }]}>
              <MaterialCommunityIcons
                name={isMasterOn ? "bell-ring-outline" : "bell-off-outline"}
                size={22}
                color={isMasterOn ? theme.colors.actionPrimary.default : "#94A3B8"}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.masterToggleText}>Master Control</Text>
              <Text style={styles.masterToggleSubtext}>
                {isAllOn
                  ? "All reminders are active"
                  : isAllOff
                    ? "All reminders are currently paused"
                    : "Some reminders are paused"}
              </Text>
            </View>
            <AnimatedToggle
              value={isMasterOn}
              onValueChange={handleToggleMaster}
            />
          </View>
        </View>

        {reminders.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>YOUR REMINDERS</Text>
            {reminders.map((rem) => (
              <TouchableOpacity
                key={rem.id}
                style={styles.reminderCard}
                activeOpacity={0.7}
                onPress={() => navigation.navigate("ConfigureReminder", { reminderId: rem.id })}
                onLongPress={() => handleDeleteReminder(rem.id, rem.title)}
              >
                <View style={styles.reminderContent}>
                  <View style={[styles.iconContainer, { backgroundColor: (CATEGORY_META[rem.category]?.color || "#000") + "15" }]}>
                    <MaterialCommunityIcons
                      name={CATEGORY_META[rem.category]?.icon as any}
                      size={20}
                      color={CATEGORY_META[rem.category]?.color}
                    />
                  </View>
                  <View style={styles.textContainer}>
                    <Text style={styles.reminderTitle}>{rem.title}</Text>
                    <Text style={styles.reminderTime}>
                      {rem.type === "ROUTINE" ? "Every day at " : "Once at "}
                      <Text style={{ fontWeight: "700" }}>{rem.time}</Text>
                    </Text>
                  </View>

                  <View style={styles.actionRow}>
                    <AnimatedToggle
                      value={rem.active}
                      onValueChange={() => handleToggleIndividual(rem.id)}
                    />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <MaterialCommunityIcons name="bell-outline" size={48} color="#94A3B8" />
            </View>
            <Text style={styles.emptyTitle}>No reminders yet</Text>
            <Text style={styles.emptyDesc}>Set a reminder to build your daily speech practice habit.</Text>
          </View>
        )}
      </ScrollView>

      {/* Floating Create Button */}
      <View style={[styles.bottomAction, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <TouchableOpacity
          style={styles.createButton}
          activeOpacity={0.9}
          onPress={handleCreateNew}
        >
          <LinearGradient
            colors={[theme.colors.actionPrimary.default, "#E06B00"]}
            style={styles.createGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <MaterialCommunityIcons name="plus" size={24} color="#FFF" />
            <Text style={styles.createButtonText}>Create Reminder</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <BottomSheetModal
        visible={isCategorySheetVisible}
        onClose={() => setIsCategorySheetVisible(false)}
        fitContent
        showCloseButton={false}
      >
        <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 32) }]}>
          <TouchableOpacity
            onPress={() => setIsCategorySheetVisible(false)}
            style={styles.modalCloseCircle}
          >
            <MaterialCommunityIcons name="close" size={20} color={theme.colors.text.title} />
          </TouchableOpacity>

          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>What do you want to be reminded of?</Text>
          </View>

          <View style={styles.gridContainer}>
            {(Object.keys(CATEGORY_META) as ReminderCategory[]).map((cat) => {
              const meta = CATEGORY_META[cat];
              return (
                <TouchableOpacity
                  key={cat}
                  style={styles.gridCard}
                  activeOpacity={0.8}
                  onPress={() => handleSelectCategory(cat)}
                >
                  <LinearGradient
                    colors={[meta.bgColor, "#FFFFFF"]}
                    style={styles.gridCardGradient}
                  >
                    <View style={styles.cardTextContent}>
                      <Text style={styles.gridLabel}>{meta.label}</Text>
                      <Text style={styles.gridDesc}>{meta.desc}</Text>
                    </View>

                    {/* Watermark Icon - Main Visual Element */}
                    <View style={styles.watermark}>
                      <MaterialCommunityIcons name={meta.icon as any} size={80} color={meta.color} />
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </BottomSheetModal>

      {/* Action / Alert Prompt */}
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
};

const styles = StyleSheet.create({
  screenView: {
    flex: 1,
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
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  masterToggleCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingHorizontal: 20,
    height: 100,
    justifyContent: "center",
    marginBottom: 32,
    ...parseShadowStyle(theme.shadow.elevation2),
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  masterToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  masterToggleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  masterToggleText: {
    ...parseTextStyle(theme.typography.Heading3),
    fontSize: 16,
    color: theme.colors.text.title,
    fontWeight: "700",
  },
  masterToggleSubtext: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "#64748B",
    marginTop: 2,
    minHeight: 18,
  },
  sectionTitle: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: "#94A3B8",
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 16,
    marginLeft: 4,
  },
  reminderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    ...parseShadowStyle(theme.shadow.elevation1),
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  reminderContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    flex: 1,
  },
  reminderTitle: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
    fontWeight: "700",
  },
  reminderTime: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "#64748B",
    marginTop: 2,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 60,
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
    textAlign: "center",
    marginBottom: 8,
  },
  emptyDesc: {
    ...parseTextStyle(theme.typography.Body),
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
  },
  bottomAction: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    backgroundColor: "transparent",
  },
  createButton: {
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
    ...parseShadowStyle(theme.shadow.elevation3),
  },
  createGradient: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  createButtonText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  modalContent: {
    paddingHorizontal: 24,
  },
  modalHeader: {
    paddingTop: 40,
    paddingBottom: 28,
    alignItems: "center",
    paddingHorizontal: 60, // Symmetrical padding to ensure title is centered in the safe area
  },
  modalTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
    fontWeight: "800",
    textAlign: "center",
    fontSize: 20,
    lineHeight: 26,
  },
  modalCloseCircle: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  gridCard: {
    width: "48%",
    borderRadius: 24,
    overflow: "hidden",
    ...parseShadowStyle(theme.shadow.elevation1),
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginBottom: 4,
  },
  gridCardGradient: {
    padding: 24,
    minHeight: 120,
    justifyContent: "center",
    position: "relative",
  },
  cardTextContent: {
    zIndex: 2,
  },
  gridLabel: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
    fontWeight: "800",
    fontSize: 17,
  },
  gridDesc: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "#64748B",
    marginTop: 4,
    fontSize: 13,
    fontWeight: "600",
  },
  watermark: {
    position: "absolute",
    bottom: -15,
    right: -15,
    opacity: 0.12,
    transform: [{ rotate: "-10deg" }],
  },
});

export default Reminders;
