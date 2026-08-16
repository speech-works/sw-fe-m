import { Audio } from "expo-av";

/**
 * Put the iOS audio session into plain playback before making a sound.
 *
 * TWO SEPARATE FAILURES, BOTH SILENT, BOTH ALREADY SEEN IN THIS APP.
 *
 * 1. THE RINGER SWITCH. `playsInSilentModeIOS` defaults to FALSE, which leaves
 *    the session in an ambient category that the hardware silent switch mutes.
 *    A great many people leave that switch on permanently, so without this the
 *    audio does not fail, it just never arrives, with no error to notice.
 *
 * 2. A RECORDING SESSION LEFT BEHIND. The practice recorder, DAF and the call
 *    widget all set `allowsRecordingIOS: true`, and the session is global and
 *    sticky. Playing into PlayAndRecord opens an input route as well as an
 *    output one and fails to start on iOS ("Prime failed -66680"), loudest on
 *    the Simulator where there is no microphone at all. Forcing it back to
 *    playback is what keeps a player from inheriting somebody else's mode.
 *
 * Named and shared rather than copy-pasted because both causes are easy to fix
 * in one place and easy to forget in a new one, which is exactly what happened
 * to the two Difficult Sounds pickers.
 */
export async function ensurePlaybackSession(): Promise<void> {
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
    });
  } catch {
    // Never block playback on this. A failure here means the session stayed as
    // it was, which is the behaviour we had before, not a new problem.
  }
}
