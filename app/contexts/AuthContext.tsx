import * as SecureStore from "expo-secure-store"; // or AsyncStorage
import React, { createContext, useEffect, useState } from "react";
import { Text } from "react-native";
import { logoutUser } from "../api";
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
  updateToken: (newToken: string) => void;
};

export const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  token: null,
  login: () => {},
  logout: () => {},
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
    track(ANALYTICS_EVENTS.USER_LOGGED_OUT);
    resetAnalyticsIdentity();

    setToken(null);
  };

  const isLoggedIn = !!token;

  return (
    <AuthContext.Provider
      value={{ isLoggedIn, token, login, logout, updateToken }}
    >
      {children}
    </AuthContext.Provider>
  );
}
