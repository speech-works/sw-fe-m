import React, { useEffect, useRef } from "react";
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
import { getMyUser } from "./app/api/users";
import { useUserStore } from "./app/stores/user";
import { useAppStore } from "./app/stores/app";

import Qonversion from "@qonversion/react-native-sdk";
import { initQonversion } from "./app/lib/qonversion";
import PaywallScreen from "./app/screens/Paywall/PaywallScreen";

// MUST be here for OAuth redirect handling
WebBrowser.maybeCompleteAuthSession();

const App: React.FC = () => {
  // reset local mood data
  useEffect(() => {
    // reset local mood data
    useMoodCheckStore.getState().checkAndResetIfNeeded();
  }, []);

  // 2. Use a ref to track listener attachment
  const listenerAttached = useRef(false);

  // 3. Get state and setters from stores
  const { user } = useUserStore();
  const { isQonversionReady, setQonversionReady } = useAppStore();

  // 4. Initialize Qonversion (ONLY ONCE) and update global state
  useEffect(() => {
    const initializeSDKs = async () => {
      try {
        await initQonversion(); // <-- Awaits the async init
        console.log("🔥 Qonversion initialization successful");
        setQonversionReady(true); // <-- Set global flag
      } catch (e) {
        console.error("🚨 Qonversion init failed:", e);
      }
    };

    initializeSDKs();
  }, [setQonversionReady]); // Dependency ensures it runs once

  // Sync backend user on launch
  // Sync backend user on launch
  useEffect(() => {
    async function syncUser() {
      try {
        const backendUser = await getMyUser();
        useUserStore.getState().setUser(backendUser);
      } catch (e: any) {
        // ✅ Check for the expected "logged out" error
        if (e?.message === "No refresh token found") {
          console.log("App loaded without a user. Skipping sync.");
        } else {
          // Log any other *unexpected* errors
          console.error("Unable to sync user (unexpected error):", e);
        }
      }
    }
    syncUser();
  }, []);

  // 6. Attach entitlement listener AFTER user is logged in & Qonversion is ready
  useEffect(() => {
    // This effect now depends on user and Qonversion readiness
    if (user?.id && isQonversionReady && !listenerAttached.current) {
      listenerAttached.current = true; // Mark as attached
      console.log(
        "👤 User detected AND Qonversion ready, attaching listener:",
        user.id
      );
      attachEntitlementsListener();
    }
  }, [user, isQonversionReady]); // Re-runs when user logs in or Qonversion becomes ready

  const attachEntitlementsListener = () => {
    try {
      const q = Qonversion.getSharedInstance();
      console.log("📡 Setting entitlement update listener...");

      q.setEntitlementsUpdateListener({
        onEntitlementsUpdated: async (entitlements) => {
          const premium = entitlements.get("premium");
          const isPremium = premium?.isActive === true;

          console.log("🔄 Entitlement Updated -> Premium:", isPremium);

          const currentUser = useUserStore.getState().user; // Get fresh user state
          if (currentUser) {
            useUserStore.getState().setUser({
              ...currentUser,
              isPaid: isPremium,
            });
          }

          // Sync with backend to update DB isPaid
          try {
            const updated = await getMyUser();
            useUserStore.getState().setUser(updated);
          } catch (e) {
            console.log("Failed backend entitlement sync:", e);
          }
        },
      });
    } catch (err) {
      console.log("⚠️ Failed to attach Qonversion listener:", err);
    }
  };

  // Debug token check
  useEffect(() => {
    const checkToken = async () => {
      const access = await SecureStore.getItemAsync(
        SECURE_KEYS_NAME.SW_APP_JWT_KEY
      );
      const refresh = await SecureStore.getItemAsync(
        SECURE_KEYS_NAME.SW_APP_REFRESH_TOKEN_KEY
      );
      console.log("App started. Tokens:", { access, refresh });
    };
    checkToken();
  }, []);

  // iOS audio config
  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });
  }, []);

  // Notifications (already correct)
  useEffect(() => {
    registerForNotifications();
    setupNotificationHandlers();

    const unsub = useReminderStore.persist.onFinishHydration(() => {
      useReminderStore.getState().rescheduleAllActiveNotifications();
    });

    return () => unsub();
  }, []);

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
  safeAreaView: { flex: 1 },
});
