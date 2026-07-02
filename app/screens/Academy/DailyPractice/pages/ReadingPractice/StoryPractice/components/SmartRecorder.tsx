import React, { useMemo, useState } from "react";
import { View } from "react-native";
import PressableScale from "../../../../../../../components/PressableScale";
import {
  Dialog,
  Icon,
  Text,
  elevation,
  makeStyles,
  radius,
  size,
  space,
  useTheme,
} from "../../../../../../../design-system";
import ModernWaveform from "../../../../../Library/TechniquePage/components/ModernWaveform";
import { useAudioRecorder } from "./useAudioRecorder";

const formatTime = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

interface Props {
  onRecorded?: (uri: string) => void;
  onToggle?: () => void;
  prevRecordingUri?: string;
  renderTools?: () => React.ReactNode;
  onSubmit?: () => void;
  onDiscard?: () => void;
  /** Disable starting a recording (idle mic button off + dimmed). Default false. */
  disabled?: boolean;
  /** Hide the idle tools↔mic divider (for docks with no left-side tools). Default false. */
  hideSeparator?: boolean;
}

const SmartRecorder: React.FC<Props> = ({
  onRecorded,
  prevRecordingUri,
  renderTools,
  onSubmit,
  onDiscard,
  disabled = false,
  hideSeparator = false,
}) => {
  const { colors } = useTheme();
  const styles = useStyles();
  const {
    startRecording,
    stopRecording,
    startPlayback,
    stopPlayback,
    state,
    waveform,
    playbackPosition, // Needed for replay sync
    recordingDuration,
    deleteRecording,
    duration,
  } = useAudioRecorder();

  const isRecording = state === "recording";
  // Playback state is only valid if we actually have a recording to play
  const isPlaying = state === "playback" && !!prevRecordingUri;
  const hasRecording = !!prevRecordingUri;

  // Waveform Visualization Logic
  const POINTS = 40; // Match the visualizer
  const displayEnvelope = useMemo(() => {
    if (isRecording) {
      const slice = waveform.slice(-POINTS);
      return [
        ...new Array(Math.max(0, POINTS - slice.length)).fill(0),
        ...slice,
      ];
    }
    if (isPlaying) {
      const index = Math.floor(playbackPosition / 50); // 50ms per sample
      const slice = waveform.slice(Math.max(0, index - POINTS), index);
      return [
        ...new Array(Math.max(0, POINTS - slice.length)).fill(0),
        ...slice,
      ];
    }
    return waveform; // Review Mode: Show full history squeezed
  }, [waveform, isRecording, isPlaying, playbackPosition]);

  const [isPreparing, setIsPreparing] = useState(false);
  const [showSmallAudioPrompt, setShowSmallAudioPrompt] = useState(false);

  const handleSubmitPress = () => {
    // If audio is < 1 second (1000ms), warn user.
    if (duration < 1000) {
      setShowSmallAudioPrompt(true);
    } else {
      onSubmit?.();
    }
  };

  const confirmSmallAudioSubmit = () => {
    setShowSmallAudioPrompt(false);
    onDiscard?.(); // This clears the URI and the internal audio state
    setTimeout(() => {
      onSubmit?.();
    }, 400); // Ensure modal unmounts (300ms anim) before submitting
  };

  const handleStartRecording = async () => {
    setIsPreparing(true);
    try {
      await startRecording();
    } finally {
      setIsPreparing(false);
    }
  };

  const handleStopRecording = async () => {
    const uri = await stopRecording();
    if (uri && onRecorded) {
      onRecorded(uri);
    }
  };

  const handlePlay = () => {
    if (prevRecordingUri) startPlayback(prevRecordingUri);
  };

  const handleStopPlay = () => {
    stopPlayback();
  };

  const handleDiscard = async () => {
    // Ensure we stop and clean up locally
    await deleteRecording();
    // Then notify parent to clear the URI
    onDiscard?.();
  };

  return (
    <View style={styles.container}>
      {/* Floating Dock */}
      <View style={[styles.dock, isRecording && styles.dockRecording]}>
        {/* LEFT SECTION: Tools or Timer */}
        <View
          style={
            isRecording
              ? styles.leftSectionRecording
              : isPlaying
                ? styles.leftSectionCompact
                : styles.leftSection
          }
        >
          {isRecording ? (
            <View style={styles.recordingIndicator}>
              <View style={styles.recordingDot} />
              <View style={styles.recordingTextContainer}>
                <Text variant="caption" color="tertiary" style={styles.recordingText}>
                  Rec
                </Text>
                <Text variant="caption" color={colors.feedback.dangerText} style={styles.timerText}>
                  {formatTime(recordingDuration)}
                </Text>
              </View>
            </View>
          ) : isPlaying ? (
            <View style={styles.playbackIndicator}>
              <Text variant="bodySm" color="secondary" style={styles.timerTextPlayback}>
                {formatTime(playbackPosition)}
              </Text>
            </View>
          ) : hasRecording ? (
            <PressableScale style={styles.controlButton} onPress={handleDiscard}>
              <Icon name="trash-2" size={size.icon} color={colors.text.tertiary} />
            </PressableScale>
          ) : (
            <View style={styles.toolsWrapper}>{renderTools?.()}</View>
          )}
        </View>

        {/* SEPARATOR (Only in Idle, and only when there are left-side tools) */}
        {!isRecording && !hasRecording && !hideSeparator && (
          <View style={styles.separator} />
        )}

        {/* CENTER SECTION:  Mic Button OR Waveform */}
        {(isRecording || isPlaying) && (
          <View style={styles.centerSectionRecording}>
            <View style={styles.waveformWrapper}>
              <ModernWaveform
                envelope={displayEnvelope}
                mode={state}
                height={32}
                glowColor={
                  isRecording ? colors.feedback.danger : colors.action.primary
                }
                points={POINTS}
              />
            </View>
          </View>
        )}

        {/* Play Button for Review (Center) - Only if hasRecording and NOT playing/recording */}
        {hasRecording && !isPlaying && !isRecording && (
          <View style={styles.centerSection}>
            <PressableScale style={styles.playButton} onPress={handlePlay}>
              <Icon
                name="play"
                size={size.icon}
                color={colors.action.primary}
                style={{ marginLeft: 3 }}
              />
            </PressableScale>
          </View>
        )}

        {/* Duration text perfectly centered between Left (Trash) and Center (Play) */}
        {hasRecording && !isPlaying && !isRecording && (
          <View style={styles.reviewTimerContainer} pointerEvents="none">
            <Text variant="bodySm" color="secondary" style={styles.timerTextPlayback}>
              {formatTime(duration)}
            </Text>
          </View>
        )}

        {/* RIGHT SECTION: Stop/Submit */}
        <View style={styles.rightSection}>
          {isRecording ? (
            <PressableScale style={styles.stopButtonRecording} onPress={handleStopRecording}>
              <Icon name="square" size={size.iconSm} color={colors.accentOn.danger} />
            </PressableScale>
          ) : isPlaying ? (
            <PressableScale style={styles.stopButton} onPress={handleStopPlay}>
              <Icon name="square" size={size.iconSm} color={colors.text.primary} />
            </PressableScale>
          ) : hasRecording ? (
            <PressableScale style={styles.submitButton} onPress={handleSubmitPress}>
              <Icon name="check" size={size.icon} color={colors.action.onPrimary} />
            </PressableScale>
          ) : (
            // Idle Right: Mic Button
            <PressableScale
              style={[
                styles.mainMicButton,
                (isPreparing || disabled) && styles.mainMicButtonPreparing,
              ]}
              onPress={handleStartRecording}
              disabled={isPreparing || disabled}
            >
              <Icon
                name="mic"
                size={size.icon}
                color={
                  isPreparing || disabled
                    ? colors.action.disabledText
                    : colors.action.onPrimary
                }
              />
            </PressableScale>
          )}
        </View>
      </View>

      {/* Small Audio Prompt */}
      <Dialog
        visible={showSmallAudioPrompt}
        onClose={() => setShowSmallAudioPrompt(false)}
        title="Audio too short"
        message="The audio clip is absent or too small. Would you like to complete the task without submitting your voice recording?"
        confirmLabel="Submit Anyway"
        onConfirm={confirmSmallAudioSubmit}
        cancelLabel="Cancel"
      />
    </View>
  );
};

