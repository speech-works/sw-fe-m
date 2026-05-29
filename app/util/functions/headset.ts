import { Platform } from "react-native";
import DeviceInfo from "react-native-device-info";
import { ALLOW_SIMULATOR_HEADSET_BYPASS } from "../../constants/features";

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
