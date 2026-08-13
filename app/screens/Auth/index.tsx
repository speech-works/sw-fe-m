import React, { useContext, useState, useEffect } from "react";
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
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { signInWithApple } from "../../api/auth";
import { apiErrorMessage } from "../../util/functions/apiError";
import { showErrorBottomSheet } from "../../util/functions/bottomSheet";
// The WEB-redirect providers. Apple is deliberately absent: it now uses the
// native ASAuthorization flow below, not the Safari round trip, so it has no
// business in this list or in the generic button map.
const ALL_PROVIDERS = ["google", "facebook"];

/**
 * Icon size for the Google/Facebook rows — deliberately NOT `size.icon` (20).
 *
 * `AppleAuthenticationButton` draws its own glyph and there is no prop to
 * change it; measured off-device it renders at roughly 12.7×11.7pt inside a
 * 56pt-tall button, well under the DS's standard 20pt control icon. At 20 the
 * FontAwesome5 google/facebook marks measured ~18.7×14.3pt and ~19×14.7pt —
 * already near-identical to EACH OTHER, but visibly larger than Apple's, which
 * is what actually read as "the icons don't match."
 *
 * Since Apple's size is the one fixed point, matching means shrinking the
 * other two toward it rather than trying to inflate Apple's. 14 lands their
 * rendered width close to Apple's (~13pt) without leaving them so small they
 * look like a mistake next to the label.
 */
const OAUTH_ICON_SIZE = 14;

// Required to ensure the WebBrowser closes correctly on Android redirects
WebBrowser.maybeCompleteAuthSession();

