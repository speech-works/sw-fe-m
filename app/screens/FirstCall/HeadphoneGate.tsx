import React, { useState } from "react";
import { View } from "react-native";
import FA5Icon from "react-native-vector-icons/FontAwesome5";
import {
  Button,
  Text,
  makeStyles,
  space,
  spacing,
  useTheme,
} from "../../design-system";
import { isHeadsetConnected } from "../../util/functions/headset";

/**
 * ============================================================================
 * THE HEADPHONE GATE
 * ----------------------------------------------------------------------------
 * Calls only work on headphones today. This is a real limitation of ours, so
 * it is worded as one: we are still improving it, and until we have, the call
 * needs headphones. We do not explain echo cancellation to somebody thirty
 * seconds into their first experience of the product, and we never imply the
 * problem is their equipment.
 *
 * IT COMES BEFORE THE RINGING, NOT DURING IT. Being stopped mid-answer by a
 * technical requirement would break the one illusion the whole experience is
 * built on. Better to say "someone is about to call you" and sort the
 * headphones out first.
 *
 * NOTHING HERE SPENDS THE CALL. Every exit from this screen leaves the offer
 * exactly as it found it — the point of a gate is that it can be closed again.
 * ============================================================================
 */

interface Props {
  callerName: string;
  /** Headphones confirmed — go and ring. */
  onReady: () => void;
  /** "Remind me later" — quiet for a few days. */
  onDefer: () => void;
  /** "I don't have headphones" — stop asking, keep the offer. */
  onNoHeadphones: () => void;
}

const HeadphoneGate: React.FC<Props> = ({
  callerName,
  onReady,
  onDefer,
  onNoHeadphones,
}) => {
  const { colors } = useTheme();
  const styles = useStyles();
  const [checking, setChecking] = useState(false);
  const [missed, setMissed] = useState(false);

  const check = async () => {
    setChecking(true);
    try {
      if (await isHeadsetConnected()) {
        onReady();
        return;
      }
      setMissed(true);
    } finally {
      setChecking(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.body}>
        <View style={styles.glyph}>
          <FA5Icon
            solid
            name="headphones-alt"
            size={34}
            color={colors.accentText.purple}
          />
        </View>

        <Text variant="h1" color="primary" center>
          {callerName} is about to call
        </Text>

        {/* The honest version. Not "your setup won't work" — ours doesn't, yet. */}
        <Text variant="body" color="secondary" center style={styles.line}>
          We're still improving how calls work — for now, please pop your
          headphones in so you can hear {callerName} properly.
        </Text>

        {missed ? (
          <Text variant="bodySm" color="tertiary" center style={styles.line}>
            Still not seeing them. Check they're plugged in or paired, then try
            again.
          </Text>
        ) : null}
      </View>

      <View style={styles.actions}>
        <Button
          label={checking ? "Checking…" : "I've got them on"}
          variant="primary"
          disabled={checking}
          onPress={check}
        />
        <Button label="Remind me later" variant="ghost" onPress={onDefer} />
        {/* Named plainly, because it is a real answer and not a failure: some
            people simply do not own headphones, and asking them again every
            few days is nagging rather than reminding. */}
        <Button
          label="I don't have headphones"
          variant="ghost"
          onPress={onNoHeadphones}
        />
      </View>
    </View>
  );
};

export default HeadphoneGate;

const useStyles = makeStyles((c) => ({
  root: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: space.screenX,
    paddingBottom: spacing.xl,
  },
  body: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.lg,
  },
  glyph: {
    height: 72,
    width: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.accentTint.purple,
    marginBottom: spacing.sm,
  },
  line: {
    paddingHorizontal: spacing.sm,
  },
  actions: {
    gap: spacing.sm,
  },
}));
