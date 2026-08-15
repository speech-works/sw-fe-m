import { useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";
import { useIsFocused } from "@react-navigation/native";

/**
 * Silences the three practice tools (metronome, DAF, reading guide) whenever
 * the user is no longer actually practising.
 *
 * WHY THIS EXISTS: every practice screen finishes with an early return —
 * `if (practiceComplete) return <DonePractice />` — which swaps the UI but
 * leaves the screen component MOUNTED. The tool hooks live on the screen, not
 * inside the tool components, so `useMetronome`'s interval kept firing and
 * `useDAF` kept processing mic audio underneath the Done screen. The tick only
 * stopped when the user navigated away and the screen finally unmounted.
 *
 * Blur is the same class of bug and is easy to miss: pushing another screen, or
 * switching tabs, does NOT unmount a stack screen. The reading guide is the
 * clearest case — it stops itself on completion, because the component sits in
 * the tree that the early return replaces, but on blur it stays mounted and
 * keeps speaking over whatever the user opened next.
 *
 * These tools are turned OFF rather than muted. Muting would leave `isPlaying`
 * true, so the sound would restart by itself when the user came back — startling
 * on the metronome, and worse on DAF, which would resume capturing microphone
 * audio without anyone asking for it. One tap re-enables either.
 *
 * Unmount is deliberately NOT handled here. `useMetronome` and `useDAF` already
 * clean up their own interval, sound handle and audio session on unmount, and
 * setting state during teardown would only produce a no-op.
 */
type ToggleableTool = {
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
};

type PracticeToolShutdownArgs = {
  /**
   * True once the activity has been submitted and the Done screen is showing.
   * Omit on screens that have no completion state of their own — the Library
   * drill page, for instance, advances through items and is left by navigating
   * back, so only the focus and background guards apply to it.
   */
  practiceComplete?: boolean;
  metronome: ToggleableTool;
  daf: { isDAFActive: boolean; stopDAF: () => void };
  guide: ToggleableTool;
};

export function usePracticeToolShutdown({
  practiceComplete,
  metronome,
  daf,
  guide,
}: PracticeToolShutdownArgs) {
  const isFocused = useIsFocused();

  // Read the tools through a ref so `silence` stays referentially stable. If it
  // changed on every render the AppState listener would be town down and re-added
  // constantly, and the focus/completion effects would re-run for no reason.
  const latest = useRef({ metronome, daf, guide });
  latest.current = { metronome, daf, guide };

  const silence = useCallback(() => {
    const tools = latest.current;
    // Each guard matters: calling a setter unconditionally on every focus change
    // would queue a state update on a screen that is already idle.
    if (tools.metronome.isPlaying) tools.metronome.setIsPlaying(false);
    if (tools.daf.isDAFActive) tools.daf.stopDAF();
    if (tools.guide.isPlaying) tools.guide.setIsPlaying(false);
  }, []);

  // 1. The activity was submitted. The Done screen must be silent.
  useEffect(() => {
    if (practiceComplete) silence();
  }, [practiceComplete, silence]);

  // 2. The screen lost focus but is still mounted — a pushed screen or a tab switch.
  useEffect(() => {
    if (!isFocused) silence();
  }, [isFocused, silence]);

  // 3. The app went to the background. A metronome ticking from a pocket, or a
  //    live microphone, is not something to leave running.
  //
  //    ONLY "background", never "inactive". On iOS `inactive` is a transient
  //    state the app enters while it is still on screen: pulling down Control
  //    Centre, an incoming-call banner, the app switcher — and, critically, any
  //    system permission dialog. Treating `inactive` as "stop" would tear DAF
  //    down at the exact moment the user granted it the microphone, because
  //    that prompt puts the app inactive. The user has not left in any of those
  //    cases, so neither should the tools.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "background") silence();
    });
    return () => subscription.remove();
  }, [silence]);
}
