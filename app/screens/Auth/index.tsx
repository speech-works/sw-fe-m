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
    if (loadingProvider) return;
    setLoadingProvider(provider);

    try {
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: "speechworks",
        path: "auth-callback",
      });

      console.log("[OAuth 1] Provider:", provider);
      console.log("[OAuth 1] Platform:", Platform.OS, "| isDev:", __DEV__);
      console.log("[OAuth 1] Redirect URI:", redirectUri);

      let authUrl: string;
      try {
        const res = await loginUser({ provider, redirectTo: redirectUri });
        authUrl = res.redirectUrl;
        console.log("[OAuth 2] ✅ Got auth URL from backend:", authUrl);
      } catch (e: any) {
        console.error("[OAuth 2] ❌ loginUser() failed:", e?.message, e?.response?.data);
        throw e;
      }

      let linkingHandled = false;

      const handleRedirect = async (event: { url: string }) => {
        console.log("[OAuth Linking] URL received:", event.url);
        if (linkingHandled) {
          console.log("[OAuth Linking] Already handled, skipping.");
          return;
        }
        const url = event.url;
        if (!url.startsWith("speechworks://auth-callback")) {
          console.log("[OAuth Linking] Not an auth-callback URL, ignoring.");
          return;
        }
        linkingHandled = true;
        console.log("[OAuth 4] ✅ Deep link captured:", url);
        try {
          await processAuthRedirect(url);
        } catch (err: any) {
          console.error("[OAuth 4] ❌ processAuthRedirect failed:", err.message || err);
          showError(err.message || "Login failed. Please try again.");
        } finally {
          setLoadingProvider(null);
        }
      };


      console.log("[OAuth 3] Registering Linking listener & opening browser...");
      const subscription = Linking.addEventListener("url", handleRedirect);

      if (Platform.OS === "ios") {
        // Both openBrowserAsync (SafariViewService crash: code 4099) and
        // openAuthSessionAsync (blank page) are broken in iOS Simulator on
        // macOS 26.3 beta. Linking.openURL opens the full native Safari app
        // which is unaffected by these simulator bugs.
        // On real devices this also works: Safari opens, user authenticates,
        // Supabase redirects to speechworks://auth-callback, iOS opens the app.
        console.log("[OAuth 3] Opening Safari via Linking.openURL...");
        await Linking.openURL(authUrl);
        console.log("[OAuth 3] Linking.openURL resolved. Waiting for deep link...");

        // Poll until the Linking listener handles the redirect (up to 5 min).
        const deadline = Date.now() + 5 * 60 * 1000;
        while (!linkingHandled && Date.now() < deadline) {
          await new Promise((r) => setTimeout(r, 200));
        }
        if (!linkingHandled) {
          console.warn("[OAuth 3] ❌ No deep link received after 5 minutes.");
          showError("Login was interrupted. Please try again.");
          setLoadingProvider(null);
        } else {
          console.log("[OAuth 3] ✅ Deep link handled.");
        }
      } else {
        // Android: openBrowserAsync (Custom Tabs) works correctly.
        const result = await WebBrowser.openBrowserAsync(authUrl);
        console.log("[OAuth 3] Browser closed. result.type:", result.type);

        const anyResult = result as any;
        if (anyResult.type === "success" && anyResult.url) {
          console.log("[OAuth 3] Success URL:", anyResult.url);
          if (!linkingHandled) {
            linkingHandled = true;
            await processAuthRedirect(anyResult.url);
          }
        } else if (result.type === "cancel") {
          console.log("[OAuth 3] User cancelled.");
          if (!linkingHandled) setLoadingProvider(null);
        } else {
          console.warn("[OAuth 3] result.type:", result.type, "— waiting 2s for deep link...");
          await new Promise((resolve) => setTimeout(resolve, 2000));
          if (!linkingHandled) {
            console.warn("[OAuth 3] ❌ No deep link received after 2s.");
            showError("Login was interrupted. Please try again.");
            setLoadingProvider(null);
          } else {
            console.log("[OAuth 3] ✅ Deep link was handled during wait.");
          }
        }
      }

      subscription.remove();

    } catch (err: any) {
      console.error("[OAuth] ❌ Unhandled error:", err.message || err);
      showError(err.message || "Login failed. Please try again.");
      setLoadingProvider(null);
    }
  };

  /** Shared logic to exchange the OAuth code for tokens and log the user in. */
  const processAuthRedirect = async (url: string) => {
    console.log("[OAuth 5] processAuthRedirect called with URL:", url);

    const queryString = url.split("?")[1] ?? "";
    const fragmentString = url.includes("#") ? url.split("#")[1] : "";
    console.log("[OAuth 5] Query string:", queryString);
    console.log("[OAuth 5] Fragment:", fragmentString);

    const params = new URLSearchParams(queryString);
    let code = params.get("code");
    console.log("[OAuth 5] code param:", code);

    if (!code) throw new Error(`No 'code' in OAuth redirect. Full URL: ${url}`);

    // Strip any trailing '#' fragment captured by URLSearchParams
    code = code.replace(/#.*$/, "");
    console.log("[OAuth 5] code (trimmed):", code);

    console.log("[OAuth 6] Calling handleOAuthCallback...");
    const { user, appJwt, refreshToken } = await handleOAuthCallback(code);
    console.log("[OAuth 6] ✅ Got appJwt for user:", user?.email ?? user?.id);

    await SecureStore.setItemAsync(SECURE_KEYS_NAME.SW_APP_JWT_KEY, appJwt);
    await SecureStore.setItemAsync(
      SECURE_KEYS_NAME.SW_APP_REFRESH_TOKEN_KEY,
      refreshToken,
    );

    console.log("[OAuth 7] ✅ Stored tokens, logging in.");
    login(appJwt);
    setUser(user);
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
            {/* <Image
              style={styles.logoImg}
              source={speechworksLogo}
              resizeMode="contain"
            /> */}
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
