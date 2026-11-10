const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * The line under a reminder in the list. A routine names its days, so a
 * Monday and Friday reminder no longer reads "Every day" (R1, 11 Nov 2026).
 * weekDays is 0=Sun…6=Sat, as saved by ConfigureReminder.
 */
export function reminderRepeatLabel(reminder: {
  type: "ONE_TIME" | "ROUTINE" | string;
  time: string;
  weekDays?: number[];
}): string {
  if (reminder.type !== "ROUTINE") return `Once at ${reminder.time}`;
  const days = Array.from(new Set(reminder.weekDays ?? []))
    .filter((d) => d >= 0 && d <= 6)
    .sort((a, b) => a - b);
  if (days.length === 0 || days.length === 7) {
    return `Every day at ${reminder.time}`;
  }
  return `${days.map((d) => DAY_NAMES[d]).join(", ")} at ${reminder.time}`;
}
