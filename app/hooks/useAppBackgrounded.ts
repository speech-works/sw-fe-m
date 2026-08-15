import { useEffect, useState } from "react";
import { AppState, AppStateStatus } from "react-native";

/**
 * True while the app is in the background.
 *
 * Feed this into a tool's `muteLogic` flag rather than switching the tool off.
 * `useMetronome` and `useDAF` both treat muteLogic as PAUSE: they tear down the
 * interval and the audio session but leave `isPlaying` / `isDAFActive` alone, so
 * the tool restarts by itself when the app returns. That property is the whole
 * point of doing it this way. An earlier attempt switched the tools off on
 * background, and because "off" is permanent, one spurious signal killed the
 * metronome the moment the user pressed record. A pause that fires wrongly
 * costs a second of silence and then heals itself.
 *
 * "background" only, never "inactive". On iOS `inactive` is a passing state the
 * app enters while still on screen: Control Centre, the app switcher, an
 * incoming-call banner, and any system permission dialog — including the
 * microphone prompt that DAF and the recorder both trigger. The user has not
 * left in any of those cases.
 *
 * Why this exists at all when iOS already stops background audio: iOS silences
 * it because the app does not declare UIBackgroundModes, but Android has no
 * such rule and would happily keep the metronome ticking in a pocket. This
 * makes both platforms behave the same way.
 */
export function useAppBackgrounded(): boolean {
  const [backgrounded, setBackgrounded] = useState(
    AppState.currentState === "background",
  );

  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      setBackgrounded(state === "background");
    };
    const subscription = AppState.addEventListener("change", onChange);
    return () => subscription.remove();
  }, []);

  return backgrounded;
}
