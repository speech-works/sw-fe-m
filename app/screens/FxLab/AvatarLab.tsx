/**
 * DEV ONLY, WEB ONLY: the user-avatar lab (App.web.tsx, hash #avatars). Shows the kit avatars the way the app's screens
 * use them, at phone widths, light and dark, for close-zoom checks of the art rules (full collar, the body ends on the
 * blob or runs past a frame, nothing over the collar).
 *   #avatars                         the gallery: list, card, Home, Settings and Studio sizes
 *   #avatars=studio,390x844,dark     the real Avatar Studio screen (add ,tab=hair to open a tab)
 *   #avatars=shapes,light,0          every blob shape x 4 looks at every app size, each inside a box that clips (page 0 or 1)
 *   #avatars=f5,A,light,wall|list    founder option mocks F5 (A frame, B tile edge, C blob) on the real Community wall / lists
 *   #avatars=f6,A,light              founder option mocks F6 on the real Welcome stage (A blob only, B wash only, C both)
 */
import React, { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { NavigationContainer, NavigationIndependentTree, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaFrameContext, SafeAreaInsetsContext } from "react-native-safe-area-context";
import { Avatar, ProgressRing, ThemeProvider } from "../../design-system";
import { AvatarVariantOverride, UserAvatar } from "../../components/UserAvatar";
import { KIT_SHAPES } from "../../components/KitAvatar/kitLook";
import type { KitVariant } from "../../components/KitAvatar/kitLook";
import { CommunityRoom } from "../../components/CommunityRoom";
import { BuddyRequestList } from "../../components/BuddyRequests";
import type { BuddyRequest } from "../../api/buddies";
import WelcomeStage from "../PreAuth/WelcomeStage";
import AvatarStudio from "../AvatarStudio";
import { useUserStore } from "../../stores/user";
import { useAvatarDraftStore } from "../../stores/avatarDraft";
import { DEFAULT_MANIFEST, type AvatarManifest } from "../../types/avatar";

const M = (parts: Partial<AvatarManifest["parts"]>, colors: Partial<AvatarManifest["colors"]>): AvatarManifest =>
  ({ version: 1, parts: { ...DEFAULT_MANIFEST.parts, ...parts }, colors: { ...DEFAULT_MANIFEST.colors, ...colors } });

/** The default and eight varied kit looks (every slot, light and deep skin, hats, glasses, beards, long hair). */
export const LAB_LOOKS: [string, AvatarManifest | null][] = [
  ["default", null],
  ["waves", M({ hair: "hair.waves", eyewear: "eyewear.round", collar: "collar.notched", face: "face.smile" }, { skin: "#C68642", hair: "#241E1A", collar: "#8E3B49", bg: "#5BA88A" })],
  ["coily", M({ hair: "hair.coilybig", collar: "collar.peterpan", face: "face.warm" }, { skin: "#4E3325", hair: "#241E1A", collar: "#EDEDF0", bg: "#E8785B" })],
  ["turban", M({ hair: "hair.crop", beard: "beard.full", headgear: "headgear.turban", collar: "collar.mandarin" }, { skin: "#A56A3D", hair: "#241E1A", collar: "#EDEDF0", bg: "#D9A93F" })],
  ["sunhat", M({ hair: "hair.bob", headgear: "headgear.sunhat", collar: "collar.sailor", face: "face.laugh" }, { skin: "#F5D5BC", hair: "#C9A05A", collar: "#3A5A8C", bg: "#8A6FB0" })],
  ["braids", M({ hair: "hair.boxbraids", eyewear: "eyewear.cateye", collar: "collar.suittie", face: "face.proud" }, { skin: "#7A4A2B", hair: "#241E1A", collar: "#3A3A42", bg: "#5AA9E6" })],
  ["cowboy", M({ hair: null, beard: "beard.stubblestache", headgear: "headgear.cowboy", collar: "collar.neckerchief" }, { skin: "#E8B98A", hair: "#9B9691", collar: "#C08A4E", bg: "#2F8F8A" })],
  ["phones", M({ hair: "hair.pigtailbows", headgear: "headgear.studiophones", collar: "collar.rollneck", face: "face.curious" }, { skin: "#C68642", hair: "#7A4530", collar: "#3E7D63", bg: "#A88BD8" })],
  ["scarf", M({ hair: "hair.tightcurls", headgear: "headgear.headscarf", collar: "collar.shawl", face: "face.listening" }, { skin: "#A56A3D", hair: "#241E1A", collar: "#C08A4E", bg: "#B0555F" })],
];

const C = { light: { bg: "#F7F4EE", card: "#FFFFFF", fg: "#141311", sub: "#5E584E", track: "#DDD6C8" }, dark: { bg: "#141311", card: "#23211E", fg: "#F7F4EE", sub: "#B9B3A8", track: "#3A3733" } };

function Row({ title, t, children }: { title: string; t: typeof C.light; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={{ color: t.sub, fontSize: 12, marginBottom: 6 }}>{title}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "flex-end" }}>{children}</View>
    </View>
  );
}

