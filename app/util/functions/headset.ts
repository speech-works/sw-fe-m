import { Platform } from "react-native";
import DeviceInfo from "react-native-device-info";
import { ALLOW_SIMULATOR_HEADSET_BYPASS } from "../../constants/features";

/* ██████████████████████████████████████████████████████████████████████████
   TEMPORARY — UI TESTING ONLY. REMOVE THIS BLOCK.

   Mayank asked for the headphone gate to be off so the first-call screens can
   be walked through without headphones (2026-07-28). It is deliberately NOT
   wired to `ALLOW_SIMULATOR_HEADSET_BYPASS`, because that flag only bypasses on
   a detected emulator and would leave the gate stuck anywhere else.

   `__DEV__` is compiled to false in a release build, so this cannot ship
   enabled even if it is forgotten — but it should still be deleted, not left
   to rely on that. Restore by removing this whole block.

   Turning it off gates BOTH places at once: the HeadphoneGate screen and
   CallingWidget's own pre-call check, which share this one function.
   ██████████████████████████████████████████████████████████████████████████ */
const TEMP_SKIP_HEADSET_CHECK = true;

export async function isHeadsetConnected(): Promise<boolean> {
  if (__DEV__ && TEMP_SKIP_HEADSET_CHECK) return true;

  if (Platform.OS === "web") return true;

  try {
    if (ALLOW_SIMULATOR_HEADSET_BYPASS) {
      const isEmulator = await DeviceInfo.isEmulator();
      if (isEmulator) return true;
    }

    return await DeviceInfo.isHeadphonesConnected();
  } catch (error) {
    console.error("Error checking headset connection:", error);
    // Enforce headset-only audio flows unless we can positively confirm access.
    return false;
  }
}
