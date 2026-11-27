/**
 * A LESSON ON THE DAY FRAME'S SHEET (program screens redesign, 2026-11-27; mocks 02 and 11).
 *
 *   chip row      "Part N of M" on every part of a split lesson, the same chip each time; "About N min read" beside it on
 *                 the first part only. A lesson with one part has no chip row at all: the row owns the gap under it, so
 *                 the heading moves up and nothing is left behind.
 *   heading       the first part's is the big one with the orange rule; a later part's is small with no rule
 *                 (SimpleMarkdown `leadHeading`).
 *   text          16/26 at the standard size, 24 from the screen edge (the frame's content has the 16 gutter).
 *
 * No Pip here: the reader's eyes stay on the text.
 * PART CHANGE: the new part fades in over the old one, which fades out (opacity only). The day frame has already put the
 * scroll back at the top. Reduced motion: the new part is simply there.
 */
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import { Text, fonts, makeStyles, spacing, useTheme } from "../../design-system";
import type { TeachPart } from "../../util/packs/teachParts";
import { SimpleMarkdown } from "./SimpleMarkdown";

const FADE_MS = 220;

/** The chip row. Renders nothing for a lesson that is not split. */
export function LessonChips({ part, count, minutes }: { part: number; count: number; minutes?: number | null }) {
  const styles = useStyles();
  if (count < 2) return null;
  return (
    <View style={styles.chips}>
      <Text style={styles.chip}>{`Part ${part + 1} of ${count}`}</Text>
      {part === 0 && minutes ? <Text style={styles.chip}>{`About ${minutes} min read`}</Text> : null}
    </View>
  );
}

function Fade({ from, to, style, children }: { from: number; to: number; style?: any; children: React.ReactNode }) {
  const o = useSharedValue(from);
  useEffect(() => { o.value = withTiming(to, { duration: FADE_MS }); }, [o, to]);
  const st = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View pointerEvents={to === 0 ? "none" : "auto"} style={[style, st]}>{children}</Animated.View>;
}

export function LessonParts({ parts, at, minutes, textSize }: { parts: TeachPart[]; at: number; minutes?: number | null; textSize?: number }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  // `shown` follows `at`; the part that was showing fades out over the new one
  const [shown, setShown] = useState(at);
  const [leaving, setLeaving] = useState<number | null>(null);
  const [moved, setMoved] = useState(false);
  if (shown !== at) {
    setLeaving(reduced ? null : shown);
    setShown(at);
    setMoved(true);
  }
  useEffect(() => {
    if (leaving == null) return;
    const t = setTimeout(() => setLeaving(null), FADE_MS + 40);
    return () => clearTimeout(t);
  }, [leaving, shown]);

  const part = (i: number) => (
    <>
      <LessonChips part={i} count={parts.length} minutes={minutes} />
      <SimpleMarkdown content={parts[i].markdown} textColor={colors.text.primary} readingSize={textSize} keyLeadIns leadHeading={i === 0 ? "big" : "small"} />
    </>
  );
  return (
    <View style={[styles.lesson, leaving != null && styles.clip]}>
      {moved && !reduced ? <Fade key={shown} from={0} to={1}>{part(shown)}</Fade> : <View key={shown}>{part(shown)}</View>}
      {leaving != null ? <Fade key={`out-${leaving}`} from={1} to={0} style={styles.leaving}>{part(leaving)}</Fade> : null}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  // 24 from the screen edge
  lesson: { paddingHorizontal: spacing.sm },
  clip: { overflow: "hidden" },
  leaving: { position: "absolute", left: spacing.sm, right: spacing.sm, top: 0 },
  // the row owns the gap under it
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 18 },
  // a row surface with a hairline, one step up from the sheet
  chip: {
    fontFamily: fonts.semibold,
    fontWeight: "600",
    fontSize: 12.5,
    lineHeight: 16,
    color: c.text.secondary,
    backgroundColor: c.surface.elevated,
    borderWidth: 1,
    borderColor: c.border.default,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    overflow: "hidden",
  },
}));