/** One phone column of the gallery. */
function Phone({ w, dark }: { w: number; dark: boolean }) {
  const t = dark ? C.dark : C.light;
  return (
    <ThemeProvider scheme={dark ? "dark" : "light"}>
      <View {...({ dataSet: { labPhone: `${w}-${dark ? "dark" : "light"}` } } as object)} style={{ width: w, backgroundColor: t.bg, padding: 16, borderRadius: 12 }}>
        <Text style={{ color: t.fg, fontWeight: "700", marginBottom: 12 }}>{w} wide, {dark ? "dark" : "light"}</Text>
        <Row title="List, 40 (Discover, buddy requests: square frame)" t={t}>
          {LAB_LOOKS.map(([k, m]) => <UserAvatar key={k} manifest={m} size={40} shape="square" />)}
        </Row>
        <Row title="List, 42 (SignalCard, blob)" t={t}>
          {LAB_LOOKS.map(([k, m]) => <UserAvatar key={k} manifest={m} size={42} />)}
        </Row>
        <Row title="Card, 60 (Achievements stage card, lock badge top-right)" t={t}>
          {LAB_LOOKS.slice(0, 5).map(([k, m]) => (
            <View key={k} style={{ width: 60, height: 60 }}>
              <UserAvatar manifest={m} size={60} />
              <View style={{ position: "absolute", right: -2, top: -2, width: 20, height: 20, borderRadius: 10, backgroundColor: t.track }} />
            </View>))}
        </Row>
        <Row title="Card, 85 (Community)" t={t}>
          {LAB_LOOKS.slice(0, 4).map(([k, m]) => <UserAvatar key={k} manifest={m} size={85} />)}
        </Row>
        <Row title="Home identity card: energy ring 62, LIVE avatar cut by the ring's inside (56)" t={t}>
          {LAB_LOOKS.slice(0, 5).map(([k, m]) => (
            <View key={k} style={{ backgroundColor: t.card, borderRadius: 16, padding: 8 }}>
              <ProgressRing progress={0.72} size={62} strokeWidth={3} color="#3E9B5B" trackColor={t.track}>
                <UserAvatar manifest={m} size={56} shape="ring" animate />
              </ProgressRing>
            </View>))}
        </Row>
        <Row title="Energy info sheet: ring 84, still avatar cut by the ring (72)" t={t}>
          {LAB_LOOKS.slice(5, 9).map(([k, m]) => (
            <ProgressRing key={k} progress={0.72} size={84} strokeWidth={6} color="#3E9B5B" trackColor={t.track}>
              <UserAvatar manifest={m} size={72} shape="ring" />
            </ProgressRing>))}
        </Row>
        <Row title="Settings: AvatarButton 72 with level badge" t={t}>
          {LAB_LOOKS.slice(0, 3).map(([k, m]) => <Avatar key={k} size={72} level={7} content={<UserAvatar manifest={m} size={72} />} />)}
        </Row>
        <Row title="Wall tile 130 (CommunityRoom subject, square frame)" t={t}>
          {LAB_LOOKS.slice(1, 3).map(([k, m]) => <UserAvatar key={k} manifest={m} size={130} shape="square" />)}
        </Row>
        <Row title="Welcome stage (pre-auth first screen, still)" t={t}>
          <View style={{ width: w - 32 }}><WelcomeStage available={340} /></View>
        </Row>
        <Row title="Studio preview, LIVE 240" t={t}>
          <UserAvatar manifest={LAB_LOOKS[5][1]} size={240} animate />
        </Row>
      </View>
    </ThemeProvider>
  );
}

const Stack = createNativeStackNavigator<any>();

