// notifications.ts
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import {
  getTemplateForCategory,
  type ReminderCategory,
} from "../../constants/reminderTemplates";
import type { Reminder } from "../../stores/reminders";
import { useUserStore } from "../../stores/user";
import {
  registerPushToken as apiRegisterPushToken,
  removePushToken as apiRemovePushToken,
} from "../../api/devices";
import { navigate } from "./navigation";
import { ROUTE_NAMES } from "../../constants/routes";

const DEFAULT_REMINDER_CHANNEL_ID = "default_reminders";

/** AsyncStorage key for the last-registered Expo push token (so we can deregister on logout). */
const PUSH_TOKEN_KEY = "SW_EXPO_PUSH_TOKEN";

/** AsyncStorage key for the last notification response we have already acted on. */
const HANDLED_RESPONSE_KEY = "SW_LAST_HANDLED_NOTIFICATION_RESPONSE";

/** Buddy/community push data.type values that should deep-link to the Community tab. */
const BUDDY_PUSH_TYPES = ["signal", "reaction", "support_note", "support_lifeline"];

const hasGrantedNotificationPermission = (
  settings: Notifications.NotificationPermissionsStatus,
) =>
  settings.granted ||
  settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

/** The OS-level answer, read fresh. The user can change it in system settings
 *  at any time without the app knowing, so never cache this beyond a foreground. */
export async function isNotificationPermissionGranted(): Promise<boolean> {
  try {
    return hasGrantedNotificationPermission(
      await Notifications.getPermissionsAsync(),
    );
  } catch (error) {
    // Unknown is not the same as denied — don't accuse the user's device of
    // something we failed to read.
    console.warn("[Push] could not read notification permission:", error);
    return true;
  }
}

/**
 * Ask the OS directly, once. Returns whether we ended up granted.
 *
 * Distinct from requestNotificationPermissionWithFallback(): that one is for a
 * user who just tapped something that NEEDS notifications, so it may show an
 * "Open Settings" alert. This is the proactive ask, and it must stay silent —
 * if the user has already denied, iOS cannot re-prompt and pushing an alert at
 * someone who didn't ask for one is the wrong trade.
 */
export async function requestNotificationPermissionQuietly(): Promise<boolean> {
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(
        DEFAULT_REMINDER_CHANNEL_ID,
        {
          name: "Default Reminders",
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
          sound: "default",
          showBadge: true,
        },
      );
    }

    const settings = await Notifications.getPermissionsAsync();
    if (hasGrantedNotificationPermission(settings)) return true;
    // iOS turns this false permanently after one denial; asking again is a
    // silent no-op, so don't bother the user with a dialog that can't appear.
    if (!settings.canAskAgain) return false;

    const result = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
    const granted = hasGrantedNotificationPermission(result);
    if (granted) void registerPushToken();
    return granted;
  } catch (error) {
    console.warn("[Push] quiet permission request failed:", error);
    return false;
  }
}

const buildRoutineTrigger = (
  weekday: number,
  hour: number,
  minute: number,
): Notifications.SchedulableNotificationTriggerInput => {
  if (Platform.OS === "android") {
    return {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday,
      hour,
      minute,
      channelId: DEFAULT_REMINDER_CHANNEL_ID,
    };
  }

  return {
    type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
    weekday,
    hour,
    minute,
    repeats: true,
  };
};

/**
 * A stable name for ONE DELIVERY of one notification.
 *
 * BOTH HALVES ARE LOad-BEARING. The identifier alone is not enough: a repeating
 * reminder (`repeats: true`) keeps the same request identifier for every
 * trigger, so keying on it would let Monday's tap suppress Tuesday's. The date
 * alone is not enough either — two notifications can land in the same
 * millisecond. Together they name a single delivery.
 *
 * Returns null when either half is missing, and the caller then routes normally.
 * Failing open is deliberate: dropping a tap the user really made is worse than
 * the rare duplicate this exists to stop.
 *
 * The runtime guards look redundant against the TypeScript types — they are
 * not. On the Android path that replays a stale launch Intent, the response is
 * rebuilt from raw Intent extras (`NotificationSerializer.toResponseBundleFromExtras`),
 * where `identifier` is `google.message_id` and `date` is `google.sent_time`.
 * Anything that is not an FCM push arrives with those null and 0.
 */
export function notificationResponseKey(
  response: Notifications.NotificationResponse,
): string | null {
  const identifier = response?.notification?.request?.identifier;
  const date = response?.notification?.date;
  if (typeof identifier !== "string" || identifier === "") return null;
  if (typeof date !== "number" || !Number.isFinite(date) || date <= 0) {
    return null;
  }
  return `${identifier}:${date}`;
}

