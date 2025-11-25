import React, { useEffect, useState } from "react";
import { Audio } from "expo-av";
import { StyleSheet } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import FontLoader from "./app/util/components/FontLoader";
import { NavigationContainer } from "@react-navigation/native";
import MainNavigator from "./app/navigators/MainNavigator";
import { AuthProvider } from "./app/contexts/AuthContext";
import Toast from "react-native-toast-message";
import toastConfig from "./app/util/config/toastConfig";
import * as WebBrowser from "expo-web-browser";
import * as SecureStore from "expo-secure-store";
import { SECURE_KEYS_NAME } from "./app/constants/secureStorageKeys";
import {
  registerForNotifications,
  setupNotificationHandlers,
} from "./app/util/functions/notifications";
import { useReminderStore } from "./app/stores/reminders";
import { useMoodCheckStore } from "./app/stores/mood";

import { NativeModules } from "react-native";
import { ASYNC_KEYS_NAME } from "./app/constants/asyncStorageKeys";
import AsyncStorage from "@react-native-async-storage/async-storage";

console.log("NativeModules keys:", Object.keys(NativeModules));

if (__DEV__) {
  require("./ReactotronConfig");
}

// 👇 This is critical for trapping the OAuth redirect back into your JS:
WebBrowser.maybeCompleteAuthSession();

const App: React.FC = () => {
  // reset mood log on frontend
  useMoodCheckStore.getState().checkAndResetIfNeeded();

  const rescheduleAllActiveNotifications = useReminderStore(
    (state) => state.rescheduleAllActiveNotifications
  );

  useEffect(() => {
    const checkToken = async () => {
      const accessToken = await SecureStore.getItemAsync(
        SECURE_KEYS_NAME.SW_APP_JWT_KEY
      );
      const refreshToken = await SecureStore.getItemAsync(
        SECURE_KEYS_NAME.SW_APP_REFRESH_TOKEN_KEY
      );

      // await SecureStore.deleteItemAsync(SECURE_KEYS_NAME.SW_APP_JWT_KEY);
      // await SecureStore.deleteItemAsync(
      //   SECURE_KEYS_NAME.SW_APP_REFRESH_TOKEN_KEY
      // );
      // await AsyncStorage.removeItem(ASYNC_KEYS_NAME.SW_ZSTORE_USER);
      await AsyncStorage.removeItem(ASYNC_KEYS_NAME.SW_ZSTORE_ONBOARDING);

      console.log(".................checkToken................");
      console.log("accessToken", accessToken);
      console.log("refreshToken", refreshToken);
      // console.log(
      //   "ASYNC_KEYS_NAME.SW_ZSTORE_USER",
      //   AsyncStorage.getItem(ASYNC_KEYS_NAME.SW_ZSTORE_USER)
      // );
    };

    checkToken();
  }, []);

  useEffect(() => {
    const checkForUpdates = async () => {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
    };

    checkForUpdates();
  }, []);

  useEffect(() => {
    // 1. Register for notifications and set up channels (Android)
    // This function also requests permissions.
    registerForNotifications().then((granted) => {
      if (granted) {
        console.log("Notification permissions granted.");
      } else {
        console.log("Notification permissions denied.");
        // Consider showing a persistent UI message to the user
        // explaining why notifications won't work and how to enable them.
      }
    });

    // 2. Set up notification listeners for foreground and tap interactions
    setupNotificationHandlers();

    // 3. Hydration listener for Zustand store to re-schedule notifications
    // This ensures notifications are restored/updated after the app fully loads
    // and the persisted state is available.
    const unsubscribe = useReminderStore.persist.onFinishHydration(() => {
      console.log(
        "Zustand store rehydrated. Attempting to reschedule notifications."
      );
      rescheduleAllActiveNotifications();
    });

    // Clean up the subscription when the component unmounts
    return () => {
      unsubscribe();
    };
  }, [rescheduleAllActiveNotifications]);

  // if (!ready) return <LoadingScreen />;

  return (
    <AuthProvider>
      <SafeAreaProvider>
        <SafeAreaView
          style={styles.safeAreaView}
          edges={["top", "left", "right"]}
        >
          <FontLoader />
          <NavigationContainer>
            <MainNavigator />
          </NavigationContainer>
          <Toast config={toastConfig} />
        </SafeAreaView>
      </SafeAreaProvider>
    </AuthProvider>
  );
};

export default App;

const styles = StyleSheet.create({
  safeAreaView: {
    flex: 1,
  },
});
