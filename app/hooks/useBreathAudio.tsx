import { useRef, useEffect, useCallback } from "react";
import { Audio } from "expo-av";

type BreathAudioHook = {
  loadBreathSounds: () => Promise<void>;
  playBreath: (
    type: "inhale" | "exhale",
    targetDurationMs: number,
    isMutedGetter: () => boolean // MODIFIED: Added getter for mute state
  ) => Promise<void>;
  stopBreathSounds: () => Promise<void>;
};

export function useBreathAudio(): BreathAudioHook {
  const inhaleSound = useRef<Audio.Sound | null>(null);
  const exhaleSound = useRef<Audio.Sound | null>(null);
  const isMounted = useRef(true);

  const loadBreathSounds = useCallback(async () => {
    try {
      const [inhaleObj, exhaleObj] = await Promise.all([
        Audio.Sound.createAsync(require("../assets/inhale.mp3")),
        Audio.Sound.createAsync(require("../assets/exhale.mp3")),
      ]);
      if (isMounted.current) {
        inhaleSound.current = inhaleObj.sound;
        exhaleSound.current = exhaleObj.sound;
      } else {
        // If unmounted during load, unload immediately
        inhaleObj.sound?.unloadAsync().catch(() => {});
        exhaleObj.sound?.unloadAsync().catch(() => {});
      }
    } catch (error) {
      console.warn("[useBreathAudio] Error loading breath sounds:", error);
    }
  }, []);

  const playBreath = useCallback(
    async (
      type: "inhale" | "exhale",
      targetDurationMs: number,
      isMutedGetter: () => boolean // MODIFIED: Added getter for mute state
    ) => {
      const soundRef =
        type === "inhale" ? inhaleSound.current : exhaleSound.current;

      // Early exit if already muted or not ready
      if (!soundRef || !isMounted.current || isMutedGetter()) {
        return;
      }

      try {
        await soundRef.setPositionAsync(0);
        // Check mute state again after first await, as it might have changed
        if (!isMounted.current || isMutedGetter()) return;

        const status = await soundRef.getStatusAsync();
        if (!status.isLoaded) return; // Should be loaded if loadBreathSounds completed

        // Check mute state again
        if (!isMounted.current || isMutedGetter()) return;

        const originalDuration = status.durationMillis ?? 1000;
        // Ensure playbackRate is positive and reasonable
        const rate = originalDuration / targetDurationMs;
        const playbackRate = Math.max(0.1, Math.min(rate, 4.0)); // Clamp rate e.g. between 0.1x and 4x

        await soundRef.setRateAsync(playbackRate, true);

        // FINAL AND MOST CRITICAL CHECK: Check mute state right before playing
        if (!isMounted.current || isMutedGetter()) {
          return; // Do not play if muted now
        }

        await soundRef.playAsync();
      } catch (error) {
        // Catch errors, e.g., if sound is already playing or unmounted mid-operation
        // Don't log if it's just an unmount issue or if we were explicitly muted
        if (isMounted.current && !isMutedGetter()) {
          console.warn(`[useBreathAudio] Error playing ${type} sound:`, error);
        }
      }
    },
    [] // isMounted, inhaleSound, exhaleSound are refs, their .current access doesn't need to be in deps
  );

  const stopBreathSounds = useCallback(async () => {
    try {
      await inhaleSound.current?.stopAsync();
    } catch (error) {
      console.warn("[useBreathAudio] Error stopping inhale sound:", error);
    }
    try {
      await exhaleSound.current?.stopAsync();
    } catch (error) {
      console.warn("[useBreathAudio] Error stopping exhale sound:", error);
    }
  }, []);

  useEffect(() => {
    isMounted.current = true; // Set to true on mount
    return () => {
      isMounted.current = false;
      // Stop and unload sounds on unmount
      if (inhaleSound.current) {
        inhaleSound.current.stopAsync().catch(() => {}); // Stop before unload
        inhaleSound.current.unloadAsync().catch(() => {});
      }
      if (exhaleSound.current) {
        exhaleSound.current.stopAsync().catch(() => {}); // Stop before unload
        exhaleSound.current.unloadAsync().catch(() => {});
      }
    };
  }, []); // Removed stopBreathSounds from here as it's handled by the cleanup

  return { loadBreathSounds, playBreath, stopBreathSounds };
}