function StudioLab({ w, h, dark, tab, look }: { w: number; h: number; dark: boolean; tab: string | null; look: number }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    useUserStore.setState({ user: { id: "lab-user", email: "lab@example.test", firstName: "Sam", name: "Sam", level: 4, avatarManifest: LAB_LOOKS[look][1] } as any });
    useAvatarDraftStore.getState().clear();
    setReady(true);
  }, [look]);
  useEffect(() => {
    if (!ready || !tab || typeof document === "undefined") return;
    const t = setTimeout(() => {
      const el = Array.from(document.querySelectorAll('[role="tab"], [role="button"], div')).find((n) => (n as HTMLElement).innerText?.trim() === tab) as HTMLElement | undefined;
      el?.click();
    }, 400);
    return () => clearTimeout(t);
  }, [ready, tab]);
  if (!ready) return null;
  const nav = dark ? DarkTheme : DefaultTheme, bg = dark ? "#141311" : "#F7F4EE";
  return (
    <SafeAreaFrameContext.Provider value={{ x: 0, y: 0, width: w, height: h }}>
      <SafeAreaInsetsContext.Provider value={{ top: 44, bottom: 24, left: 0, right: 0 }}>
        <ThemeProvider scheme={dark ? "dark" : "light"}>
          <View style={{ width: w, height: h, backgroundColor: bg, overflow: "hidden" }}>
            <NavigationIndependentTree>
              <NavigationContainer theme={{ ...nav, colors: { ...nav.colors, background: bg } }} documentTitle={{ enabled: false }}>
                <Stack.Navigator screenOptions={{ headerShown: false, animation: "none" }}>
                  <Stack.Screen name="AvatarStudio" component={AvatarStudio} />
                </Stack.Navigator>
              </NavigationContainer>
            </NavigationIndependentTree>
          </View>
        </ThemeProvider>
      </SafeAreaInsetsContext.Provider>
    </SafeAreaFrameContext.Provider>
  );
}

/** Every blob shape x 4 looks at every size the app draws a blob avatar; each box clips (overflow hidden, dashed edge), so a
 *  shape that left its box would show cut here. The 240 one is live (breathing). */
function ShapeSheet({ dark, page }: { dark: boolean; page: number }) {
  const t = dark ? C.dark : C.light, looks = [1, 4, 5, 6].map((i) => LAB_LOOKS[i][1] as AvatarManifest);
  const shapes = KIT_SHAPES.slice(page * 11, page * 11 + 11);
  const box = (k: string, m: AvatarManifest, size: number, live = false) => (
    <View key={k} style={{ width: size, height: size, overflow: "hidden", borderWidth: 1, borderStyle: "dashed", borderColor: dark ? "#55504A" : "#C9C1B3" }}>
      <UserAvatar manifest={m} size={size} animate={live} />
    </View>);
  return (
    <ThemeProvider scheme={dark ? "dark" : "light"}>
      <View style={{ backgroundColor: t.bg, padding: 16, gap: 14 }}>
        <Text style={{ color: t.fg, fontWeight: "700" }}>Blob shapes {page * 11 + 1} to {page * 11 + shapes.length} of {KIT_SHAPES.length}, {dark ? "dark" : "light"}. Sizes 40 (lists), 60 (cards), 72 (Studio cells), 85 (Community), 240 live (Studio). Dashed = the box that clips.</Text>
        {shapes.map((sh) => (
          <View key={sh.id} style={{ flexDirection: "row", alignItems: "flex-end", gap: 10 }}>
            <Text style={{ color: t.sub, width: 110, fontSize: 12 }}>{sh.label}{"\n"}{sh.id}</Text>
            {[40, 60, 72, 85].map((size) => (
              <View key={size} style={{ flexDirection: "row", gap: 4, alignItems: "flex-end" }}>
                {looks.map((m, i) => box(sh.id + size + i, { ...m, parts: { ...m.parts, bg: sh.id } }, size))}
              </View>))}
            {box(sh.id + "live", { ...looks[2], parts: { ...looks[2].parts, bg: sh.id } }, 240, true)}
          </View>))}
      </View>
    </ThemeProvider>);
}

const ago = (d: number) => new Date(Date.now() - d * 86400000).toISOString();
const REQUESTS: BuddyRequest[] = LAB_LOOKS.slice(1, 5).map(([, m], i) => ({ id: "r" + i, direction: "incoming", createdAt: ago(i + 1),
  profile: { id: "p" + i, name: ["Asha Rao", "Ben Ortiz", "Chidi Obi", "Dana Levi"][i], avatarManifest: m } } as BuddyRequest));
