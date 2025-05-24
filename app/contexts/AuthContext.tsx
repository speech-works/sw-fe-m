import React, { createContext, useState, useEffect } from "react";
import { Text } from "react-native";
import * as SecureStore from "expo-secure-store"; // or AsyncStorage
import { logoutUser } from "../api";
import { setUpdateTokenFn } from "../util/functions/authToken";
import { SECURE_KEYS_NAME } from "../constants/secureStorageKeys";

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
    console.log("token changed", token);
  }, [token]);

  useEffect(() => {
    // On app startup, try loading token from SecureStore
    const loadToken = async () => {
      const storedToken = await SecureStore.getItemAsync(
        SECURE_KEYS_NAME.SW_APP_JWT_KEY
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
    console.log("context login called with", newToken);
    // Save to SecureStore
    await SecureStore.setItemAsync(SECURE_KEYS_NAME.SW_APP_JWT_KEY, newToken);
    setToken(newToken);
  };

  const logout = async () => {
    // Retrieve tokens for API logout
    const accessToken = token;
    const refreshToken = await SecureStore.getItemAsync(
      SECURE_KEYS_NAME.SW_APP_REFRESH_TOKEN_KEY
    );

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
      SECURE_KEYS_NAME.SW_APP_REFRESH_TOKEN_KEY
    );
    setToken(null);
  };

  const isLoggedIn = !!token;
  console.log("isLoggedIn changed to", isLoggedIn);

  return (
    <AuthContext.Provider
      value={{ isLoggedIn, token, login, logout, updateToken }}
    >
      {children}
    </AuthContext.Provider>
  );
}
