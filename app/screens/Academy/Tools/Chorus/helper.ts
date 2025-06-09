import * as Speech from "expo-speech";
import { Platform } from "react-native";

type ChorusOptions = {
  text: string;
  /**
   * Base pitch multiplier (1.0 = default voice pitch).
   */
  basePitch?: number;
  /**
   * How far above/below basePitch for the “outer” voices.
   * Even 0.03–0.07 can be enough to perceive separation.
   */
  pitchDelta?: number;
  /**
   * Delay between each utterance, in milliseconds.
   * Smaller delays (~30–70ms) tend to give more overlap, but behavior varies by device.
   */
  delayMs?: number;
  /**
   * Speaking rate for all voices. 1.0 is normal.
   * You could also tweak each voice’s rate separately if desired.
   */
  rate?: number;
};

export async function speakChorusFrontEnd({
  text,
  basePitch = 1.0,
  pitchDelta = 0.05,
  delayMs = 60,
  rate = 1.0,
}: ChorusOptions) {
  // 1) Sanity check:
  if (!text || text.trim().length === 0) {
    return;
  }

  // 2) Define three pitch values for [higher, normal, lower]:
  const pitches = [
    basePitch + pitchDelta, // e.g. 1.05
    basePitch, // e.g. 1.0
    basePitch - pitchDelta, // e.g. 0.95
  ];

  // 3) Platform-specific fallback: On many Android devices, overlapping isn't supported—
  //    instead, the utterances queue. To reduce that “queued” feel, we can:
  //      a) Reduce to two voices instead of three (so queueing is shorter), or
  //      b) Use a bigger delay so at least they’re less obviously queued.
  //
  //    Feel free to tweak this logic based on your own testing:
  //
  const isAndroid = Platform.OS === "android";
  let actualPitches = pitches;
  let actualDelay = delayMs;

  if (isAndroid) {
    // Option A: reduce to two voices for Android:
    actualPitches = [basePitch + pitchDelta, basePitch - pitchDelta];
    // Optionally, you could increase delay to ~100ms:
    actualDelay = Math.max(delayMs, 80);
  }

  // 4) Fire off each TTS call with a tiny cascading delay:
  actualPitches.forEach((p, index) => {
    const speakParams: Speech.SpeechOptions = {
      pitch: p,
      rate,
      // You can optionally force a specific voice if installed, e.g.:
      // voice: Platform.OS === "ios" ? "com.apple.ttsbundle.Samantha-compact" : undefined
    };

    const thisDelay = actualDelay * index;
    setTimeout(() => {
      Speech.speak(text, speakParams);
    }, thisDelay);
  });
}
