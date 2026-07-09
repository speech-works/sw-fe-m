import { NavigationContainer, DarkTheme, DefaultTheme } from "@react-navigation/native";
import { Audio } from "expo-av";
import React, { useEffect, useMemo } from "react";
import { AppState, StyleSheet } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { PostHogProvider } from "posthog-react-native";
import UpsellModal from "./app/components/UpsellModal";
import OutcomeModal from "./app/components/OutcomeModal";
import StaminaVignetteOverlay from "./app/components/StaminaVignetteOverlay";
import GlobalStaminaController from "./app/components/GlobalStaminaController";
import ErrorFallback from "./app/components/ErrorFallback";
import { AuthProvider } from "./app/contexts/AuthContext";
import MainNavigator from "./app/navigators/MainNavigator";
import FontLoader from "./app/util/components/FontLoader";
import { ThemeProvider, useTheme } from "./app/design-system";
import { DevPreview } from "./app/design-system/_DevPreview";
import { runSchemeAudit } from "./app/design-system/utils/schemeAudit";

// Dev-only: verify every canonical text-on-surface pairing in BOTH schemes
// clears WCAG AA (warns a table of failures; silent in prod builds).
if (__DEV__) runSchemeAudit();

// TEMP (Phase B visual review only): renders the design-system preview overlay.
// Revert to false / remove before shipping.
const SHOW_DS_PREVIEW = false;
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
  registerPushToken,
  setupNotificationHandlers,
} from "./app/util/functions/notifications";
import { getThread } from "./app/api/threads";
import { useInboxStore } from "./app/stores/inbox";
import {
  applyAnalyticsConsent,
  initAnalytics,
  trackScreen,
} from "./app/util/analytics/postHog";
import { useAnalyticsConsentStore } from "./app/stores/analyticsConsent";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ASYNC_KEYS_NAME } from "./app/constants/asyncStorageKeys";

import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn:
    process.env.EXPO_PUBLIC_SENTRY_DSN ??
    "https://a959449fa17ed277c31d96ebb9ad2523@o4511563148361728.ingest.de.sentry.io/4511563163959376",

  // Only report from release builds — avoids dev noise and dev-machine data.
  enabled: !__DEV__,

  // Privacy: health-adjacent app — never attach IP / cookies / raw PII. We do
  // not call Sentry.setUser, so events carry no user identity, voice, or
  // transcripts.
  sendDefaultPii: false,

  // Structured logs.
  enableLogs: true,

  // Keep performance tracing light, and only inject tracing headers into our
  // own API.
  tracesSampleRate: 0.2,
  tracePropagationTargets: [/api\.speechworks\.in/],

  // Defense-in-depth: scrub auth/secret headers from HTTP breadcrumbs so a
  // captured event can never carry the JWT.
  beforeBreadcrumb(breadcrumb) {
    const headers = (breadcrumb?.data as Record<string, any> | undefined)
      ?.headers;
    if (headers && typeof headers === "object") {
      for (const key of Object.keys(headers)) {
        if (/authorization|cookie|token/i.test(key)) {
          headers[key] = "[redacted]";
        }
      }
    }
    return breadcrumb;
  },
});

if (__DEV__) {
  require("./ReactotronConfig");
}

// 👇 This is critical for trapping the OAuth redirect back into your JS:
WebBrowser.maybeCompleteAuthSession();

// Initialize PostHog once at module scope before any component renders.
// Disabled automatically in __DEV__ mode (see initAnalytics).
const posthogClient = initAnalytics();

/**
 * NavigationContainer with its underlay/transition colors driven by the active
 * scheme (kills the white/black flash on push/pop in the "wrong" mode). Must
 * render INSIDE ThemeProvider; keeps the ref + analytics wiring here so the
 * container itself stays untouched.
 */
