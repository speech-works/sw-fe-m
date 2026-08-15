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
 * SUBMIT IS THE ONLY TRIGGER, deliberately. An earlier version also stopped the
 * tools when the screen lost focus and when the app reported itself
 * backgrounded. That broke the feature: the metronome died the moment the user
 * pressed record, which is exactly when it is needed, because reading aloud to
 * a beat while recording is the point of the tool.
 *
 * The lesson worth keeping: tools are switched OFF here, not paused, so a false
 * trigger is not a brief gap in sound, it kills the tool until the user taps it
 * again. That makes every additional trigger expensive. Do not add one without
 * testing it on a real device against a real recording.
 *
 * Leaving the screen is already covered elsewhere: `useMetronome` and `useDAF`
 * release their interval, sound handle and audio session on unmount, and the
 * reading guide stops speaking when its component unmounts.
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
