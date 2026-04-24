import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { ASYNC_KEYS_NAME } from "../../constants/asyncStorageKeys";
import type { ReminderCategory } from "../../constants/reminderTemplates";
import {
  cancelAllNotifications,
  cancelReminderNotifications,
  scheduleOneTime,
  scheduleRoutine,
} from "../../util/functions/notifications";

export type ReminderType = "ONE_TIME" | "ROUTINE";

export interface Reminder {
  id: string;
  title: string;
  body?: string;
  category: ReminderCategory;
  type: ReminderType;
  date: string; // ISO date: 'YYYY-MM-DD'
  time: string; // 'HH:MM'
  weekDays?: number[]; // 0=Sun…6=Sat for ROUTINE
  notificationIds: string[]; // IDs from scheduleNotificationAsync
  active: boolean;
  createdAt: string; // ISO timestamp
  messageIndex?: number; // Index into the template message pool (for rotation)
}

export type NewReminderInput = Omit<
  Reminder,
  "id" | "notificationIds" | "createdAt"
>;

const MAX_REMINDERS = 3;

interface ReminderState {
  reminders: Reminder[];
  globalPaused: boolean;
  addReminder: (r: NewReminderInput) => Promise<void>;
  updateReminder: (
    id: string,
    changes: Partial<Omit<Reminder, "id">>,
  ) => Promise<void>;
  removeReminder: (id: string) => Promise<void>;
  toggleActive: (id: string) => Promise<void>;
  setGlobalPaused: (paused: boolean) => Promise<void>;
  setAllActive: (active: boolean) => Promise<void>;
  removeAll: () => Promise<void>;
  clearExpired: () => void;
  rescheduleAllActiveNotifications: () => Promise<void>;
  canAddMore: () => boolean;
}

export { MAX_REMINDERS };

