import { NavigationContainer } from "@react-navigation/native";
import { Audio } from "expo-av";
import React, { useEffect } from "react";
import { AppState, StyleSheet } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import GlobalModal from "./app/components/GlobalModal";
import { AuthProvider } from "./app/contexts/AuthContext";
import MainNavigator from "./app/navigators/MainNavigator";
import FontLoader from "./app/util/components/FontLoader";
// import Toast from "react-native-toast-message";
// import toastConfig from "./app/util/config/toastConfig";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import { SECURE_KEYS_NAME } from "./app/constants/secureStorageKeys";
import { useMoodCheckStore } from "./app/stores/mood";
import { useReminderStore } from "./app/stores/reminders";
import { useUserStore } from "./app/stores/user";
import {
  registerForNotifications,
  setupNotificationHandlers,
} from "./app/util/functions/notifications";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeModules } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ASYNC_KEYS_NAME } from "./app/constants/asyncStorageKeys";
import { TourGuideProvider } from "rn-tourguide";
import TourTooltip, { LocalTourTooltipStub } from "./app/components/Tour";

console.log("NativeModules keys:", Object.keys(NativeModules));

if (__DEV__) {
  require("./ReactotronConfig");
}

// 👇 This is critical for trapping the OAuth redirect back into your JS:
WebBrowser.maybeCompleteAuthSession();

const App: React.FC = () => {
  useEffect(() => {
    // reset mood log on frontend
    useMoodCheckStore.getState().checkAndResetIfNeeded();
  }, []);

  const rescheduleAllActiveNotifications = useReminderStore(
    (state) => state.rescheduleAllActiveNotifications,
  );

  useEffect(() => {
    const checkToken = async () => {
      const accessToken = await SecureStore.getItemAsync(
        SECURE_KEYS_NAME.SW_APP_JWT_KEY,
      );
      const refreshToken = await SecureStore.getItemAsync(
        SECURE_KEYS_NAME.SW_APP_REFRESH_TOKEN_KEY,
      );

      // await SecureStore.deleteItemAsync(SECURE_KEYS_NAME.SW_APP_JWT_KEY);
      // await SecureStore.deleteItemAsync(
      //   SECURE_KEYS_NAME.SW_APP_REFRESH_TOKEN_KEY
      // );
      // await AsyncStorage.removeItem(ASYNC_KEYS_NAME.SW_ZSTORE_USER);
      // await AsyncStorage.removeItem(ASYNC_KEYS_NAME.SW_ZSTORE_ONBOARDING);
      // await AsyncStorage.removeItem(ASYNC_KEYS_NAME.SW_ZSTORE_MOOD_CHECK);
      // await AsyncStorage.removeItem(ASYNC_KEYS_NAME.SW_ZSTORE_TOUR);
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
        "Zustand store rehydrated. Attempting to reschedule notifications.",
      );
      rescheduleAllActiveNotifications();
    });

    // Clean up the subscription when the component unmounts
    return () => {
      unsubscribe();
    };
  }, [rescheduleAllActiveNotifications]);

  // Foreground sync for user data (stamina)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === "active") {
        console.log("App foregrounded: Refreshing user data...");
        useUserStore.getState().fetchUser();
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );

    return () => {
      subscription.remove();
    };
  }, []);

  // if (!ready) return <LoadingScreen />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TourGuideProvider
        tooltipComponent={LocalTourTooltipStub}
        tooltipStyle={{
          backgroundColor: "transparent",
        }}
        androidStatusBarVisible
        backdropColor="rgba(0, 0, 0, 0.85)"
        preventOutsideInteraction={true}
        borderRadius={24}
        maskOffset={10}
        labels={{
          skip: "Skip Tour",
          previous: "Back",
          next: "Next",
          finish: "Got it!",
        }}
      >
        <AuthProvider>
          <SafeAreaProvider style={{ flex: 1 }}>
            <SafeAreaView
              style={styles.safeAreaView}
              edges={["top", "left", "right"]}
            >
              <FontLoader />
              <NavigationContainer>
                <MainNavigator />
                <GlobalModal />
              </NavigationContainer>
            </SafeAreaView>
            <TourTooltip />
          </SafeAreaProvider>
        </AuthProvider>
      </TourGuideProvider>
    </GestureHandlerRootView>
  );
};

export default App;

const styles = StyleSheet.create({
  safeAreaView: {
    flex: 1,
  },
});
