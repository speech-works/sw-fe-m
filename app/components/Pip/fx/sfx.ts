/**
 * Pip's sound effects: short, quirky, synthesised from scratch (scripts/sfx/make_sfx.py; no samples, no licences).
 * Loaded once on first use, played by name. Respects the phone's silent switch on iOS (playsInSilentModeIOS false).
 */
import { Platform } from "react-native";
import * as Application from "expo-application";
import { Audio } from "expo-av";

// static requires so Metro bundles each file
export const SFX = {
  pop: require("../../../assets/sfx/pop.m4a"),
  boing: require("../../../assets/sfx/boing.m4a"),
  "chime-up": require("../../../assets/sfx/chime-up.m4a"),
  "xylo-run": require("../../../assets/sfx/xylo-run.m4a"),
  sparkle: require("../../../assets/sfx/sparkle.m4a"),
  whoosh: require("../../../assets/sfx/whoosh.m4a"),
  "swoosh-down": require("../../../assets/sfx/swoosh-down.m4a"),
  popper: require("../../../assets/sfx/popper.m4a"),
  firework: require("../../../assets/sfx/firework.m4a"),
  fire: require("../../../assets/sfx/fire.m4a"),
  snow: require("../../../assets/sfx/snow.m4a"),
  bubbles: require("../../../assets/sfx/bubbles.m4a"),
  "slide-up": require("../../../assets/sfx/slide-up.m4a"),
  "slide-down": require("../../../assets/sfx/slide-down.m4a"),
  tada: require("../../../assets/sfx/tada.m4a"),
  drumroll: require("../../../assets/sfx/drumroll.m4a"),
  boop: require("../../../assets/sfx/boop.m4a"),
  zip: require("../../../assets/sfx/zip.m4a"),
  harp: require("../../../assets/sfx/harp.m4a"),
  tick: require("../../../assets/sfx/tick.m4a"),
  ding: require("../../../assets/sfx/ding.m4a"),
  "heart-blip": require("../../../assets/sfx/heart-blip.m4a"),
  sleepy: require("../../../assets/sfx/sleepy.m4a"),
  // CC0 sounds from freesound.org for the moment samples (app/assets/sfx/lab/CREDITS.json)
  "lab-clock-tick-1": require("../../../assets/sfx/lab/clock-tick-1.m4a"),
  "lab-clock-tick-2": require("../../../assets/sfx/lab/clock-tick-2.m4a"),
  "lab-clock-wind-1": require("../../../assets/sfx/lab/clock-wind-1.m4a"),
  "lab-clock-wind-2": require("../../../assets/sfx/lab/clock-wind-2.m4a"),
  "lab-confetti-pop-1": require("../../../assets/sfx/lab/confetti-pop-1.m4a"),
  "lab-confetti-pop-2": require("../../../assets/sfx/lab/confetti-pop-2.m4a"),
  "lab-ff-zip-1": require("../../../assets/sfx/lab/ff-zip-1.m4a"),
  "lab-ff-zip-2": require("../../../assets/sfx/lab/ff-zip-2.m4a"),
  "lab-fire-whoosh-1": require("../../../assets/sfx/lab/fire-whoosh-1.m4a"),
  "lab-fire-whoosh-2": require("../../../assets/sfx/lab/fire-whoosh-2.m4a"),
  "lab-grip-pat-1": require("../../../assets/sfx/lab/grip-pat-1.m4a"),
  "lab-grip-pat-2": require("../../../assets/sfx/lab/grip-pat-2.m4a"),
  "lab-kids-yay-1": require("../../../assets/sfx/lab/kids-yay-1.m4a"),
  "lab-kids-yay-2": require("../../../assets/sfx/lab/kids-yay-2.m4a"),
  "lab-medal-ding-1": require("../../../assets/sfx/lab/medal-ding-1.m4a"),
  "lab-medal-ding-2": require("../../../assets/sfx/lab/medal-ding-2.m4a"),
  "lab-music-box-1": require("../../../assets/sfx/lab/music-box-1.m4a"),
  "lab-music-box-2": require("../../../assets/sfx/lab/music-box-2.m4a"),
  "lab-page-flip-1": require("../../../assets/sfx/lab/page-flip-1.m4a"),
  "lab-page-flip-2": require("../../../assets/sfx/lab/page-flip-2.m4a"),
  "lab-party-horn-1": require("../../../assets/sfx/lab/party-horn-1.m4a"),
  "lab-party-horn-2": require("../../../assets/sfx/lab/party-horn-2.m4a"),
  "lab-pencil-check-1": require("../../../assets/sfx/lab/pencil-check-1.m4a"),
  "lab-pencil-check-2": require("../../../assets/sfx/lab/pencil-check-2.m4a"),
  "lab-yawn-cartoon-1": require("../../../assets/sfx/lab/yawn-cartoon-1.m4a"),
  "lab-yawn-cartoon-2": require("../../../assets/sfx/lab/yawn-cartoon-2.m4a"),
} as const;
export type SfxName = keyof typeof SFX;
export const SFX_NAMES = Object.keys(SFX) as SfxName[];

