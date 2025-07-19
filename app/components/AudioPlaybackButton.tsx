// AudioPlaybackButton.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import { Audio, AVPlaybackStatus } from "expo-av";

interface AudioPlaybackButtonProps {
  audioUrl: string | null | undefined;
  iconSize?: number;
  activeColor?: string;
  style?: StyleProp<ViewStyle>;
}

const AudioPlaybackButton: React.FC<AudioPlaybackButtonProps> = ({
  audioUrl,
  iconSize = 16,
  activeColor = "#007AFF",
  style,
}) => {
  const soundInstanceRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const isMountedRef = useRef(true); // To prevent state updates on unmounted component

  useEffect(() => {
    isMountedRef.current = true;
    // Cleanup on component unmount
    return () => {
      isMountedRef.current = false;
      if (soundInstanceRef.current) {
        // console.log('Unloading sound on component unmount');
        soundInstanceRef.current
          .unloadAsync()
          .catch((e) => console.error("Error unloading sound on unmount:", e));
        soundInstanceRef.current = null;
      }
    };
  }, []);

  // Effect to handle audioUrl changes
  useEffect(() => {
    // If a sound is currently loaded (from a previous URL), unload it.
    if (soundInstanceRef.current) {
      // console.log('audioUrl changed, unloading previous sound');
      soundInstanceRef.current
        .unloadAsync()
        .catch((e) => console.error("Error unloading sound on URL change:", e));
      soundInstanceRef.current = null;
    }
    // Reset playback states as the audio source has changed
    if (isMountedRef.current) {
      setIsPlaying(false);
      setIsLoading(false);
      setIsBuffering(false);
    }
    // The next call to handlePlayPause will then load the new audioUrl.
  }, [audioUrl]);

  const onPlaybackStatusUpdate = async (status: AVPlaybackStatus) => {
    if (!isMountedRef.current || !soundInstanceRef.current) {
      // If the sound was unloaded (e.g. due to URL change or error), status updates might still come.
      // Or if component unmounted.
      return;
    }

    if (status.isLoaded) {
      setIsPlaying(status.isPlaying);
      setIsBuffering(status.isBuffering);

      if (status.didJustFinish && !status.isLooping) {
        // console.log('Audio finished playing.');
        setIsPlaying(false); // Mark as not playing
        // Crucial: Stop the sound. This also resets its position to 0,
        // preparing it to be played again from the start.
        try {
          await soundInstanceRef.current.stopAsync();
          // console.log('Sound stopped and reset after finishing.');
        } catch (error) {
          console.error("Error stopping sound after finish:", error);
        }
      }
    } else {
      // Sound is not loaded, possibly due to an error or unload
      setIsPlaying(false);
      setIsBuffering(false);
      if (status.error) {
        console.error(`Playback Status Error: ${status.error}`);
        Alert.alert(
          "Audio Error",
          `An error occurred during playback: ${status.error}`
        );
        // Unload the problematic sound instance and nullify the ref
        if (soundInstanceRef.current) {
          try {
            await soundInstanceRef.current.unloadAsync();
          } catch (unloadError) {
            console.error("Error during emergency unload:", unloadError);
          }
          soundInstanceRef.current = null;
        }
      }
    }
  };

  const handlePlayPause = async () => {
    if (!audioUrl) {
      Alert.alert("Audio Error", "No audio URL provided.");
      return;
    }

    if (soundInstanceRef.current) {
      // Sound instance exists
      try {
        const status = await soundInstanceRef.current.getStatusAsync();
        if (status.isLoaded) {
          if (isPlaying) {
            // If currently playing, pause it
            // console.log('Pausing sound.');
            await soundInstanceRef.current.pauseAsync();
          } else {
            // If not playing (it's paused or was stopped after finishing)
            // console.log('Playing sound (resume or from start).');
            await soundInstanceRef.current.playAsync(); // Should start from beginning if stopped, or resume if paused.
          }
        } else {
          // Sound object exists but is not loaded (e.g., unloaded due to error)
          // This case should ideally be handled by falling through to load new sound
          // console.warn('Sound instance exists but is not loaded. Will attempt to reload.');
          soundInstanceRef.current = null; // Force re-creation by clearing the ref
        }
      } catch (error) {
        console.error("Error controlling playback:", error);
        Alert.alert("Error", "Could not control audio playback.");
        // Attempt to clean up on error
        if (soundInstanceRef.current) {
          try {
            await soundInstanceRef.current.unloadAsync();
          } catch (e) {}
          soundInstanceRef.current = null;
        }
        if (isMountedRef.current) {
          setIsPlaying(false);
          setIsLoading(false);
          setIsBuffering(false);
        }
      }
    }

    // If soundInstanceRef.current is null (either initially, or cleared above due to error/not loaded state)
    if (!soundInstanceRef.current) {
      if (!isMountedRef.current) return;

      // console.log('Loading new sound for URL:', audioUrl);
      setIsLoading(true);
      setIsBuffering(false);

      try {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: audioUrl },
          { shouldPlay: true }, // Attempt to play immediately after loading
          onPlaybackStatusUpdate // Register status callback for ongoing updates
        );

        if (isMountedRef.current) {
          soundInstanceRef.current = newSound;
          // isPlaying and other states will be updated by onPlaybackStatusUpdate.
          // Loading is complete once createAsync resolves.
          setIsLoading(false);
        } else {
          // console.log('Component unmounted during sound load. Unloading new sound.');
          newSound
            .unloadAsync()
            .catch((e) =>
              console.error("Error unloading new sound on unmount:", e)
            );
        }
      } catch (error) {
        console.error("Failed to load sound:", error);
        let errorMessage = "Unknown error";
        if (error && typeof error === "object" && "message" in error) {
          errorMessage = (error as { message: string }).message;
        } else if (typeof error === "string") {
          errorMessage = error;
        }
        Alert.alert("Error", `Could not load audio: ${errorMessage}`);
        if (isMountedRef.current) {
          soundInstanceRef.current = null; // Ensure ref is null on loading error
          setIsLoading(false);
          setIsPlaying(false);
          setIsBuffering(false);
        }
      }
    }
  };

  let iconName = "play-circle";
  if (isLoading || isBuffering) {
    // Render loading/buffering indicator
  } else if (isPlaying) {
    iconName = "pause-circle";
  }

  return (
    <TouchableOpacity
      onPress={handlePlayPause}
      disabled={isLoading} // Only disable during the initial load phase
      style={[styles.button, style]}
    >
      {isLoading || isBuffering ? (
        <ActivityIndicator
          size="small"
          color={activeColor}
          style={{ width: iconSize, height: iconSize }}
        />
      ) : (
        <Icon name={iconName} size={iconSize} color={activeColor} />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default AudioPlaybackButton;
