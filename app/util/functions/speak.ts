import { useVoicePreferenceStore } from "../../stores/voicePreference";
import {
  getAccentGroups,
  resolveVoiceForPreference,
  speakWithProfile,
  stopSpeaking,
} from "../voice";

/**
 * Speaks the given text using the user's chosen accent (the app-wide Voice
 * Hover preference), resolved against the voices actually installed on this
 * device. Falls back gracefully — a natural voice in another accent, then the
 * engine default — so it never dead-ends or stays silent.
 *
 * Voice selection lives in one place now (app/util/voice); this wrapper just
 * reads the saved preference imperatively (no React context needed) so any
 * caller — including non-component code like the Library technique demos —
 * inherits the same voice.
 *
 * @param text The text string to be spoken.
 * @returns A Promise that resolves when speech is done or rejects on error.
 */
export async function speakText(text: string): Promise<void> {
  try {
    const [groups, preference] = [
      await getAccentGroups(),
      useVoicePreferenceStore.getState().preference,
    ];
    const { voice } = resolveVoiceForPreference(preference, groups);

    return await new Promise<void>((resolve, reject) => {
      speakWithProfile(text, {
        voice,
        language: preference?.accent,
        rate: 1.0,
        onDone: () => resolve(),
        onError: (e) => {
          console.error("Speech error:", e);
          reject(e);
        },
      });
    });
  } catch (err) {
    console.warn("Failed to load voices or speak:", err);
    return Promise.reject(err);
  }
}

/** Stop any in-progress speech started via speakText. */
export function stopSpeakText(): void {
  stopSpeaking();
}
