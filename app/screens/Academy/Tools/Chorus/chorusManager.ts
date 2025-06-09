// chorusManager.ts
import * as Speech from "expo-speech";
import { Platform } from "react-native";

type ChorusOptions = {
  text: string;
  /**
   * Array of TTS voice IDs you want to use (length ≥ 1).
   * If some IDs aren’t available on device, we use fallback voices.
   */
  voiceIdentifiers?: string[];
  /** Delay between each utterance, in ms (e.g. 40–60). */
  delayMs?: number;
  /** Speaking rate (1.0 = normal). */
  rate?: number;
};

export class ChorusManager {
  private timeouts: NodeJS.Timeout[] = [];
  private isPlaying = false;
  private defaultDelay: number;
  private isAndroid: boolean;

  constructor() {
    this.isAndroid = Platform.OS === "android";
    this.defaultDelay = 50;
  }

  /**
   * Play a “chorus” by firing off multiple Speech.speak() calls,
   * each using a different voice identifier for timbral separation.
   */
  public async play({
    text,
    voiceIdentifiers = [],
    delayMs = this.defaultDelay,
    rate = 1.0,
  }: ChorusOptions) {
    if (!text.trim()) return;

    // If already playing, stop first
    if (this.isPlaying) {
      this.stop();
    }
    this.isPlaying = true;
    this.timeouts = [];

    // 1) Query the device for available voices:
    let available: any[] = [];
    try {
      available = await Speech.getAvailableVoicesAsync();
    } catch (err) {
      console.warn("Could not load available voices:", err);
    }

    // 2) Build a map of identifier → voice object
    const installedMap = new Map<string, any>();
    for (const v of available) {
      if (v.identifier && typeof v.identifier === "string") {
        installedMap.set(v.identifier, v);
      }
    }

    // 3) Filter the desired voice IDs against what’s actually installed:
    const desired = voiceIdentifiers.filter((id) => installedMap.has(id));

    // 4) Pick up to 2 voices on Android, or up to 3 on iOS
    let chosenVoices: string[] = [];
    if (this.isAndroid) {
      chosenVoices = desired.slice(0, 2);
    } else {
      chosenVoices = desired.slice(0, 3);
    }

    // 5) If no desired voices are installed, fall back to the first few available
    if (chosenVoices.length === 0) {
      const fallbackCount = this.isAndroid ? 2 : 3;
      const fallback: string[] = [];
      for (
        let i = 0;
        i < available.length && fallback.length < fallbackCount;
        i++
      ) {
        if (available[i].identifier) {
          fallback.push(available[i].identifier);
        }
      }
      chosenVoices = fallback;
    }

    // 6) If only one voice remains, speak normally (no chorus)
    if (chosenVoices.length === 1) {
      Speech.speak(text, { voice: chosenVoices[0], rate });
      return;
    }

    // 7) Schedule each utterance with cascading delays
    const baseDelay = this.isAndroid ? Math.max(delayMs, 80) : delayMs;
    for (let idx = 0; idx < chosenVoices.length; idx++) {
      const voiceId = chosenVoices[idx];
      const msDelay = baseDelay * idx;
      const to = setTimeout(() => {
        if (!this.isPlaying) return;
        Speech.speak(text, { voice: voiceId, rate });
      }, msDelay);
      this.timeouts.push(to);
    }

    // 8) Safety timeout: if after ~ maxDelay the speech is still queued,
    //    assume it queued instead of overlapped, then stop all and play a single voice.
    const maxDelay = baseDelay * (chosenVoices.length - 1) + 300;
    const safetyTo = setTimeout(() => {
      if (!this.isPlaying) return;
      this.stop();
      // Play just the first voice so it doesn’t read all in series
      Speech.speak(text, {
        voice: chosenVoices[0],
        rate,
      });
    }, maxDelay);
    this.timeouts.push(safetyTo);
  }

  /**
   * Stop any scheduled or in-progress utterances immediately.
   */
  public stop() {
    this.timeouts.forEach((t) => clearTimeout(t));
    this.timeouts = [];
    Speech.stop();
    this.isPlaying = false;
  }
}