/**
 * Record a response and report whether we had already acted on it.
 *
 * PERSISTED, not in-memory, because the duplicate arrives in a DIFFERENT
 * PROCESS. Android hands the launching Intent back to a recreated Activity, so
 * one tap is replayed as a fresh response on every relaunch from the Recents
 * list — a module-level Set would be empty each time and catch nothing.
 *
 * `Notifications.clearLastNotificationResponseAsync()` does NOT solve this; it
 * only clears the native module's in-memory bundle, never the Intent.
 */
async function claimResponse(key: string): Promise<"fresh" | "already-handled"> {
  try {
    if ((await AsyncStorage.getItem(HANDLED_RESPONSE_KEY)) === key) {
      return "already-handled";
    }
    await AsyncStorage.setItem(HANDLED_RESPONSE_KEY, key);
  } catch (error) {
    // Best effort. A storage failure puts us back to routing every time, which
    // is where this started — not worse.
    console.warn("[Push] could not read the handled-response marker:", error);
  }
  return "fresh";
}

/**
 * Where a notification tap sends someone. Runs 500ms after the response so the
 * app has finished foregrounding and the stores have had a moment to rehydrate.
 */
async function routeFromNotificationResponse(
  response: Notifications.NotificationResponse,
): Promise<void> {
  // ONCE PER DELIVERY. Claimed BEFORE the session check on purpose: a response
  // seen while logged out is spent, so signing in later cannot make an old
  // replay suddenly navigate.
  const key = notificationResponseKey(response);
  if (key && (await claimResponse(key)) === "already-handled") return;

  // NO SESSION → NO DEEP LINK, AND NO REDIRECT EITHER.
  //
  // This used to `navigate("Auth")`, which was harmless back when the
  // logged-out half of the app WAS a single login screen: it navigated you to
  // the screen you were already on. It stopped being harmless the moment Act 1
  // moved in front of it. AuthNavigator now opens a stranger on the welcome
  // screen, and this dragged them off it half a second later — onto the login
  // wall the whole pre-signup flow exists to avoid.
  //
  // Doing nothing loses nothing: AuthNavigator has already put this person
  // exactly where they belong, and every destination below needs an account.
  if (!useUserStore.getState().user) return;

  const data = response.notification.request.content.data;

  // Buddy/community signal (reaction, moment, support…) → the Community tab.
  const pushType =
    typeof data?.type === "string" ? (data.type as string) : undefined;
  if (data?.threadId || (pushType && BUDDY_PUSH_TYPES.includes(pushType))) {
    navigate("Root", { screen: ROUTE_NAMES.COMMUNITY });
    return;
  }

  const category = data?.category as ReminderCategory | undefined;

  // Custom reminders, and anything with no category, land on Home.
  if (!category || category === "CUSTOM") {
    navigate("Root", { screen: ROUTE_NAMES.HOME });
    return;
  }

  const template = getTemplateForCategory(category);
  if (template?.deepLink) {
    navigate(template.deepLink.screen, template.deepLink.params);
  } else {
    // Fallback to Home if template has no deep link
    navigate("Root", { screen: ROUTE_NAMES.HOME });
  }
}

// --- New Global Listener for handling notification interactions ---
// This should be set up once, typically in your App.tsx or a top-level component.
// It should be moved out of this file if this file is meant purely for scheduling functions.
// For now, keeping it here as a utility that can be imported and called.
export const setupNotificationHandlers = () => {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  // Listener for when a notification is received while the app is in the foreground
  const notificationReceivedSubscription =
    Notifications.addNotificationReceivedListener((notification) => {
      console.log(
        "Notification received while app is foregrounded:",
        notification,
      );
      // You might want to display a custom in-app banner or toast here
      // rather than the default system notification.
    });

  // Listener for when the user taps on a notification — deep link to the
  // relevant screen.
  //
  // "TAPPED" IS OPTIMISTIC. This fires on ordinary cold starts too: Android
  // hands the launching Intent back to a recreated Activity, so a single tap
  // days ago is replayed as a fresh response on every relaunch from the Recents
  // list (`ExpoNotificationLifecycleListener.onCreate` →
  // `NotificationManager.onNotificationResponseFromExtras`). Everything the
  // routing does must therefore be safe to run on any launch, which is what
  // `routeFromNotificationResponse` handles.
  const notificationResponseSubscription =
    Notifications.addNotificationResponseReceivedListener((response) => {
      console.log("User tapped on notification:", response);
      // Deferred so the app can finish foregrounding before the navigator is
      // touched, and so the stores have a moment to rehydrate — the session
      // read inside would otherwise report "logged out" for someone who is
      // merely still on disk.
      setTimeout(() => {
        void routeFromNotificationResponse(response);
      }, 500);
    });

  return () => {
    notificationReceivedSubscription.remove();
    notificationResponseSubscription.remove();
  };
};

