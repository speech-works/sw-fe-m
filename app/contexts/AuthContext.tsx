import React, { createContext, useState, useEffect } from "react";
import { Text } from "react-native";
import * as SecureStore from "expo-secure-store"; // or AsyncStorage

type AuthContextType = {
  isLoggedIn: boolean;
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  token: null,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    console.log("token changed", token);
  }, [token]);

  useEffect(() => {
    // On app startup, try loading token from SecureStore
    const loadToken = async () => {
      const storedToken = await SecureStore.getItemAsync("accessToken");
      if (storedToken) {
        setToken(storedToken);
      }
    };
    loadToken();
  }, []);

  if (token === undefined) {
    return <Text>Loading..</Text>; // A simple loading screen
  }

  const login = async (newToken: string) => {
    console.log("context login called with", newToken);
    // Save to SecureStore
    await SecureStore.setItemAsync("accessToken", newToken);
    setToken(newToken);
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync("accessToken");
    setToken(null);
  };

  const isLoggedIn = !!token;
  console.log("isLoggedIn changed to", isLoggedIn);

  return (
    <AuthContext.Provider value={{ isLoggedIn, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
