import { Linking, Platform } from "react-native";

/**
 * Helpers to get a user to a better / missing voice, per platform.
 *
 * STORE COMPLIANCE (do not regress):
 *  - iOS: we ONLY use the public `Linking.openSettings()` (opens our app's
 *    Settings page). We must NEVER deep-link into Settings panes via private
 *    `prefs:root=` / `App-Prefs:` URL schemes — Apple rejects those under
 *    Guideline 2.5.1 (non-public API). There is no public API to land on the
 *    voices pane, so iOS relies on the guided walkthrough below.
 *  - Android: ACTION_INSTALL_TTS_DATA and TTS_SETTINGS are public, documented
 *    APIs reached via React Native's built-in Linking.sendIntent (no extra
 *    native dependency required).
 */

// Public Android intent actions (android.speech.tts.TextToSpeech.Engine).
const ACTION_INSTALL_TTS_DATA = "android.speech.tts.engine.INSTALL_TTS_DATA";
const ACTION_TTS_SETTINGS = "com.android.settings.TTS_SETTINGS";

/**
 * Android: fire the system "install voice data" flow (opens the engine's
 * voice-pack installer / Play Store). Returns true if an intent was launched.
 * Falls back to the TTS settings screen if the install intent isn't honoured.
 */
export async function launchAndroidVoiceInstall(): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  try {
    await Linking.sendIntent(ACTION_INSTALL_TTS_DATA);
    return true;
  } catch {
    try {
      await Linking.sendIntent(ACTION_TTS_SETTINGS);
      return true;
    } catch (e) {
      console.warn("[voiceInstall] Android TTS intents unavailable:", e);
      return false;
    }
  }
}

/**
 * iOS: open the app's Settings page via the public API. This does NOT land on
 * the voices pane (impossible without a private API) — the UI pairs this with
 * the guided steps below.
 */
export async function openIOSSettings(): Promise<void> {
  try {
    await Linking.openSettings();
  } catch (e) {
    console.warn("[voiceInstall] openSettings failed:", e);
  }
}

/**
 * The exact manual path for downloading a natural voice on iOS, shown in the
 * guided walkthrough sheet. (iOS 16+: Accessibility → Spoken Content → Voices.)
 */
export const IOS_VOICE_DOWNLOAD_STEPS: readonly string[] = [
  "Open the Settings app",
  "Tap Accessibility",
  "Tap Spoken Content, then Voices",
  "Tap English and choose your accent",
  "Tap the accent to download the natural voice",
  "Come back here and select it",
];