/**
 * Registers for push notifications permissions and sets up default channel for Android.
 * This should be called once, typically on app startup.
 * Returns true if permissions are granted, false otherwise.
 */
/**
 * Create the Android notification channel. Safe to call on every launch, needs
 * no permission, and must run before anything is scheduled or any push arrives
 * — a message naming a channel that doesn't exist is dropped on Android 8+.
 */
export async function ensureNotificationChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    await Notifications.setNotificationChannelAsync(
      DEFAULT_REMINDER_CHANNEL_ID,
      {
        name: "Default Reminders",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
        sound: "default",
        showBadge: true,
      },
    );
  } catch (error) {
    console.warn("[Push] could not create notification channel:", error);
  }
}

/**
 * Startup work only: make sure the channel exists, and if permission was
 * ALREADY granted on a previous run, refresh this device's push token.
 *
 * This deliberately no longer REQUESTS permission. It used to, from a bare
 * mount effect, which fired the system dialog over the pre-auth welcome screen
 * before the person had signed up or seen what the app does. iOS grants exactly
 * one dialog per install, so that spent the only ask we get at the worst
 * possible moment. The ask now lives in NotificationPermissionPrompt, on Home,
 * after onboarding.
 *
 * @returns whether notifications are currently permitted.
 */
export async function registerForNotifications(): Promise<boolean> {
  await ensureNotificationChannel();

  // Expo push tokens require a real device; the channel above is still worth
  // creating on an emulator so local reminders behave the same there.
  if (!Device.isDevice) {
    console.log(
      "Running on simulator/emulator — skipping push token registration.",
    );
    return false;
  }

  const isGranted = hasGrantedNotificationPermission(
    await Notifications.getPermissionsAsync(),
  );

  if (isGranted) {
    // Returning user who already said yes — keep their token fresh.
    void registerPushToken();
  }

  return isGranted;
}

/**
 * Fetch this device's Expo push token and register it with the backend so it can deliver buddy
 * pushes ("Alex shared a moment", "Alex reacted…", crisis support). No-ops on simulators (Expo push
 * only works on real devices). Best-effort — never throws into the caller. PII: never logged.
 */
export async function registerPushToken(): Promise<void> {
  try {
    if (!Device.isDevice) return;
    // Called on every login as well as at startup, so it can fire before the
    // permission prompt has been answered. Bail quietly rather than letting
    // getExpoPushTokenAsync throw — the startup path re-runs this once the
    // grant lands.
    if (!hasGrantedNotificationPermission(await Notifications.getPermissionsAsync())) {
      return;
    }
    const projectId =
      (Constants.expoConfig as any)?.extra?.eas?.projectId ??
      (Constants as any)?.easConfig?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    if (!token) return;
    await apiRegisterPushToken(token);
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
  } catch (err) {
    console.warn("[Push] token registration failed:", err);
  }
}

/** Deregister this device's push token (call on logout). Best-effort. */
export async function unregisterPushToken(): Promise<void> {
  try {
    const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (token) {
      await apiRemovePushToken(token);
      await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
    }
  } catch (err) {
    console.warn("[Push] token removal failed:", err);
  }
}

/**
 * What came of asking for notification permission.
 *
 * `blocked` is the case worth distinguishing: the OS will not show its dialog
 * again, so the only route left is system settings. Callers use it to offer
 * that route in OUR dialog — this module renders nothing itself.
 */
export type NotificationPermissionOutcome = "granted" | "denied" | "blocked";

/**
 * Request notification permission, reporting enough for the caller to respond
 * well. Never renders anything.
 */
export async function requestNotificationPermissionWithFallback(): Promise<NotificationPermissionOutcome> {
  const granted = await resolveNotificationPermission();

  if (!granted) {
    // Distinguish "said no just now, could be asked again" from "the OS will
    // never ask again". Only the latter needs a trip to system settings.
    const settings = await Notifications.getPermissionsAsync();
    return settings.canAskAgain ? "denied" : "blocked";
  }

  // A grant obtained HERE is the late path: the user declined at first launch
  // (or was never asked), so App.tsx's startup registration already ran and
  // gave up. Without this, local reminders would start working while every
  // server-sent push stayed dead until the next cold start — which reads as
  // "buddy notifications are broken".
  //
  // Deliberately NOT awaited: callers are save handlers, and this makes a
  // network round-trip. registerPushToken never throws, so nothing here can
  // delay or fail the save.
  void registerPushToken();
  return "granted";
}

