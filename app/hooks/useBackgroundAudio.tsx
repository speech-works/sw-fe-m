// hooks/useBackgroundAudio.ts
import { useRef, useEffect, useCallback } from "react";
import { Audio } from "expo-av";

type BackgroundAudioHook = {
  loadBackground: () => Promise<void>;
  toggleBackground: (enabled: boolean) => Promise<void>;
  stopBackground: () => Promise<void>;
};

export function useBackgroundAudio(): BackgroundAudioHook {
  const backgroundSound = useRef<Audio.Sound | null>(null);
  const isMounted = useRef(true);

  // Load the background track (looping)
  const loadBackground = useCallback(async () => {
    const { sound } = await Audio.Sound.createAsync(
      {
        uri: "https://www.chosic.com/wp-content/uploads/2022/04/Arnor(chosic.com).mp3",
      },
      { isLooping: true, volume: 0.2 }
    );
    backgroundSound.current = sound;
  }, []);

  // Start or stop looping based on `enabled`
  const toggleBackground = useCallback(async (enabled: boolean) => {
    const bg = backgroundSound.current;
    if (!bg || !isMounted.current) return;

    if (enabled) {
      try {
        await bg.setPositionAsync(0);
        await bg.playAsync();
      } catch {
        // if unmounted mid‐toggle, ignore
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

  return { loadBackground, toggleBackground, stopBackground };
}
