import React from "react";
import { View } from "react-native";
import {
  Button,
  Text,
  TextLink,
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
  /** Category accent for the recorder + Finish button (defaults to brand orange). */
  accentColor?: string;
  onAccentColor?: string;
}

/**
 * The single bottom dock — the shared `SmartRecorder`, reused (not a bespoke
 * pill). Until an option is armed the mic is disabled and a subtle hint sits in
 * the recorder's idle left area (the space it otherwise uses for tools/waveform);
 * arming an option lights the mic up to speak. At the dialogue's end it's a
 * Finish button. Kept in-tree (no native Modal).
 *
 * The turn NEVER depends on audio existing. Speaking is the practice, but the
 * recording is incidental — the session keeps a single uri and only the last take
 * is ever uploaded — so an armed reply always has a way forward even if the mic
 * is denied, fails, or the user would rather just say the line out loud. Welding
 * the advance to the recorder's submit button is what left every scenario stuck
 * on its first turn.
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
  accentColor,
  onAccentColor,
}) => {
  const styles = useStyles();

  if (isEnded) {
    return (
      <View style={styles.wrap}>
        <Button
          label="Finish"
          onPress={onComplete}
          accentColor={accentColor}
          onAccentColor={onAccentColor}
        />
      </View>
    );
  }

  if (!hasOptions) return null;

  return (
    <View pointerEvents="box-none">
      {/* The escape hatch: armed, nothing recorded. Quiet (tertiary, not the
          orange link tier) so it reads as available rather than inviting —
          speaking is still the point of the exercise. */}
      {armed && !turnRecordingUri ? (
        <TextLink
          label="Continue without recording"
          onPress={onConfirm}
          color="tertiary"
        />
      ) : null}

      <SmartRecorder
        disabled={!armed}
        hideSeparator
        // A chat turn is a STEP, not the task — a short take must never open the
        // "complete the task without submitting?" prompt, whose Cancel branch
        // dead-ends the scenario.
        confirmShortAudio={false}
        prevRecordingUri={turnRecordingUri ?? undefined}
        onRecorded={onRecorded}
        onSubmit={onConfirm}
        onDiscard={onDiscard}
        accentColor={accentColor}
        onAccentColor={onAccentColor}
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
    </View>
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
