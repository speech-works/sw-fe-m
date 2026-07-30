/**
 * Dead-tap detector — the instrument for the "buttons randomly don't respond"
 * bug (Android, reported across Explore, Community, AvatarStudio and others).
 *
 * WHY THIS EXISTS RATHER THAN A FIX. The bug is intermittent, unreproducible on
 * demand, and appears in unrelated places. Every structural theory formed by
 * reading code (animation transforms desyncing touch targets, a scroll wrapper
 * under-reporting content size, edge-bleed overhangs) was individually
 * plausible and none could be confirmed or refuted from source. Shipping a
 * speculative fix for a random bug is untestable by construction: if the ghost
 * stays away for a week we still learn nothing. So: measure first.
 *
 * WE LOG RETRIES, NOT TAPS — THIS IS THE WHOLE DESIGN.
 * A single unanswered tap is worthless as evidence and ruinous as volume: taps
 * into a TextInput, onto a bare TouchableOpacity, or onto empty space to
 * dismiss a keyboard all look identical to a dead tap from here, and there are
 * tens of them per session. What is NOT ambiguous is a person tapping the same
 * spot AGAIN because the first tap did nothing. That is what a stuck button
 * actually looks like from the outside, it is rare, and it is nearly impossible
 * to produce by accident.
 *
 * So nothing is reported until `MIN_ATTEMPTS` unanswered taps land inside
 * `RETRY_RADIUS_PX` of each other within `RETRY_WINDOW_MS`, and each session is
 * capped at `MAX_REPORTS_PER_SESSION`. Expected volume is ZERO events for a
 * healthy session and a handful for a broken one — a few thousand events a
 * month across the whole user base, not hundreds of thousands.
 *
 * KNOWN LIMITATION. Presses are reported by `PressableScale` (which the DS
 * `Button` wraps, so ~64 files) and by `TabDock`. A screen still using a bare
 * `TouchableOpacity` can therefore still produce a false cluster if somebody
 * genuinely double-taps one. `instrumented: false` marks events we cannot
 * vouch for. Judge a screen by its rate against its own baseline, never by raw
 * counts across screens.
 *
 * The geometry flags test the two live theories directly:
 *   `nearTop`  — a status-bar-height overlay was swallowing taps on 4 screens
 *                (fixed 2026-07-30; this confirms whether any remain).
 *   `nearEdge` — AvatarStudio's dock is drawn 16dp outside its parent, and
 *                Android does not hit-test outside a parent's bounds. Clusters
 *                at the left/right margins would confirm it, which is exactly
 *                why that one was left unfixed rather than changed on a guess.
 */
import { track } from "../analytics/postHog";
import { ANALYTICS_EVENTS } from "../analytics/analyticsEvents";

/** Unanswered taps this close together are the same person retrying. */
const RETRY_RADIUS_PX = 44;
/** Beyond this gap it is a new intention, not a retry. */
const RETRY_WINDOW_MS = 2500;
/** Report only from the Nth unanswered tap in a cluster. 2 = "they tried again". */
const MIN_ATTEMPTS = 2;
/** Hard ceiling per app launch, so one pathological session cannot flood. */
const MAX_REPORTS_PER_SESSION = 5;

/** Bumped by every instrumented touchable. Absolute value is meaningless; only
 *  "did this change across one touch" is read. */
let pressCount = 0;

let currentScreen = "unknown";
let screenEnteredAt = Date.now();
let reportsThisSession = 0;

/** The cluster currently being accumulated, if any. */
let cluster: { x: number; y: number; at: number; attempts: number } | null = null;

/** Call from any touchable that successfully fired a press. */
export function notePress(): void {
  pressCount += 1;
  // A real press means whatever they were fighting with just worked — end the
  // cluster so a later, unrelated tap nearby is not folded into it.
  cluster = null;
}

export function readPressCount(): number {
  return pressCount;
}

/** Wired to NavigationContainer's existing onStateChange. */
export function noteScreen(name: string): void {
  if (name === currentScreen) return;
  currentScreen = name;
  screenEnteredAt = Date.now();
  // Clusters never span screens.
  cluster = null;
}

export interface UnansweredTap {
  x: number;
  y: number;
  screenW: number;
  screenH: number;
  durationMs: number;
  nearTop: boolean;
  nearEdge: boolean;
}

/**
 * Feed every unanswered tap here. Reports only when it completes a retry
 * cluster, so most calls do nothing. Returns true when an event was sent
 * (used by tests).
 */
export function noteUnansweredTap(tap: UnansweredTap): boolean {
  const now = Date.now();

  const continues =
    cluster !== null &&
    now - cluster.at <= RETRY_WINDOW_MS &&
    Math.abs(tap.x - cluster.x) <= RETRY_RADIUS_PX &&
    Math.abs(tap.y - cluster.y) <= RETRY_RADIUS_PX;

  if (continues && cluster) {
    cluster.attempts += 1;
    cluster.at = now;
  } else {
    cluster = { x: tap.x, y: tap.y, at: now, attempts: 1 };
  }

  if (!cluster || cluster.attempts < MIN_ATTEMPTS) return false;
  if (reportsThisSession >= MAX_REPORTS_PER_SESSION) return false;

  reportsThisSession += 1;
  track(ANALYTICS_EVENTS.DEAD_TAP_DETECTED, {
    screen: currentScreen,
    msSinceScreenEnter: now - screenEnteredAt,
    // How many times they tried before we gave up on their behalf. 2 is a
    // retry; 4 is somebody jabbing at a button that is plainly broken.
    attempts: cluster.attempts,
    // Absolute AND normalised: absolute finds a fixed dead band, normalised
    // makes the numbers comparable across phone sizes.
    x: Math.round(tap.x),
    y: Math.round(tap.y),
    xPct: tap.screenW ? Math.round((tap.x / tap.screenW) * 100) : null,
    yPct: tap.screenH ? Math.round((tap.y / tap.screenH) * 100) : null,
    durationMs: tap.durationMs,
    instrumented: false,
    nearTop: tap.nearTop,
    nearEdge: tap.nearEdge,
  });

  // Report each escalation at most once: keep the cluster alive (so `attempts`
  // keeps climbing if they persist) but require another tap to fire again.
  return true;
}

/** Test seam — resets module state between unit tests. */
export function __resetDeadTapStateForTests(): void {
  pressCount = 0;
  currentScreen = "unknown";
  screenEnteredAt = Date.now();
  reportsThisSession = 0;
  cluster = null;
}
