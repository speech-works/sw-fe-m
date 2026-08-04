import { FaceRegion } from "../../types";
import { Tier } from "./types";
import { NOT_A_DIAGNOSIS } from "../../copy";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Mirror Work reflection copy banks.
 *
 * NSA-COMPLIANT VOICE (must hold for every string here):
 *   • No severity numbers, no diagnosis, no clinical labels.
 *   • Soft, supportive, Van Riper "noticing → choice" framing.
 *   • Tier-A regions get firm observations; Tier-B/C regions hedge ("may have").
 *
 * CLINICALLY APPROVED 2026-08-04. These are no longer "reasonable starters" —
 * they have been through review. Changing the WORDING here needs another pass;
 * punctuation and typos do not.
 *
 * ONE RULE THE REVIEW ADDED: wherever a line says "ease", "relaxed", "settled"
 * or "steady", the sentence must make clear it is describing the FACE. This
 * feature measures facial tension, and the same words read as a claim about
 * someone's speech if left floating. Anchor them ("your face looks...", "a
 * mostly relaxed face"), rather than adding a disclaimer.
 *
 * {freq} is the only slot — replaced by a frequency phrase ("a few times").
 * ─────────────────────────────────────────────────────────────────────────────
 */

// Confidence tier per region — drives both wording firmness and UI styling.
// Mirrors the detection tiers: mouth signals + blink are high-reliability (A),
// brow/cheek/nose are softer (B), head/gaze are informational (C).
export const REGION_TIER: Record<FaceRegion, Tier> = {
  [FaceRegion.MOUTH]: "A",
  [FaceRegion.EYES]: "A",
  [FaceRegion.BROW]: "B",
  [FaceRegion.CHEEKS]: "B",
  [FaceRegion.NOSE]: "B",
  [FaceRegion.HEAD]: "C",
};

export type MoodKey =
  | "firstSession"
  | "calm"
  | "mostlyAtEase"
  | "someToNotice"
  | "heldTension"
  | "eased";

export const MOOD_LABELS: Record<MoodKey, string[]> = {
  firstSession: ["A gentle start", "Your first look", "Setting a baseline", "Getting acquainted"],
  calm: ["Calm and settled", "A still expression", "Quiet and relaxed", "Relaxed throughout"],
  mostlyAtEase: ["A mostly relaxed face", "Largely relaxed", "Pretty settled", "Relaxed, mostly"],
  someToNotice: ["A little to notice", "A few things to notice", "Some gentle signals", "Worth a closer look"],
  heldTension: ["Some tension to notice", "Carrying a bit today", "A heavier session", "More to notice today"],
  eased: ["Found your footing", "Softened as you went", "Settled as you went", "Loosened up"],
};

// ── Opening lines (used when there's no cross-session comparison) ──
export const OPENING_FIRST = [
  "Welcome to your first mirror session. This is just a baseline to notice from.",
  "First session done. There's nothing to get right here, only to notice.",
  "This is your starting point. A calm look at what your face does when you speak.",
  "Your first mirror. No score, no goal, just a memory to build on.",
];

export const OPENING_RETURNING = [
  "Good to be back at the mirror with you.",
  "Another session in. Every look adds to what you notice.",
  "Back for another look. That consistency is the real work.",
  "Here again. Showing up is most of it.",
];

// ── Cross-session progress ("since last time") ──
export const PROGRESS_IMPROVED = [
  "Since last time, your face looks more relaxed overall.",
  "Compared with your last session, your face is carrying a little less.",
  "You're carrying less than you were last time. Nice to see.",
  "A touch more settled than your previous session.",
];

export const PROGRESS_STEADY = [
  "Your face looks about the same as last time. A steady baseline.",
  "Roughly in step with your last session.",
  "Your face is holding steady from last time.",
  "Much like your previous session. Consistency counts.",
];

export const PROGRESS_TENSER = [
  "A bit more came up than last time. Some sessions are just heavier, and that's okay.",
  "Today held a little more than your last session. Days vary.",
  "Slightly more to notice than last time. Nothing unusual about that.",
  "A heavier session than your last one. That happens, and noticing it is the point.",
];

// ── Milestones ──
// NOTE: copy is "recent"-framed, not all-time — the milestone flags compare
// only to the recent comparison window (~last 5 sessions), so claims like
// "ever" / "to date" would over-state.
export const MILESTONE_CALMEST = [
  "One of your calmer sessions lately.",
  "One of the more relaxed your face has looked recently.",
  "A notably relaxed session next to your recent ones.",
  "Calmer than your last few. Nice to see.",
];

export const MILESTONE_LONGEST = [
  "Your longest session in a while.",
  "You stayed with it longer than your recent sessions.",
  "A longer look in the mirror than lately.",
  "More time noticing than your last few sessions.",
];

// ── Within-session arc ──
export const ARC_EASED = [
  "There was more to notice early on, but you settled as it went. Calmest in the final stretch.",
  "You loosened up over the session; your face was calmest at the end.",
  "Whatever you carried at the start, you let go of by the end.",
  "You found your footing partway through, and your face softened from there.",
];

export const ARC_TENSED = [
  "You started relaxed; a little more crept in toward the end.",
  "Your face started calm. Some tension built as you went.",
  "Calm to begin with, then a bit more to notice later on.",
  "More showed up in the second half than the first.",
];

