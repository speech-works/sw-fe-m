/**
 * THE PRE-CALL GATE, decision only. Headphones first, then volume.
 *
 * Echo happens when the headphone volume is high; at about half the phone's
 * media volume calls work. Software guards cannot fully fix it, so we ask for
 * a lower volume. Constants live here and nowhere else.
 */
export const VOLUME_LIMIT = 0.6;
export const VOLUME_TARGET = 0.5;

export type CallGateStep = "need_headset" | "need_lower_volume" | "ok";

/**
 * Pure. Volume is looked at only after a headset is found. A volume we could
 * not read (null) never blocks the call.
 */
export function decideCallGate(
  volume: number | null,
  limit: number,
  headsetConnected: boolean,
): CallGateStep {
  if (!headsetConnected) return "need_headset";
  if (volume === null || !Number.isFinite(volume)) return "ok";
  return volume > limit ? "need_lower_volume" : "ok";
}

export const CALL_GATE_COPY = {
  headset: "Connect headphones to take this call.",
  volume:
    "Keep the volume at half. We are improving this feature, and for now calls work best at a lower volume.",
  lowerForMe: "Lower it for me",
  iLowered: "I lowered it",
  stillLoud: "Still a bit loud.",
} as const;