const LoginScreen = () => {
  const { colors, scheme } = useTheme();
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
  // Gates the BUTTON only. Not the handler (an unrendered button can't be
  // pressed), and not the whole actions block — on a device where Sign in with
  // Apple is unavailable, Google and Facebook must still render or there is no
  // way into the app at all. isAvailableAsync is the only correct signal here:
  // it accounts for OS version and device management, which Platform.OS cannot.
  const [appleAvailable, setAppleAvailable] = useState(false);
  useEffect(() => {
    if (Platform.OS !== "ios") return;
    let alive = true;
    AppleAuthentication.isAvailableAsync()
      .then((ok) => alive && setAppleAvailable(ok))
      .catch(() => alive && setAppleAvailable(false));
    return () => {
      alive = false;
    };
  }, []);

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
  /**
   * Native Sign in with Apple (App Store Guideline 4.8).
   *
   * Nothing here touches the web flow: no browser, no deep link, no five-minute
   * poll. The device authorizes directly and we exchange the identity token.
   *
   * THE NONCE IS THE EASY THING TO GET BACKWARDS. Apple wants the SHA-256 HASH,
   * and embeds it in the token. Supabase wants the RAW value so it can hash and
   * compare. Swap them and you get an opaque "invalid nonce" with nothing in
   * the logs to explain it.
   */
  const onPressApple = async () => {
    if (loadingProvider) return;
    setLoadingProvider("apple");
    try {
      const bytes = await Crypto.getRandomBytesAsync(32);
      const rawNonce = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce,
      );

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      if (!credential.identityToken) {
        throw new Error("Apple didn't return an identity token.");
      }

      // ONE SHOT, EVER. Apple sends the name only on the first authorization
      // for this Apple ID and app, and only to the client — it is not in the
      // token, so the server cannot recover it later. Forward it or lose it.
      const fullName =
        [credential.fullName?.givenName, credential.fullName?.familyName]
          .filter(Boolean)
          .join(" ")
          .trim() || undefined;

      await completeSignIn(
        await signInWithApple({
          identityToken: credential.identityToken,
          nonce: rawNonce,
          fullName,
          // Also one shot, and for the same structural reason as `fullName`:
          // Apple hands this to the client and nowhere else. The server
          // exchanges it for a refresh token, which is the ONLY thing that can
          // later be revoked when the user deletes their account. Apple
          // requires that revocation (Guideline 5.1.1(v)), and the identity
          // token above cannot serve, since `signInWithIdToken` never performs
          // a code exchange. Typed `string | null` by the module, so it is
          // normalised to undefined rather than sent as null.
          authorizationCode: credential.authorizationCode ?? undefined,
        }),
      );
    } catch (e: any) {
      // Cancelling is a choice, not a failure. Dropping someone into the
      // "couldn't sign you in" dialog because they tapped Cancel is the
      // classic mistake here. Both codes: the module renamed it across SDKs.
      if (e?.code === "ERR_REQUEST_CANCELED" || e?.code === "ERR_CANCELED") {
        setLoadingProvider(null);
        return;
      }
      showError(apiErrorMessage(e, "Couldn't sign you in with Apple."));
      setLoadingProvider(null);
    }
  };

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
    await completeSignIn(await handleOAuthCallback(code));
  };

  /**
   * The half of sign-in that is identical for every provider: store the tokens,
   * redeem a pending invite code, then flip the app into its logged-in state.
   *
   * Extracted so the native Apple path reuses it rather than copying it. The
   * invite-code block below carries load-bearing ordering (see its own note) —
   * an Apple path that skipped it would silently drop buddy pairing for every
   * iOS signup.
   */
  const completeSignIn = async ({
    user,
    appJwt,
    refreshToken,
  }: {
    user: any;
    appJwt: string;
    refreshToken: string;
  }) => {
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
          `${apiErrorMessage(e, "That code didn't work.")}\n\nYou're all signed up. You can add a code from the Buddy tab.`,
        );
      }
    }

    console.log("[OAuth 7] ✅ Stored tokens, logging in.");
    login(appJwt);
    setUser(user);
  };

  const providers = ALL_PROVIDERS;
  // The Apple button takes slot 1 when present, so everything after it shifts.
  const staggerBase = appleAvailable ? 2 : 1;

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
          {/* FIRST, deliberately. Guideline 4.8 asks that Sign in with Apple be
              presented as an equivalent option, and first position removes the
              argument. AppleAuthenticationButton renders Apple's own native
              view — it cannot be restyled beyond these props, and it must not
              be wrapped in PressableScale (the press would be double-handled
              and a scale transform on a native view breaks the HIG). */}
          {appleAvailable ? (
            <Animated.View entering={motion.stagger(1)}>
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={
                  AppleAuthentication.AppleAuthenticationButtonType.CONTINUE
                }
                buttonStyle={
                  scheme === "dark"
                    ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                    : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                }
                cornerRadius={radius.pill}
                style={styles.appleButton}
                onPress={onPressApple}
              />
            </Animated.View>
          ) : null}

          {providers.map((provider, i) => {
            const isLoading = loadingProvider === provider;
            const label = `Continue with ${
              provider.charAt(0).toUpperCase() + provider.slice(1)
            }`;

            return (
              <Animated.View key={provider} entering={motion.stagger(staggerBase + i)}>
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
                          size={OAUTH_ICON_SIZE}
                          color={colors.text.onInverse}
                          brand
                        />
                      </View>
                      {/* h3, NOT `title`. `AppleAuthenticationButton` sizes its
                          own label off the button height — at 56pt that lands
                          near 20pt — and there is no prop to change it. Left at
                          `title` (16pt) the Apple row read a quarter larger than
                          the two beneath it, which is the other half of what was
                          reported as a broken button. 18pt closes most of that
                          gap while staying on the type scale; matching it
                          exactly is not possible without abandoning Apple's
                          native view. */}
                      <Text variant="h3" color={colors.text.onInverse}>
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
          <Animated.View entering={motion.stagger(staggerBase + providers.length)}>
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

          <Animated.View entering={motion.stagger(staggerBase + 1 + providers.length)}>
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
  appleButton: {
    // Height only. Apple's native button owns its colour, type and typography;
    // anything more here is both ineffective and a HIG violation.
    height: 56,
    marginBottom: spacing.md,
  },
  oauthButton: {
    flexDirection: "row",
    alignItems: "center",
    // CENTRED, reversing an earlier decision — and the reason that decision was
    // wrong is sitting directly above these buttons.
    //
    // The old comment argued for `flex-start` so all three would share one left
    // edge, since centring puts each icon at a different x once the labels
    // differ in length. That reasoning is sound in isolation and it ignored the
    // fourth button: `AppleAuthenticationButton` is a NATIVE iOS view whose
    // content is centred by the system and cannot be restyled. So the screen
    // shipped as one centred button above two left-aligned ones, which does not
    // read as a considered left edge — it reads as a bug, and was reported as
    // one.
    //
    // Three centred buttons cost a few points of icon drift between rows. One
    // centred button over two left-aligned ones costs the user's confidence in
    // the screen. Matching the element we cannot change is the cheaper trade.
    justifyContent: "center",
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
