import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

/**
 * Height of the on-screen keyboard — and **0 on iOS, deliberately**.
 *
 * Add this to chrome pinned to the bottom of the *window* that must stay above
 * the keyboard: specifically `Page`'s absolutely-positioned footer, which sits
 * OUTSIDE the `KeyboardAvoidingView` (that only wraps the scrolling body) and so
 * is not moved by it.
 *
 * Why this is needed at all: before edge-to-edge, `adjustResize` shrank the
 * whole window when the IME opened, so `position:"absolute", bottom: 0` landed
 * above the keyboard for free. Edge-to-edge stops the window resizing, so
 * `bottom: 0` is now the bottom of the SCREEN and the keyboard draws straight
 * over the footer — verified on an API 36 emulator, where the keyboard covered
 * "Save Reminder" on ConfigureReminder.
 *
 * Why iOS is excluded: iOS never resized its window either, so its footers
 * behave exactly as they always have. Applying this there would move them for
 * the first time — a change to a platform this migration does not touch.
 *
 * `keyboardDidShow`/`Hide` (not `Will*`) because only the Did* pair fires on
 * Android; the endCoordinates height already excludes the nav bar.
 */
export const useKeyboardInset = (): number => {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    const show = Keyboard.addListener("keyboardDidShow", (e) =>
      setHeight(e.endCoordinates?.height ?? 0),
    );
    const hide = Keyboard.addListener("keyboardDidHide", () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return Platform.OS === "android" ? height : 0;
};
