import React, { useContext, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  Linking,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";

import {
  COMPANY_NAME,
  COMPANY_SLOGAN,
  PRIVACY_POLICY_URL,
  SUPPORT_URL,
} from "./constants";

import * as AuthSession from "expo-auth-session";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
// Brand marks (google/apple) have no Fluent/registry glyph — scoped brand
// exception, mirroring the DS Icon's own FontAwesome5 brand fallback.
import { FontAwesome5 } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { handleOAuthCallback, loginUser } from "../../api";
import PressableScale from "../../components/PressableScale";
import { SECURE_KEYS_NAME } from "../../constants/secureStorageKeys";
import { AuthContext } from "../../contexts/AuthContext";
import { useUserStore } from "../../stores/user";
import { attachInviteCode } from "../../api/buddies";
import { track } from "../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../util/analytics/analyticsEvents";
import { handleLinkPress } from "../../util/functions/externalLinks";
import {
  borderWidth,
  radius,
  SchemeStatusBar,
  size,
  space,
  spacing,
  Text,
  TextField,
  useTheme,
} from "../../design-system";
import LoginBackground from "./components/LoginBackground";

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
  const { colors } = useTheme();
  const { height } = useWindowDimensions();
  const isSmallDevice = height < 700;

  const { login } = useContext(AuthContext);
  const { setUser } = useUserStore();

  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState("");

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

    // App-global Linking listener — must be removed on EVERY exit path
    // (finally below), or each failed attempt stacks another live handler.
    let subscription: { remove: () => void } | undefined;

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
      subscription = Linking.addEventListener("url", handleRedirect);

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

    } catch (err: any) {
      console.error("[OAuth] ❌ Unhandled error:", err.message || err);
      showError(err.message || "Login failed. Please try again.");
      setLoadingProvider(null);
    } finally {
      subscription?.remove();
    }
  };

  /** Shared logic to exchange the OAuth code for tokens and log the user in. */
  const processAuthRedirect = async (url: string) => {
    console.log("[OAuth 5] processAuthRedirect called with URL:", url);

    const queryString = url.split("?")[1] ?? "";

    // Security: the query/fragment carry the OAuth authorization code — never
    // log their raw values (and never embed them in thrown errors, which now
    // flow to Sentry).
    console.log("[OAuth 5] Received auth-callback redirect");

    const params = new URLSearchParams(queryString);
    let code = params.get("code");

    if (!code) throw new Error("No 'code' found in OAuth redirect.");

    // Strip any trailing '#' fragment captured by URLSearchParams
    code = code.replace(/#.*$/, "");
    console.log("[OAuth 5] Authorization code received");

    console.log("[OAuth 6] Calling handleOAuthCallback...");
    const { user, appJwt, refreshToken } = await handleOAuthCallback(code);
    console.log("[OAuth 6] ✅ Authenticated user:", user?.id ?? "(unknown)");

    await SecureStore.setItemAsync(SECURE_KEYS_NAME.SW_APP_JWT_KEY, appJwt);
    await SecureStore.setItemAsync(
      SECURE_KEYS_NAME.SW_APP_REFRESH_TOKEN_KEY,
      refreshToken,
    );

    console.log("[OAuth 7] ✅ Stored tokens, logging in.");
    login(appJwt);
    setUser(user);

    // Practice Buddy: if the user entered an invite code, link them to their buddy.
    // Non-blocking and new-sign-ups-only (the server rejects non-new accounts).
    const buddyCode = inviteCode.trim();
    if (buddyCode) {
      try {
        track(ANALYTICS_EVENTS.BUDDY_CODE_ENTERED, { source: "signup" });
        await attachInviteCode(buddyCode);
        track(ANALYTICS_EVENTS.BUDDY_LINKED, { role: "invitee" });
      } catch (e) {
        console.warn("[Buddy] Invite code not applied:", (e as any)?.message);
      }
    }
  };

  const providers = getDisplayProviders();

  return (
    <View style={[styles.container, { backgroundColor: colors.background.canvas }]}>
      <SchemeStatusBar />
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
            {/* Brand wordmark — text.link is the scheme-correct orange ink
                (deep orange on paper, bright orange on the dark canvas). */}
            <Text variant="screenTitle" color="link" center>
              {COMPANY_NAME}
            </Text>
            <Text
              variant={isSmallDevice ? "bodySm" : "h3"}
              color="secondary"
              center
              style={styles.captionText}
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
            <Text variant="h2" center style={styles.sheetTitle}>
              Let's get started
            </Text>
            <Text variant="body" color="secondary" center>
              Login to continue your progress
            </Text>
          </View>

          {/* Social Buttons */}
          <View style={styles.loginButtons}>
            {providers.map((provider) => {
              const isLoading = loadingProvider === provider;
              const label = `Continue with ${
                provider.charAt(0).toUpperCase() + provider.slice(1)
              }`;

              // OAuth-branded buttons: a bright inverse disc on the canvas with
              // near-black label/glyph (surface.inverse + text.onInverse) — the
              // AA-correct pairing on both schemes.
              return (
                <PressableScale
                  key={provider}
                  onPress={() => onPressOAuth(provider)}
                  disabled={isLoading}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  accessibilityState={{ disabled: isLoading, busy: isLoading }}
                  style={[
                    styles.oauthButton,
                    {
                      backgroundColor: colors.surface.inverse,
                      borderColor: colors.border.default,
                      marginBottom: isSmallDevice ? spacing.md : spacing.lg, // Adaptive spacing
                      height: isSmallDevice ? 50 : 56, // Adaptive height
                    },
                  ]}
                >
                  {isLoading ? (
                    <ActivityIndicator color={colors.text.onInverse} />
                  ) : (
                    <>
                      <FontAwesome5
                        name={provider as any}
                        size={size.icon}
                        color={colors.text.onInverse}
                        brand
                      />
                      <Text variant="title" color={colors.text.onInverse} numberOfLines={1}>
                        {label}
                      </Text>
                    </>
                  )}
                </PressableScale>
              );
            })}
          </View>

          {/* Optional invite code */}
          <View style={styles.inviteWrap}>
            <TextField
              value={inviteCode}
              onChangeText={(t) => setInviteCode(t.toUpperCase())}
              placeholder="Have an invite code? (optional)"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={12}
              textAlign="center"
            />
          </View>

          {/* Footer / Legal */}
          <View
            style={[
              styles.legalContainer,
              { marginBottom: isSmallDevice ? spacing["2xl"] : spacing.xl },
            ]}
          >
            <Text variant="caption" color="tertiary" center>
              By continuing, you agree to our{" "}
              <Text
                variant="caption"
                color="link"
                onPress={() => handleLinkPress(PRIVACY_POLICY_URL)}
              >
                Terms & Privacy Policy
              </Text>
            </Text>
            <View style={{ height: spacing.lg }} />
            <Text variant="caption" color="tertiary" center>
              Need help?{" "}
              <Text
                variant="caption"
                color="link"
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

// Geometry only — every color is read from useTheme() at render time.
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Top Section
  topSection: {
    flex: 0.4,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  brandContent: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: spacing.sm + 2,
    gap: spacing.sm,
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
    marginTop: spacing.xs,
  },

  // Bottom Sheet
  bottomSheet: {
    flex: 0.6,
    backgroundColor: "transparent",
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    overflow: "hidden",
  },
  sheetContent: {
    flex: 1,
    paddingHorizontal: space.screenX,
    paddingTop: spacing["2xl"],
    justifyContent: "flex-start",
  },
  sheetHeader: {
    marginBottom: space.groupGap,
    alignItems: "center",
  },
  sheetTitle: {
    marginBottom: space.titleSub,
  },

  loginButtons: {
    width: "100%",
    marginBottom: space.rowGap,
  },
  oauthButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.iconText,
    borderRadius: radius.pill,
    borderWidth: borderWidth.thin,
    paddingHorizontal: spacing["2xl"],
  },
  inviteWrap: {
    width: "100%",
    marginBottom: space.rowGap,
  },

  legalContainer: {
    alignItems: "center",
    marginTop: "auto",
  },
});
