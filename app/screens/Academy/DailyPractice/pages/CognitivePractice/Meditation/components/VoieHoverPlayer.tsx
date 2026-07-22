import { Audio } from "expo-av";
import { useEffect, useRef } from "react";

interface HoverSoundProps {
  voiceHoverUrl?: string;
  mute: boolean;
  hoverVolume: number;
  isPlaying: boolean; // NEW PROP: Controls if the exercise is active and audio should play

  // NEW: how much to slow/fast, as a percentage between −50 and +50
  playbackRatePercent: number;
}

export default function VoiceHoverPlayer({
  voiceHoverUrl,
  mute,
  hoverVolume,
  isPlaying, // Destructure the new prop
  playbackRatePercent,
}: HoverSoundProps) {
  const voiceSound = useRef<Audio.Sound | null>(null);

  // Helper: clamp percent → rate
  const computeRate = (percent: number) => {
    const clamped = Math.max(-50, Math.min(50, percent));
    return 1 + clamped / 100; // -50 → 0.5, 0 → 1.0, +50 → 1.5
  };

  // Whenever voiceHoverUrl (the MP3 link) changes:
  useEffect(() => {
    if (!voiceHoverUrl) return;

    let isCancelled = false;

    (async () => {
      try {
        // Ensure playback even if iOS is in Silent mode:
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: false,
          playThroughEarpieceAndroid: false,
        });
      } catch (e) {
        console.warn("Audio.setAudioModeAsync error:", e);
      }

      try {
        // 1) Stop & unload any previously loaded hover Sound
        if (voiceSound.current) {
          await voiceSound.current.stopAsync().catch(() => {});
          await voiceSound.current.unloadAsync().catch(() => {});
          voiceSound.current = null;
        }

        // 2) Load the new hover Sound. shouldPlay will now be determined by `isPlaying` as well.
        const { sound } = await Audio.Sound.createAsync(
          { uri: voiceHoverUrl },
          {
            shouldPlay: false, // Initially set to false, control with `isPlaying`
            isLooping: false,
            volume: hoverVolume,
          }
        );

        // 3) Immediately set the playback rate on that sound:
        const initialRate = computeRate(playbackRatePercent);
        await sound.setRateAsync(initialRate, true);

        if (!isCancelled) {
          voiceSound.current = sound;
          // After loading, apply the `isPlaying` and `mute` logic
          if (isPlaying && !mute) {
            await sound.playAsync().catch(() => {});
          }
        } else {
          // If unmounted in the meantime, unload right away
          await sound.unloadAsync();
        }
      } catch (error) {
        console.warn("Failed to load/play hover sound:", error);
      }
    })();

    return () => {
      isCancelled = true;
      (async () => {
        if (voiceSound.current) {
          await voiceSound.current.stopAsync().catch(() => {});
          await voiceSound.current.unloadAsync().catch(() => {});
          voiceSound.current = null;
        }
      })();
    };
    // ONLY the url. `isPlaying` and `mute` were deps here, and this effect's
    // cleanup unloads the sound — so every mute toggle tore down the narration
    // and re-downloaded the MP3, restarting a guided meditation from the first
    // line while the on-screen timer read 2:00. On a weak connection it was a
    // multi-second silence, or a failed reload and no narration at all for the
    // rest of the session. Play/pause is the next effect's job; this one owns
    // the sound's lifetime, and its lifetime depends only on which file it is.
  }, [voiceHoverUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // When `mute` or `isPlaying` changes, pause or resume the hover sound
  useEffect(() => {
    if (!voiceSound.current) return;
    if (mute || !isPlaying) {
      // pauseAsync, NOT stopAsync: expo-av's stopAsync rewinds to 0:00, so
      // unmuting replayed the meditation from the beginning even when the
      // sound had not been unloaded. Pausing keeps the playhead.
      voiceSound.current.pauseAsync().catch(() => {});
    } else {
      voiceSound.current.playAsync().catch(() => {});
    }
  }, [mute, isPlaying]); // Depend on both mute and isPlaying

  // When `hoverVolume` changes, update the playing sound’s volume
  useEffect(() => {
    (async () => {
      if (voiceSound.current) {
        try {
          await voiceSound.current.setVolumeAsync(hoverVolume);
        } catch {
          // ignore if not ready
        }
      }
    })();
  }, [hoverVolume]);

  // NEW: When playbackRatePercent changes, update the sound’s rate
  useEffect(() => {
    (async () => {
      if (voiceSound.current) {
        const newRate = computeRate(playbackRatePercent);
        try {
          await voiceSound.current.setRateAsync(newRate, true);
        } catch {
          // ignore if not ready
        }
      }
    })();
  }, [playbackRatePercent]);

  return null;
}
