import { NavigationContainer } from "@react-navigation/native";
import { Audio } from "expo-av";
import React, { useEffect } from "react";
import { AppState, StyleSheet } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import UpsellModal from "./app/components/UpsellModal";
import OutcomeModal from "./app/components/OutcomeModal";
import StaminaVignetteOverlay from "./app/components/StaminaVignetteOverlay";
import GlobalStaminaController from "./app/components/GlobalStaminaController";
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
import { navigationRef } from "./app/util/functions/navigation";
import {
  registerForNotifications,
  setupNotificationHandlers,
} from "./app/util/functions/notifications";

import { GestureHandlerRootView } from "react-native-gesture-handler";

if (__DEV__) {
  require("./ReactotronConfig");
}

// 👇 This is critical for trapping the OAuth redirect back into your JS:
WebBrowser.maybeCompleteAuthSession();

// Bug Fix #3: Debounce guard for AppState-triggered fetchUser() calls.
// Android foregrounds apps more aggressively than iOS (screen-on events,
// notification dismissals, alt-tab, etc.). Without this guard, stamina
// detection can fire multiple times in a short window, each one a candidate
// for bypassing the lowStaminaNotified flag before it persists.
const APPSTATE_FETCH_DEBOUNCE_MS = 5_000;
let lastAppStateFetchTime = 0;

const App: React.FC = () => {
  useEffect(() => {
    // reset mood log on frontend
    useMoodCheckStore.getState().checkAndResetIfNeeded();
  }, []);

  const rescheduleAllActiveNotifications = useReminderStore(
    (state) => state.rescheduleAllActiveNotifications,
  );

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
    const cleanupNotificationHandlers = setupNotificationHandlers();

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
      cleanupNotificationHandlers();
    };
  }, [rescheduleAllActiveNotifications]);

  // Foreground sync for user data (stamina)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === "active") {
        void (async () => {
          // Bug Fix #3: Debounce rapid foreground events (common on Android).
          const now = Date.now();
          if (now - lastAppStateFetchTime < APPSTATE_FETCH_DEBOUNCE_MS) {
            console.log("App foregrounded: Skipping fetchUser (debounced)");
            return;
          }
          lastAppStateFetchTime = now;

          const [accessToken, refreshToken] = await Promise.all([
            SecureStore.getItemAsync(SECURE_KEYS_NAME.SW_APP_JWT_KEY),
            SecureStore.getItemAsync(SECURE_KEYS_NAME.SW_APP_REFRESH_TOKEN_KEY),
          ]);

          if (!accessToken && !refreshToken) {
            console.log(
              "App foregrounded: Skipping user refresh (no stored session)",
            );
            return;
          }

          console.log("App foregrounded: Refreshing user data...");
          await useUserStore.getState().fetchUser();
        })();
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
      <AuthProvider>
        <SafeAreaProvider style={{ flex: 1 }}>
          <SafeAreaView
            style={styles.safeAreaView}
            edges={["top", "left", "right"]}
          >
            <FontLoader />
            <NavigationContainer ref={navigationRef}>
              <MainNavigator />
            </NavigationContainer>
            <UpsellModal />
            <OutcomeModal />
            <StaminaVignetteOverlay />
            <GlobalStaminaController />
          </SafeAreaView>
        </SafeAreaProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
};

export default App;

const styles = StyleSheet.create({
  safeAreaView: {
    flex: 1,
  },
});
