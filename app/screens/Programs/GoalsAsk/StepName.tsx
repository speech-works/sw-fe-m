import React, { useRef, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import {
  Chip,
  Text,
  TextField,
  haptics,
  radius,
  space,
  spacing,
  useTheme,
} from "../../../design-system";
import { GoalHarness } from "../../../api/programGoals/types";
import { ASK_COPY } from "./copy";
import { looksThin, placeholderFor, slotForCue } from "./draft";

/**
 * STEP 1: the user names their own targets.
 *
 * ── NOTHING IS REJECTED ────────────────────────────────────────────────────
 * There is no validation here beyond "the slot has something in it". A person
 * answering this is naming three real people, or three calls they have been
 * avoiding for months. Telling them their answer is wrong at that moment is how
 * you lose them on day 1. When an answer looks thin we say one soft line, once,
 * and accept whatever they leave.
 *
 * ── THE PLACEHOLDER IS SPLIT ───────────────────────────────────────────────
 * The seed carries three real examples in one comma-separated string. One per
 * slot shows the SHAPE of a single answer; all three in the first slot would
 * read as an instruction to type the lot in one box.
 */
export function StepName({
  harness,
  values,
  onChange,
}: {
  harness: GoalHarness;
  values: string[];
  onChange: (next: string[]) => void;
}) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(0);
  const refs = useRef<(TextInput | null)[]>([]);

  // Every rule below lives in draft.ts and is tested there. The edge cases
  // (a name is a whole answer, a cue must not overwrite typing) are invisible
  // in a screenshot and easy to break in a refactor.
  const thin = looksThin(values, harness.noun);

  const applyCue = (cue: string) => {
    haptics.light();
    const target = slotForCue(values, focused);
    if (target === -1) return;
    const next = [...values];
    next[target] = cue;
    onChange(next);
    refs.current[target]?.focus();
  };

  return (
    <View style={styles.root}>
      {values.map((value, i) => (
        <TextField
          key={i}
          ref={(r) => {
            refs.current[i] = r;
          }}
          value={value}
          onChangeText={(text) => {
            const next = [...values];
            next[i] = text;
            onChange(next);
          }}
          onFocus={() => setFocused(i)}
          placeholder={placeholderFor(harness.placeholder, i)}
          /**
           * THE KEYBOARD WAS EDITING THEIR WORDS.
           *
           * iOS capitalises the first letter of a field by default, so "the
           * visa interview" arrived as "The visa interview" and the goal read
           * "Get through The visa interview". These answers are FRAGMENTS that
           * get wrapped in a verb, not sentences.
           *
           * A name is the exception: Art of Disclosure collects people, and
           * "priya" would be worse than the capital ever was. The harness
           * already says which kind of thing it is asking for.
           */
          autoCapitalize={harness.noun === "person" ? "words" : "none"}
          returnKeyType={i === values.length - 1 ? "done" : "next"}
          onSubmitEditing={() => refs.current[i + 1]?.focus()}
          maxLength={120}
        />
      ))}

      <Text variant="caption" color="tertiary">
        {ASK_COPY.lengthHint}
      </Text>

      {harness.cues.length > 0 && (
        <View style={styles.cues}>
          {/* `label`, not `caption`. It heads a row of tappable chips, so it is
              a form label rather than a footnote. */}
          <Text variant="label" color="secondary">
            {ASK_COPY.cueLabel}
          </Text>
          <View style={styles.cueRow}>
            {harness.cues.map((cue) => (
              <Chip key={cue} label={cue} onPress={() => applyCue(cue)} />
            ))}
          </View>
        </View>
      )}

      {thin && (
        <View
          style={[
            styles.nudge,
            { backgroundColor: colors.surface.control },
          ]}
        >
          <Text variant="bodySm" color="secondary">
            {ASK_COPY.thinHint}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.rowGap },
  cues: { gap: spacing.sm, marginTop: spacing.sm },
  cueRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  nudge: {
    marginTop: spacing.sm,
    padding: space.cardPad,
    // `radius.card`, not a raw 16 — the only hardcoded radius left in the
    // Programs tree.
    borderRadius: radius.card,
  },
});
