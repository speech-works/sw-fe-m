import * as SecureStore from "expo-secure-store"; // or AsyncStorage
import React, { createContext, useEffect, useState } from "react";
import { View } from "react-native";
import { deleteMe } from "../api";
import { logoutUserDetached } from "../api/auth";
import { removePushTokenDetached } from "../api/devices";
import { palette } from "../design-system/primitives/palette";
import { resetAuthInterceptor } from "../api/axiosClient";
import { SECURE_KEYS_NAME } from "../constants/secureStorageKeys";
import { setUpdateTokenFn } from "../util/functions/authToken";
import { resetAnalyticsIdentity, track } from "../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../util/analytics/analyticsEvents";
import {
  registerPushToken,
  storedPushToken,
  unregisterPushToken,
} from "../util/functions/notifications";
import { signOutNow } from "../util/functions/signOut";
import { clearAllPersistedUserState } from "../util/functions/clearUserState";
import { logoutPurchasesUser } from "../services/purchases";

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
  // Start UNDEFINED (not null) so the loading screen shows until SecureStore
  // resolves. If it started null, the very first render would be token=null →
  // isLoggedIn=false → the login screen would flash on every cold start for an
  // already-logged-in user until loadToken() resolves.
  const [token, setToken] = useState<string | null | undefined>(undefined);

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

  const updateToken = (newToken: string) => {
    setToken(newToken);
  };

  useEffect(() => {
    setUpdateTokenFn(updateToken);
  }, [updateToken]);

  // Register this device's push token whenever we hold a JWT. App.tsx also
  // calls this at startup, but a first-time user is NOT authenticated at mount:
  // that call 401s, the error is swallowed, and nothing retried it — so new
  // sign-ups had no push token on the server for their whole first session and
  // silently received none of the server-sent notifications. Keying on `token`
  // covers both fresh login/signup and a cold start with a stored token.
  useEffect(() => {
    if (!token) return;
    void registerPushToken();
  }, [token]);

  // Loading guard AFTER all hooks — never return before a hook has run, or the
  // hook count differs between renders (rules-of-hooks violation → crash). The
  // functions below are plain closures, not hooks, so gating them is safe.
  if (token === undefined) {
    // CONTINUE THE SPLASH, DON'T FLASH AT IT.
    //
    // This was a bare `<Text>Loading..</Text>`: system font, default white
    // background, no insets, top-left. The app ships no `expo-splash-screen`
    // dependency, so the native splash hides on the first frame rather than
    // covering this — meaning every cold start went dark splash → white frame
    // with stray text → app. Rendering any text here is the bug (it is also
    // above FontLoader, so it draws before Inter is registered); a bare fill is
    // the whole fix.
    //
    // Imports the raw primitive rather than a semantic role on purpose: this
    // provider sits ABOVE ThemeProvider (it has to — the tree it gates includes
    // the theme's own consumers), so `useTheme()` is not available here. The
    // literal matches `splash.backgroundColor` in app.config.js, which is
    // unconditionally dark regardless of the user's light/dark preference, so
    // matching the splash is what makes the handoff invisible.
    return (
      <View style={{ flex: 1, backgroundColor: palette.ink.canvas }} />
    );
  }

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

    // Wipe ALL locally-persisted, user-scoped state (every AsyncStorage key +
    // in-memory zustand stores) so nothing leaks across accounts on a shared
    // device.
    await clearAllPersistedUserState();

    // Reset PostHog identity so subsequent anonymous events don't link to this user
    resetAnalyticsIdentity();

    // Same reasoning, for money: unlink the RevenueCat identity, or the next
    // person to sign in on this device has their purchases webhooked under the
    // PREVIOUS user's id — granting the pack to the wrong account and giving
    // the person who actually paid nothing.
    await logoutPurchasesUser();

    setToken(null);
  };

  // SIGN OUT AT ONCE. This used to await the push-token removal and POST
  // /auth/logout before clearing anything, so Log Out sat still for about
  // 2.5 s on a real phone. Now the tokens those calls need are read first
  // (the clear deletes them), the calls run in the background with errors
  // only logged, and the local clear is all that is waited for. The server is
  // told here and only here (util/functions/signOut.ts).
  const logout = async () => {
    await signOutNow({
      readSecrets: async () => {
        const [storedJwt, refreshToken, pushToken] = await Promise.all([
          SecureStore.getItemAsync(SECURE_KEYS_NAME.SW_APP_JWT_KEY),
          SecureStore.getItemAsync(SECURE_KEYS_NAME.SW_APP_REFRESH_TOKEN_KEY),
          storedPushToken(),
        ]);
        return { appJwt: storedJwt ?? token ?? null, refreshToken, pushToken };
      },
      clearSession: async () => {
        track(ANALYTICS_EVENTS.USER_LOGGED_OUT);
        await clearLocalSession();
      },
      removePushToken: removePushTokenDetached,
      revokeSession: logoutUserDetached,
    });
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
