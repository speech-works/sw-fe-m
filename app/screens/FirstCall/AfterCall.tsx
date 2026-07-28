import React, { useState } from "react";
import { Pressable, View } from "react-native";
import {
  Button,
  Text,
  haptics,
  makeStyles,
  space,
  spacing,
  radius,
  useTheme,
} from "../../design-system";

/**
 * ============================================================================
 * AFTER THE FIRST CALL
 * ----------------------------------------------------------------------------
 * They have just done, on day one, the thing a lot of people put off for
 * years. Two rules shape this screen.
 *
 * FIRST: we do not grade it. No score, no "you spoke for 3:12", no comment on
 * fluency — the caller was under orders never to mention how they spoke, and it
 * would be a strange betrayal for the app to do it the second they hang up.
 * The only question is how they FEEL.
 *
 * SECOND: "that was a lot" is a valid answer and gets a real response, not a
 * consolation message. Somebody who leaves an exposure activated and with
 * nowhere to put it has learned that the app winds them up and walks away —
 * which is how people stop opening it. So that answer opens a one-minute
 * breathing exercise, and it counts for the day exactly as much as the call.
 *
 * NOTHING HERE IS REQUIRED. Every route out of this screen is one tap.
 * ============================================================================
 */

export type AfterCallFeeling = "good" | "mixed" | "alot";

interface Props {
  callerName: string;
  /** Chosen "that was a lot" and wants the minute of breathing. */
  onBreathe: () => void;
  /** Done — back to the app. `feeling` is what they picked, if anything. */
  onFinish: (feeling: AfterCallFeeling | null) => void;
}

const CHOICES: { key: AfterCallFeeling; label: string; sub: string }[] = [
  {
    key: "good",
    label: "Honestly, good",
    sub: "That was easier than I expected",
  },
  {
    key: "mixed",
    label: "A bit of both",
    sub: "Hard in places, fine in others",
  },
  {
    key: "alot",
    label: "That was a lot",
    sub: "I'm still keyed up",
  },
];

const AfterCall: React.FC<Props> = ({ callerName, onBreathe, onFinish }) => {
  const { colors } = useTheme();
  const styles = useStyles();
  const [picked, setPicked] = useState<AfterCallFeeling | null>(null);

  return (
    <View style={styles.root}>
      <View style={styles.body}>
        {/* States the fact, claims nothing about how it went. */}
        {/* Left-aligned and set at screenTitle, like every other screen in this
            flow. Centred h1 over a left-aligned list was the one thing here
            that read as a different app. */}
        <Text variant="screenTitle" style={styles.headline}>
          You took{"\n"}the call.
        </Text>
        <Text variant="h3" color="secondary">
          {callerName} has hung up. How do you feel?
        </Text>

        <View style={styles.choices}>
          {CHOICES.map((c) => {
            const active = picked === c.key;
            return (
              <Pressable
                key={c.key}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  haptics.selection();
                  setPicked(c.key);
                }}
                style={({ pressed }) => [
                  styles.choice,
                  {
                    backgroundColor: active
                      ? colors.accentTint.purple
                      : colors.surface.default,
                    borderColor: active
                      ? colors.accent.purple
                      : colors.border.hairline,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <Text variant="title" color="primary">
                  {c.label}
                </Text>
                <Text variant="bodySm" color="secondary">
                  {c.sub}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.actions}>
        {picked === "alot" ? (
          <>
            {/* The offer, not a prescription — and it counts for the day, so
                taking it is not "giving up" on doing something real. */}
            <Text variant="caption" color="tertiary" center style={styles.line}>
              One minute, and it counts for today just like the call did.
            </Text>
            <Button
              label="Breathe for a minute"
              variant="primary"
              onPress={onBreathe}
            />
            {/* A link, not a second pill. Two filled buttons here made "I'm
                alright" look like a refusal of equal weight, when it is simply
                the other ordinary answer. */}
            <Text
              variant="bodySm"
              color="secondary"
              center
              style={styles.altRow}
              onPress={() => onFinish(picked)}
            >
              I&apos;m alright
            </Text>
          </>
        ) : (
          <Button
            label={picked ? "Done" : "Skip"}
            variant={picked ? "primary" : "ghost"}
            onPress={() => onFinish(picked)}
          />
        )}
      </View>
    </View>
  );
};

export default AfterCall;

const useStyles = makeStyles(() => ({
  root: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: space.screenX,
    paddingBottom: spacing.xl,
  },
  /**
   * TOP-ANCHORED, and that is the whole fix for the layout shift.
   *
   * It was centred, and the actions block below it changes height with the
   * selection — "that was a lot" adds a line of copy and a second control. A
   * centred body absorbs that difference by MOVING, so choosing an answer
   * dragged the headline, the question and every option upward. Nothing had
   * changed about them; they moved because something else grew.
   *
   * Anchored to the top, the flexible space sits BETWEEN the choices and the
   * actions, which is the only place that can grow without moving anything the
   * reader is looking at.
   */
  body: {
    flex: 1,
    justifyContent: "flex-start",
    paddingTop: spacing["3xl"],
    gap: space.inlineGap,
  },
  headline: {
    lineHeight: 40,
  },
  line: {
    paddingHorizontal: spacing.sm,
  },
  altRow: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  choices: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  choice: {
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.xxs,
  },
  pressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.9,
  },
  actions: {
    gap: spacing.sm,
  },
}));
