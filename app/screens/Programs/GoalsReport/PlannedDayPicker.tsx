import React, { useState } from "react";
import { Platform, StyleSheet, TouchableOpacity, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Text, radius, spacing, useTheme } from "../../../design-system";
import { formatPlannedDay } from "./labels";

/** How far ahead a plan may go. Must match MAX_PLAN_DAYS on the server. */
const MAX_PLAN_DAYS = 90;

/** A local Date as "YYYY-MM-DD", the form the server stores. */
export function toDayString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Tomorrow, as the day a fresh "Planned" starts on. */
export function defaultPlannedDay(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toDayString(d);
}

function fromDayString(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * The day under a "Planned" answer. Shown only once "Planned" is picked, so the
 * other answers stay one tap.
 *
 * iOS shows the compact picker inline. Android has no inline date picker, so it
 * is a button that opens the system dialog, the same as ConfigureReminder.
 * Today is the earliest day: planning to tell somebody later today is a plan.
 */
export function PlannedDayPicker({
  value,
  onChange,
  bare = false,
}: {
  value: string;
  onChange: (day: string) => void;
  /** Just the picker, with no label or panel, for a card that says it already. */
  bare?: boolean;
}) {
  const { colors, scheme } = useTheme();
  const [androidOpen, setAndroidOpen] = useState(false);
  const today = new Date();
  const latest = new Date();
  latest.setDate(latest.getDate() + MAX_PLAN_DAYS);

  return (
    <View style={bare ? styles.bare : [styles.root, { backgroundColor: colors.surface.control }]}>
      {bare ? null : (
        <Text variant="bodySm" color="secondary" style={styles.label}>
          Which day? You get a reminder that morning.
        </Text>
      )}
      {Platform.OS === "ios" ? (
        <DateTimePicker
          value={fromDayString(value)}
          mode="date"
          display="compact"
          themeVariant={scheme === "dark" ? "dark" : "light"}
          minimumDate={today}
          maximumDate={latest}
          onChange={(_, d) => d && onChange(toDayString(d))}
        />
      ) : (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`Planned day, ${formatPlannedDay(value)}. Change`}
          style={[styles.androidButton, { backgroundColor: colors.surface.default }]}
          onPress={() => setAndroidOpen(true)}
        >
          <Text variant="body">{formatPlannedDay(value)}</Text>
        </TouchableOpacity>
      )}
      {Platform.OS === "android" && androidOpen ? (
        <DateTimePicker
          value={fromDayString(value)}
          mode="date"
          display="default"
          minimumDate={today}
          maximumDate={latest}
          onChange={(_, d) => {
            setAndroidOpen(false);
            if (d) onChange(toDayString(d));
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.input,
  },
  // The iOS compact picker pads its own left edge. This lines it up with the
  // card's text.
  bare: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: Platform.OS === "ios" ? -spacing.md : 0,
  },
  label: { flex: 1 },
  androidButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.input,
  },
});