async function resolveNotificationPermission(): Promise<boolean> {
  // 1. Ensure Android channel exists regardless of permission state
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(
      DEFAULT_REMINDER_CHANNEL_ID,
      {
        name: "Default Reminders",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
        sound: "default",
        showBadge: true,
      },
    );
  }

  // 2. Check current status
  const settings = await Notifications.getPermissionsAsync();
  if (hasGrantedNotificationPermission(settings)) {
    return true;
  }

  // 3. If we can still ask (status is undetermined/not yet asked), request it
  if (settings.canAskAgain) {
    const requestResult = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
    return hasGrantedNotificationPermission(requestResult);
  }

  // 4. Permanently denied. This module cannot render — it is imported by save
  // handlers, not mounted — so it reports the fact and the CALLER decides how
  // to say it. It used to raise a native OS alert here, which was the only
  // system-styled dialog left in the product.
  return false;
}

/**
 * Schedule a one‑time notification.
 * Returns the notification ID.
 */
export async function scheduleOneTime(rem: Reminder): Promise<string> {
  const [year, month, day] = rem.date.split("-").map(Number);
  const [hour, minute] = rem.time.split(":").map(Number);
  const triggerDate = new Date(year, month - 1, day, hour, minute);

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: rem.title,
      body: rem.body || "Time for your practice!",
      data: { reminderId: rem.id, category: rem.category },
      sound: "default",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
      channelId: DEFAULT_REMINDER_CHANNEL_ID,
    },
  });
  return id;
}

/**
 * Schedule a weekly routine on selected weekdays.
 * Returns an array of notification IDs.
 */
export async function scheduleRoutine(rem: Reminder): Promise<string[]> {
  const ids: string[] = [];
  const [hour, minute] = rem.time.split(":").map(Number);

  try {
    for (const weekday of rem.weekDays || []) {
      // Input Weekday (0=Sun...6=Sat) to Expo Weekday (1=Sun...7=Sat)
      // 0 (Sunday) -> 1
      // 1 (Monday) -> 2
      // ...
      // 6 (Saturday) -> 7
      const expoWeekday = weekday + 1;

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: rem.title,
          body: rem.body || "Time for your practice!",
          data: { reminderId: rem.id, category: rem.category },
          sound: "default",
        },
        trigger: buildRoutineTrigger(expoWeekday, hour, minute),
      });
      ids.push(id);
    }
  } catch (error) {
    // Partial failure would otherwise strand the days that DID schedule: every
    // caller discards the return value on throw, and these are `repeats: true`
    // weekly triggers, so the orphans would arrive forever with nothing left
    // holding their ids. Undo our own work before surfacing the failure.
    for (const id of ids) {
      try {
        await Notifications.cancelScheduledNotificationAsync(id);
      } catch {
        // Best-effort: the reconciling sweep in cancelAllReminderNotifications
        // is the backstop if this also fails.
      }
    }
    throw error;
  }

  return ids;
}

/**
 * Cancel every reminder notification actually pending ON THE DEVICE, not just
 * the ids this store happens to remember.
 *
 * Those two sets drift: a reschedule mints new ids across ~21 native calls and
 * persists once at the end, so a kill in between leaves the store holding the
 * previous generation while the new one stays armed. Cancelling by stored id
 * can then never reach the orphans, and they repeat weekly forever.
 *
 * Only requests carrying a `reminderId` in their data are touched, so this
 * cannot cancel notifications scheduled by any other part of the app.
 */
export async function cancelAllReminderNotifications(): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const req of scheduled) {
      const data = req.content?.data as { reminderId?: unknown } | undefined;
      if (typeof data?.reminderId !== "string") continue;
      try {
        await Notifications.cancelScheduledNotificationAsync(req.identifier);
      } catch (error) {
        console.warn(`[Reminders] failed to cancel ${req.identifier}:`, error);
      }
    }
  } catch (error) {
    // Never block the caller — the per-reminder cancel still runs.
    console.warn("[Reminders] could not enumerate scheduled notifications:", error);
  }
}



/**
 * Cancel all notifications for a reminder.
 */
export async function cancelReminderNotifications(rem: Reminder) {
  for (const nid of rem.notificationIds) {
    try {
      await Notifications.cancelScheduledNotificationAsync(nid);
    } catch (error) {
      console.warn(`Failed to cancel notification ${nid}:`, error);
      // This can happen if the notification was already delivered or cleared by the OS/user.
    }
  }
}
