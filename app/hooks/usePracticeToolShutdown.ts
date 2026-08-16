import { useCallback, useEffect, useRef } from "react";

/**
 * Switches the practice tools (metronome, DAF, reading guide) off once the
 * activity has been submitted.
 *
 * WHY THIS EXISTS: every practice screen ends with an early return —
 * `if (practiceComplete) return <DonePractice />` — which swaps the UI but
 * leaves the screen component MOUNTED. The tool hooks live on the screen, not
 * inside the tool components, so `useMetronome`'s interval kept firing and
 * `useDAF` kept processing microphone audio underneath the Done screen. The
 * tick only stopped once the user navigated away and the screen unmounted.
 *
 * TRIGGERS ARE DELIBERATELY NARROW. An earlier version also stopped the tools
 * when the screen lost FOCUS and when the app reported itself backgrounded.
 * That broke the feature: the metronome died the moment the user pressed
 * record, which is exactly when it is needed, because reading aloud to a beat
 * while recording is the point of the tool.
 *
 * The lesson worth keeping: tools are switched OFF here, not paused, so a false
 * trigger is not a brief gap in sound, it kills the tool until the user taps it
 * again. That makes every additional trigger expensive. Do not add one without
 * testing it on a real device against a real recording.
 *
 * `inactive` clears that bar, and the regression above is not an argument
 * against it. What killed the metronome then was AppState reporting `inactive`,
 * which iOS raises for the system microphone prompt while the screen is still
 * right there, and `useAppBackgrounded` now ignores it for exactly that reason.
 * Navigation focus is a different signal: no permission dialog, sheet or
 * recording moves it.
 *
 * Unmounting is covered elsewhere: `useMetronome` and `useDAF` release their
 * interval, sound handle and audio session on unmount, and the reading guide
 * stops speaking when its component unmounts. That covers popping a pushed
 * screen, and nothing else. A screen that is navigated AWAY from rather than
 * back out of stays mounted with every tool still running, which is what
 * `inactive` is for.
 */
type ToggleableTool = {
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
};

type PracticeToolShutdownArgs = {
  /**
   * True once the activity has been submitted and the Done screen is showing.
   * Optional, for screens with no completion state of their own — the Library
   * drill page advances through items and is left by navigating back, so
   * unmount already covers it and this hook has nothing to do there.
   */
  practiceComplete?: boolean;
  /**
   * True when the page is still mounted but is no longer what the user is
   * looking at. Two ways that happens on the Library technique page, and it
   * leaked audio both ways:
   *
   *  - its stages (Learn / Practice / Test) sit side by side in a horizontal
   *    pager, so moving off Practice unmounts nothing, and the metronome kept
   *    ticking under the lesson video and the quiz;
   *  - the screen itself is navigated away from rather than popped (the tab bar,
   *    and the mood-check entry point's route home), so it stays mounted and the
   *    tools followed the user onto the Home screen.
   */
  inactive?: boolean;
  /**
   * From `useAppBackgrounded`. Only the reading guide is handled here: the
   * metronome and DAF PAUSE on background through their own `muteLogic` flag
   * and resume by themselves, but speech cannot resume mid-word, so the guide
   * is stopped and the user restarts it with one tap.
   */
  backgrounded?: boolean;
  metronome: ToggleableTool;
  daf: { isDAFActive: boolean; stopDAF: () => void };
  guide: ToggleableTool;
};

export function usePracticeToolShutdown({
  practiceComplete,
  inactive,
  backgrounded,
  metronome,
  daf,
  guide,
}: PracticeToolShutdownArgs) {
  // Read the tools through a ref so the effect depends only on
  // `practiceComplete` and cannot re-run on an unrelated render.
  const latest = useRef({ metronome, daf, guide });
  latest.current = { metronome, daf, guide };

  const silence = useCallback(() => {
    const tools = latest.current;
    if (tools.metronome.isPlaying) tools.metronome.setIsPlaying(false);
    if (tools.daf.isDAFActive) tools.daf.stopDAF();
    if (tools.guide.isPlaying) tools.guide.setIsPlaying(false);
  }, []);

  useEffect(() => {
    if (practiceComplete) silence();
  }, [practiceComplete, silence]);

  // Leaving the page switches the tools OFF rather than pausing them: coming
  // back to a stage minutes later and having a metronome start ticking on its
  // own is worse than tapping it again, and the same argument that keeps DAF
  // from resuming after a background applies to the microphone here.
  useEffect(() => {
    if (inactive) silence();
  }, [inactive, silence]);

  // Background behaviour differs by tool, on purpose.
  //
  // The metronome and the guide only make sound, so they pause and come back on
  // their own. The metronome does it through its own `muteLogic` flag. The guide
  // has no such flag — its only control is `isPlaying` — so remember that it was
  // speaking, switch it off, and switch it back on when the app returns.
  // VoiceHover keeps its place and carries on from the sentence it was on
  // instead of restarting the passage.
  //
  // DAF is deliberately NOT resumed. It listens through the microphone, and a
  // microphone that switches itself back on without the user doing anything is
  // not acceptable, whatever the screen happens to show. `stopDAF` clears its
  // on/off state, so returning to the screen leaves it off until tapped.
  const guideWasPlaying = useRef(false);
  useEffect(() => {
    const { guide: g, daf: d } = latest.current;
    if (backgrounded) {
      guideWasPlaying.current = g.isPlaying;
      if (g.isPlaying) g.setIsPlaying(false);
      if (d.isDAFActive) d.stopDAF();
      return;
    }
    if (guideWasPlaying.current) {
      guideWasPlaying.current = false;
      g.setIsPlaying(true);
    }
  }, [backgrounded]);
}
