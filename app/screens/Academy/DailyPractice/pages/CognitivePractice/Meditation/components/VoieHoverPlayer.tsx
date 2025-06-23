import React, { useEffect, useRef } from "react";
import { Audio } from "expo-av";

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
  }, [voiceHoverUrl, isPlaying, mute]); // Add isPlaying and mute to dependencies

  // When `mute` or `isPlaying` changes, stop or play the hover sound
  useEffect(() => {
    if (!voiceSound.current) return;
    if (mute || !isPlaying) {
      // If muted OR not playing, stop the sound
      voiceSound.current.stopAsync().catch(() => {});
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
