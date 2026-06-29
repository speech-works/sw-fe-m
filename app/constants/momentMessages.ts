import { MomentId, MomentValence } from "../api/threads/types";
import colors from "../Theme/colors";
import { icons } from "../design-system/icons";
import type { IconName } from "../design-system/components/Icon";

/**
 * "Share a moment" catalog — a COMPACT, BROAD set of states (deliberately general, not specific
 * events, so the list stays short and never bloats). NSA-aligned: frames the *experience*, never
 * fluency, non-pathologising. The two `sensitive` struggles trigger the "Reach out" support flow
 * + a gentle 988 prompt. Struggle gradients are soft/cool (non-alarming); win gradients are warm.
 * This is a FIXED, safety-reviewed vocabulary → it lives in app config, not the DB.
 */
export interface MomentMessage {
  id: MomentId;
  valence: MomentValence;
  /** Feather icon from the DS registry — the consistent visual for this moment. */
  icon: IconName;
  emoji: string;
  text: string;
  sensitive?: boolean;
  gradient: readonly [string, string, ...string[]];
}

export const MOMENT_MESSAGES: MomentMessage[] = [
  // ── Wins (warm; courage / effort / openness, never fluency) ──
  { id: "a_win", valence: "win", icon: icons.win, emoji: "✨", text: "A win today", gradient: [colors.green[300], colors.green[500]] },
  { id: "faced_a_fear", valence: "win", icon: icons.courage, emoji: "🦁", text: "Faced a fear", gradient: [colors.orange[400], colors.orange[600]] },
  { id: "spoke_up", valence: "win", icon: icons.spokeUp, emoji: "🙌", text: "Spoke up today", gradient: [colors.orange[400], colors.orange[500]] },
  { id: "proud_moment", valence: "win", icon: icons.proud, emoji: "🌟", text: "Proud of a moment", gradient: [colors.green[300], colors.green[500]] },
  // ── Struggles (soft, cool, non-alarming) ──
  { id: "tough_day", valence: "struggle", icon: icons.toughDay, emoji: "🌧️", text: "Tough day", gradient: [colors.blue[300], colors.blue[400]] },
  { id: "anxious", valence: "struggle", icon: icons.anxious, emoji: "😬", text: "Feeling anxious", gradient: [colors.purple[300], colors.purple[400]] },
  { id: "really_struggling", valence: "struggle", icon: icons.struggling, emoji: "💔", text: "Really struggling right now", sensitive: true, gradient: [colors.blue[400], colors.purple[400]] },
  { id: "weighed_down", valence: "struggle", icon: icons.heavy, emoji: "💧", text: "Everything feels heavy", sensitive: true, gradient: [colors.blue[400], colors.purple[400]] },
];

/** Resolve a moment by id, falling back to the first entry (safe). */
export const getMoment = (id: MomentId): MomentMessage =>
  MOMENT_MESSAGES.find((m) => m.id === id) ?? MOMENT_MESSAGES[0];

/** All moments of a given valence, in catalog order (for the composer's grouped lists). */
export const momentsByValence = (v: MomentValence): MomentMessage[] =>
  MOMENT_MESSAGES.filter((m) => m.valence === v);
