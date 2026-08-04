import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * The Android navigation-bar inset — and **0 on iOS, deliberately**.
 *
 * Add this to any chrome that is anchored to the bottom of the *window* with a
 * fixed offset (a floating dock, a pinned footer, a FAB slot). It keeps that
 * chrome in exactly the same visual position it occupied before edge-to-edge.
 *
 * Why the platform gate, when `insets.bottom` reads correctly on both:
 *
 *  - **Android.** Before edge-to-edge the window stopped above the nav bar, so
 *    `insets.bottom` was 0 and `bottom: 30` meant "30 above the nav bar". Now the
 *    window spans the whole screen and `bottom: 30` means "30 from the screen
 *    edge" — straight under the bar. Measured: 24dp gesture, 48dp 3-button.
 *    Adding the inset back restores the original position exactly.
 *
 *  - **iOS.** `insets.bottom` has ALWAYS been ~34 on home-indicator devices, and
 *    these offsets were tuned against that. Adding it again would shift every
 *    dock up by 34pt — changing a platform this migration does not touch. So iOS
 *    keeps whatever it renders today, untouched.
 *
 * Do NOT use this for values already written as `insets.bottom + x` or
 * `Math.max(insets.bottom, x)`; those are correct on both platforms already.
 */
export const useNavBarInset = (): number => {
  const insets = useSafeAreaInsets();
  return Platform.OS === "android" ? insets.bottom : 0;
};
