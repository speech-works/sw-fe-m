/**
 * DEV ONLY (phone lab and web preview page): the REAL day-done screen (components/Pack/DayDone) with sample words.
 * The goals are a static stand-in for DailyLog (DailyLog calls the API): the same question, rows and "Not yet" link as
 * DailyLog's layout="sheet", the same onAnswer calls; nothing is saved.
 */
import React, { forwardRef, useCallback, useRef, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { ChoiceList, Text, TextLink, space, spacing } from "../../design-system";
import { DayDone } from "../../components/Pack/DayDone";
import type { DayDoneAnswer, DayDoneHandle } from "../../components/Pack/DayDone";

export type DayDoneSample = "goals" | "no-goals" | "next-open" | "long";
export const DAY_DONE_SAMPLES: [DayDoneSample, string][] = [["goals", "With goals"], ["no-goals", "No goals"], ["next-open", "Next day open"], ["long", "Long words"]];

const GOALS = [
  { key: "g1", label: "Say my name on a phone call" },
  { key: "g2", label: "Ask one question in a meeting" },
];
const LONG_GOALS = [
  { key: "g1", label: "Say my name on a phone call to someone I do not know, with no word swapped" },
  { key: "g2", label: "Ask one question in a meeting" },
  { key: "g3", label: "Order my coffee and say the name of the drink I really want" },
];

function GoalsStandIn({ onAnswer, long }: { onAnswer: (kind: DayDoneAnswer) => void; long?: boolean }) {
  const [ticked, setTicked] = useState<string[]>([]);
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <View style={s.goals}>
      <Text variant="h2" color="primary" style={s.question}>Did any of these happen?</Text>
      <View style={s.list}>
        <ChoiceList multiple options={long ? LONG_GOALS : GOALS} selected={ticked}
          onToggle={k => { onAnswer("toggle"); setTicked(p => (p.includes(k) ? p.filter(x => x !== k) : [...p, k])); }} />
      </View>
      {ticked.length === 0 ? <TextLink label="Not yet" onPress={() => { setDismissed(true); onAnswer("dismiss"); }} /> : null}
    </View>);
}

export const DayDoneReal = forwardRef<DayDoneHandle, { sample: DayDoneSample; autoPlay?: boolean; sound?: boolean; onHome: () => void; insets?: { top: number; bottom: number } }>(
  function DayDoneReal({ sample, autoPlay, sound, onHome, insets }, ref) {
    // web: the phone screen is a box inside the browser window; Pip's effects need to know where it is
    const root = useRef<View>(null);
    const [screen, setScreen] = useState<{ x: number; y: number; width: number; height: number } | undefined>(undefined);
    const measure = useCallback(() => {
      if (Platform.OS !== "web") return;
      root.current?.measureInWindow((x, y, width, height) => { if ([x, y, width, height].every(Number.isFinite)) setScreen(o => (o && o.x === x && o.y === y && o.width === width && o.height === height ? o : { x, y, width, height })); });
    }, []);
    const long = sample === "long";
    const goalsSlot = useCallback(({ onAnswer }: { onAnswer: (kind: DayDoneAnswer) => void }) => <GoalsStandIn onAnswer={onAnswer} long={long} />, [long]);
    return (
      <View ref={root} onLayout={measure} style={StyleSheet.absoluteFill}>
        <DayDone ref={ref} autoPlay={autoPlay} sound={sound} screen={screen} insets={insets}
          heading={long ? "Day 12 done" : "Day 2 done"}
          closeLine={sample === "next-open" ? null : long ? "Day 13 opens tomorrow morning, at about 6 o'clock your time." : "Day 3 opens tomorrow morning."}
          nextTitle={sample === "next-open" ? null : long ? "Say it your way, or not at all: the choice that is always yours" : "Say it your way, or not at all"}
          onNext={sample === "next-open" ? onHome : null}
          goalsSlot={sample === "no-goals" ? null : goalsSlot}
          onHome={onHome} />
      </View>);
  });

const s = StyleSheet.create({
  goals: { gap: space.rowGap, width: "100%", alignItems: "center" },
  question: { alignSelf: "stretch", paddingHorizontal: spacing.sm, marginBottom: spacing.xs },
  list: { alignSelf: "stretch" },
});