const ThemedNavRoot: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { colors, scheme } = useTheme();
  const navTheme = useMemo(() => {
    const base = scheme === "dark" ? DarkTheme : DefaultTheme; // v7 base keeps required `fonts`
    return {
      ...base,
      colors: {
        ...base.colors,
        background: colors.background.canvas,
        card: colors.background.raised,
        text: colors.text.primary,
        primary: colors.action.primary,
        border: colors.border.default,
        notification: colors.nav.badge,
      },
    };
  }, [colors, scheme]);
  return (
    <NavigationContainer
      ref={navigationRef}
      theme={navTheme}
      onStateChange={() => {
        const currentRoute = navigationRef.getCurrentRoute();
        if (currentRoute?.name) {
          trackScreen(
            currentRoute.name,
            currentRoute.params
              ? { params: currentRoute.params as Record<string, any> }
              : undefined,
          );
        }
      }}
    >
      {children}
    </NavigationContainer>
  );
};

// Reflect the persisted analytics opt-out onto PostHog once the consent store
// hydrates (and immediately if it already has).
const applyAnalyticsConsentFromStore = () =>
  applyAnalyticsConsent(useAnalyticsConsentStore.getState().enabled);
if (useAnalyticsConsentStore.persist.hasHydrated()) {
  applyAnalyticsConsentFromStore();
}
useAnalyticsConsentStore.persist.onFinishHydration(applyAnalyticsConsentFromStore);

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

    // Clear mood check local storage every time the app loads
    const clearMoodStorage = async () => {
      try {
        await AsyncStorage.removeItem(ASYNC_KEYS_NAME.SW_ZSTORE_MOOD_CHECK);
        console.log("Mood check local storage cleared on app load");
      } catch (e) {
        console.error("Failed to clear mood check storage", e);
      }
    };
    clearMoodStorage();
  }, []);

  const rescheduleAllActiveNotifications = useReminderStore(
    (state) => state.rescheduleAllActiveNotifications,
  );

  useEffect(() => {
    const initAudioMode = async () => {
      // Default the whole app to playback-only. Recording screens (StoryPractice /
      // TechniquePage recorders, DAF) set allowsRecordingIOS:true themselves before
      // capturing and reset it on stop/unmount. Launching globally in PlayAndRecord
      // forced an input+output route app-wide, which fails on the iOS Simulator
      // (no mic device) with -66680 and breaks unrelated playback (AVPlayer -11800).
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });
    };

    initAudioMode();
  }, []);

  useEffect(() => {
    // 1. Register for notifications and set up channels (Android)
    // This function also requests permissions.
    registerForNotifications().then((granted) => {
      if (granted) {
        console.log("Notification permissions granted.");
        // Register this device's Expo push token so the backend can deliver buddy pushes.
        void registerPushToken();
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

          // Refresh buddy-thread unread count for the Community tab badge (best-effort).
          try {
            const thread = await getThread();
            useInboxStore.getState().setUnreadCount(thread?.unreadCount ?? 0);
          } catch {
            // ignore — badge is non-critical
          }
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

  // TEMP (Phase B): show only the design-system preview for visual review.

  if (__DEV__ && SHOW_DS_PREVIEW) {
    return (
      <SafeAreaProvider style={{ flex: 1 }}>
        <ThemeProvider>
          <DevPreview />
        </ThemeProvider>
      </SafeAreaProvider>
    );
  }

  return (
    <Sentry.ErrorBoundary
      fallback={({ resetError }) => <ErrorFallback resetError={resetError} />}
    >
      <PostHogProvider client={posthogClient} autocapture={false}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <SafeAreaProvider style={{ flex: 1 }}>
            <SafeAreaView
              style={styles.safeAreaView}
              edges={["left", "right"]}
            >
              <FontLoader />
              <ThemeProvider>
                <ThemedNavRoot>
                  <MainNavigator />
                  <UpsellModal />
                  <OutcomeModal />
                  <StaminaVignetteOverlay />
                  <GlobalStaminaController />
                </ThemedNavRoot>
              </ThemeProvider>
            </SafeAreaView>
          </SafeAreaProvider>
        </AuthProvider>
      </GestureHandlerRootView>
      </PostHogProvider>
    </Sentry.ErrorBoundary>
  );
};

export default Sentry.wrap(App);

const styles = StyleSheet.create({
  safeAreaView: {
    flex: 1,
  },
});
