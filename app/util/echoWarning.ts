/**
 * The "echo_warning" message from the server: the microphone keeps hearing
 * the call. The call screen shows a calm line of text for a few seconds, once
 * per call. No sound, no vibration, no modal.
 */
export const ECHO_WARNING_TEXT = "Lower your volume a bit.";
export const ECHO_WARNING_VISIBLE_MS = 8000;

/** Pure: should this echo_warning message show the banner? Once per call. */
export function shouldShowEchoWarning(alreadyShown: boolean): boolean {
  return !alreadyShown;
}

/** Pure: is the banner still visible `elapsedMs` after it was shown? */
export function isEchoWarningVisible(elapsedMs: number): boolean {
  return elapsedMs >= 0 && elapsedMs < ECHO_WARNING_VISIBLE_MS;
}
