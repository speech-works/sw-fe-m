import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import CallerStage from "../../components/stage/CallerStage";
import {
  Button,
  Text,
  duration,
  space,
  spacing,
  useMotion,
} from "../../design-system";
import { isHeadsetConnected } from "../../util/functions/headset";

/**
 * ============================================================================
 * THE HEADPHONE GATE
 * ----------------------------------------------------------------------------
 * Calls only work on headphones today. This is a real limitation of ours, so it
 * is worded as one: we are still improving it, and until we have, the call
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
 *
 * ── THE LOOK IS NOT ITS OWN ─────────────────────────────────────────────────
 * Same lockup as the pre-signup offer and the Act 1 welcome: the stage floating
 * in a flex slot that absorbs the slack, a bottom-anchored text block landing
 * on the CTA, then screenTitle / h3 / caption. The person who reaches this
 * screen saw "Maya would like to call you" a minute ago; the SAME picture with
 * a headphone badge added says "still Maya, one condition" without a word.
 *
 * A THREE-TIER FOOTER, not three orange things. The previous version stacked a
 * filled pill and two accent-coloured links at equal size, which gave three
 * choices identical weight and made the screen read as a menu. Tiering them
 * (button → bodySm → caption) is the same ladder ActOneWelcome uses, and it
 * lets the rarest answer stay reachable without shouting.
 * ============================================================================
 */

interface Props {
  callerName: string;
  /** Keeps the picture continuous with the screen before it. */
  callerIcon?: string;
  /** Headphones confirmed — go and ring. */
  onReady: () => void;
  /** "Remind me later" — quiet for a few days. */
  onDefer: () => void;
  /** "I don't have headphones" — stop asking, keep the offer. */
  onNoHeadphones: () => void;
}

const HeadphoneGate: React.FC<Props> = ({
  callerName,
  callerIcon,
  onReady,
  onDefer,
  onNoHeadphones,
}) => {
  const styles = useStyles();
  const motion = useMotion();
  const [checking, setChecking] = useState(false);
  const [missed, setMissed] = useState(false);
  const [stageHeight, setStageHeight] = useState(0);

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
        <Animated.View
          style={styles.stageSlot}
          entering={motion.stagger(0)}
          onLayout={(e) => setStageHeight(e.nativeEvent.layout.height)}
        >
          {/* NOT pulsing. The pulse means "incoming" and nothing is incoming
              yet — the call is held behind this screen. Reusing it here would
              spend the signal before the moment it exists for. */}
          <CallerStage
            available={stageHeight}
            icon={callerIcon || "user"}
            badge="headphones-alt"
            pulsing={false}
          />
        </Animated.View>

        <View style={styles.copyBlock}>
          <Animated.View entering={motion.stagger(1)}>
            {/* Hard-broken to two lines, same tightened leading as the screens
                either side of it — the sequence is meant to rhyme. */}
            <Text variant="screenTitle" style={styles.headline}>
              {callerName} is{"\n"}about to call.
            </Text>
          </Animated.View>

          <Animated.View entering={motion.stagger(2)}>
            {/* Ours to fix, said as ours. Never "your setup won't work". */}
            <Text variant="h3" color="secondary">
              We&apos;re still improving how calls work — for now, headphones
              in, so you can hear {callerName} properly.
            </Text>
          </Animated.View>

          {/* The retry hint occupies a RESERVED line whether or not it has
              anything to say, so a failed check does not shove the headline and
              the button apart. Layout that jumps under a person's thumb is the
              cheapest way to feel unreliable, and this screen is asking them to
              trust us with their voice. */}
          <View style={styles.hintSlot}>
            {missed ? (
              <Animated.View entering={FadeIn.duration(duration.base)}>
                <Text variant="caption" color="tertiary">
                  Still not seeing them — check they&apos;re plugged in or
                  paired, then try again.
                </Text>
              </Animated.View>
            ) : null}
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Animated.View entering={motion.stagger(3)}>
          <Button
            label={checking ? "Checking…" : "I've got them on"}
            disabled={checking}
            onPress={check}
          />
        </Animated.View>

        {/* Tier two: the ordinary way out. */}
        <Animated.View entering={motion.stagger(4)}>
          <Text
            variant="bodySm"
            color="secondary"
            center
            style={styles.deferRow}
            onPress={onDefer}
          >
            Remind me later
          </Text>
        </Animated.View>

        {/* Tier three: a real answer, and the rarest. Quiet, not hidden —
            re-offering every few days to somebody who owns no headphones is
            nagging about hardware rather than reminding about a call. */}
        <Animated.View entering={motion.stagger(5)}>
          <Text
            variant="caption"
            color="tertiary"
            center
            style={styles.noteRow}
            onPress={onNoHeadphones}
          >
            I don&apos;t have headphones
          </Text>
        </Animated.View>
      </View>
    </View>
  );
};

export default HeadphoneGate;

// Geometry shared with ActOneWelcome / ActOneCallOffer rather than re-derived.
const useStyles = () =>
  StyleSheet.create({
    root: {
      flex: 1,
      justifyContent: "space-between",
    },
    body: {
      flex: 1,
      justifyContent: "flex-start",
      paddingTop: spacing.lg,
      paddingHorizontal: space.screenX,
      gap: space.groupGap,
      paddingBottom: space.groupGap,
    },
    stageSlot: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    copyBlock: {
      gap: space.inlineGap,
    },
    headline: {
      lineHeight: 40,
    },
    // Two caption lines' worth, reserved. See the note at the call site.
    hintSlot: {
      minHeight: 34,
    },
    footer: {
      paddingHorizontal: space.screenX,
      paddingBottom: spacing.md,
    },
    deferRow: {
      paddingTop: spacing["2xl"],
      paddingBottom: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    noteRow: {
      paddingTop: spacing.xs,
      paddingBottom: spacing.sm,
      paddingHorizontal: spacing.md,
    },
  });
