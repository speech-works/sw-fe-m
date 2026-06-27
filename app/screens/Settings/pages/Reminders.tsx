import { useNavigation } from "@react-navigation/native";
import React, { useState } from "react";
import { LayoutAnimation, StyleSheet, View } from "react-native";
import { useReminderStore } from "../../../stores/reminders";
import { ReminderCategory } from "../../../constants/reminderTemplates";
import {
  useTheme,
  spacing,
  radius,
  Page,
  Sheet,
  ListItem,
  Toggle,
  Button,
  Dialog,
  EmptyState,
  Text,
  IconName,
} from "../../../design-system";

const CATEGORY_META: Record<
  ReminderCategory,
  { label: string; icon: IconName; desc: string }
> = {
  DAILY_PRACTICE: { label: "Daily Practice", icon: "target", desc: "Core exercises" },
  BREATHING: { label: "Breathing", icon: "wind", desc: "Airflow rhythm" },
  READING: { label: "Reading", icon: "book-open", desc: "Read aloud" },
  CHALLENGE: { label: "Challenge", icon: "award", desc: "Daily goals" },
  MOOD_CHECKIN: { label: "Mood", icon: "smile", desc: "Daily feelings" },
  CUSTOM: { label: "Custom", icon: "edit-3", desc: "Your needs" },
};

const Reminders = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { reminders, toggleActive, removeReminder, setAllActive } = useReminderStore();
  const [isCategorySheetVisible, setIsCategorySheetVisible] = useState(false);

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

  const isAllOn = reminders.length > 0 && reminders.every((r) => r.active);
  const isAllOff = reminders.length === 0 || reminders.every((r) => !r.active);
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
        message:
          "You can only have up to 3 reminders at a time. Please delete one of your existing reminders to create a new one.",
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

  const isConfirm = !!promptConfig.secondaryLabel;
  const sorted = [...reminders].sort((a, b) => a.time.localeCompare(b.time));

  return (
    <>
      <Page
        title="Reminders"
        description="Build your daily speech-practice habit."
        onBack={() => navigation.goBack()}
        footer={<Button label="Create Reminder" leftIcon="plus" onPress={handleCreateNew} />}
      >
        {/* Master control */}
        {reminders.length > 1 ? (
          <View style={[styles.group, { backgroundColor: colors.surface.default }]}>
            <ListItem
              leftIcon={isMasterOn ? "bell" : "bell-off"}
              label="Master Control"
              sublabel={
                isAllOn
                  ? "All reminders are active"
                  : isAllOff
                    ? "All reminders are currently paused"
                    : "Some reminders are paused"
              }
              right={<Toggle value={isMasterOn} onChange={handleToggleMaster} />}
            />
          </View>
        ) : null}

        {/* List or empty */}
        {reminders.length > 0 ? (
          <View>
            {reminders.length > 1 ? (
              <Text variant="label" color="tertiary" style={styles.sectionLabel}>
                YOUR REMINDERS
              </Text>
            ) : null}
            <View style={[styles.group, { backgroundColor: colors.surface.default }]}>
              {sorted.map((rem, index, arr) => (
                <ListItem
                  key={rem.id}
                  leftIcon={CATEGORY_META[rem.category]?.icon ?? "bell"}
                  label={rem.title}
                  sublabel={`${rem.type === "ROUTINE" ? "Every day at" : "Once at"} ${rem.time}`}
                  right={<Toggle value={rem.active} onChange={() => handleToggleIndividual(rem.id)} />}
                  divider={index < arr.length - 1}
                  onPress={() => navigation.navigate("ConfigureReminder", { reminderId: rem.id })}
                  onLongPress={() => handleDeleteReminder(rem.id, rem.title)}
                />
              ))}
            </View>
          </View>
        ) : (
          <EmptyState
            icon="bell"
            title="No reminders yet"
            message="Set a reminder to build your daily speech practice habit."
          />
        )}
      </Page>

      {/* Category picker */}
      <Sheet
        visible={isCategorySheetVisible}
        onClose={() => setIsCategorySheetVisible(false)}
        title="Choose a category"
      >
        <Text variant="bodySm" color="secondary" style={styles.sheetSub}>
          Select what you want to be reminded of
        </Text>
        <View style={[styles.group, { backgroundColor: colors.surface.default }]}>
          {(Object.keys(CATEGORY_META) as ReminderCategory[]).map((cat, index, arr) => {
            const meta = CATEGORY_META[cat];
            return (
              <ListItem
                key={cat}
                leftIcon={meta.icon}
                label={meta.label}
                sublabel={meta.desc}
                showChevron
                divider={index < arr.length - 1}
                onPress={() => handleSelectCategory(cat)}
              />
            );
          })}
        </View>
      </Sheet>

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
};

export default Reminders;

const styles = StyleSheet.create({
  group: {
    borderRadius: radius.card,
    overflow: "hidden",
  },
  sectionLabel: {
    marginBottom: spacing.md,
    marginLeft: spacing.xs,
  },
  sheetSub: {
    marginBottom: spacing.lg,
  },
});
