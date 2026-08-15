import React, { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import PressableScale from "../../../../../../../components/PressableScale";
import {
  Button,
  Dialog,
  Icon,
  Text,
  makeStyles,
  radius,
  size,
  space,
  useTheme,
  darkenForContrast,
  AA_LARGE,
} from "../../../../../../../design-system";
import { useAppBackgrounded } from "../../../../../../../hooks/useAppBackgrounded";
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
  /**
   * Challenge a sub-second take before submitting. Default true — right where the
   * submit IS the task (reading practice: one take, then you're done). Pass false
   * where submit only ends a STEP (a chat turn), because there the prompt's
   * "complete the task without submitting" wording is wrong and its Cancel branch
   * strands the user on a turn they can't leave.
   */
  confirmShortAudio?: boolean;
  accentColor?: string;
  onAccentColor?: string;
}

const SmartRecorder: React.FC<Props> = ({
  onRecorded,
  prevRecordingUri,
  renderTools,
  onSubmit,
  onDiscard,
  disabled = false,
  hideSeparator = false,
  confirmShortAudio = true,
  accentColor,
  onAccentColor,
}) => {
  const { colors, scheme, elevation } = useTheme();
  const styles = useStyles();
  const accent = accentColor ?? colors.action.primary;
  // The review play icon is colored foreground on the elevated dock — darken the
  // threaded hue to clear AA on paper (a no-op on dark). Keep bright `accent` for
  // the waveform glow.
  const accentFg = darkenForContrast(accent, colors.surface.elevated, AA_LARGE);
  const onAccent = onAccentColor ?? colors.action.onPrimary;
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
    interrupted,
    pauseForInterruption,
    resumeInterruption,
    discardInterruption,
  } = useAudioRecorder();

  // Pause a take the moment the app is sent to the background, and hold it until
  // the user says whether to carry on. Every recording screen renders this dock,
  // so handling it here covers reading, fun, exposure and the technique drills in
  // one place, with nothing to wire up per screen.
  const backgrounded = useAppBackgrounded();
  useEffect(() => {
    if (backgrounded) void pauseForInterruption();
    // Intentionally NOT resuming on return: the user answers that question.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backgrounded]);

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
  const [showMicFailed, setShowMicFailed] = useState(false);

  const handleSubmitPress = () => {
    // If audio is < 1 second (1000ms), warn user — unless the caller submits per
    // step rather than per task, where a short take must never block the step.
    if (confirmShortAudio && duration < 1000) {
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
      // A denied permission or a failed prepare used to leave the mic looking
      // live and doing nothing at all — say it instead of swallowing it.
      const started = await startRecording();
      if (!started) setShowMicFailed(true);
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

  // A take was paused by an interruption. Replace the dock with the question,
  // rather than floating a modal over it: two of the screens that render this
  // dock already sit inside a native Modal, and a second live Modal freezes all
  // touch input on iOS.
  if (interrupted) {
    return (
      <View style={styles.container}>
        <View style={styles.interruptCard}>
          <View style={styles.interruptText}>
            <Text variant="bodySm" color="primary">
              You were interrupted
            </Text>
            <Text variant="caption" color="tertiary">
              {formatTime(recordingDuration)} recorded · carry on from there?
            </Text>
          </View>
          <View style={styles.interruptActions}>
            <Button
              variant="secondary"
              label="Start over"
              onPress={() => void discardInterruption()}
              accentColor={accent}
              onAccentColor={onAccent}
              style={styles.interruptButton}
            />
            <Button
              variant="primary"
              label="Continue"
              onPress={() => void resumeInterruption()}
              accentColor={accent}
              onAccentColor={onAccent}
              style={styles.interruptButton}
            />
          </View>
        </View>
      </View>
    );
  }

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
                glowColor={isRecording ? colors.feedback.danger : accent}
                points={POINTS}
              />
            </View>
          </View>
        )}

        {/* Play Button for Review (Center) - Only if hasRecording and NOT playing/recording */}
        {hasRecording && !isPlaying && !isRecording && (
          <View style={styles.centerSection}>
            <PressableScale
              style={[
                styles.playButton,
                { backgroundColor: scheme === "dark" ? colors.surface.control : colors.surface.inverse },
                scheme !== "dark" && elevation.e2,
              ]}
              onPress={handlePlay}
            >
              <Icon
                name="play"
                size={size.icon}
                color={accentFg}
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
            <PressableScale
              // One of the few taps that keeps its tick: recording starts and
              // stops are worth confirming by feel, because people are looking
              // at the words or at their own face, not at this button.
              haptic
              style={[styles.stopButtonRecording, scheme !== "dark" && elevation.e2]}
              onPress={handleStopRecording}
            >
              <Icon name="square" size={size.iconSm} color={colors.accentOn.danger} />
            </PressableScale>
          ) : isPlaying ? (
            <PressableScale
              style={[
                styles.stopButton,
                { backgroundColor: scheme === "dark" ? colors.surface.control : colors.surface.inverse },
                scheme !== "dark" && elevation.e2
              ]}
              onPress={handleStopPlay}
            >
              <Icon name="square" size={size.iconSm} color={colors.text.primary} />
            </PressableScale>
          ) : hasRecording ? (
            <PressableScale
              // Submitting the take is a commit, and the screen changes under
              // the finger. The tick marks the moment it went.
              haptic
              style={[styles.submitButton, { backgroundColor: accent }, scheme !== "dark" && elevation.e2]}
              onPress={handleSubmitPress}
            >
              <Icon name="check" size={size.icon} color={onAccent} />
            </PressableScale>
          ) : (
            // Idle Right: Mic Button
            <PressableScale
              haptic
              style={[
                styles.mainMicButton,
                { backgroundColor: accent },
                (isPreparing || disabled) && styles.mainMicButtonPreparing,
                scheme !== "dark" && elevation.e2,
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
                    : onAccent
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
        accentColor={accent}
        onAccentColor={onAccent}
      />

      {/* Mic couldn't start — single acknowledge, no action we can take for them. */}
      <Dialog
        visible={showMicFailed}
        onClose={() => setShowMicFailed(false)}
        title="Microphone unavailable"
        message="We couldn't start recording. Check that Speechworks has microphone access in your device settings, then try again."
        cancelLabel="OK"
      />
    </View>
  );
};

const useStyles = makeStyles((c, t) => ({
  container: {
    marginHorizontal: space.screenX,
    // A plain visual gap, NOT a safe-area value (it was mislabelled as one).
    // The nav-bar inset is owned by whichever container anchors this dock to the
    // window — ReadingStage/PracticePage `deckFloat`, ChatSession `dockFloat` —
    // because this component also renders inside a <Sheet> (MoodCheck's
    // ExpressYourself), which already pads its own bottom. Adding it here too
    // would double-pad that one.
    marginBottom: 34,
  },
  interruptCard: {
    backgroundColor: c.surface.elevated,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: c.border.default,
    padding: space.cardPad,
    gap: space.rowGap,
  },
  interruptText: {
    gap: space.titleSub,
  },
  interruptActions: {
    flexDirection: "row",
    gap: space.inlineGap,
  },
  interruptButton: {
    flex: 1,
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
    ...t.elevation.e2,
  },
  dockRecording: {
    borderColor: c.feedback.danger,
    borderWidth: 2,
  },
  stopButton: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: c.surface.control,
  },
  stopButtonRecording: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
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
    borderRadius: radius.full,
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
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
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
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: c.surface.control,
  },
}));

export default SmartRecorder;
