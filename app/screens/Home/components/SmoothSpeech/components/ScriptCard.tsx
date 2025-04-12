import { StyleSheet, Text, View, Image } from "react-native";
import React, { useState, useEffect } from "react";
import Button from "../../../../../components/Button";
import { parseTextStyle } from "../../../../../util/functions/parseFont";
import { theme } from "../../../../../Theme/tokens";
import Icon from "react-native-vector-icons/MaterialIcons";
import CustomModal from "../../../../../components/CustomModal";
import PracticeScript from "../Scripts/PracticeScript";
import ContextMenu from "../../../../../components/ContextMenu";
import { Audio } from "expo-av";
import { saveRecordingToBE } from "../../../../../util/functions/uploadRecording";
import { useUserStore } from "../../../../../stores/user";
import { useActivityStore } from "../../../../../stores/activity";
import { triggerToast } from "../../../../../util/functions/toast";
import {
  getDownloadUrl,
  getLatestRecording,
} from "../../../../../api/recordings";

interface ScriptCardProps {
  id: string;
  title: string;
  content: string;
  imgUrl?: string;
  srcUrl?: string;
  recordAudioCallback: () => void;
  stopRecoringallback: () => void;
}

const ScriptCard = ({
  id,
  title,
  content,
  imgUrl,
  srcUrl,
  recordAudioCallback,
  stopRecoringallback,
}: ScriptCardProps) => {
  const { user } = useUserStore();
  const { activity } = useActivityStore();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isPracticeModalOpen, setPracticeModalOpen] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Helper to attach playback status update callback
  const attachPlaybackStatusUpdate = (newSound: Audio.Sound) => {
    newSound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded) {
        // When the playback finishes, update the isPlaying flag.
        if (status.didJustFinish && !status.isLooping) {
          setIsPlaying(false);
        } else {
          setIsPlaying(status.isPlaying);
        }
      }
    });
  };

  useEffect(() => {
    async function fetchRecording() {
      try {
        const result = await getLatestRecording(user?.id, undefined, id);
        if (result) {
          const downloadUrl = await getDownloadUrl(result.audioUrl);
          console.log("Remote download URL:", downloadUrl);
          if (downloadUrl) {
            const { sound: newRemoteSound } = await Audio.Sound.createAsync({
              uri: downloadUrl,
            });
            attachPlaybackStatusUpdate(newRemoteSound);
            setSound(newRemoteSound);
          }
        }
      } catch (e) {
        console.log(e);
      }
    }
    fetchRecording();
  }, []);

  // Cleanup effect for audio resources
  useEffect(() => {
    if (!user || !activity) {
      triggerToast("error", "Session Timeout", "Please login again");
      return;
    }
    return () => {
      if (recording) {
        recording
          .stopAndUnloadAsync()
          .then(() => {
            const uri = recording.getURI();
            if (!uri) return;
            // Retrieve the recording status for duration information
            return recording.getStatusAsync().then((status) => {
              const durationMillis = status.durationMillis;
              saveRecordingToBE({
                uri,
                audioDuration: durationMillis,
                userId: user.id,
                activityId: activity.id,
                scriptId: id,
              });
            });
          })
          .catch((error) => {
            console.log("ScriptCard: Error during recording cleanup:", error);
          });
      }
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [recording, sound]);

  const stripFirst169Chars = (str: string) =>
    typeof str === "string"
      ? str.substring(0, 169) || str
      : "Input must be a string.";

  // Updated play handler: if playback is at the end, reset to 0 before playing.
  const handlePlayRecording = async () => {
    if (sound) {
      try {
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          // Only reset the position if durationMillis is defined and the current position is at or beyond it.
          if (
            status.durationMillis !== undefined &&
            status.positionMillis >= status.durationMillis
          ) {
            await sound.setPositionAsync(0);
          }
          await sound.playAsync();
        }
      } catch (error) {
        console.error("Failed to play recording", error);
      }
    } else {
      console.log("No sound to play.");
    }
  };

  // Pause function remains unchanged.
  const handlePauseRecording = async () => {
    if (sound) {
      try {
        await sound.pauseAsync();
      } catch (error) {
        console.error("Failed to pause recording", error);
      }
    }
  };

  const handleRecordAudio = async () => {
    if (!user || !activity) {
      triggerToast("error", "Session Timeout", "Please login again");
      return;
    }
    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        if (!uri) return;

        // Load directly from URI and attach status update
        const { sound: newSound } = await Audio.Sound.createAsync({ uri });
        attachPlaybackStatusUpdate(newSound);
        setSound(newSound);

        // Retrieve the recording status for duration information
        recording.getStatusAsync().then((status) => {
          const durationMillis = status.durationMillis;
          saveRecordingToBE({
            uri,
            audioDuration: durationMillis,
            userId: user.id,
            activityId: activity.id,
            scriptId: id,
          });
        });

        stopRecoringallback();
      } catch (error) {
        console.error("Failed to stop recording", error);
      } finally {
        setRecording(null); // Ensure recording is cleared even on error
      }
      return;
    }

    // Unload any previous sound
    if (sound) {
      await sound.unloadAsync();
      setSound(null);
    }

    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        console.error("Audio permissions not granted");
        return;
      }

      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      await newRecording.startAsync();

      setRecording(newRecording);
      recordAudioCallback();
    } catch (error) {
      console.error("Failed to start recording", error);
      setRecording(null); // Ensure recording is cleared on error
    }
  };

  return (
    <View style={styles.cardWrapper}>
      <View style={styles.imgView}>
        {imgUrl ? (
          <Image source={{ uri: imgUrl }} style={styles.cardImg} />
        ) : (
          <Image
            source={require("../../../../../assets/icon.png")}
            style={styles.cardImg}
          />
        )}
      </View>
      <View style={styles.contentView}>
        <Text style={styles.subtitleText}>MEDIUM</Text>
        <Text style={styles.titleText}>{title}</Text>
        <Text style={styles.text}>{stripFirst169Chars(content)}</Text>
        <View style={styles.footerView}>
          <Button
            size="small"
            onPress={() => {
              setPracticeModalOpen(true);
            }}
          >
            <Text>Start practice</Text>
          </Button>
          <View style={styles.optionsView}>
            <Icon
              name={isFavorite ? "favorite" : "favorite-border"}
              size={20}
              color={theme.colors.actionPrimary.default}
              onPress={() => setIsFavorite((old) => !old)}
            />
            {/* Toggle play/pause icon in the card */}
            <Icon
              name={isPlaying ? "pause-circle-outline" : "play-circle-outline"}
              size={20}
              color={
                sound
                  ? theme.colors.actionPrimary.default
                  : theme.colors.neutral[5]
              }
              onPress={() => {
                if (isPlaying) {
                  handlePauseRecording();
                } else {
                  handlePlayRecording();
                }
              }}
            />
            <ContextMenu
              options={[
                { label: "Edit", onPress: () => console.log("Edit clicked") },
                {
                  label: "Delete",
                  onPress: () => console.log("Delete clicked"),
                },
              ]}
            />
          </View>
        </View>
      </View>
      <CustomModal
        visible={isPracticeModalOpen}
        onClose={() => {
          setPracticeModalOpen(false);
        }}
        title={title}
        icon="auto-stories"
        primaryButton={{
          label: recording ? "Stop" : "Record",
          onPress: handleRecordAudio,
          icon: recording ? "stop" : "mic",
          disabled: isPlaying, // Primary button is disabled when playback is active
        }}
        secondaryButton={{
          label: isPlaying ? "Pause" : "Play",
          onPress: isPlaying ? handlePauseRecording : handlePlayRecording,
          icon: isPlaying ? "pause" : "play-arrow",
          disabled: !sound, // Secondary button is disabled when there's no sound available
        }}
      >
        <PracticeScript script={content} />
      </CustomModal>
    </View>
  );
};

export default ScriptCard;

const styles = StyleSheet.create({
  cardWrapper: {
    borderRadius: 4,
    boxShadow: "0 0.96 2.87 0 rgba(0, 0, 0, 0.22)",
  },
  imgView: {
    borderRadius: 4,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  contentView: {
    padding: 12,
  },
  titleText: {
    ...parseTextStyle(theme.typography.paragraphSmall.heavy),
    marginBottom: 6,
    marginTop: 4,
  },
  subtitleText: {
    ...parseTextStyle(theme.typography.paragraphXSmall.regular),
    color: theme.colors.neutral[2],
  },
  text: {
    ...parseTextStyle(theme.typography.paragraphXSmall.light),
    color: theme.colors.neutral[2],
  },
  footerView: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  optionsView: {
    flexDirection: "row",
    gap: 8,
  },
  cardImg: {
    height: 100,
    width: "auto",
  },
});
