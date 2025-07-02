import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  scheduleOneTime,
  scheduleRoutine,
  cancelReminderNotifications,
  cancelAllNotifications,
} from "../../util/functions/notifications";
import { ASYNC_KEYS_NAME } from "../../constants/asyncStorageKeys";

export type ReminderType = "ONE_TIME" | "ROUTINE";

export interface Reminder {
  id: string;
  type: ReminderType;
  date: string; // ISO date: 'YYYY-MM-DD'
  time: string; // 'HH:MM'
  notes?: string;
  weekDays?: number[]; // 0=Sun…6=Sat for ROUTINE
  notificationIds: string[]; // IDs from scheduleNotificationAsync
}

interface ReminderState {
  reminders: Reminder[];
  addReminder: (r: Omit<Reminder, "id" | "notificationIds">) => Promise<void>;
  updateReminder: (
    id: string,
    changes: Partial<Omit<Reminder, "id">>
  ) => Promise<void>;
  removeReminder: (id: string) => Promise<void>;
  clearExpired: () => void;
  // New action to re-schedule notifications when the app starts/rehydrates
  rescheduleAllActiveNotifications: () => Promise<void>;
}

export const useReminderStore = create<ReminderState>()(
  persist(
    (set, get) => ({
      reminders: [],

      addReminder: async (r) => {
        const newRem: Reminder = {
          ...r,
          id: new Date().toString(),
          notificationIds: [], // Initialize empty; will be populated after scheduling
        };

        let scheduledNotificationIds: string[] = [];
        try {
          if (newRem.type === "ONE_TIME") {
            const notificationId = await scheduleOneTime(newRem);
            scheduledNotificationIds.push(notificationId);
          } else if (newRem.type === "ROUTINE") {
            scheduledNotificationIds = await scheduleRoutine(newRem);
          }
        } catch (error) {
          console.error(
            "Failed to schedule notification for new reminder:",
            error
          );
          // Decide how to handle this:
          // 1. You could throw the error to the UI to notify the user.
          // 2. You could prevent adding the reminder to the store if notifications are critical.
          // For now, we'll proceed but log the error.
        }

        // Update the new reminder with the scheduled IDs
        newRem.notificationIds = scheduledNotificationIds;

        set((s) => ({ reminders: [...s.reminders, newRem] }));
      },

      updateReminder: async (id, changes) => {
        const currentReminders = get().reminders;
        const oldRem = currentReminders.find((rem) => rem.id === id);

        if (!oldRem) {
          console.warn(
            `Attempted to update non-existent reminder with ID: ${id}`
          );
          return;
        }

        // 1. Cancel existing notifications for the old reminder
        if (oldRem.notificationIds && oldRem.notificationIds.length > 0) {
          await cancelReminderNotifications(oldRem);
        }

        // 2. Create the updated reminder object
        const updatedRem: Reminder = { ...oldRem, ...changes };

        // 3. Re-schedule notifications for the updated reminder
        let newNotificationIds: string[] = [];
        try {
          if (updatedRem.type === "ONE_TIME") {
            const notificationId = await scheduleOneTime(updatedRem);
            newNotificationIds.push(notificationId);
          } else if (updatedRem.type === "ROUTINE") {
            newNotificationIds = await scheduleRoutine(updatedRem);
          }
        } catch (error) {
          console.error(
            "Failed to re-schedule notification for updated reminder:",
            error
          );
          // Consider a fallback here, e.g., keeping old notifications or alerting user.
        }

        updatedRem.notificationIds = newNotificationIds; // Update with new IDs

        // 4. Update the reminder in the Zustand store
        set((s) => ({
          reminders: s.reminders.map((rem) =>
            rem.id === id ? updatedRem : rem
          ),
        }));
      },

      removeReminder: async (id) => {
        const currentReminders = get().reminders;
        const remToRemove = currentReminders.find((rem) => rem.id === id);

        if (remToRemove) {
          // Cancel associated notifications before removing from store
          await cancelReminderNotifications(remToRemove);
        }

        set((s) => ({
          reminders: s.reminders.filter((rem) => rem.id !== id),
        }));
      },

      clearExpired: () => {
        const now = new Date();
        const updatedReminders = get().reminders.filter((rem) => {
          if (rem.type === "ONE_TIME") {
            const [y, m, d] = rem.date.split("-").map(Number);
            const [h, min] = rem.time.split(":").map(Number);
            const dt = new Date(y, m - 1, d, h, min);
            // Keep one-time reminders only if their scheduled time is in the future
            return dt.getTime() > now.getTime();
          }
          // Routine reminders are never "expired" in this sense, they repeat indefinitely
          return true;
        });

        // Optional: Cancel notifications for the expired ones that are being removed
        get().reminders.forEach(async (rem) => {
          if (!updatedReminders.some((ur) => ur.id === rem.id)) {
            // If reminder is being filtered out
            await cancelReminderNotifications(rem);
          }
        });

        set({ reminders: updatedReminders });
      },

      // New action to re-schedule all active notifications on app load/rehydration
      rescheduleAllActiveNotifications: async () => {
        console.log("Rescheduling all active notifications...");
        // 1. Cancel all existing notifications that might be stale or from previous sessions
        await cancelAllNotifications();

        // 2. Filter out any one-time reminders that might have expired while the app was closed
        const now = new Date();
        const activeReminders = get().reminders.filter((rem) => {
          if (rem.type === "ONE_TIME") {
            const [y, m, d] = rem.date.split("-").map(Number);
            const [h, min] = rem.time.split(":").map(Number);
            const dt = new Date(y, m - 1, d, h, min);
            return dt.getTime() > now.getTime();
          }
          return true; // Routine reminders are always considered active
        });

        // 3. Reschedule notifications for all active reminders
        const updatedRemindersWithNewNIDs = await Promise.all(
          activeReminders.map(async (rem) => {
            let newNotificationIds: string[] = [];
            try {
              if (rem.type === "ONE_TIME") {
                newNotificationIds.push(await scheduleOneTime(rem));
              } else if (rem.type === "ROUTINE") {
                newNotificationIds = await scheduleRoutine(rem);
              }
            } catch (error) {
              console.error(
                `Failed to reschedule notification for reminder ${rem.id}:`,
                error
              );
              // In case of error, you might want to retain old NIDs or alert user.
              // For now, we'll proceed with an empty array if scheduling failed.
              newNotificationIds = [];
            }
            return { ...rem, notificationIds: newNotificationIds };
          })
        );
        set({ reminders: updatedRemindersWithNewNIDs });
        console.log("All active notifications rescheduled.");
      },
    }),
    {
      name: ASYNC_KEYS_NAME.SW_ZSTORE_REMINDERS,
      storage: createJSONStorage(() => AsyncStorage),
      // Middleware lifecycle hooks
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Clear expired reminders first
          state.clearExpired(); // This will also cancel notifications for expired one-time reminders
          // Then, re-schedule all remaining active notifications
          state.rescheduleAllActiveNotifications();
        }
      },
      // You can also add a `version` for migrations if your store structure changes
      // version: 1,
      // migrate: (persistedState, version) => { /* ... */ }
    }
  )
);
