/**
 * DEV ONLY, WEB ONLY: the real moment pieces that the program lab cannot open, with sample data, for the review shots
 * (FxWeb: #mspot=<which>,<W>x<H>,dark|light).
 *   done | early | level         the practice done page (DonePractice) with Pip's moment
 *   welcome                      the onboarding welcome screen (Pip is its hero)
 *   error                        the error sheet with "your work is safe" (OutcomeSheet, pip "work-safe")
 *   loading | goldfish | snail   PipWaiting: loading, and the two empty lists
 *   notify | notify-no           the notification ask, and its "Not now" (tapped after 3 s)
 *   host-<moment id>[~variant]   a moment over the screen (showPipMoment) on the app's plain background, e.g.
 *                                host-mood-checkin~low, host-level-up~stage
 *   away                         the home greeting's "back after 2+ days" (Pip with his bird, on the plain background)
 */
import React, { useEffect } from "react";
import { View } from "react-native";
import { NavigationContainer, NavigationIndependentTree, DarkTheme, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaFrameContext, SafeAreaInsetsContext } from "react-native-safe-area-context";
import { Text, ThemeProvider } from "../../design-system";
import DonePractice from "../Academy/DailyPractice/components/DonePractice";
import OnboardingWelcome from "../Onboarding/OnboardingWelcome";
import { OutcomeSheet } from "../../components/OutcomeModal";
import { PipWaiting } from "../../components/Pip/PipWaiting";
import { PipMomentSpot } from "../../components/Pip/PipMomentSpot";
import { FxFront, FxFrontHost } from "../../components/Pip/fx/FxPortal";
import NotificationAsk from "../../components/NotificationAsk";
import { askNotificationsNicely, useNotificationAskStore } from "../../util/functions/notificationAsk";
import { PipMomentHost, showPipMoment } from "../../components/Pip";
import type { PipMomentId } from "../../components/Pip";
import { useUserStore } from "../../stores/user";

const Stack = createNativeStackNavigator();

export function parseSpotHash(hash: string) {
  const m = decodeURIComponent(hash).match(/#mspot=([a-z0-9~-]+)(?:,(\d+)x(\d+))?(?:,(dark|light))?/);
  return m ? { which: m[1], w: +(m[2] ?? 390), h: +(m[3] ?? 844), dark: m[4] !== "light" } : null;
}

function Body({ which }: { which: string }) {
  useEffect(() => {
    if (which.startsWith("host-")) {
      const [id, variant] = which.slice(5).split("~");
      const h = setTimeout(() => { void showPipMoment(id as PipMomentId, variant ? { variant } : undefined); }, 900);
      return () => clearTimeout(h);
    }
    if (which === "notify" || which === "notify-no") {
      // the OS would ask: open our ask directly (the lab has no OS permission state)
      const h = setTimeout(() => { useNotificationAskStore.setState({ open: true, resolve: () => undefined }); }, 600);
      return () => clearTimeout(h);
    }
    return undefined;
  }, [which]);
  void askNotificationsNicely;
  if (which === "done" || which === "early" || which === "level") return <DonePractice practiceName="Reading practice" isAborted={which === "early"} />;
  if (which === "welcome") return <OnboardingWelcome />;
  if (which === "away" || which === "home") return (
    <FxFront>
    <View style={{ flex: 1, paddingTop: 70, paddingHorizontal: 16 }}>
      <View>
        <View pointerEvents="none" style={{ position: "absolute", left: 0, top: -23 }}><PipMomentSpot moment="home-greeting" variant={which === "away" ? "away" : undefined} size={117} delay={900} figure={false} /></View>
        <Text>Good Morning,</Text><Text style={{ fontSize: 30, fontWeight: "800" }}>Sam</Text>
      </View>
      <View style={{ marginTop: 40, height: 220, borderRadius: 20, backgroundColor: "#2A2724" }} />
      <FxFrontHost />
    </View>
    </FxFront>);
  if (which === "error") return <OutcomeSheet visible type="error" title="Your work is safe" message="Your work is not lost. Check your connection and tap Complete again." pip="work-safe" onClose={() => undefined} />;
  if (which === "loading") return <View style={{ flex: 1, justifyContent: "center" }}><PipWaiting kind="loading" label="Loading content..." /></View>;
  if (which === "goldfish" || which === "snail") return <View style={{ flex: 1, justifyContent: "center" }}><PipWaiting kind="empty" which={which} title="No programs yet" label="Programs you start show up here." /></View>;
  if (which.startsWith("host-")) return <PipMomentHost />;
  if (which.startsWith("notify")) return <NotificationAsk />;
  return <Text>Unknown: {which}</Text>;
}

export function MomentSpotLab({ spec }: { spec: { which: string; w: number; h: number; dark: boolean } }) {
  useEffect(() => { useUserStore.setState({ user: { id: "lab-user", email: "lab@example.test", firstName: "Sam", name: "Sam" } as any }); }, []);
  const nav = spec.dark ? DarkTheme : DefaultTheme, bg = spec.dark ? "#141311" : "#F7F4EE";
  const Screen = () => <View style={{ flex: 1, backgroundColor: bg }}><Body which={spec.which} /></View>;
  return (
    <SafeAreaFrameContext.Provider value={{ x: 0, y: 0, width: spec.w, height: spec.h }}>
      <SafeAreaInsetsContext.Provider value={{ top: 44, bottom: 24, left: 0, right: 0 }}>
        <ThemeProvider scheme={spec.dark ? "dark" : "light"}>
          <View style={{ width: spec.w, height: spec.h, backgroundColor: bg, overflow: "hidden" }}>
            <NavigationIndependentTree>
              <NavigationContainer theme={{ ...nav, colors: { ...nav.colors, background: bg } }} documentTitle={{ enabled: false }}>
                <Stack.Navigator screenOptions={{ headerShown: false, animation: "none" }}>
                  <Stack.Screen name="Spot" component={Screen} />
                </Stack.Navigator>
              </NavigationContainer>
            </NavigationIndependentTree>
          </View>
        </ThemeProvider>
      </SafeAreaInsetsContext.Provider>
    </SafeAreaFrameContext.Provider>);
}
