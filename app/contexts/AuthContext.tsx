import * as SecureStore from "expo-secure-store"; // or AsyncStorage
import React, { createContext, useEffect, useState } from "react";
import { Text } from "react-native";
import { logoutUser, deleteMe } from "../api";
import { resetAuthInterceptor } from "../api/axiosClient";
import { SECURE_KEYS_NAME } from "../constants/secureStorageKeys";
import { setUpdateTokenFn } from "../util/functions/authToken";
import { resetAnalyticsIdentity, track } from "../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../util/analytics/analyticsEvents";
import { unregisterPushToken } from "../util/functions/notifications";

type AuthContextType = {
  isLoggedIn: boolean;
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
  /**
   * Permanently delete the current user's account, then clear the local
   * session. Rejects (and leaves the user logged in) if the server deletion
   * fails, so the caller can show an error and let the user retry.
   */
  deleteAccount: () => Promise<void>;
  updateToken: (newToken: string) => void;
};

export const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  token: null,
  login: () => {},
  logout: () => {},
  deleteAccount: async () => {},
  updateToken: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null | undefined>(null);

  useEffect(() => {
    // On app startup, try loading token from SecureStore
    const loadToken = async () => {
      const storedToken = await SecureStore.getItemAsync(
        SECURE_KEYS_NAME.SW_APP_JWT_KEY,
      );
      if (storedToken) {
        setToken(storedToken);
      } else {
        setToken(null);
      }
    };
    loadToken();
  }, []);

  if (token === undefined) {
    return <Text>Loading..</Text>; // A simple loading screen
  }

  const updateToken = (newToken: string) => {
    setToken(newToken);
  };

  useEffect(() => {
    setUpdateTokenFn(updateToken);
  }, [updateToken]);

  const login = async (newToken: string) => {
    // Save to SecureStore
    await SecureStore.setItemAsync(SECURE_KEYS_NAME.SW_APP_JWT_KEY, newToken);
    setToken(newToken);

    // Reset the interceptor state so that future 401s trigger logout events again
    resetAuthInterceptor();
  };

  // Clears all local credentials and cached state, and resets analytics
  // identity. Shared by logout and account deletion. Setting the token to null
  // flips `isLoggedIn`, which routes the app back to the auth screen.
  const clearLocalSession = async () => {
    // Clear secure storage
    await SecureStore.deleteItemAsync(SECURE_KEYS_NAME.SW_APP_JWT_KEY);
    await SecureStore.deleteItemAsync(
      SECURE_KEYS_NAME.SW_APP_REFRESH_TOKEN_KEY,
    );

    // Clear Zustand stores to prevent leaked state or erroneous fetches on re-login
    import("../stores/user").then(m => m.useUserStore.getState().clearUser());
    import("../stores/userBehaviorTrends").then(m => m.useUserBehaviorTrendsStore.getState().clearTrends());
    import("../stores/progressReport").then(m => m.useProgressReportStore.getState().clearProgressReport());
    import("../stores/practiceCategorySummary").then(m => m.usePracticeCategorySummaryStore.getState().clearSummary());

    // Reset PostHog identity so subsequent anonymous events don't link to this user
    resetAnalyticsIdentity();

    setToken(null);
  };

  const logout = async () => {
    // Retrieve tokens for API logout
    const accessToken = token;
    const refreshToken = await SecureStore.getItemAsync(
      SECURE_KEYS_NAME.SW_APP_REFRESH_TOKEN_KEY,
    );

    // Deregister this device's push token while still authenticated (best-effort).
    await unregisterPushToken();

    if (accessToken && refreshToken) {
      try {
        // Call the API to properly logout
        await logoutUser({ appJwt: accessToken, refreshToken });
      } catch (error) {
        console.error("Error during API logout", error);
        // Optionally, you can decide whether to continue clearing local credentials if the API call fails.
      }
    }

    track(ANALYTICS_EVENTS.USER_LOGGED_OUT);
    await clearLocalSession();
  };

  const deleteAccount = async () => {
    // Deregister this device's push token while still authenticated (best-effort);
    // a failure here must not block the deletion itself.
    try {
      await unregisterPushToken();
    } catch (error) {
      console.error("Error unregistering push token before deletion", error);
    }

    // Hard requirement: the account must actually be deleted on the server
    // before we wipe local state. If this throws, we propagate the error and
    // leave the user logged in so they can retry.
    await deleteMe();

    track(ANALYTICS_EVENTS.ACCOUNT_DELETED);
    await clearLocalSession();
  };

  const isLoggedIn = !!token;

  return (
    <AuthContext.Provider
      value={{ isLoggedIn, token, login, logout, deleteAccount, updateToken }}
    >
      {children}
    </AuthContext.Provider>
  );
}
