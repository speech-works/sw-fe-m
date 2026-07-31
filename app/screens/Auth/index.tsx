import React, { useContext, useState } from "react";
import {
  ActivityIndicator,
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
  Button,
  Dialog,
  radius,
  SchemeStatusBar,
  Sheet,
  size,
  space,
  spacing,
  Text,
  TextField,
  useMotion,
  useTheme,
} from "../../design-system";
import LoginBackground from "./components/LoginBackground";
import { apiErrorMessage } from "../../util/functions/apiError";
import { showErrorBottomSheet } from "../../util/functions/bottomSheet";
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
   * The invite field stays collapsed until asked for.
   *
   * It used to sit open under the buttons on every visit, which meant the one
   * input on the screen belonged to the small minority who arrived with a code
   * — and, worse, read as a thing you might be expected to fill in before
   * continuing. Behind the sheet it costs one row instead of one field, and the
   * people who have a code are exactly the people looking for it.
   */
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isCodeAdded, setIsCodeAdded] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  /**
   * Sign-in failed. Offers support HERE rather than from a permanent link on
   * the screen: this is the only moment anyone actually wants it, and a
   * standing "Need help?" at the door was clutter for everyone it never helped.
   * An error with no recovery path is the thing worth avoiding — not the link.
   */
  const showError = (message: string) => {
    setSignInError(message);
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

    /**
     * Practice Buddy — REDEEMED BEFORE `login()`, deliberately.
     *
     * This used to run after, and a wrong code vanished into a `console.warn`:
     * the person typed their friend's code, was never linked, and was never
     * told. Moving it after login also put it past the point of no return —
     * `login()` flips `isLoggedIn`, MainNavigator swaps this navigator out, and
     * everything below it runs on an unmounted component, so there was nowhere
     * left to show anything.
     *
     * Here the screen is still mounted and the request is still authenticated:
     * the JWT went into SecureStore above, and that is where the axios
     * interceptor reads it from — `login()` is React state, not the token.
     *
     * A rejection does NOT block sign-in. The account exists either way, and
     * trapping someone at the door over their friend's typo would be a far
     * worse outcome than being paired later.
     */
    const buddyCode = inviteCode.trim();
    if (buddyCode) {
      try {
        track(ANALYTICS_EVENTS.BUDDY_CODE_ENTERED, { source: "signup" });
        await attachInviteCode(buddyCode);
        track(ANALYTICS_EVENTS.BUDDY_LINKED, { role: "invitee" });
      } catch (e) {
        // The server's own words: it distinguishes an invalid code from your
        // own code, from already having a buddy, from theirs being taken. A
        // generic "something went wrong" would throw all of that away.
        showErrorBottomSheet(
          "Couldn't pair you up",
          `${apiErrorMessage(e, "That code didn't work.")}\n\nYou're all signed up — you can add a code from the Community tab.`,
        );
      }
    }

    console.log("[OAuth 7] ✅ Stored tokens, logging in.");
    login(appJwt);
    setUser(user);
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
        <View style={styles.spacer} />

        <Animated.View entering={motion.stagger(0)}>
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
                      <View style={styles.oauthIcon}>
                        <FontAwesome5
                          name={provider as any}
                          size={size.icon}
                          color={colors.text.onInverse}
                          brand
                        />
                      </View>
                      <Text
                        variant="title"
                        color={colors.text.onInverse}
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

        <View style={styles.footer}>
          <Animated.View entering={motion.stagger(1 + providers.length)}>
            <Text
              variant="bodySm"
              color={isCodeAdded ? (colors.feedback.successText as any) : "link"}
              center
              style={styles.inviteLink}
              onPress={() => setIsSheetOpen(true)}
            >
              {isCodeAdded ? "Buddy code added" : "Have an invite code?"}
            </Text>
          </Animated.View>

          <Animated.View entering={motion.stagger(2 + providers.length)}>
            <Text variant="caption" color="tertiary" center>
              By continuing, you agree to our{" "}
              <Text
                variant="caption"
                color="link"
                onPress={() => handleLinkPress(PRIVACY_POLICY_URL)}
              >
                Privacy Policy
              </Text>
            </Text>
          </Animated.View>
        </View>
      </ScrollView>

      <Sheet
        visible={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        title="Pair with a Buddy"
      >
        <View style={{ gap: space.groupGap, paddingHorizontal: spacing.md, paddingTop: spacing.md }}>
          <Text variant="body" color="secondary">
            Enter a friend's invite code to pair up and share your progress.
          </Text>
          <TextField
            value={inviteCode}
            onChangeText={(t) => setInviteCode(t.toUpperCase())}
            placeholder="Invite code"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={12}
            textAlign="center"
          />
          <Button 
            variant="primary" 
            label={isCodeAdded ? "Update" : "Pair up"} 
            onPress={() => {
              setIsCodeAdded(inviteCode.trim().length > 0);
              setIsSheetOpen(false);
            }} 
          />
        </View>
      </Sheet>

      {/* Support is offered HERE, at the only moment anyone wants it — see the
          note on showError. "Try again" is the cancel, because dismissing the
          dialog already returns them to the buttons. */}
      <Dialog
        visible={signInError !== null}
        onClose={() => setSignInError(null)}
        title="Couldn't sign you in"
        message={signInError ?? ""}
        cancelLabel="Try again"
        confirmLabel="Get help"
        onConfirm={() => {
          setSignInError(null);
          handleLinkPress(SUPPORT_URL);
        }}
      />
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
    // flex-start, NOT center. Centring the [icon + label] group put every icon
    // and every label at a different x, because the three labels differ in
    // length and the three glyphs differ in width — three buttons, three left
    // edges. Left-aligning against a fixed icon slot gives all three a single
    // shared edge, which is also what the left-aligned headline above wants.
    justifyContent: "flex-start",
    gap: space.iconText,
    height: 56,
    borderRadius: radius.pill,
    borderWidth: borderWidth.thin,
    paddingHorizontal: spacing["2xl"],
  },
  oauthIcon: {
    width: size.icon,
    alignItems: "center",
  },
  /** Set apart from the actions: this is chrome, and it was crowding them. */
  footer: {
    gap: space.rowGap,
    paddingTop: space.groupGap,
  },
  inviteLink: {
    // Carries the ~20pt line past the 44pt minimum tap target.
    paddingVertical: spacing.md,
  },
});
