import React, { useContext, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  Image,
  Linking,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { theme } from "../../Theme/tokens";
import {
  COMPANY_NAME,
  COMPANY_SLOGAN,
  PRIVACY_POLICY_URL,
  SUPPORT_URL,
} from "./constants";

import * as AuthSession from "expo-auth-session";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import { SafeAreaView } from "react-native-safe-area-context";
import { handleOAuthCallback, loginUser } from "../../api";
import speechworksLogo from "../../assets/speechworks_logo.png";
import Button from "../../components/Button";
import { SECURE_KEYS_NAME } from "../../constants/secureStorageKeys";
import { AuthContext } from "../../contexts/AuthContext";
import { useUserStore } from "../../stores/user";
import { handleLinkPress } from "../../util/functions/externalLinks";
import { parseTextStyle } from "../../util/functions/parseStyles";
import LoginBackground from "./components/LoginBackground";
import Butterfly2Face from "../../assets/sw-faces/Butterfly2Face";

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

// Required to ensure the WebBrowser closes correctly on Android redirects
WebBrowser.maybeCompleteAuthSession();

const { height } = Dimensions.get("window");

const LoginScreen = () => {
  const { height } = useWindowDimensions();
  const isSmallDevice = height < 700;

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

      // On Android, openAuthSessionAsync often returns { type: 'dismiss' } due to
      // an AppState race condition, even when the OAuth redirect actually happened.
      // We set up a Linking listener as a fallback to catch the redirect URL.
      let linkingHandled = false;

      const handleRedirect = async (event: { url: string }) => {
        if (linkingHandled) return;
        const url = event.url;
        if (!url.startsWith("speechworks://auth-callback")) return;
        linkingHandled = true;
        console.log("[Auth] 🔍 Deep link captured:", url);
        try {
          await processAuthRedirect(url);
        } catch (err: any) {
          console.error("🚨 OAuth callback failed:", err.message || err);
          showError(err.message || "Login failed. Please try again.");
        } finally {
          setLoadingProvider(null);
        }
      };

      // Register the listener before opening the browser
      const subscription = Linking.addEventListener("url", handleRedirect);

      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        redirectUri,
        {
          preferEphemeralSession: true,
        },
      );

      console.log("[Auth] 🔍 Auth session result:", result);

      if (result.type === "success" && result.url) {
        // Browser returned the URL directly (common on iOS)
        if (!linkingHandled) {
          linkingHandled = true;
          await processAuthRedirect(result.url);
        }
      } else if (result.type === "cancel") {
        console.log("🔸 User cancelled OAuth");
        if (!linkingHandled) setLoadingProvider(null);
      } else {
        // On Android this often fires as 'dismiss' even on success.
        // The Linking listener above will handle the redirect if it happened.
        console.warn(
          "⚠️ OAuth result type:",
          result.type,
          "— waiting for deep link fallback",
        );
        // Give the deep link listener a moment to fire
        await new Promise((resolve) => setTimeout(resolve, 2000));
        if (!linkingHandled) {
          console.warn(
            "⚠️ No deep link received. OAuth may have been cancelled.",
          );
          showError("Login was interrupted. Please try again.");
          setLoadingProvider(null);
        }
      }

      // Clean up the listener
      subscription.remove();
    } catch (err: any) {
      console.error("🚨 OAuth failed:", err.message || err);
      showError(err.message || "Login failed. Please try again.");
      setLoadingProvider(null);
    }
  };

  /** Shared logic to exchange the OAuth code for tokens and log the user in. */
  const processAuthRedirect = async (url: string) => {
    const params = new URLSearchParams(url.split("?")[1]);
    let code = params.get("code");
    if (!code) throw new Error("No code returned from OAuth");

    // Supabase/Google often appends a trailing '#' to the redirect URL
    // which URLSearchParams captures. We must strip it or the code exchange fails.
    code = code.replace(/#.*$/, "");

    const { user, appJwt, refreshToken } = await handleOAuthCallback(code);
    setUser(user);

    await SecureStore.setItemAsync(SECURE_KEYS_NAME.SW_APP_JWT_KEY, appJwt);
    await SecureStore.setItemAsync(
      SECURE_KEYS_NAME.SW_APP_REFRESH_TOKEN_KEY,
      refreshToken,
    );

    login(appJwt);
  };

  const providers = getDisplayProviders();

  return (
    <View style={styles.container}>
      <LoginBackground />

      {/*
        1. TOP SECTION (Brand)
           - Transparent to show background watermarks
      */}
      <View style={styles.topSection}>
        {/* Logo Content */}
        <SafeAreaView edges={["top"]} style={styles.brandContent}>
          <Animated.View
            style={[
              styles.logoWrapper,
              {
                opacity: logoFadeAnim,
                transform: [{ scale: logoScaleAnim }],
                height: isSmallDevice ? 100 : 120, // Adaptive logo height
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
            <Text
              style={
                isSmallDevice ? styles.captionTextSmall : styles.captionText
              }
            >
              {COMPANY_SLOGAN}
            </Text>
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
                    marginBottom: isSmallDevice ? 12 : 16, // Adaptive spacing
                    height: isSmallDevice ? 50 : 56, // Adaptive height
                    paddingVertical: isSmallDevice ? 8 : 16, // Prevent icon clipping
                  }}
                />
              );
            })}
          </View>

          {/* Footer / Legal */}
          <View
            style={[
              styles.legalContainer,
              { marginBottom: isSmallDevice ? 24 : 20 },
            ]}
          >
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
    flex: 0.4, // Reduced from 0.45
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  brandContent: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 10, // Reduced from 20
    gap: 8, // Reduced from 16
  },
  companyName: {
    ...parseTextStyle(theme.typography.Heading1),
    fontSize: 42,
    fontWeight: "800",
    color: "#EA580C", // Deep, vibrant orange
    textAlign: "center",
  },
  logoWrapper: {
    // Large logo area
    width: 200,
    height: 120, // Base height, overridden by inline style
    justifyContent: "center",
    alignItems: "center",
  },
  logoImg: {
    width: "100%",
    height: "100%",
  },
  captionText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: "#475569", // Slate-600 for contrast
    opacity: 1,
    textAlign: "center",
    marginTop: 4,
  },
  captionTextSmall: {
    ...parseTextStyle(theme.typography.Label),
    color: "#475569",
    opacity: 1,
    textAlign: "center",
    marginTop: 2,
  },

  // Bottom Sheet
  bottomSheet: {
    flex: 0.6, // Increased from 0.55
    backgroundColor: "transparent",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: "hidden",
  },
  blurAbsolute: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24, // Reduced from 40
    justifyContent: "flex-start",
  },
  sheetHeader: {
    marginBottom: 16, // Reduced from 32
    alignItems: "center",
  },
  sheetTitle: {
    ...parseTextStyle(theme.typography.Heading2),
    color: theme.colors.text.title,
    marginBottom: 4, // Reduced from 8
  },
  sheetSubtitle: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
  },

  loginButtons: {
    width: "100%",
    marginBottom: 12, // Reduced from 24
  },

  legalContainer: {
    alignItems: "center",
    marginTop: "auto",
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