export const useReminderStore = create<ReminderState>()(
  persist(
    (set, get) => ({
      reminders: [],
      globalPaused: false,

      canAddMore: () => get().reminders.length < MAX_REMINDERS,

      addReminder: async (r) => {
        if (get().reminders.length >= MAX_REMINDERS) {
          throw new Error(
            `Maximum ${MAX_REMINDERS} reminders allowed. Please delete one to add a new one.`,
          );
        }

        const newRem: Reminder = {
          ...r,
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          notificationIds: [],
          createdAt: new Date().toISOString(),
        };

        // Only schedule if the reminder is active and global isn't paused
        let scheduledNotificationIds: string[] = [];
        if (newRem.active && !get().globalPaused) {
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
              error,
            );
          }

          if (scheduledNotificationIds.length === 0) {
            throw new Error("Failed to schedule reminder notification.");
          }
        }

        newRem.notificationIds = scheduledNotificationIds;
        set((s) => ({ reminders: [...s.reminders, newRem] }));
      },

      updateReminder: async (id, changes) => {
        const currentReminders = get().reminders;
        const oldRem = currentReminders.find((rem) => rem.id === id);

        if (!oldRem) {
          console.warn(
            `Attempted to update non-existent reminder with ID: ${id}`,
          );
          return;
        }

        // 1. Cancel existing notifications
        if (oldRem.notificationIds && oldRem.notificationIds.length > 0) {
          await cancelReminderNotifications(oldRem);
        }

        // 2. Create the updated reminder object
        const updatedRem: Reminder = { ...oldRem, ...changes };

        // 3. Re-schedule if active and not globally paused
        let newNotificationIds: string[] = [];
        if (updatedRem.active && !get().globalPaused) {
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
              error,
            );
            throw error;
          }

          if (newNotificationIds.length === 0) {
            throw new Error("Failed to reschedule reminder notification.");
          }
        }

        updatedRem.notificationIds = newNotificationIds;

        // 4. Update in store
        set((s) => ({
          reminders: s.reminders.map((rem) =>
            rem.id === id ? updatedRem : rem,
          ),
        }));
      },

      removeReminder: async (id) => {
        const remToRemove = get().reminders.find((rem) => rem.id === id);

        if (remToRemove) {
          await cancelReminderNotifications(remToRemove);
        }

        set((s) => ({
          reminders: s.reminders.filter((rem) => rem.id !== id),
        }));
      },

      toggleActive: async (id) => {
        const rem = get().reminders.find((r) => r.id === id);
        if (!rem) return;

        const newActive = !rem.active;

        if (!newActive) {
          // Pausing — cancel notifications
          await cancelReminderNotifications(rem);
          set((s) => ({
            reminders: s.reminders.map((r) =>
              r.id === id ? { ...r, active: false, notificationIds: [] } : r,
            ),
          }));
        } else {
          // Resuming — reschedule notifications
          let newNotificationIds: string[] = [];
          if (!get().globalPaused) {
            try {
              if (rem.type === "ONE_TIME") {
                newNotificationIds.push(await scheduleOneTime(rem));
              } else if (rem.type === "ROUTINE") {
                newNotificationIds = await scheduleRoutine(rem);
              }
            } catch (error) {
              console.error(`Failed to reschedule reminder ${id}:`, error);
            }
          }
          set((s) => ({
            reminders: s.reminders.map((r) =>
              r.id === id
                ? { ...r, active: true, notificationIds: newNotificationIds }
                : r,
            ),
          }));
        }
      },

      setGlobalPaused: async (paused) => {
        set({ globalPaused: paused });
        await get().rescheduleAllActiveNotifications();
      },

      setAllActive: async (active) => {
        // Update all reminders to the target active state
        const updatedReminders = get().reminders.map(r => ({ ...r, active }));
        set({ reminders: updatedReminders });
        
        // Then reschedule everything
        await get().rescheduleAllActiveNotifications();
      },

      removeAll: async () => {
        // Cancel all notifications owned by this store
        await Promise.all(
          get()
            .reminders.filter((r) => r.notificationIds.length > 0)
            .map((r) => cancelReminderNotifications(r)),
        );
        set({ reminders: [], globalPaused: false });
      },

      clearExpired: () => {
        const now = new Date();
        const updatedReminders = get().reminders.filter((rem) => {
          if (rem.type === "ONE_TIME") {
            const [y, m, d] = rem.date.split("-").map(Number);
            const [h, min] = rem.time.split(":").map(Number);
            const dt = new Date(y, m - 1, d, h, min);
            return dt.getTime() > now.getTime();
          }
          return true;
        });

        get().reminders.forEach(async (rem) => {
          if (!updatedReminders.some((ur) => ur.id === rem.id)) {
            await cancelReminderNotifications(rem);
          }
        });

        set({ reminders: updatedReminders });
      },

      rescheduleAllActiveNotifications: async () => {
        if (get().globalPaused) {
          console.log("Global pause is on — skipping reschedule.");
          return;
        }

        console.log("Rescheduling all active notifications...");

        // 1. Cancel existing notifications
        await Promise.all(
          get().reminders.map(async (rem) => {
            if (rem.notificationIds.length > 0) {
              await cancelReminderNotifications(rem);
            }
          }),
        );

        // 2. Filter expired one-time reminders
        const now = new Date();
        const activeReminders = get().reminders.filter((rem) => {
          if (!rem.active) return false;
          if (rem.type === "ONE_TIME") {
            const [y, m, d] = rem.date.split("-").map(Number);
            const [h, min] = rem.time.split(":").map(Number);
            const dt = new Date(y, m - 1, d, h, min);
            return dt.getTime() > now.getTime();
          }
          return true;
        });

        // 3. Reschedule
        const updatedReminders = await Promise.all(
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
                error,
              );
              newNotificationIds = [];
            }
            return { ...rem, notificationIds: newNotificationIds };
          }),
        );

        // 4. Merge: keep inactive reminders as-is, update active ones
        const allReminders = get().reminders.map((rem) => {
          const updated = updatedReminders.find((u) => u.id === rem.id);
          return updated || { ...rem, notificationIds: [] };
        });

        set({ reminders: allReminders });
        console.log("All active notifications rescheduled.");
      },
    }),
    {
      name: ASYNC_KEYS_NAME.SW_ZSTORE_REMINDERS,
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