const useStyles = makeStyles((c) => ({
  container: {
    marginHorizontal: space.screenX,
    marginBottom: 34, // Safe area margin
  },
  dock: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 8,
    borderRadius: radius.pill,
    // Opaque elevated surface (NOT the translucent `surface.material`) so content
    // never bleeds through the floating dock — matches the solid dark language.
    backgroundColor: c.surface.elevated,
    height: 70,
    borderWidth: 1,
    // Stronger hairline so the pill reads as a distinct floating surface even
    // when it overlaps a same-toned bubble mid-scroll (border.default is too faint).
    borderColor: c.border.strong,
    ...elevation.e2,
  },
  dockRecording: {
    borderColor: c.feedback.danger,
    borderWidth: 2,
  },
  stopButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: c.surface.control,
  },
  stopButtonRecording: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: c.feedback.danger,
  },
  separator: {
    width: 1,
    height: 32,
    backgroundColor: c.border.default,
    marginHorizontal: 12,
  },
  leftSection: {
    flex: 1,
    alignItems: "flex-start",
    paddingLeft: 4,
    justifyContent: "center",
  },
  leftSectionRecording: {
    width: "auto",
    alignItems: "flex-start",
    paddingLeft: 12,
    justifyContent: "center",
  },
  leftSectionCompact: {
    width: "auto",
    alignItems: "flex-start",
    paddingLeft: 4,
    justifyContent: "center",
  },
  centerSection: {
    minWidth: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  centerSectionRecording: {
    flex: 1,
    marginHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewTimerContainer: {
    position: "absolute",
    left: 0,
    right: "50%",
    alignItems: "center",
    justifyContent: "center",
  },
  rightSection: {
    minWidth: 60, // Ensure space for controls
    alignItems: "flex-end",
    paddingRight: 4,
    justifyContent: "center",
    flexShrink: 0, // Prevent shrinking when left section expands
  },
  waveformWrapper: {
    flex: 1,
    height: "100%",
    justifyContent: "center",
    width: "100%",
  },
  recordingIndicator: {
    flexDirection: "row",
    alignItems: "center",
  },
  recordingTextContainer: {
    flexDirection: "column",
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: c.feedback.danger,
    marginRight: 6,
  },
  recordingText: {
    fontSize: 12,
  },
  timerText: {
    fontSize: 12,
  },
  playbackIndicator: {
    paddingLeft: 12,
    justifyContent: "center",
  },
  timerTextPlayback: {
    fontSize: 14,
  },
  toolsWrapper: {
    width: "100%",
  },
  mainMicButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: c.action.primary,
  },
  mainMicButtonPreparing: {
    backgroundColor: c.action.disabledBg,
  },
  controlButton: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  submitButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: c.action.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: c.surface.control,
  },
}));

export default SmartRecorder;
