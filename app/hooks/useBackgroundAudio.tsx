// hooks/useBackgroundAudio.ts
import { Audio } from "expo-av";
import { ensurePlaybackSession } from "../util/audio/playbackSession";
import { useCallback, useEffect, useRef } from "react";

type BackgroundAudioHook = {
  loadBackground: () => Promise<void>;
  toggleBackground: (enabled: boolean) => Promise<void>;
  stopBackground: () => Promise<void>;
};

/**
 * Custom hook to play a looping background track.
 * @param soundUri Optional URI of the sound file to play.
 *                Defaults to a provided MP3 if not specified.
 */
export function useBackgroundAudio(
  soundUri: string = "https://www.chosic.com/wp-content/uploads/2022/04/Arnor(chosic.com).mp3",
  volume: number = 0.2
): BackgroundAudioHook {
  const backgroundSound = useRef<Audio.Sound | null>(null);
  const isMounted = useRef(true);

  // Load the background track (looping)
  const loadBackground = useCallback(async () => {
    // Use the provided URI or fall back to default
    // NOT a new product decision. Meditation already plays in silent mode,
    // because its VoieHoverPlayer sets that on the shared session before this
    // bed starts. This only makes it explicit, and gives Breathing the same
    // behaviour instead of leaving it to whichever screen ran first.
    await ensurePlaybackSession();
    const { sound } = await Audio.Sound.createAsync(
      { uri: soundUri },
      { isLooping: true, volume: volume }
    );
    // If the screen unmounted while the track was loading, the unmount
    // cleanup already ran against a null ref — release this one directly.
    if (!isMounted.current) {
      sound.unloadAsync().catch(() => {});
      return;
    }
    if (backgroundSound.current && backgroundSound.current !== sound) {
      backgroundSound.current.unloadAsync().catch(() => {});
    }
    backgroundSound.current = sound;
  }, [soundUri]);

  // Start or stop looping based on `enabled`
  const toggleBackground = useCallback(async (enabled: boolean) => {
    const bg = backgroundSound.current;
    if (!bg || !isMounted.current) return;

    if (enabled) {
      try {
        // Reset position to the start for each play
        await bg.setPositionAsync(0);
        await bg.playAsync();
      } catch {
        // If unmounted mid‐toggle, ignore
      }
    } else {
      try {
        await bg.stopAsync();
      } catch {
        // ignore
      }
    }
  }, []);

  // Immediately stops and unloads on unmount
  const stopBackground = useCallback(async () => {
    try {
      await backgroundSound.current?.stopAsync();
    } catch {}
    try {
      await backgroundSound.current?.unloadAsync();
    } catch {}
  }, []);

  useEffect(() => {
    return () => {
      isMounted.current = false;
      stopBackground();
    };
  }, [stopBackground]);

  useEffect(() => {
    (async () => {
      if (backgroundSound.current) {
        try {
          await backgroundSound.current.setVolumeAsync(volume);
        } catch {
          // ignore if the sound isn't ready yet or is being unloaded
        }
      }
    })();
  }, [volume]);

  return { loadBackground, toggleBackground, stopBackground };
}
