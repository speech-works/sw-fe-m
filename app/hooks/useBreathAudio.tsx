import { Audio } from "expo-av";
import { useRef } from "react";

export function useBreathAudio() {
  const inhaleSound = useRef<Audio.Sound | null>(null);
  const exhaleSound = useRef<Audio.Sound | null>(null);

  const loadSounds = async () => {
    const [inhale, exhale] = await Promise.all([
      Audio.Sound.createAsync(require("../assets/inhale.mp3")),
      Audio.Sound.createAsync(require("../assets/exhale.mp3")),
    ]);
    inhaleSound.current = inhale.sound;
    exhaleSound.current = exhale.sound;
  };

  const playBreath = async (
    type: "inhale" | "exhale",
    targetDurationMs: number
  ) => {
    const sound = type === "inhale" ? inhaleSound.current : exhaleSound.current;
    if (!sound) return;

    const status = await sound.getStatusAsync();
    if (!status.isLoaded || !("durationMillis" in status)) return;

    const originalDuration = status.durationMillis || 1000;
    const playbackRate = originalDuration / targetDurationMs;

    await sound.setPositionAsync(0);
    await sound.setRateAsync(playbackRate, true); // true = correct pitch
    await sound.playAsync();
  };

  const stopAll = async () => {
    await inhaleSound.current?.stopAsync();
    await exhaleSound.current?.stopAsync();
  };

  return { loadSounds, playBreath, stopAll };
}
