import * as Speech from "expo-speech";
import { Platform } from "react-native";

/**
 * Speaks the given text using an available English voice,
 * prioritizing enhanced/premium voices on iOS and female voices on Android.
 *
 * @param text The text string to be spoken.
 * @returns A Promise that resolves when the speech is done or rejects on error.
 */
export async function speakText(text: string): Promise<void> {
  let voiceId: string | undefined = undefined;

  try {
    const allVoices = await Speech.getAvailableVoicesAsync();

    if (Platform.OS === "ios") {
      voiceId = allVoices.find(
        (v) =>
          v.language?.startsWith("en") &&
          v.name?.toLowerCase().includes("enhanced") &&
          v.identifier
      )?.identifier;
      if (!voiceId) {
        voiceId = allVoices.find(
          (v) =>
            v.language?.startsWith("en") &&
            v.name?.toLowerCase().includes("premium") &&
            v.identifier
        )?.identifier;
      }
    }
    if (!voiceId && Platform.OS === "android") {
      voiceId = allVoices.find(
        (v) =>
          v.language === "en-US" &&
          v.name?.toLowerCase().includes("female") &&
          v.identifier
      )?.identifier;
      if (!voiceId) {
        voiceId = allVoices.find(
          (v) => v.language === "en-US" && v.identifier
        )?.identifier;
      }
    }
    if (!voiceId) {
      // Fallback to any English voice if specific preferences aren't met
      voiceId = allVoices.find(
        (v) => v.language?.startsWith("en") && v.identifier
      )?.identifier;
    }

    if (!voiceId) {
      console.warn("No suitable English voice found for speech.");
      return Promise.reject("No suitable voice found.");
    }

    // You can customize rate and pitch if needed, but for a general function,
    // we'll use defaults or a slight random pitch variation for naturalness.
    const pitch = 1 + (Math.random() * 0.06 - 0.03);

    return new Promise<void>((resolve, reject) => {
      Speech.speak(text, {
        voice: voiceId,
        rate: 1.0, // Default rate
        pitch,
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