const cache: Partial<Record<SfxName, Audio.Sound>> = {};
/** The last thing that went wrong with a sound (shown in the FX lab; a failed sound never breaks a moment). */
export const sfxStatus = { last: "", played: 0 };
let modeSet = false;

/** Where a sound loads from. Android release: the file is packed in the app's raw resources and expo-asset fails to "download"
 *  it ("Unable to download asset from url", every sound silent), so the player reads the resource directly. Elsewhere (dev
 *  server, iOS, web): the bundled module as before. */
function source(n: SfxName): any {
  // the packer names each file after its path: app/assets/sfx/chime-up.m4a -> raw resource "app_assets_sfx_chimeup"
  // (a lab sound in app/assets/sfx/lab/ff-zip-2.m4a -> "app_assets_sfx_lab_ffzip2")
  const raw = n.startsWith("lab-") ? `lab_${n.slice(4).replace(/[^a-z0-9]/g, "")}` : n.replace(/[^a-z0-9]/g, "");
  if (Platform.OS === "android" && !__DEV__) return { uri: `android.resource://${Application.applicationId ?? "com.speechworks.app"}/raw/app_assets_sfx_${raw}` };
  return SFX[n];
}

/** Load some sounds ahead of time (a screen that will celebrate calls this when it opens). */
export async function preloadSfx(names: SfxName[]) {
  if (!modeSet) { modeSet = true; try { await Audio.setAudioModeAsync({ playsInSilentModeIOS: false, staysActiveInBackground: false }); } catch (e: any) { sfxStatus.last = `mode: ${e?.message ?? e}`; } }
  await Promise.all(names.map(async n => {
    if (cache[n]) return;
    try { const { sound } = await Audio.Sound.createAsync(source(n), { shouldPlay: false }); cache[n] = sound; } catch (e: any) { sfxStatus.last = `load ${n}: ${e?.message ?? e}`; /* a missing sound never breaks a moment */ }
  }));
}

// DEV ONLY (web FX preview): lets the preview page play a candidate sound in place of ours, so a sound is judged with its effect
let override: ((name: string, volume: number) => boolean) | null = null;
export function setSfxOverride(fn: ((name: string, volume: number) => boolean) | null) { override = fn; }

/** Play one sound now. volume 0..1. */
export async function playSfx(name: string, volume = 0.8) {
  if (override && override(name, volume)) return;
  if (!(name in SFX)) return;
  const n = name as SfxName;
  try {
    if (!cache[n]) await preloadSfx([n]);
    const s = cache[n]; if (!s) return;
    await s.setVolumeAsync(volume);
    await s.replayAsync();
    sfxStatus.played++;
  } catch (e: any) { sfxStatus.last = `play ${n}: ${e?.message ?? e}`; }
}
