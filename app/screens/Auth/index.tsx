import React, { useContext, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import Animated from "react-native-reanimated";

import { PRIVACY_POLICY_URL, SUPPORT_URL } from "./constants";

import * as AuthSession from "expo-auth-session";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
// Brand marks (google/apple) have no Fluent/registry glyph — scoped brand
// exception, mirroring the DS Icon's own FontAwesome5 brand fallback.
import { FontAwesome5 } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  useMotion,
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

const LoginScreen = () => {
  const { colors } = useTheme();
  const motion = useMotion();
  const insets = useSafeAreaInsets();

  const { login } = useContext(AuthContext);
  const { setUser } = useUserStore();

  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  /**
   * The invite field starts collapsed behind a link.
   *
   * It used to sit open under the buttons on every visit, which meant the one
   * input on the screen belonged to the small minority who arrived with a code
   * — and, worse, read as a thing you might be expected to fill in before
   * continuing. Behind a link it costs one row instead of one field, and the
   * people who have a code are exactly the people looking for it.
   */
  const [showInvite, setShowInvite] = useState(false);

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
        ONE COLUMN, LEFT ALIGNED — the same shape as every screen before it.

        This used to be a brand block pinned to the top 35-42% and a sheet that
        slid up over it, with the wordmark and slogan set centred. Two problems.
        The wordmark introduced the app by name to someone who had just spent a
        minute answering its questions and been shown a personalised plan — the
        one moment in the flow where an introduction is redundant. And centring
        it broke the left-aligned rhythm the welcome, question and teaser
        screens all share, so arriving here felt like arriving in a different
        app.

        Now it is the welcome screen's skeleton: a spacer that pushes content
        down, a screenTitle headline at 40 leading, the actions, one footnote.
        The ambient orbs stay — they are what makes a screen with almost nothing
        on it still feel considered, and they already respect reduce-motion.
      */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + spacing.lg,
            paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.md,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Collapses to nothing the moment content outgrows the viewport (an
            open keyboard, a large text size), so the headline can never be
            pushed above the scroll origin where nothing can reach it. */}
        <View style={styles.spacer} />

        <Animated.View entering={motion.stagger(0)}>
          {/* Hard-broken to two lines so the lockup matches "Everyone has /
              a list." — same variant, same 40 leading, same left edge.

              Works for both arrivals, which is why it replaced a stacked
              "Let's get started" / "Login to continue your progress": one of
              those addressed a new signup and the other a returning login, and
              showing both to everyone meant half of it was always wrong. */}
          <Text variant="screenTitle" style={styles.headline}>
            Let's get{"\n"}you in.
          </Text>
        </Animated.View>

        <View style={styles.actions}>
          {providers.map((provider, i) => {
            const isLoading = loadingProvider === provider;
            const label = `Continue with ${
              provider.charAt(0).toUpperCase() + provider.slice(1)
            }`;

            // OAuth-branded buttons: a bright inverse disc on the canvas with
            // near-black label/glyph (surface.inverse + text.onInverse) — the
            // AA-correct pairing on both schemes.
            return (
              <Animated.View key={provider} entering={motion.stagger(1 + i)}>
                <PressableScale
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
                      <Text
                        variant="title"
                        color={colors.text.onInverse}
                        numberOfLines={1}
                      >
                        {label}
                      </Text>
                    </>
                  )}
                </PressableScale>
              </Animated.View>
            );
          })}
        </View>

        <Animated.View entering={motion.stagger(1 + providers.length)}>
          {showInvite ? (
            <TextField
              value={inviteCode}
              onChangeText={(t) => setInviteCode(t.toUpperCase())}
              placeholder="Invite code"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={12}
              autoFocus
            />
          ) : (
            <Text
              variant="bodySm"
              color="link"
              style={styles.inviteLink}
              onPress={() => setShowInvite(true)}
            >
              Have an invite code?
            </Text>
          )}
        </Animated.View>

        {/* ONE footnote, not two stacked blocks with a spacer between them.
            The consent sentence has to be here; "Need help?" rides along on the
            same line rather than claiming a block of its own, so nothing is
            lost from a screen someone may well be stuck on. */}
        <Animated.View entering={motion.stagger(2 + providers.length)}>
          <Text variant="caption" color="tertiary" style={styles.legal}>
            By continuing, you agree to our{" "}
            <Text
              variant="caption"
              color="link"
              onPress={() => handleLinkPress(PRIVACY_POLICY_URL)}
            >
              Terms & Privacy Policy
            </Text>
            .{" "}
            <Text
              variant="caption"
              color="link"
              onPress={() => handleLinkPress(SUPPORT_URL)}
            >
              Need help?
            </Text>
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

export default LoginScreen;

// Geometry only — every color is read from useTheme() at render time.
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    // flexGrow, not flex — the spacer below can then absorb slack on a tall
    // screen AND collapse on a short one, instead of the content being centred
    // and clipped at both ends when it overflows.
    flexGrow: 1,
    paddingHorizontal: space.screenX,
    gap: space.groupGap,
  },
  spacer: {
    flex: 1,
  },
  headline: {
    lineHeight: 40,
  },
  actions: {
    gap: space.rowGap,
  },
  oauthButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.iconText,
    height: 56,
    borderRadius: radius.pill,
    borderWidth: borderWidth.thin,
    paddingHorizontal: spacing["2xl"],
  },
  inviteLink: {
    paddingVertical: spacing.sm,
  },
  legal: {
    paddingBottom: spacing.sm,
  },
});
