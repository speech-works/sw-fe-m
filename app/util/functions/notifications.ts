// notifications.ts
import * as Notifications from "expo-notifications";
import { Reminder } from "../../stores/reminders";
import { Platform } from "react-native";
import Constants from "expo-constants";

// --- New Global Listener for handling notification interactions ---
// This should be set up once, typically in your App.tsx or a top-level component.
// It should be moved out of this file if this file is meant purely for scheduling functions.
// For now, keeping it here as a utility that can be imported and called.
export const setupNotificationHandlers = () => {
  // Listener for when a notification is received while the app is in the foreground
  Notifications.addNotificationReceivedListener((notification) => {
    console.log(
      "Notification received while app is foregrounded:",
      notification
    );
    // You might want to display a custom in-app banner or toast here
    // rather than the default system notification.
  });

  // Listener for when the user taps on a notification
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
};

/**
 * Registers for push notifications permissions and sets up default channel for Android.
 * This should be called once, typically on app startup.
 * Returns true if permissions are granted, false otherwise.
 */
export async function registerForNotifications(): Promise<boolean> {
  // Check if it's a device capable of receiving notifications
  if (Constants.isDevice) {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Only ask if permissions have not already been determined
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.warn("Permission for notifications not granted!");
      // You might want to show an Alert here in a real app
      return false;
    }

    // --- Android Specific: Create a notification channel ---
    // This is required for Android 8.0 (Oreo) and above for notifications to appear.
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default_reminders", {
        name: "Default Reminders",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250], // Vibrate for 250ms, pause for 250ms, then vibrate for 250ms
        lightColor: "#FF231F7C",
        sound: "default", // Use default notification sound
        showBadge: true,
      });
      // You can create more channels if you have different types of reminders
      // e.g., 'routine_reminders' with different sound/vibration
    }
    return true;
  } else {
    console.log("Must use a physical device for push notifications");
    // You might want to show an Alert for development/testing in emulator
    return false;
  }
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

    const trigger: Notifications.CalendarTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
      weekday: expoWeekday,
      hour,
      minute,
      repeats: true, // Crucial for weekly repetition
    };

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "SpeechWorks Routine Reminder",
        body: rem.notes || "Time for your practice!",
        data: { reminderId: rem.id },
        sound: "default",
      },
      trigger,
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
      throw new Error(`Failed to cancel notification ${nid}: ${error}`);
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
