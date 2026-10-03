import { NativeModules, Platform } from "react-native";

/**
 * Thin wrapper around react-native-volume-manager, so the rest of the app (and
 * the tests) never touch the native module. Every function is safe to call
 * anywhere: when the module is missing (web, an old dev build) or a call
 * fails, we return null / false and the caller carries on. A volume check must
 * never be the reason a call cannot start.
 */

function manager(): {
  getVolume: () => Promise<number | { volume: number }>;
  setVolume: (value: number, config?: { showUI?: boolean }) => Promise<void> | void;
} | null {
  if (Platform.OS === "web") return null;
  try {
    if (!(NativeModules.VolumeManager || NativeModules.RNVolumeManager)) {
      return null;
    }
    return require("react-native-volume-manager").VolumeManager;
  } catch {
    return null;
  }
}

/** Media volume from 0 to 1, or null when it cannot be read. */
export async function getSystemVolume(): Promise<number | null> {
  try {
    const vm = manager();
    if (!vm) return null;
    const res = await vm.getVolume();
    const value = typeof res === "number" ? res : res?.volume;
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

/** Sets the media volume (0 to 1) without the system slider. True if it ran. */
export async function setSystemVolume(value: number): Promise<boolean> {
  try {
    const vm = manager();
    if (!vm) return false;
    await vm.setVolume(value, { showUI: false });
    return true;
  } catch {
    return false;
  }
}
