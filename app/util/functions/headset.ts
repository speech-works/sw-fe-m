import { Platform } from "react-native";
import DeviceInfo from "react-native-device-info";
import { ALLOW_SIMULATOR_HEADSET_BYPASS } from "../../constants/features";

/**
 * THE HEADSET GATE. One function, two callers — the HeadphoneGate screen and
 * CallingWidget's own pre-call check — so a change here moves both at once.
 *
 * Headphones are not a nicety on the call flows: without them the agent's voice
 * goes out of the speaker and straight back into the mic, and the user hears
 * themselves echoed while trying to speak. For somebody who stutters that is
 * actively harmful, not just untidy.
 *
 * (A `TEMP_SKIP_HEADSET_CHECK` bypass lived here between 2026-07-28 and
 * 2026-07-29 so the first-call screens could be walked through on a machine
 * with no headphones. Removed.)
 */
export async function isHeadsetConnected(): Promise<boolean> {
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