/** F5: the option's avatar treatment on the real Community wall (wall) or the real buddy request list plus a sheet head (list). */
function F5({ opt, dark, what }: { opt: "A" | "B" | "C"; dark: boolean; what: "wall" | "list" }) {
  const v: KitVariant = opt === "A" ? "frame" : opt === "B" ? "edge" : "blob";
  const t = dark ? C.dark : C.light;
  return (
    <ThemeProvider scheme={dark ? "dark" : "light"}>
      <AvatarVariantOverride.Provider value={v}>
        {what === "wall" ? (
          <View style={{ width: 360, height: 780, backgroundColor: dark ? "#141311" : "#F7F4EE" }}>
            <NavigationIndependentTree>
              <NavigationContainer theme={dark ? DarkTheme : DefaultTheme} documentTitle={{ enabled: false }}>
                <Stack.Navigator screenOptions={{ headerShown: false, animation: "none", contentStyle: { backgroundColor: dark ? "#141311" : "#F7F4EE" } }}>
                  <Stack.Screen name="Wall">{() => <CommunityRoom manifest={LAB_LOOKS[5][1]} seatCount={3} />}</Stack.Screen>
                </Stack.Navigator>
              </NavigationContainer>
            </NavigationIndependentTree>
          </View>
        ) : (
          <View style={{ width: 360, minHeight: 780, backgroundColor: t.bg, padding: 16, gap: 16 }}>
            <Text style={{ color: t.fg, fontWeight: "700" }}>F5 option {opt}: buddy requests (real list, 40)</Text>
            <BuddyRequestList requests={REQUESTS} onOpen={() => undefined} />
            <Text style={{ color: t.fg, fontWeight: "700" }}>Candidate / request sheet head (58)</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: t.card, borderRadius: 16, padding: 16 }}>
              <UserAvatar manifest={LAB_LOOKS[6][1]} size={58} shape="square" />
              <View><Text style={{ color: t.fg, fontSize: 18, fontWeight: "700" }}>Sam</Text><Text style={{ color: t.sub }}>Asked 2 days ago</Text></View>
            </View>
            <Text style={{ color: t.fg, fontWeight: "700" }}>Discover rows (you 32, people 40)</Text>
            <View style={{ backgroundColor: t.card, borderRadius: 16 }}>
              {[LAB_LOOKS[7][1], LAB_LOOKS[8][1], LAB_LOOKS[2][1]].map((m, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderBottomWidth: i < 2 ? 1 : 0, borderColor: t.track }}>
                  <UserAvatar manifest={m} size={40} shape="square" />
                  <Text style={{ color: t.fg }}>{["Ravi", "Mei", "Tom"][i]}</Text>
                </View>))}
            </View>
          </View>)}
      </AvatarVariantOverride.Provider>
    </ThemeProvider>);
}

/** F6: the real Welcome stage, current (C) or the lab options A / B. */
function F6({ opt, dark }: { opt: "A" | "B" | "C"; dark: boolean }) {
  const t = dark ? C.dark : C.light;
  return (
    <ThemeProvider scheme={dark ? "dark" : "light"}>
      <View style={{ width: 360, height: 780, backgroundColor: dark ? "#141311" : "#F7F4EE", paddingTop: 60 }}>
        <Text style={{ color: t.fg, fontWeight: "700", marginLeft: 16 }}>F6 option {opt}: Welcome stage</Text>
        <WelcomeStage available={420} labOption={opt === "C" ? undefined : opt} />
      </View>
    </ThemeProvider>);
}

export function AvatarLab() {
  const hash = typeof location !== "undefined" ? decodeURIComponent(location.hash || "") : "";
  const sh = hash.match(/^#avatars=shapes(?:,(light|dark))?(?:,(\d))?/);
  if (sh) return <ShapeSheet dark={sh[1] === "dark"} page={+(sh[2] || 0)} />;
  const f5 = hash.match(/^#avatars=f5,([ABC])(?:,(light|dark))?(?:,(wall|list))?/);
  if (f5) return <F5 opt={f5[1] as "A"} dark={f5[2] === "dark"} what={(f5[3] as "wall") || "wall"} />;
  const f6 = hash.match(/^#avatars=f6,([ABC])(?:,(light|dark))?/);
  if (f6) return <F6 opt={f6[1] as "A"} dark={f6[2] === "dark"} />;
  const m = hash.match(/^#avatars=studio(?:,(\d+)x(\d+))?(?:,(light|dark))?(?:,tab=([A-Za-z]+))?(?:,look=(\d+))?/);
  if (m) return <StudioLab w={+(m[1] || 390)} h={+(m[2] || 844)} dark={m[3] === "dark"} tab={m[4] || null} look={+(m[5] || 5)} />;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#8A8478" }} contentContainerStyle={{ padding: 16, flexDirection: "row", flexWrap: "wrap", gap: 16, alignItems: "flex-start" }}>
      <Phone w={360} dark={false} />
      <Phone w={360} dark />
      <Phone w={430} dark={false} />
      <Phone w={430} dark />
    </ScrollView>
  );
}
