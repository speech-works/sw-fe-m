import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  LayoutAnimation,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import Icon from "react-native-vector-icons/FontAwesome5";
import BottomSheetModal from "../../../components/BottomSheetModal";
import ScreenView from "../../../components/ScreenView";
import {
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
  { label: string; icon: string; color: string; desc: string; gradient: [string, string] }
> = {
  DAILY_PRACTICE: {
    label: "Daily Practice",
    icon: "bullseye-arrow",
    color: "#F59E0B",
    gradient: ["#F59E0B", "#B45309"],
    desc: "Core exercises",
  },
  BREATHING: {
    label: "Breathing",
    icon: "lungs",
    color: "#0EA5E9",
    gradient: ["#0EA5E9", "#0369A1"],
    desc: "Airflow rhythm",
  },
  READING: {
    label: "Reading",
    icon: "book-open-variant",
    color: "#8B5CF6",
    gradient: ["#8B5CF6", "#6D28D9"],
    desc: "Read aloud",
  },
  CHALLENGE: {
    label: "Challenge",
    icon: "trophy-outline",
    color: "#EC4899",
    gradient: ["#EC4899", "#BE185D"],
    desc: "Daily goals",
  },
  MOOD_CHECKIN: {
    label: "Mood",
    icon: "emoticon-outline",
    color: "#10B981",
    gradient: ["#10B981", "#047857"],
    desc: "Daily feelings",
  },
  CUSTOM: {
    label: "Custom",
    icon: "pencil-outline",
    color: "#64748B",
    gradient: ["#64748B", "#334155"],
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
    primaryAction: () => { },
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
        primaryAction: () => { },
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
        <Text style={styles.headerTitle}>Reminders</Text>
        <View style={{ width: 32 }} />
      </BlurView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
      >
        {reminders.length > 1 && (
          <View style={styles.masterToggleCard}>
            <View style={styles.masterToggleRow}>
              <View style={[styles.masterToggleIcon, { backgroundColor: isMasterOn ? theme.colors.actionPrimary.default + "15" : "#F1F5F9" }]}>
                <MaterialCommunityIcons
                  name={isMasterOn ? "bell-ring-outline" : "bell-off-outline"}
                  size={22}
                  color={isMasterOn ? theme.colors.actionPrimary.default : "#94A3B8"}
                />
              </View>
              <View style={{ flex: 1, zIndex: 1 }}>
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
        )}

        {reminders.length > 0 ? (
          <>
            {reminders.length > 1 && <Text style={styles.sectionTitle}>YOUR REMINDERS</Text>}
            <View style={styles.listContainer}>
              {[...reminders]
                .sort((a, b) => a.time.localeCompare(b.time))
                .map((rem, index, arr) => (
                <TouchableOpacity
                  key={rem.id}
                  style={styles.listItem}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate("ConfigureReminder", { reminderId: rem.id })}
                  onLongPress={() => handleDeleteReminder(rem.id, rem.title)}
                >
                  <View style={styles.reminderContent}>
                    <View style={[styles.listIconBox, { backgroundColor: rem.active ? "#F8FAFC" : "#F1F5F9" }]}>
                      <MaterialCommunityIcons
                        name={CATEGORY_META[rem.category]?.icon as any}
                        size={22}
                        color={rem.active ? theme.colors.actionPrimary.default : "#94A3B8"}
                      />
                    </View>
                    <View style={styles.textContainer}>
                      <Text style={styles.reminderTitle}>{rem.title}</Text>
                      <Text style={styles.reminderTime}>
                        {rem.type === "ROUTINE" ? "Every day at " : "Once at "}
                        <Text style={{ fontWeight: "700", color: theme.colors.text.title }}>{rem.time}</Text>
                      </Text>
                    </View>

                    <AnimatedToggle
                      value={rem.active}
                      onValueChange={() => handleToggleIndividual(rem.id)}
                    />
                  </View>
                  {index < arr.length - 1 && <View style={styles.divider} />}
                </TouchableOpacity>
              ))}
            </View>
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
          <MaterialCommunityIcons name="plus" size={20} color="#FFF" />
          <Text style={styles.createButtonText}>Create Reminder</Text>
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
            <Text style={styles.modalTitle}>Choose a category</Text>
            <Text style={styles.modalSub}>Select what you want to be reminded of</Text>
          </View>

          <View style={styles.modalListContainer}>
            {(Object.keys(CATEGORY_META) as ReminderCategory[]).map((cat, index, arr) => {
              const meta = CATEGORY_META[cat];
              return (
                <TouchableOpacity
                  key={cat}
                  style={styles.modalListItem}
                  activeOpacity={0.7}
                  onPress={() => handleSelectCategory(cat)}
                >
                  <View style={[styles.modalIconBox, { backgroundColor: meta.color + "15" }]}>
                    <MaterialCommunityIcons name={meta.icon as any} size={22} color={meta.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalItemTitle}>{meta.label}</Text>
                    <Text style={styles.modalItemDesc}>{meta.desc}</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color="#94A3B8" />
                  {index < arr.length - 1 && <View style={styles.modalDivider} />}
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
          onPress: () => { },
        } : undefined}
      />
    </ScreenView>
  );
};

const styles = StyleSheet.create({
  screenView: {
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
    paddingTop: 80,
  },
  masterToggleCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingHorizontal: 20,
    height: 84,
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
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  masterToggleText: {
    fontSize: 16,
    color: theme.colors.text.title,
    fontWeight: "700",
  },
  masterToggleSubtext: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 4,
  },
  listContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    ...parseShadowStyle(theme.shadow.elevation1),
    marginBottom: 32,
  },
  listItem: {
    padding: 16,
    position: "relative",
  },
  divider: {
    position: "absolute",
    bottom: 0,
    left: 76,
    right: 16,
    height: 1,
    backgroundColor: "#F1F5F9",
  },
  reminderContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  listIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 16,
    color: theme.colors.text.title,
    fontWeight: "700",
  },
  reminderTime: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
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
    height: 52,
    borderRadius: 16,
    backgroundColor: theme.colors.actionPrimary.default,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  createButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  modalHeader: {
    paddingVertical: 24,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: theme.colors.text.title,
    textAlign: "center",
  },
  modalSub: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 4,
    textAlign: "center",
  },
  modalCloseCircle: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  modalListContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    ...parseShadowStyle(theme.shadow.elevation1),
    marginBottom: 16,
  },
  modalListItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    position: "relative",
  },
  modalIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  modalItemTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text.title,
  },
  modalItemDesc: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  modalDivider: {
    position: "absolute",
    bottom: 0,
    left: 76,
    right: 16,
    height: 1,
    backgroundColor: "#F1F5F9",
  },
});

export default Reminders;
