import * as Clipboard from "expo-clipboard";

/**
 * Copy a string to the system clipboard.
 *
 * Resolves TRUE only once the platform confirms the write, so callers can show
 * "Copied" on the strength of something that actually happened rather than on
 * the fact that a function was called.
 */
export const copyToClipboard = async (value: string): Promise<boolean> => {
  if (!value) return false;
  try {
    return await Clipboard.setStringAsync(value);
  } catch (error) {
    console.error("[clipboard] copy failed:", error);
    return false;
  }
};