export const ARC_MIXED = [
  "Tension came and went across the session.",
  "Your face loosened and tightened by turns. Some stretches looser than others.",
  "A mixed picture through the session, rising and settling.",
  "You moved in and out of tension as you went.",
];

// ── Calm fallback (nothing notable came up) ──
export const CALM = [
  "Nothing really stood out today. Your face stayed at ease.",
  "A quiet session; no tension patterns came up.",
  // Was "Mostly smooth sailing." An idiom about the session, but "smooth" is
  // the single most loaded word we could put next to a description of someone
  // speaking. Opening chosen to stay distinct from the other three in this
  // pool — it is a rotation, so two entries starting the same way waste a slot.
  "A calm one today. Little to flag this time.",
  "Your face stayed relaxed throughout. Quiet sessions count too.",
];

// ── Encouragement (Van Riper "noticing → choice") ──
export const ENCOURAGEMENT = [
  "Noticing is the whole game, and you're doing it.",
  "Every time you notice a pattern, you get a little more choice over it.",
  "The calm you're finding is something you're building, not luck.",
  // Was "Awareness is the first step to ease" — ambiguous about WHAT gets
  // easier, with nothing in the sentence to anchor it to the face.
  "Awareness is where it starts. You did that today.",
  "Showing up and looking honestly. That's the hard part, and you did it.",
];

// ── Caveat footnote (rotated so even the disclaimer stays fresh) ──
export const CAVEAT = [
  NOT_A_DIAGNOSIS,
  "This isn't a verdict on your speech. Just a gentle reflection of what your face did.",
  "Not a diagnosis, just a mirror. What you notice here is yours to use.",
];

// ── Region observations (voiced per region's tier; {freq} slot) ──
// Only "someTension" and "heldTension" bands are ever surfaced.
export const REGION_OBSERVATION: Record<FaceRegion, Record<"someTension" | "heldTension", string[]>> = {
  [FaceRegion.MOUTH]: {
    someTension: [
      "Your jaw and lips tightened {freq} today.",
      "A little tension around your mouth, {freq}.",
      "Your jaw held on {freq} as you spoke.",
      "Some gripping around the lips and jaw, {freq}.",
    ],
    heldTension: [
      "Your jaw and lips carried real tension {freq} today.",
      "There was firm holding around your mouth {freq}.",
      "Your jaw stayed tight {freq}. A clear pattern this session.",
      "A lot was happening around your lips and jaw, {freq}.",
    ],
  },
  [FaceRegion.EYES]: {
    someTension: [
      "Your eyes tensed or blinked hard {freq}.",
      "A little strain around your eyes, {freq}.",
      "Your eyes worked a bit harder {freq} today.",
      "Some squeezing or rapid blinking, {freq}.",
    ],
    heldTension: [
      "Your eyes blinked hard or squeezed shut {freq} today.",
      "Real tension around your eyes, {freq}.",
      "Your eyes carried a lot {freq} this session.",
      "A clear pattern of eye strain, {freq}.",
    ],
  },
  [FaceRegion.BROW]: {
    someTension: [
      "You may have held a little tension in your brow, {freq}.",
      "Your forehead seemed to tighten {freq}.",
      "Possibly some brow tension, {freq}.",
      "Your brow may have furrowed {freq} today.",
    ],
    heldTension: [
      "You may have carried real tension in your brow {freq}.",
      "Your forehead looked tight {freq} this session.",
      "There seemed to be a lot in your brow, {freq}.",
      "Your brow may have stayed furrowed {freq} today.",
    ],
  },
  [FaceRegion.CHEEKS]: {
    someTension: [
      "Your cheeks may have puffed {freq}.",
      "Possibly a little air held in your cheeks, {freq}.",
      "Your cheeks seemed to fill {freq} today.",
      "Maybe some cheek tension, {freq}.",
    ],
    heldTension: [
      "Your cheeks may have puffed firmly {freq} today.",
      "There seemed to be repeated cheek puffing, {freq}.",
      "Your cheeks looked to hold air {freq} this session.",
      "A possible pattern of cheek puffing, {freq}.",
    ],
  },
  [FaceRegion.NOSE]: {
    someTension: [
      "Your nose may have tensed {freq}.",
      "Possibly a little flaring around the nose, {freq}.",
      "Some nose tension may have shown {freq}.",
      "Your nostrils may have flared {freq} today.",
    ],
    heldTension: [
      "Your nose may have tensed noticeably {freq} today.",
      "There seemed to be repeated nostril flaring, {freq}.",
      "Your nose looked to work {freq} this session.",
      "A possible pattern of nose tension, {freq}.",
    ],
  },
  [FaceRegion.HEAD]: {
    someTension: [
      "There were a few head movements {freq} (just an observation).",
      "Your head shifted {freq}. Easy to do while thinking.",
      "Some head movement showed up {freq}.",
      "A little head motion, {freq}. Nothing to read into.",
    ],
    heldTension: [
      "There was noticeable head movement {freq} today (just an observation).",
      "Your head moved a fair bit {freq} this session.",
      "Repeated head motion showed up {freq}.",
      "A pattern of head movement, {freq}. Purely informational.",
    ],
  },
};
