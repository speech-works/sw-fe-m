import React from "react";
import { View } from "react-native";
import {
  Button,
  Text,
  makeStyles,
  space,
  spacing,
} from "../../../../../design-system";
import SmartRecorder from "../../pages/ReadingPractice/StoryPractice/components/SmartRecorder";

interface InputDockProps {
  /** There are options this turn (the user must arm one before speaking). */
  hasOptions: boolean;
  /** The dialogue has reached its end — show Finish. */
  isEnded: boolean;
  /** An option is armed — the mic is live. */
  armed: boolean;
  /** The current turn's local recording (drives the recorder's review state). */
  turnRecordingUri: string | null;
  onRecorded: (uri: string) => void;
  /** The recorder's check button — confirms the spoken take and advances. */
  onConfirm: () => void;
  /** Discard the current take and re-record (stays on the same armed option). */
  onDiscard: () => void;
  /** Finish the practice (end of dialogue). */
  onComplete: () => void;
}

/**
 * The single bottom dock — the shared `SmartRecorder`, reused (not a bespoke
 * pill). Until an option is armed the mic is disabled and a subtle hint sits in
 * the recorder's idle left area (the space it otherwise uses for tools/waveform);
 * arming an option lights the mic up to speak. At the dialogue's end it's a
 * Finish button. Kept in-tree (no native Modal).
 */
export const InputDock: React.FC<InputDockProps> = ({
  hasOptions,
  isEnded,
  armed,
  turnRecordingUri,
  onRecorded,
  onConfirm,
  onDiscard,
  onComplete,
}) => {
  const styles = useStyles();

  if (isEnded) {
    return (
      <View style={styles.wrap}>
        <Button label="Finish" onPress={onComplete} />
      </View>
    );
  }

  if (!hasOptions) return null;

  return (
    <SmartRecorder
      disabled={!armed}
      hideSeparator
      prevRecordingUri={turnRecordingUri ?? undefined}
      onRecorded={onRecorded}
      onSubmit={onConfirm}
      onDiscard={onDiscard}
      renderTools={
        armed
          ? undefined
          : () => (
              <Text
                variant="bodySm"
                color="tertiary"
                numberOfLines={1}
                style={styles.hint}
              >
                Tap a reply, then speak it
              </Text>
            )
      }
    />
  );
};

const useStyles = makeStyles(() => ({
  // Matches SmartRecorder's own container footprint for the Finish state.
  wrap: {
    marginHorizontal: space.screenX,
    marginBottom: spacing["3xl"],
  },
  // A little breathing room so the placeholder clears the pill's rounded end.
  hint: {
    marginLeft: spacing.sm,
  },
}));
