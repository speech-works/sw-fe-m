// notifications.ts
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, Linking, Platform } from "react-native";
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

/** Buddy/community push data.type values that should deep-link to the Community tab. */
const BUDDY_PUSH_TYPES = ["signal", "reaction", "support_note", "support_lifeline"];

const hasGrantedNotificationPermission = (
  settings: Notifications.NotificationPermissionsStatus,
) =>
  settings.granted ||
  settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

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

const buildDailyTrigger = (
  hour: number,
  minute: number,
): Notifications.SchedulableNotificationTriggerInput => {
  if (Platform.OS === "android") {
    return {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: DEFAULT_REMINDER_CHANNEL_ID,
    };
  }

  return {
    type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
    hour,
    minute,
    repeats: true,
  };
};

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

  // Listener for when the user taps on a notification — deep link to the relevant screen
  const notificationResponseSubscription =
    Notifications.addNotificationResponseReceivedListener((response) => {
    console.log("User tapped on notification:", response);

    // 1. Check Auth Status: If not logged in, force navigation to Auth
    const isLoggedIn = !!useUserStore.getState().user;
    if (!isLoggedIn) {
      setTimeout(() => {
        navigate("Auth");
      }, 500);
      return;
    }

    const data = response.notification.request.content.data;

    // 1b. Buddy/community signal (reaction, moment, support…) → open the Community tab.
    const pushType = typeof data?.type === "string" ? (data.type as string) : undefined;
    if (data?.threadId || (pushType && BUDDY_PUSH_TYPES.includes(pushType))) {
      setTimeout(() => {
        navigate("Root", { screen: ROUTE_NAMES.COMMUNITY });
      }, 500);
      return;
    }

    const category = data?.category as ReminderCategory | undefined;

    // 2. Handle Custom Reminders or Fallbacks
    if (!category || category === "CUSTOM") {
      setTimeout(() => {
        navigate("Root", { screen: ROUTE_NAMES.HOME });
      }, 500);
      return;
    }

    // 3. Handle Template Deep Links
    const template = getTemplateForCategory(category);
    if (template?.deepLink) {
      // Small delay to ensure the app is fully foregrounded before navigating
      setTimeout(() => {
        navigate(template.deepLink.screen, template.deepLink.params);
      }, 500);
    } else {
      // Fallback to Home if template has no deep link
      setTimeout(() => {
        navigate("Root", { screen: ROUTE_NAMES.HOME });
      }, 500);
    }
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
export async function registerForNotifications(): Promise<boolean> {
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

  // On emulators/simulators, skip the permission request but still set up channels
  if (!Device.isDevice) {
    console.log(
      "Running on simulator/emulator — skipping notification permission request.",
    );
    return false;
  }

  const existingSettings = await Notifications.getPermissionsAsync();
  let isGranted = hasGrantedNotificationPermission(existingSettings);

  // Only ask if permissions have not already been determined
  if (!isGranted) {
    const requestSettings = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
    isGranted = hasGrantedNotificationPermission(requestSettings);
  }

  if (!isGranted) {
    console.warn("Permission for notifications not granted!");
    return false;
  }

  return true;
}

export async function hasNotificationPermission(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();
  return hasGrantedNotificationPermission(settings);
}

/**
 * Fetch this device's Expo push token and register it with the backend so it can deliver buddy
 * pushes ("Alex shared a moment", "Alex reacted…", crisis support). No-ops on simulators (Expo push
 * only works on real devices). Best-effort — never throws into the caller. PII: never logged.
 */
export async function registerPushToken(): Promise<void> {
  try {
    if (!Device.isDevice) return;
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
 * Request notification permission with a user-friendly fallback.
 * If permission was permanently denied, shows an alert guiding the user
 * to the device settings screen.
 * Returns true if permission is granted, false otherwise.
 */
export async function requestNotificationPermissionWithFallback(): Promise<boolean> {
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

  // 4. Permission was permanently denied — guide the user to settings
  return new Promise<boolean>((resolve) => {
    Alert.alert(
      "Notifications Disabled",
      "To receive reminders, please enable notifications for SpeechWorks in your device settings.",
      [
        { text: "Not Now", style: "cancel", onPress: () => resolve(false) },
        {
          text: "Open Settings",
          onPress: async () => {
            await Linking.openSettings();
            // Re-check after user returns from settings
            const updated = await Notifications.getPermissionsAsync();
            resolve(hasGrantedNotificationPermission(updated));
          },
        },
      ],
    );
  });
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
  return ids;
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

/**
 * Cancel ALL scheduled notifications for this app.
 * Useful for re-scheduling or app cleanup.
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  console.log("All scheduled notifications cancelled for this app.");
}
