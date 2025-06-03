import React, { useContext } from "react";
import { StyleSheet, Text, View, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  COMPANY_NAME,
  COMPANY_SLOGAN,
  PRIVACY_POLICY_URL,
  SUPPORT_URL,
} from "./constants";
import { theme } from "../../Theme/tokens";

import { parseTextStyle } from "../../util/functions/parseStyles";
import speechworksLogo from "../../assets/speechworks_logo.png";
import { handleLinkPress } from "../../util/functions/externalLinks";
import Button from "../../components/Button";
import BgWrapper from "../../util/components/BgWrapper";
import Constants from "expo-constants";
import { AuthContext } from "../../contexts/AuthContext";
import * as WebBrowser from "expo-web-browser";
import * as SecureStore from "expo-secure-store";
import * as AuthSession from "expo-auth-session";
import { SECURE_KEYS_NAME } from "../../constants/secureStorageKeys";
import { loginUser, handleOAuthCallback } from "../../api";
import { useUserStore } from "../../stores/user";

const LoginScreen = () => {
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
      console.log("→ WebBrowser openAuthSessionAsync result:", result);

      // 4️⃣ If successful, extract the `code` and finish the flow
      if (result.type === "success" && result.url) {
        const params = new URLSearchParams(result.url.split("?")[1]);
        const code = params.get("code");
        if (!code) throw new Error("No code returned from OAuth");

        // 5️⃣ Exchange on your backend
        const { user, appJwt, refreshToken } = await handleOAuthCallback(code);
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
    <BgWrapper>
      <View style={styles.wrapper}>
        <View style={styles.brandContainer}>
          <Image style={styles.logoImg} source={speechworksLogo} />
          <Text style={styles.companyName}>{COMPANY_NAME}</Text>
          <Text style={styles.captionText}>{COMPANY_SLOGAN}</Text>
        </View>
        <View style={styles.loginButtons}>
          {["google", "facebook", "apple"].map((provider) => (
            <Button
              key={provider}
              // @ts-ignore
              buttonColor={theme.colors.background[provider]}
              // @ts-ignore
              textColor={theme.colors.text[provider]}
              onPress={() => onPressOAuth(provider)}
              text={`Continue with ${
                provider.charAt(0).toUpperCase() + provider.slice(1)
              }`}
              leftIcon={provider}
            />
          ))}
        </View>
        <Text style={styles.captionText}>
          By continuing, you agree to our{" "}
          <Text
            style={styles.linkText}
            onPress={() => handleLinkPress(PRIVACY_POLICY_URL)}
          >
            Terms & Privacy Policy
          </Text>
        </Text>
        <Text style={styles.captionText}>
          Need help?{" "}
          <Text
            style={styles.linkText}
            onPress={() => handleLinkPress(SUPPORT_URL)}
          >
            Contact Support
          </Text>
        </Text>
      </View>
    </BgWrapper>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  wrapper: {
    paddingVertical: 48,
    paddingHorizontal: 24,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "space-between",
    flex: 1,
  },
  brandContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 16,
  },
  logoImg: {
    height: 80,
    width: 120,
  },
  companyName: {
    ...parseTextStyle(theme.typography.Heading2),
    color: theme.colors.text.title,
  },
  captionText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
  linkText: {
    color: theme.colors.text.title,
  },
  loginButtons: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
});
