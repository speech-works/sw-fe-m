// notifications.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { ASYNC_KEYS_NAME } from "../../constants/asyncStorageKeys";
import type { Reminder } from "../../stores/reminders";

const DEFAULT_REMINDER_CHANNEL_ID = "default_reminders";
const PREFERRED_PRACTICE_REMINDER_STORAGE_KEY =
  ASYNC_KEYS_NAME.SW_APP_PREFERRED_PRACTICE_REMINDER_NOTIFICATION_ID;

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

  // Listener for when the user taps on a notification
  const notificationResponseSubscription =
    Notifications.addNotificationResponseReceivedListener((response) => {
    console.log("User tapped on notification:", response);
    const reminderId = response.notification.request.content.data?.reminderId;
    if (reminderId) {
      console.log(`User tapped on reminder with ID: ${reminderId}`);
      // TODO: Implement navigation to the specific reminder's details screen
      // Example: navigationRef.current?.navigate('ReminderDetails', { reminderId });
    }
    // You can also check response.actionIdentifier if you add custom action buttons
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
  // Check if it's a device capable of receiving notifications
  if (Constants.isDevice) {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(
        DEFAULT_REMINDER_CHANNEL_ID,
        {
          name: "Default Reminders",
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250], // Vibrate for 250ms, pause for 250ms, then vibrate for 250ms
          lightColor: "#FF231F7C",
          sound: "default", // Use default notification sound
          showBadge: true,
        },
      );
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
      // You might want to show an Alert here in a real app
      return false;
    }

    // You can create more channels if you have different types of reminders
    // e.g., 'routine_reminders' with different sound/vibration
    return true;
  } else {
    console.log("Must use a physical device for push notifications");
    // You might want to show an Alert for development/testing in emulator
    return false;
  }
}

export async function hasNotificationPermission(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();
  return hasGrantedNotificationPermission(settings);
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
      title: "SpeechWorks Reminder",
      body: rem.notes || "Time for your practice!",
      data: { reminderId: rem.id },
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
        title: "SpeechWorks Routine Reminder",
        body: rem.notes || "Time for your practice!",
        data: { reminderId: rem.id },
        sound: "default",
      },
      trigger: buildRoutineTrigger(expoWeekday, hour, minute),
    });
    ids.push(id);
  }
  return ids;
}

export async function syncPreferredPracticeReminder(
  reminderTime: Date | null,
): Promise<void> {
  const existingNotificationId = await AsyncStorage.getItem(
    PREFERRED_PRACTICE_REMINDER_STORAGE_KEY,
  );

  if (existingNotificationId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(
        existingNotificationId,
      );
    } catch (error) {
      console.warn(
        "Failed to cancel previous preferred practice reminder:",
        error,
      );
    }
    await AsyncStorage.removeItem(PREFERRED_PRACTICE_REMINDER_STORAGE_KEY);
  }

  if (!reminderTime) {
    return;
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: "SpeechWorks Daily Reminder",
      body: "Time for your practice session.",
      data: { type: "preferred_practice_reminder" },
      sound: "default",
    },
    trigger: buildDailyTrigger(
      reminderTime.getHours(),
      reminderTime.getMinutes(),
    ),
  });

  await AsyncStorage.setItem(PREFERRED_PRACTICE_REMINDER_STORAGE_KEY, id);
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
