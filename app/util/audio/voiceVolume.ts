/**
 * Playback volume of the call's voice.
 *
 * The server measures how loud each voice is and sends the volume (0..1)
 * that brings it to the same level (about -22 LUFS): `volume` on
 * `play_stream`, `fillers` and `handover`. A loud voice played at full volume
 * leaked from Bluetooth headphones into the phone's microphone in a real-phone
 * test (2026-10-02), and the AI heard its own words as the caller's.
 *
 * - `play_stream` carries the volume of the voice expected to speak the line.
 * - `fillers` carries the volume of the voice that really speaks; if it
 *   differs (the provider failed over), the reply that is playing is
 *   corrected.
 * - `handover` carries the OLD voice's volume for its clip.
 * A missing or invalid volume (an older server) means 1: full volume, as before.
 */

/** A volume from the server, or null when it is missing or invalid. */
export function parseVoiceVolume(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  return Math.min(1, value);
}

/** The volume to play at: the server's value, or 1 when it sent none. */
export function voiceVolumeOrDefault(value: unknown): number {
  return parseVoiceVolume(value) ?? 1;
}

/**
 * The new volume for the reply that is playing when a `fillers` event
 * arrives, or null when nothing changes (no volume sent, or the same one).
 */
export function volumeCorrection(current: number, incoming: unknown): number | null {
  const next = parseVoiceVolume(incoming);
  if (next === null || Math.abs(next - current) < 0.005) return null;
  return next;
}
