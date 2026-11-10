import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { ASYNC_KEYS_NAME } from "../../constants/asyncStorageKeys";
import type { ReminderCategory } from "../../constants/reminderTemplates";
import { isSpentOneTime, normalizeReminderDate } from "./normalizeDate";
import { decideSync, mergeReminders } from "./sync";
import {
  getServerReminders,
  putServerReminders,
  type ServerReminderList,
  type SyncedReminder,
} from "../../api/reminders";
import { useUserStore } from "../user";
import {
  cancelAllReminderNotifications,
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

type NewReminderInput = Omit<
  Reminder,
  "id" | "notificationIds" | "createdAt"
>;

const MAX_REMINDERS = 3;

/**
 * ONE way to silence reminders, not two.
 *
 * There used to be a `globalPaused` flag alongside per-reminder `active`, and
 * four scheduling branches had to consult both. It had no UI and never had —
 * Settings' "Master Control" toggle drives `setAllActive`, which is the same
 * intent expressed through the state that already existed. With a cap of three
 * reminders, a second concept whose only advantage is remembering which ones
 * were on before a pause was not worth the branch it was written on.
 *
 * `clearExpired` is gone for the same reason: the reschedule that runs at every
 * launch is the natural place to retire a spent one-time reminder, and it was
 * already walking the list to decide what to schedule.
 */
interface ReminderState {
  reminders: Reminder[];
  addReminder: (r: NewReminderInput) => Promise<void>;
  updateReminder: (
    id: string,
    changes: Partial<Omit<Reminder, "id">>,
  ) => Promise<void>;
  removeReminder: (id: string) => Promise<void>;
  toggleActive: (id: string) => Promise<void>;
  setAllActive: (active: boolean) => Promise<void>;
  removeAll: () => Promise<void>;
  rescheduleAllActiveNotifications: () => Promise<void>;
  canAddMore: () => boolean;
  /**
   * When this phone's list last changed (ISO), and whose list it is. Both
   * drive the sync with the server (D3, 10 Nov 2026). null until the first
   * change or sync after this update.
   */
  updatedAt: string | null;
  ownerId: string | null;
  /** Read the server list and settle it with this phone's (see sync.ts). */
  syncWithServer: (userId: string) => Promise<void>;
}

/**
 * Sync and reschedule run one at a time (D3, 10 Nov 2026). The launch-time
 * reschedule and a sync that takes the server list both end with a `set` of
 * the whole list; run together, the slower one would write back the list the
 * other just replaced.
 */
let exclusiveChain: Promise<unknown> = Promise.resolve();
function exclusive<T>(fn: () => Promise<T>): Promise<T> {
  const run = exclusiveChain.then(fn, fn);
  exclusiveChain = run.catch(() => undefined);
  return run;
}

/** What the server keeps: everything but this phone's notification ids. */
function toSynced(r: Reminder): SyncedReminder {
  const { notificationIds: _ids, ...rest } = r;
  return rest;
}

function fromSynced(r: SyncedReminder): Reminder {
  return {
    ...r,
    date: normalizeReminderDate(r.date),
    category: r.category as ReminderCategory,
    notificationIds: [],
  };
}

export { MAX_REMINDERS };

export const useReminderStore = create<ReminderState>()(
  persist(
    (set, get) => {
      const state: ReminderState = {
      reminders: [],
      updatedAt: null,
      ownerId: null,

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

        let scheduledNotificationIds: string[] = [];
        if (newRem.active) {
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
        markChanged();
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

        const updatedRem: Reminder = { ...oldRem, ...changes };

        // Schedule the NEW notifications BEFORE cancelling the old ones. The
        // reverse order meant a failed edit (a past date, a denied permission)
        // left the user with a reminder still listed and toggled ON whose
        // notifications had already been destroyed — it simply never fired
        // again. Scheduling first means a failure here changes nothing: we
        // throw, the old notifications are still armed, and the store is
        // untouched. The two sets overlap only for the few ms below, during
        // which neither can fire.
        let newNotificationIds: string[] = [];
        if (updatedRem.active) {
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

        // Only now is it safe to retire the previous generation.
        if (oldRem.notificationIds && oldRem.notificationIds.length > 0) {
          await cancelReminderNotifications(oldRem);
        }

        updatedRem.notificationIds = newNotificationIds;

        // 4. Update in store
        set((s) => ({
          reminders: s.reminders.map((rem) =>
            rem.id === id ? updatedRem : rem,
          ),
        }));
        markChanged();
      },

      removeReminder: async (id) => {
        const remToRemove = get().reminders.find((rem) => rem.id === id);

        if (remToRemove) {
          await cancelReminderNotifications(remToRemove);
        }

        set((s) => ({
          reminders: s.reminders.filter((rem) => rem.id !== id),
        }));
        markChanged();
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
          markChanged();
        } else {
          // Resuming — reschedule notifications. A failure here used to be
          // swallowed and then written as `active: true, notificationIds: []`:
          // the switch flipped on and nothing ever fired. Leave the reminder
          // OFF and surface the failure so the UI can say so — the same
          // contract addReminder already has.
          const newNotificationIds: string[] = [];
          if (rem.type === "ONE_TIME") {
            // Its moment may have passed while it was switched off. iOS rejects
            // a past trigger and Android drops it while still handing back an
            // id, so check here and say why rather than letting the platform
            // decide how to fail.
            if (isSpentOneTime(rem, Date.now())) {
              throw new Error(
                "That reminder's time has already passed. Edit it to a future time to switch it back on.",
              );
            }
            newNotificationIds.push(await scheduleOneTime(rem));
          } else if (rem.type === "ROUTINE") {
            newNotificationIds.push(...(await scheduleRoutine(rem)));
          }

          if (newNotificationIds.length === 0) {
            throw new Error("Failed to reschedule reminder notification.");
          }

          set((s) => ({
            reminders: s.reminders.map((r) =>
              r.id === id
                ? { ...r, active: true, notificationIds: newNotificationIds }
                : r,
            ),
          }));
          markChanged();
        }
      },

      setAllActive: async (active) => {
        // Update all reminders to the target active state
        const updatedReminders = get().reminders.map(r => ({ ...r, active }));
        set({ reminders: updatedReminders });
        markChanged();

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
        // Sign-out path. Forget whose list this was and do NOT push: an
        // empty upload would delete the reminders on the person's other
        // phones (D3, 10 Nov 2026).
        set({ reminders: [], updatedAt: null, ownerId: null });
      },

      rescheduleAllActiveNotifications: () => exclusive(rescheduleNow),

      syncWithServer: (userId) =>
        exclusive(async () => {
          // A list left by a different account on this phone is never
          // uploaded to, or kept for, this one (D3, 10 Nov 2026).
          const { ownerId } = get();
          if (ownerId && ownerId !== userId) {
            await clearLocal();
          }

          let server: ServerReminderList;
          try {
            server = await getServerReminders();
          } catch (error) {
            console.warn("[Reminders] could not read the server list:", error);
            return;
          }
          // Signed out (or switched account) while the request was out.
          if (currentUserId() !== userId) return;

          const local = get();
          const decision = decideSync(
            { count: local.reminders.length, updatedAt: local.updatedAt },
            { updatedAt: server.updatedAt },
          );

          if (decision === "ADOPT") {
            await adoptServerList(server);
          } else if (decision === "MERGE") {
            const merged = mergeReminders(
              server.reminders.map(fromSynced),
              local.reminders,
              MAX_REMINDERS,
            );
            set({ reminders: merged, ownerId: userId });
            await uploadNow(userId, new Date().toISOString());
            await rescheduleNow();
          } else if (decision === "UPLOAD") {
            set({ ownerId: userId });
            await uploadNow(
              userId,
              local.updatedAt ?? new Date().toISOString(),
            );
          } else {
            set({ ownerId: userId });
          }
        }),
    };

    function currentUserId(): string | null {
      const id = useUserStore.getState().user?.id;
      return id ? String(id) : null;
    }

    /** Cancel this phone's reminder notifications and empty the list. */
    async function clearLocal() {
      await Promise.all(
        get()
          .reminders.filter((r) => r.notificationIds.length > 0)
          .map((r) => cancelReminderNotifications(r)),
      );
      await cancelAllReminderNotifications();
      set({ reminders: [], updatedAt: null, ownerId: null });
    }

    /**
     * Take the server's list and schedule it on THIS phone. Times are
     * wall-clock, so a 7:00 reminder fires at 7:00 local here too.
     */
    async function adoptServerList(server: ServerReminderList) {
      await Promise.all(
        get()
          .reminders.filter((r) => r.notificationIds.length > 0)
          .map((r) => cancelReminderNotifications(r)),
      );
      set({
        reminders: server.reminders.map(fromSynced),
        updatedAt: server.updatedAt,
        ownerId: currentUserId(),
      });
      await rescheduleNow();
    }

    /** Send the whole list. Best effort: offline, the local list still works. */
    async function uploadNow(userId: string, stamp: string) {
      try {
        const sent = get().reminders;
        const res = await putServerReminders(sent.map(toSynced), stamp);
        if (currentUserId() !== userId) return;
        if (res.applied === false) {
          // Another phone saved a newer list first: that one wins.
          await adoptServerList(res);
        } else if (get().reminders === sent && res.updatedAt) {
          // Store the server's stamp (it pulls a fast phone clock back to
          // now), unless the list changed again while this was out; that
          // change has its own upload queued.
          set({ updatedAt: res.updatedAt, ownerId: userId });
        }
      } catch (error) {
        console.warn("[Reminders] could not save the list to the server:", error);
      }
    }

    /**
     * Every change the person makes: stamp it and send it. Not awaited, so a
     * slow or missing network never holds up the screen.
     */
    function markChanged() {
      const stamp = new Date().toISOString();
      const userId = currentUserId();
      set({ updatedAt: stamp, ...(userId ? { ownerId: userId } : {}) });
      if (!userId) return;
      void exclusive(() => uploadNow(userId, get().updatedAt ?? stamp));
    }

    async function rescheduleNow() {

        // 1. Cancel the previous generation — by stored id AND by what is
        // actually pending on the device.
        //
        // The stored ids alone are not enough: a reschedule mints ~21 new ids
        // across as many native calls but persists once at the end, so a kill
        // in between leaves the store pointing at the previous generation
        // while the new one stays armed. Those orphans are weekly repeats, so
        // they would arrive forever with nothing left holding their ids.
        //
        // The device sweep alone is not enough either — it can fail to
        // enumerate, and skipping the cancel entirely would let this pass
        // duplicate every reminder. Doing both means the targeted cancel still
        // happens if the sweep fails, and duplicate cancels are harmless.
        await Promise.all(
          get().reminders.map(async (rem) => {
            if (rem.notificationIds.length > 0) {
              await cancelReminderNotifications(rem);
            }
          }),
        );
        await cancelAllReminderNotifications();

        // 2. RETIRE spent one-time reminders — don't just skip them.
        //
        // They used to be kept with an empty id list, which looked harmless but
        // wasn't: canAddMore() counts the array, so three one-off reminders that
        // had already fired silently consumed the entire budget of three and
        // the user could never add another. There was a clearExpired() that
        // would have removed them, and nothing ever called it. This pass runs at
        // every launch and is already walking the list, so it is the right place
        // — and now there is only one place.
        const now = Date.now();
        const surviving = get().reminders.filter((rem) => !isSpentOneTime(rem, now));
        const activeReminders = surviving.filter((rem) => rem.active);

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

        // 4. Merge over the SURVIVORS, so the retired ones are gone for good.
        set({
          reminders: surviving.map(
            (rem) =>
              updatedReminders.find((u) => u.id === rem.id) ?? {
                ...rem,
                notificationIds: [],
              },
          ),
        });
    }

    return state;
    },
    {
      name: ASYNC_KEYS_NAME.SW_ZSTORE_REMINDERS,
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      // v0 → v1: repair dates written as MM/DD/YYYY by the Settings screen.
      // Every consumer parses `date` with split("-"), so a slashed value became
      // NaN — the trigger silently never fired, and `NaN > now` is false, so it
      // was also classified as expired forever and could never self-heal.
      // Untouched: ROUTINE rows (date is ""), and any value already ISO.
      migrate: (persisted, version) => {
        if (version >= 1) return persisted as ReminderState;
        const state = persisted as ReminderState | undefined;
        if (!state?.reminders) return state as ReminderState;
        return {
          ...state,
          reminders: state.reminders.map((rem) => ({
            ...rem,
            date: normalizeReminderDate(rem.date),
          })),
        };
      },
    },
  ),
);
