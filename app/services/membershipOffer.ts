import { EVENT_NAMES } from "../stores/events/constants";

/**
 * ===========================================================================
 * WHAT MEMBERSHIP IS, AS DATA
 * ---------------------------------------------------------------------------
 * Deliberately free of React Native, so the claims on the screen that takes
 * money can be tested without mounting anything. The component that renders
 * this pulls in Reanimated and the whole design system; the sentences do not
 * need to, and a test suite that cannot load is a test suite nobody writes.
 *
 * Icons are KEYS rather than registry values for the same reason. The
 * component resolves them.
 * ===========================================================================
 */

/**
 * ===========================================================================
 * WHAT MEMBERSHIP ACTUALLY INCLUDES
 * ---------------------------------------------------------------------------
 * Three things. Every one of them was read out of the code rather than
 * inherited from the previous copy, because the previous copy sold a fourth.
 *
 * ── THE ONE THAT WAS REMOVED, AND WHY IT MATTERS ───────────────────────────
 * There used to be a "Guided programs" benefit reading `free: "Preview"`,
 * `pro: "All of them"`, and "Every program in the library, start to finish."
 *
 * BOTH HALVES WERE FALSE. Membership grants no programs at all:
 * PackAccessService.resolveAccess only ever asks whether the user holds
 * `pack:<catalogKey>`, and nothing anywhere lets a membership open one.
 * Programs are bought individually, by members and non-members alike. And
 * "Preview" was not a free-tier limit either — GET /packs/{id}/brochure is
 * open to any signed-in user, members included, by design.
 *
 * So somebody paid for the library and received none of it. That is a refund
 * and a one-star review, and it was the single most expensive line in the app.
 * Every screen now says programs are sold separately instead; one line up
 * front costs nothing and prevents exactly that.
 *
 * ── THE ORDER IS THE SALE ──────────────────────────────────────────────────
 * Call LENGTH leads by default, because it is the only place membership wins
 * by a wide margin. The old copy led on call COUNT, which is the one number
 * where FREE WINS: the weekly taster fires whenever the balance hits zero, so
 * a free user ends up with slightly more calls than a member. We were
 * advertising our weakest column and staying quiet about a 3.3x advantage.
 *
 * ── NO COUNTS, DELIBERATELY ────────────────────────────────────────────────
 * Not "24 techniques", not "10 programs". "The whole technique library" stays
 * true as the library grows; a number needs an app release every time it does,
 * and a stale number on a paid screen is the same class of mistake as the
 * program claim above.
 * ===========================================================================
 */
export const MEMBERSHIP_BENEFITS = [
  {
    id: "calls",
    label: "Calls that run to ten minutes",
    iconKey: "ai",
    /** Accent for the row's icon tile. Three different ones, so the list reads
     *  as three distinct things rather than one block of gold. */
    accentKey: "purple",
    /** The row's second line. Six words at most: a row is scanned, not read.
     *  `desc` is the long form, used where a benefit gets a whole card. */
    short: "Four a month, unused ones bank up",
    // PhoneCallConfig: TASTER_HARD_LIMIT_MS is 3 minutes, CALL_HARD_LIMIT_MS is
    // 10. The 3 belongs to the free WEEKLY TASTER specifically, so the sentence
    // says so rather than claiming every free call is three minutes.
    desc: "Your free weekly call stops at three minutes, usually right when it starts to matter. Four member calls a month, and the ones you don't use bank up.",
  },
  {
    id: "library",
    label: "The whole technique library",
    iconKey: "journey",
    accentKey: "info",
    short: "Every technique: lesson, drill, test",
    desc: "Every technique, with its lesson, its drill and its test. New ones are included as they land.",
  },
  {
    id: "practice",
    // "Roughly double" UNDER-CLAIMED, by a lot. Read LevelStages.ts: free is
    // 35 points regenerating at 41 min each, which caps at 5.0 activities a
    // day. A member's pool starts at 80 points at 18 min each — 11.4 a day at
    // the LOWEST level — and reaches 110 at 14 min, or 14.7. That is 2.3x to
    // 2.9x, so "more than double" is true at every level and "roughly double"
    // was quietly selling our own strongest practice number short.
    label: "More than double the daily practice",
    iconKey: "energy",
    accentKey: "warning",
    short: "And the bar refills faster",
    // FREE_STAMINA_CONFIG is 35 max at 7 per activity (about five a day); the
    // level pool is 80 to 110 (about twelve). Both real, both already used on
    // the Payments screen. They must not disagree.
    desc: "About twelve activities a day instead of five, and the bar refills faster, so a good session doesn't stop because it ran out.",
    // Twelve sits at the conservative end of the 11.4-to-14.7 range on purpose.
    // A number on a paid screen should be one we beat, never one we chase.
  },
] as const;

export type MembershipBenefitId = (typeof MEMBERSHIP_BENEFITS)[number]["id"];

/**
 * Which benefit leads, given what the user just touched.
 *
 * The sheet already received a reason and then mostly ignored it, sorting a
 * carousel nobody swipes. Leading with the thing they were just blocked by is
 * the whole point of knowing why it opened.
 *
 * Exported and pure so the mapping can be tested without mounting a modal.
 */
export function leadBenefitFor(eventName: string): MembershipBenefitId {
  if (eventName === EVENT_NAMES.SHOW_STAMINA_UPSELL) return "practice";
  if (eventName === EVENT_NAMES.SHOW_LIBRARY_UPSELL) return "library";
  // SHOW_PREMIUM_UPSELL and anything else: lead with the strongest benefit.
  return "calls";
}

/** The lead benefit first, the rest in their declared order. */
export function orderBenefitsFor(eventName: string) {
  const lead = leadBenefitFor(eventName);
  const first = MEMBERSHIP_BENEFITS.find((b) => b.id === lead)!;
  return [first, ...MEMBERSHIP_BENEFITS.filter((b) => b.id !== lead)];
}

/**
 * The headline, matched to the lead benefit.
 *
 * One sentence each, and none of them claims anything about the user's speech.
 */
export const HEADLINE_FOR: Record<MembershipBenefitId, { title: string; message: string }> = {
  calls: {
    title: "Long enough to get past hello",
    message: "Three minutes is not a conversation. Ten is.",
  },
  library: {
    title: "The drill and the test are the member half",
    message: "Watching a technique is the easy part. Membership is where you practise it.",
  },
  practice: {
    title: "Keep going when it's going well",
    message: "A good session shouldn't stop because the bar ran out.",
  },
};

/**
 * Said on every selling surface, deliberately.
 *
 * Programs are a separate purchase for everyone. Saying so up front is one
 * line, and it is the line that stops somebody buying membership for the
 * library and asking for their money back.
 */
export const PROGRAMS_NOTE = "Programs are sold separately.";

/**
 * ===========================================================================
 * THE ONE FIGURE THAT SELLS THIS
 * ---------------------------------------------------------------------------
 * Three to ten minutes. It is the only column where membership wins by a wide
 * margin, and a comparison people can hold in their head beats any adjective.
 *
 * Both numbers are read from PhoneCallConfig in sw-be-2: TASTER_HARD_LIMIT_MS
 * is three minutes, CALL_HARD_LIMIT_MS is ten. If those move, these move.
 *
 * It is a MINUTES figure and not a count, because count is the one column
 * where free quietly wins: the weekly taster refires whenever the balance hits
 * zero. Putting the count on a hero would be advertising our weakest number.
 * ===========================================================================
 */
export const CALL_LENGTH_FIGURE = {
  from: "3",
  to: "10",
  unit: "minutes per call",
} as const;
