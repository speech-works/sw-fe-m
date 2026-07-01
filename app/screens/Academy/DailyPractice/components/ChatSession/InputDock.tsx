import React from "react";
import { View } from "react-native";
import {
  Button,
  Icon,
  Text,
  elevation,
  makeStyles,
  radius,
  size,
  space,
  spacing,
  useTheme,
} from "../../../../../design-system";
import SmartRecorder from "../../pages/ReadingPractice/StoryPractice/components/SmartRecorder";

interface InputDockProps {
  /** There are options this turn (the user must arm one before speaking). */
  hasOptions: boolean;
  /** The dialogue has reached its end — show Finish. */
  isEnded: boolean;
  /** An option is armed — show the live recorder. */
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
 * The single fixed bottom surface. It never stacks a second pill — it swaps
 * between three states: a disabled prompt (options shown, nothing armed yet),
 * the live SmartRecorder (an option is armed → speak it to advance), and a
 * Finish button (dialogue ended). Kept in-tree (no native Modal) so it never
 * stacks over the vitals / exit Modals.
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
  const { colors } = useTheme();

  if (isEnded) {
    return (
      <View style={styles.wrap}>
        <Button label="Finish" onPress={onComplete} />
      </View>
    );
  }

  if (armed) {
    return (
      <SmartRecorder
        prevRecordingUri={turnRecordingUri ?? undefined}
        onRecorded={onRecorded}
        onSubmit={onConfirm}
        onDiscard={onDiscard}
      />
    );
  }

  if (hasOptions) {
    return (
      <View style={styles.wrap}>
        <View style={styles.promptPill}>
          <Icon name="mic" size={size.icon} color={colors.text.tertiary} />
          <Text variant="label" color="tertiary">
            Tap a reply, then speak it
          </Text>
        </View>
      </View>
    );
  }

  return null;
};

const useStyles = makeStyles((c) => ({
  // Matches SmartRecorder's own container footprint (it brings its own margins).
  wrap: {
    marginHorizontal: space.screenX,
    marginBottom: 34,
  },
  promptPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    height: 70,
    borderRadius: radius.pill,
    backgroundColor: c.surface.material,
    borderWidth: 1,
    borderColor: c.border.default,
    ...elevation.e2,
  },
}));
