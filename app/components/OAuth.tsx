import React, { useContext } from "react";
import { StyleSheet, View, TouchableOpacity } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome";
import * as WebBrowser from "expo-web-browser";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import { loginUser, handleOAuthCallback } from "../api";
import { AuthContext } from "../contexts/AuthContext";
import { theme } from "../Theme/tokens";
import * as AuthSession from "expo-auth-session";
import { SECURE_KEYS_NAME } from "../constants/secureStorageKeys";
import { useUserStore } from "../stores/user";

export default function OAuth() {
  const { login } = useContext(AuthContext);
  const { setUser } = useUserStore();
  const onPressOAuth = async (provider: string) => {
    try {
      // 1️⃣ Build the Expo-Go proxy redirect URI
      const owner = Constants.expoConfig?.owner;
      const slug = Constants.expoConfig?.slug;
      if (!owner || !slug)
        throw new Error("Expo owner/slug missing in app.json!");

      // const redirectUri = `https://auth.expo.io/@${owner}/${slug}`;
      const redirectUri = AuthSession.makeRedirectUri({
        preferLocalhost: true,
      });
      console.log("→ Using redirectUri:", redirectUri);

      // 2️⃣ Ask your backend for the Supabase / Google consent URL
      const { redirectUrl: authUrl } = await loginUser({
        provider,
        redirectTo: redirectUri,
      });
      console.log("→ Supabase consent URL:", authUrl);

      // 3️⃣ Open the system browser to that URL and *await* the redirect
      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        redirectUri
      );
      console.log("→ WebBrowser openAuthSessionAsync result 2:", result);

      // 4️⃣ If successful, extract the `code` and finish the flow
      if (result.type === "success" && result.url) {
        console.log("login done 2", result);
        const params = new URLSearchParams(result.url.split("?")[1]);
        const code = params.get("code");
        console.log("login code 2", code);
        if (!code) throw new Error("No code returned from OAuth");

        // 5️⃣ Exchange on your backend
        const { user, appJwt, refreshToken } = await handleOAuthCallback(code);
        console.log("user details after login 2: ", user);
        setUser(user);

        // 6️⃣ Store & update your app’s auth state
        await SecureStore.setItemAsync(SECURE_KEYS_NAME.SW_APP_JWT_KEY, appJwt);
        await SecureStore.setItemAsync(
          SECURE_KEYS_NAME.SW_APP_REFRESH_TOKEN_KEY,
          refreshToken
        );
        login(appJwt);
      } else if (result.type === "cancel") {
        console.log("🔸 User cancelled OAuth");
      } else {
        console.warn("⚠️ Unexpected OAuth result:", result);
      }
    } catch (err: any) {
      console.error("🚨 OAuth failed:", err.message || err);
    }
  };

  return (
    <View style={styles.wrapper}>
      {["google", "facebook", "apple"].map((provider) => (
        <TouchableOpacity
          key={provider}
          style={styles.iconContainer}
          activeOpacity={0.7}
          onPress={() => onPressOAuth(provider)}
        >
          <Icon name={provider} size={20} color="white" />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
  },
  iconContainer: {
    height: 36,
    width: 36,
    borderRadius: 6,
    backgroundColor: theme.colors.actionPrimary.default,
    alignItems: "center",
    justifyContent: "center",
  },
});
