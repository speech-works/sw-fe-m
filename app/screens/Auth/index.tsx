import React, { useContext, useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  Platform,
  Alert,
  Animated,
  Easing,
  Dimensions,
} from "react-native";

import {
  COMPANY_NAME,
  COMPANY_SLOGAN,
  PRIVACY_POLICY_URL,
  SUPPORT_URL,
} from "./constants";
import { theme } from "../../Theme/tokens";

import {
  parseTextStyle,
  parseShadowStyle,
} from "../../util/functions/parseStyles";
import speechworksLogo from "../../assets/speechworks_logo.png";
import { handleLinkPress } from "../../util/functions/externalLinks";
import Button from "../../components/Button";
import Constants from "expo-constants";
import { AuthContext } from "../../contexts/AuthContext";
import * as WebBrowser from "expo-web-browser";
import * as SecureStore from "expo-secure-store";
import * as AuthSession from "expo-auth-session";
import { SECURE_KEYS_NAME } from "../../constants/secureStorageKeys";
import { loginUser, handleOAuthCallback } from "../../api";
import { useUserStore } from "../../stores/user";
import LoginBackground from "./components/LoginBackground";
import { SafeAreaView } from "react-native-safe-area-context";

// Define the providers to display
const ALL_PROVIDERS = ["google", "facebook", "apple"];

// Filter providers based on the platform
const getDisplayProviders = () => {
  if (Platform.OS === "ios") {
    // Show all providers on iOS
    return ALL_PROVIDERS;
  }
  // On Android/Web/Other, filter out 'apple'
  return ALL_PROVIDERS.filter((provider) => provider !== "apple");
};

const { height } = Dimensions.get("window");

