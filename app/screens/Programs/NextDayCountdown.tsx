import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  Icon,
  icons,
  radius,
  size,
  spacing,
  Text,
  useTheme,
} from "../../design-system";

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

/**
 * How long is left, said the way a person would say it.
 *
 * The precision follows the size of the wait, because the number answers a
 * different question at each range. Nine hours out, the user is deciding
 * whether to come back tonight or in the morning: minutes are enough and
 * seconds are only anxiety. Under an hour they might actually wait, so
 * `mm:ss` is the useful read. Under a minute there is no number worth
 * reading at all.
 */
export function formatRemaining(ms: number): string {
  if (ms <= MINUTE) return "Under a minute";
  if (ms < HOUR) {
    const m = Math.floor(ms / MINUTE);
    const s = Math.floor((ms % MINUTE) / SECOND);
    return `${m}:${String(s).padStart(2, "0")}`;
  }
  const h = Math.floor(ms / HOUR);
  const m = Math.floor((ms % HOUR) / MINUTE);
  return `${h}h ${m}m`;
}

/** Shown for the moment between the clock running out and the refetch landing. */
const OPEN_NOW = "Opening now";

interface Props {
  /**
   * The instant the next day unlocks. Comes from the server
   * (`PackProgress.nextDayOpensAt`) and is never computed here.
   */
  opensAt: Date;
  /** The day being waited for. Omitted when the backend did not say. */
  dayIndex?: number | null;
  /**
   * Fired once, the moment the wait ends. The screen refetches progress and
   * turns this card into the way in — so a user who is sitting here when the
   * clock runs out is not left looking at a dead zero.
   */
  onOpened: () => void;
}

/**
 * The "come back later" state of an owned program.
 *
 * It replaced the line "That's today done. The next day opens tomorrow.",
 * which was wrong in two ways at once. The gate is 24 hours from when the day
 * was started, not a calendar boundary, so a day begun at 9pm opens the next
 * one at 9pm and not at midnight. And anybody reading that sentence after
 * midnight is already IN tomorrow, and is being told to wait for a day that,
 * as far as they can tell, has arrived.
 *
 * A countdown cannot be wrong about either. It also answers the question the
 * sentence never did: not "when, roughly" but "how long".
 */
const NextDayCountdown: React.FC<Props> = ({ opensAt, dayIndex, onOpened }) => {
  const { colors } = useTheme();
  const target = opensAt.getTime();
  const [remaining, setRemaining] = useState(() =>
    target - Date.now() <= 0 ? OPEN_NOW : formatRemaining(target - Date.now()),
  );

  /**
   * Which deadline we have already reported, so the handover happens once.
   *
   * The device clock can run ahead of the server's. When it does, this hits
   * zero while the day is still genuinely locked, the refetch returns the SAME
   * `nextDayOpensAt`, and without this ref every tick would fire another
   * refetch for as long as the screen stayed open.
   */
  const reported = useRef<number | null>(null);

  useEffect(() => {
    // One plain 1Hz tick, and no animation on the digits. This screen is read
    // for a few seconds at a time, and a number that eases or rolls into place
    // is a number you cannot read while it moves.
    //
    // Above an hour the label only changes once a minute, and the extra ticks
    // cost nothing: `setState` with an identical string bails out of the
    // render, so the work is a subtraction and a compare.
    const tick = () => {
      const left = target - Date.now();
      if (left <= 0) {
        setRemaining(OPEN_NOW);
        if (reported.current !== target) {
          reported.current = target;
          onOpened();
        }
        return;
      }
      setRemaining(formatRemaining(left));
    };
    tick();
    const id = setInterval(tick, SECOND);
    return () => clearInterval(id);
  }, [target, onOpened]);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface.default,
          borderColor: colors.border.default,
        },
      ]}
    >
      <View style={styles.doneRow}>
        <Icon
          name={icons.success}
          size={size.iconSm}
          color={colors.feedback.successText}
        />
        {/* `title`. It is the card's heading, and at 13pt it sat below the
            weight of the countdown it introduces. */}
        <Text
          variant="title"
          color={colors.feedback.successText}
          style={styles.doneText}
        >
          That&apos;s today done
        </Text>
      </View>

      <View
        style={[styles.rule, { backgroundColor: colors.border.default }]}
      />

      <View style={styles.clockBlock}>
        <Text variant="eyebrow" color="tertiary">
          {dayIndex ? `Day ${dayIndex} opens in` : "Next day opens in"}
        </Text>
        {/* Tabular figures: without them every tick changes the width of the
            number and the whole line twitches. */}
        <Text variant="h1" color="primary" style={styles.clock}>
          {remaining}
        </Text>
        <Text variant="bodySm" color="tertiary">
          at{" "}
          {opensAt.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>
    </View>
  );
};

export default NextDayCountdown;

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  doneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  // flex: 1, so the line wraps inside the card instead of overflowing it. A
  // Text in a row does not shrink on its own in React Native.
  doneText: {
    flex: 1,
  },
  rule: {
    height: StyleSheet.hairlineWidth,
  },
  clockBlock: {
    gap: spacing.xs,
  },
  clock: {
    fontVariant: ["tabular-nums"],
  },
});
