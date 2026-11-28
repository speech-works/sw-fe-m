/**
 * Pip's sound effects: short, quirky ones synthesised from scratch (scripts/sfx/make_sfx.py), and the moments' CC0 sounds
 * (assets/sfx/moments, keys "fx-..."; the lab's other candidates: assets/sfx/lab, keys "lab-...").
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
  // the app's moment sounds (CC0, freesound.org: app/assets/sfx/moments/CREDITS.json)
  "fx-a2-bird-tweet-1": require("../../../assets/sfx/moments/a2-bird-tweet-1.m4a"),
  "fx-a2-bird-tweet-2": require("../../../assets/sfx/moments/a2-bird-tweet-2.m4a"),
  "fx-a2-marimba-climb-1": require("../../../assets/sfx/moments/a2-marimba-climb-1.m4a"),
  "fx-a2-marimba-wave-1": require("../../../assets/sfx/moments/a2-marimba-wave-1.m4a"),
  "fx-a2-mic-tap-1": require("../../../assets/sfx/moments/a2-mic-tap-1.m4a"),
  "fx-a2-plug-in-1": require("../../../assets/sfx/moments/a2-plug-in-1.m4a"),
  "fx-b2-door-bell-1": require("../../../assets/sfx/moments/b2-door-bell-1.m4a"),
  "fx-b2-hand-bell-1": require("../../../assets/sfx/moments/b2-hand-bell-1.m4a"),
  "fx-b2-hello-notes-1": require("../../../assets/sfx/moments/b2-hello-notes-1.m4a"),
  "fx-book-close-2": require("../../../assets/sfx/moments/book-close-2.m4a"),
  "fx-cannon-confetti-1": require("../../../assets/sfx/moments/cannon-confetti-1.m4a"),
  "fx-cannon-confetti-2": require("../../../assets/sfx/moments/cannon-confetti-2.m4a"),
  "fx-cartoon-boing-2": require("../../../assets/sfx/moments/cartoon-boing-2.m4a"),
  "fx-cheer-short-1": require("../../../assets/sfx/moments/cheer-short-1.m4a"),
  "fx-cheer-short-2": require("../../../assets/sfx/moments/cheer-short-2.m4a"),
  "fx-envelope-tuck-2": require("../../../assets/sfx/moments/envelope-tuck-2.m4a"),
  "fx-ff-zip-1": require("../../../assets/sfx/moments/ff-zip-1.m4a"),
  "fx-ff-zip-2": require("../../../assets/sfx/moments/ff-zip-2.m4a"),
  "fx-fire-whoosh-1": require("../../../assets/sfx/moments/fire-whoosh-1.m4a"),
  "fx-firework-launch-1": require("../../../assets/sfx/moments/firework-launch-1.m4a"),
  "fx-firework-pop-1": require("../../../assets/sfx/moments/firework-pop-1.m4a"),
  "fx-firework-pop-2": require("../../../assets/sfx/moments/firework-pop-2.m4a"),
  "fx-grip-pat-2": require("../../../assets/sfx/moments/grip-pat-2.m4a"),
  "fx-harp-gliss-1": require("../../../assets/sfx/moments/harp-gliss-1.m4a"),
  "fx-hop-boing-small-1": require("../../../assets/sfx/moments/hop-boing-small-1.m4a"),
  "fx-hop-boing-small-2": require("../../../assets/sfx/moments/hop-boing-small-2.m4a"),
  "fx-kalimba-warm-1": require("../../../assets/sfx/moments/kalimba-warm-1.m4a"),
  "fx-lock-click-1": require("../../../assets/sfx/moments/lock-click-1.m4a"),
  "fx-lock-click-2": require("../../../assets/sfx/moments/lock-click-2.m4a"),
  "fx-magic-shimmer-1": require("../../../assets/sfx/moments/magic-shimmer-1.m4a"),
  "fx-medal-ding-1": require("../../../assets/sfx/moments/medal-ding-1.m4a"),
  "fx-page-flip-1": require("../../../assets/sfx/moments/page-flip-1.m4a"),
  "fx-page-flip-2": require("../../../assets/sfx/moments/page-flip-2.m4a"),
  "fx-pencil-check-1": require("../../../assets/sfx/moments/pencil-check-1.m4a"),
  "fx-rubber-stamp-1": require("../../../assets/sfx/moments/rubber-stamp-1.m4a"),
  "fx-save-confirm-1": require("../../../assets/sfx/moments/save-confirm-1.m4a"),
  "fx-save-confirm-2": require("../../../assets/sfx/moments/save-confirm-2.m4a"),
  "fx-stars-twinkle-1": require("../../../assets/sfx/moments/stars-twinkle-1.m4a"),
  "fx-success-fanfare-1": require("../../../assets/sfx/moments/success-fanfare-1.m4a"),
  "fx-swoosh-soft-1": require("../../../assets/sfx/moments/swoosh-soft-1.m4a"),
  "fx-swoosh-soft-2": require("../../../assets/sfx/moments/swoosh-soft-2.m4a"),
  "fx-ding-soft": require("../../../assets/sfx/moments/ding-soft.m4a"),
  "fx-boop-soft": require("../../../assets/sfx/moments/boop-soft.m4a"),
  "fx-chime-start": require("../../../assets/sfx/moments/chime-start.m4a"),
  // CC0 sounds from freesound.org for the moment samples (app/assets/sfx/lab/CREDITS.json)
  "lab-a2-bounce-settle-1": require("../../../assets/sfx/lab/a2-bounce-settle-1.m4a"),
  "lab-a2-cartoon-shake-1": require("../../../assets/sfx/lab/a2-cartoon-shake-1.m4a"),
  "lab-a2-choir-1": require("../../../assets/sfx/lab/a2-choir-1.m4a"),
  "lab-a2-desk-bell-1": require("../../../assets/sfx/lab/a2-desk-bell-1.m4a"),
  "lab-a2-door-creak-1": require("../../../assets/sfx/lab/a2-door-creak-1.m4a"),
  "lab-a2-marimba-note-1": require("../../../assets/sfx/lab/a2-marimba-note-1.m4a"),
  "lab-a2-phone-hangup-1": require("../../../assets/sfx/lab/a2-phone-hangup-1.m4a"),
  "lab-a2-snore-1": require("../../../assets/sfx/lab/a2-snore-1.m4a"),
  "lab-a2-spoon-clink-1": require("../../../assets/sfx/lab/a2-spoon-clink-1.m4a"),
  "lab-a2-squeak-1": require("../../../assets/sfx/lab/a2-squeak-1.m4a"),
  "lab-a2-switch-1": require("../../../assets/sfx/lab/a2-switch-1.m4a"),
  "lab-a2-toaster-pop-1": require("../../../assets/sfx/lab/a2-toaster-pop-1.m4a"),
  "lab-a2-twang-1": require("../../../assets/sfx/lab/a2-twang-1.m4a"),
  "lab-b2-bird-chirp-1": require("../../../assets/sfx/lab/b2-bird-chirp-1.m4a"),
  "lab-b2-bird-chirp-2": require("../../../assets/sfx/lab/b2-bird-chirp-2.m4a"),
  "lab-b2-cat-meow-1": require("../../../assets/sfx/lab/b2-cat-meow-1.m4a"),
  "lab-b2-cat-purr-1": require("../../../assets/sfx/lab/b2-cat-purr-1.m4a"),
  "lab-b2-chat-a-1": require("../../../assets/sfx/lab/b2-chat-a-1.m4a"),
  "lab-b2-chat-b-1": require("../../../assets/sfx/lab/b2-chat-b-1.m4a"),
  "lab-b2-phone-buzz-2": require("../../../assets/sfx/lab/b2-phone-buzz-2.m4a"),
  "lab-b2-rain-soft-1": require("../../../assets/sfx/lab/b2-rain-soft-1.m4a"),
  "lab-balloon-release-1": require("../../../assets/sfx/lab/balloon-release-1.m4a"),
  "lab-balloon-release-2": require("../../../assets/sfx/lab/balloon-release-2.m4a"),
  "lab-book-close-1": require("../../../assets/sfx/lab/book-close-1.m4a"),
  "lab-card-flick-1": require("../../../assets/sfx/lab/card-flick-1.m4a"),
  "lab-card-flick-2": require("../../../assets/sfx/lab/card-flick-2.m4a"),
  "lab-cartoon-boing-1": require("../../../assets/sfx/lab/cartoon-boing-1.m4a"),
  "lab-clock-tick-1": require("../../../assets/sfx/lab/clock-tick-1.m4a"),
  "lab-clock-tick-2": require("../../../assets/sfx/lab/clock-tick-2.m4a"),
  "lab-clock-wind-1": require("../../../assets/sfx/lab/clock-wind-1.m4a"),
  "lab-clock-wind-2": require("../../../assets/sfx/lab/clock-wind-2.m4a"),
  "lab-confetti-pop-1": require("../../../assets/sfx/lab/confetti-pop-1.m4a"),
  "lab-confetti-pop-2": require("../../../assets/sfx/lab/confetti-pop-2.m4a"),
  "lab-drawer-close-1": require("../../../assets/sfx/lab/drawer-close-1.m4a"),
  "lab-drawer-close-2": require("../../../assets/sfx/lab/drawer-close-2.m4a"),
  "lab-envelope-tuck-1": require("../../../assets/sfx/lab/envelope-tuck-1.m4a"),
  "lab-fire-whoosh-2": require("../../../assets/sfx/lab/fire-whoosh-2.m4a"),
  "lab-firework-launch-2": require("../../../assets/sfx/lab/firework-launch-2.m4a"),
  "lab-frog-ribbit-cartoon-1": require("../../../assets/sfx/lab/frog-ribbit-cartoon-1.m4a"),
  "lab-frog-ribbit-cartoon-2": require("../../../assets/sfx/lab/frog-ribbit-cartoon-2.m4a"),
  "lab-grip-pat-1": require("../../../assets/sfx/lab/grip-pat-1.m4a"),
  "lab-harp-gliss-2": require("../../../assets/sfx/lab/harp-gliss-2.m4a"),
  "lab-kalimba-warm-2": require("../../../assets/sfx/lab/kalimba-warm-2.m4a"),
  "lab-kids-yay-1": require("../../../assets/sfx/lab/kids-yay-1.m4a"),
  "lab-kids-yay-2": require("../../../assets/sfx/lab/kids-yay-2.m4a"),
  "lab-magic-shimmer-2": require("../../../assets/sfx/lab/magic-shimmer-2.m4a"),
  "lab-medal-ding-2": require("../../../assets/sfx/lab/medal-ding-2.m4a"),
  "lab-music-box-1": require("../../../assets/sfx/lab/music-box-1.m4a"),
  "lab-music-box-2": require("../../../assets/sfx/lab/music-box-2.m4a"),
  "lab-party-horn-1": require("../../../assets/sfx/lab/party-horn-1.m4a"),
  "lab-party-horn-2": require("../../../assets/sfx/lab/party-horn-2.m4a"),
  "lab-pen-click-1": require("../../../assets/sfx/lab/pen-click-1.m4a"),
  "lab-pen-click-2": require("../../../assets/sfx/lab/pen-click-2.m4a"),
  "lab-pencil-check-2": require("../../../assets/sfx/lab/pencil-check-2.m4a"),
  "lab-plop-small-1": require("../../../assets/sfx/lab/plop-small-1.m4a"),
  "lab-plop-small-2": require("../../../assets/sfx/lab/plop-small-2.m4a"),
  "lab-rubber-stamp-2": require("../../../assets/sfx/lab/rubber-stamp-2.m4a"),
  "lab-soft-bell-1": require("../../../assets/sfx/lab/soft-bell-1.m4a"),
  "lab-soft-bell-2": require("../../../assets/sfx/lab/soft-bell-2.m4a"),
  "lab-sparkler-1": require("../../../assets/sfx/lab/sparkler-1.m4a"),
  "lab-sparkler-2": require("../../../assets/sfx/lab/sparkler-2.m4a"),
  "lab-splash-tiny-1": require("../../../assets/sfx/lab/splash-tiny-1.m4a"),
  "lab-splash-tiny-2": require("../../../assets/sfx/lab/splash-tiny-2.m4a"),
  "lab-stars-twinkle-2": require("../../../assets/sfx/lab/stars-twinkle-2.m4a"),
  "lab-stone-skip-clean-1": require("../../../assets/sfx/lab/stone-skip-clean-1.m4a"),
  "lab-stone-skip-clean-2": require("../../../assets/sfx/lab/stone-skip-clean-2.m4a"),
  "lab-success-fanfare-2": require("../../../assets/sfx/lab/success-fanfare-2.m4a"),
  "lab-water-skip-1": require("../../../assets/sfx/lab/water-skip-1.m4a"),
  "lab-water-skip-2": require("../../../assets/sfx/lab/water-skip-2.m4a"),
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
  // (a moment sound in app/assets/sfx/moments/ff-zip-2.m4a, key "fx-ff-zip-2" -> "app_assets_sfx_moments_ffzip2")
  const raw = n.startsWith("lab-") ? `lab_${n.slice(4).replace(/[^a-z0-9]/g, "")}`
    : n.startsWith("fx-") ? `moments_${n.slice(3).replace(/[^a-z0-9]/g, "")}` : n.replace(/[^a-z0-9]/g, "");
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