const LoginScreen = () => {
  const { login } = useContext(AuthContext);
  const { setUser } = useUserStore();

  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  // Animation Refs
  const logoScaleAnim = useRef(new Animated.Value(0.8)).current;
  const logoFadeAnim = useRef(new Animated.Value(0)).current;
  const sheetSlideAnim = useRef(new Animated.Value(height * 0.5)).current; // Start off-screen

  useEffect(() => {
    Animated.parallel([
      // Logo Animation: Scale up + Fade in
      Animated.timing(logoScaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.5)), // Slight bounce
      }),
      Animated.timing(logoFadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      // Sheet Animation: Slide Up
      Animated.timing(sheetSlideAnim, {
        toValue: 0,
        duration: 700,
        delay: 200, // Wait a bit for logo
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start();
  }, []);

  const showError = (message: string) => {
    Alert.alert("Login Error", message);
  };

  const onPressOAuth = async (provider: string) => {
    if (loadingProvider) return; // prevent multi-trigger
    setLoadingProvider(provider);

    try {
      const owner = Constants.expoConfig?.owner;
      const slug = Constants.expoConfig?.slug;

      // iOS simulators have issues with custom schemes in development
      // Use Expo's proxy for iOS dev, custom scheme for Android/production
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: "speechworks",
        path: "auth-callback",
      });

      console.log("[Auth] 🔍 Redirect URI:", redirectUri);
      console.log("[Auth] 🔍 Provider:", provider);
      console.log("[Auth] 🔍 Platform:", Platform.OS);
      console.log("[Auth] 🔍 Is Dev:", __DEV__);

      const { redirectUrl: authUrl } = await loginUser({
        provider,
        redirectTo: redirectUri,
      });

      console.log("[Auth] 🔍 Supabase Auth URL:", authUrl);

      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        redirectUri,
        {
          preferEphemeralSession: true,
        }
      );

      console.log("[Auth] 🔍 Auth session result:", result);

      if (result.type === "success" && result.url) {
        const params = new URLSearchParams(result.url.split("?")[1]);
        const code = params.get("code");
        if (!code) throw new Error("No code returned from OAuth");

        const { user, appJwt, refreshToken } = await handleOAuthCallback(code);
        setUser(user);

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
        showError("Unexpected login response. Please try again.");
      }
    } catch (err: any) {
      console.error("🚨 OAuth failed:", err.message || err);
      showError(err.message || "Login failed. Please try again.");
    } finally {
      setLoadingProvider(null);
    }
  };

  const providers = getDisplayProviders();

  return (
    <View style={styles.container}>
      {/*
        1. TOP SECTION (Brand)
           - Uses absolute positioning for background to cover the top half
      */}
      <View style={styles.topSection}>
        <LoginBackground />

        {/* Logo Content */}
        <SafeAreaView edges={["top"]} style={styles.brandContent}>
          <Animated.View
            style={[
              styles.logoWrapper,
              {
                opacity: logoFadeAnim,
                transform: [{ scale: logoScaleAnim }],
              },
            ]}
          >
            <Image
              style={styles.logoImg}
              source={speechworksLogo}
              resizeMode="contain"
            />
          </Animated.View>
          <Animated.View style={{ opacity: logoFadeAnim }}>
            <Text style={styles.companyName}>{COMPANY_NAME}</Text>
            <Text style={styles.captionText}>{COMPANY_SLOGAN}</Text>
          </Animated.View>
        </SafeAreaView>
      </View>

      {/*
        2. BOTTOM SECTION (Sheet)
           - Slides up from bottom
      */}
      <Animated.View
        style={[
          styles.bottomSheet,
          { transform: [{ translateY: sheetSlideAnim }] },
        ]}
      >
        <SafeAreaView
          edges={["bottom", "left", "right"]}
          style={styles.sheetContent}
        >
          {/* Header of Sheet */}
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Let's get started</Text>
            <Text style={styles.sheetSubtitle}>
              Login to continue your progress
            </Text>
          </View>

          {/* Social Buttons */}
          <View style={styles.loginButtons}>
            {providers.map((provider) => {
              const isLoading = loadingProvider === provider;

              let btnBg =
                theme.colors.background[
                  provider as keyof typeof theme.colors.background
                ];
              let btnText =
                theme.colors.text[provider as keyof typeof theme.colors.text];
              let btnBorderWidth = 0;
              let btnBorderColor = "transparent";

              if (provider === "google") {
                btnBg = "#FFFFFF";
                btnText = "#1F2937";
                btnBorderWidth = 1;
                btnBorderColor = theme.colors.border.default;
              }

              return (
                <Button
                  key={provider}
                  text={`Continue with ${
                    provider.charAt(0).toUpperCase() + provider.slice(1)
                  }`}
                  onPress={() => onPressOAuth(provider)}
                  leftIcon={provider}
                  disabled={isLoading}
                  loading={isLoading}
                  buttonColor={btnBg}
                  textColor={btnText}
                  elevation={provider === "google" ? 1 : undefined} // Flat look for others
                  style={{
                    borderWidth: btnBorderWidth,
                    borderColor: btnBorderColor,
                    marginBottom: 16, // More spacing
                    height: 56, // Taller buttons
                  }}
                />
              );
            })}
          </View>

          {/* Footer / Legal */}
          <View style={styles.legalContainer}>
            <Text style={styles.legalText}>
              By continuing, you agree to our{" "}
              <Text
                style={styles.linkText}
                onPress={() => handleLinkPress(PRIVACY_POLICY_URL)}
              >
                Terms & Privacy Policy
              </Text>
            </Text>
            <View style={{ height: 16 }} />
            <Text style={styles.legalText}>
              Need help?{" "}
              <Text
                style={styles.linkText}
                onPress={() => handleLinkPress(SUPPORT_URL)}
              >
                Contact Support
              </Text>
            </Text>
          </View>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.library.orange[100], // Match top bg color
  },
  // Top Section
  topSection: {
    flex: 0.45, // 45% height
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  brandContent: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 20,
    gap: 16,
  },
  logoWrapper: {
    // Large logo area
    width: 200,
    height: 120, // Increased size
    justifyContent: "center",
    alignItems: "center",
  },
  logoImg: {
    width: "100%",
    height: "100%",
  },
  companyName: {
    ...parseTextStyle(theme.typography.Heading1), // BIGGER
    color: theme.colors.text.title,
    textAlign: "center",
  },
  captionText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    opacity: 0.8,
  },

  // Bottom Sheet
  bottomSheet: {
    flex: 0.55, // 55% height
    backgroundColor: "#FFFFFF",
    // Removed border radius and shadow as requested
    overflow: "hidden",
  },
  sheetContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    justifyContent: "flex-start",
  },
  sheetHeader: {
    marginBottom: 32,
    alignItems: "center",
  },
  sheetTitle: {
    ...parseTextStyle(theme.typography.Heading2),
    color: theme.colors.text.title,
    marginBottom: 8,
  },
  sheetSubtitle: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
  },

  loginButtons: {
    width: "100%",
    marginBottom: 24,
  },

  legalContainer: {
    alignItems: "center",
    marginTop: "auto",
    marginBottom: 20,
  },
  legalText: {
    textAlign: "center",
    ...parseTextStyle(theme.typography.BodyDetails),
    color: theme.colors.text.disabled,
  },
  linkText: {
    fontWeight: "600",
    color: theme.colors.actionPrimary.default,
  },
});
