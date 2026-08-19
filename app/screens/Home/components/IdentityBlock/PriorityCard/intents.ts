import { ROUTE_NAMES } from "../../../../../constants/routes";
import { fetchFirstCallOffer } from "../../../../../api/firstCall";

/**
 * ============================================================================
 * PRIORITY CARD INTENTS — the only place a server-driven card's route lives
 * ----------------------------------------------------------------------------
 * The backend never sends a route. It sends an INTENT, a stable word from the
 * vocabulary below, and this file turns that into navigation. That separation is
 * what lets the navigator be refactored freely while cards written months ago
 * keep working, and it keeps route shapes in the app where they belong.
 *
 * AN UNKNOWN INTENT IS A NO-OP, NOT A CRASH. A server whose vocabulary is newer
 * than the installed build is the normal state of a mobile app, and the card is
 * filtered out before render anyway (see `isKnownIntent`), so this is the second
 * line of defence rather than the first. Either way a dead tap is impossible.
 *
 * ── THE TRAP THIS FILE EXISTS TO CONTAIN ────────────────────────────────────
 * There are TWO different registrations named "ExploreStack": one inside the tab
 * navigator, and one as a sibling of "Root" in navigators/AppNavigator.tsx. A
 * bare `navigate("ExploreStack", ...)` from Home resolves to the SECOND one,
 * which pushes an orphaned copy of the whole stack OUTSIDE the tab navigator, so
 * CustomTabBar never renders and the dock vanishes.
 *
 * Every entry below therefore goes through "Root" first. If you add one, copy an
 * existing line rather than writing the short form.
 *
 * ── WHY SOME DESTINATIONS ARE DELIBERATELY ABSENT ───────────────────────────
 * `TechniquePage` needs `stage` and `hasFree` (LibraryStack/types.ts), which are
 * facts about the CONTENT, not about the user's intent. The server has no honest
 * way to supply them, so a card that wants a technique routes to `Library`.
 * ============================================================================
 */

type Nav = { navigate: (name: string, params?: object) => void };
type Params = Record<string, string | number | boolean> | null | undefined;

/** Reaches a screen inside the Explore TAB, keeping the tab bar mounted. */
const inExploreTab = (nav: Nav, screen: string, params?: object) =>
  nav.navigate("Root", {
    screen: ROUTE_NAMES.EXPLORE,
    params: { screen, params },
  });

/**
 * "This card opens its own sheet of choices."
 *
 * NOT a destination, and never called: the card short-circuits on it long
 * before `runIntent`. It is in this map for exactly one reason, and the reason
 * is `isKnownIntent`. A build that does not carry the word hides the card
 * instead of rendering a sheet whose choices it may not understand either,
 * which is the correct failure for a value that changes what a tap MEANS.
 */
export const SHEET_INTENT = "SHEET";

/** "This choice just closes the sheet." Handled before navigation, never called. */
export const CLOSE_INTENT = "CLOSE";

/**
 * "This choice hides the card for a while, then it comes back."
 *
 * Handled before navigation like CLOSE, and never called. It differs in one
 * way that matters: it REPORTS, so the server can record the date. The number
 * of days is not here and never travels from the app; the server reads it off
 * the stored card.
 */
export const SNOOZE_INTENT = "SNOOZE";

export const PRIORITY_CARD_INTENTS: Record<
  string,
  (nav: Nav, params?: Params) => void | Promise<void>
> = {
  [SHEET_INTENT]: () => {},
  [CLOSE_INTENT]: () => {},
  [SNOOZE_INTENT]: () => {},

  /** The free practice grid, scrolled to it rather than dropped at the top. */
  EXPLORE_JUMP_IN: (nav) =>
    inExploreTab(nav, "Explore", { scrollToJumpIn: true }),

  EXPLORE: (nav) => inExploreTab(nav, "Explore"),

  LIBRARY: (nav) =>
    inExploreTab(nav, "LibraryStack", { screen: "Library" }),

  PROGRAMS: (nav) => inExploreTab(nav, "Programs"),

  PROGRAM_DETAIL: (nav, params) =>
    inExploreTab(nav, "ProgramDetail", {
      catalogKey: params?.catalogKey,
      packId: params?.packId ?? null,
    }),

  MOOD_CHECK: (nav) =>
    inExploreTab(nav, "MoodCheckStack", { screen: "CheckIn" }),

  /**
   * Four levels deep, and every one of them is load bearing:
   * Explore tab > DailyPracticeStack > CognitivePracticeStack > MirrorWorkPrep.
   *
   * `practiceData: {}` is not a placeholder. It is what `CognitivePractice`
   * already passes for a standalone entry, and it is how PrepScreen tells a free
   * run apart from one opened inside a pack. Drop it and the screen looks for
   * pack context that is not there.
   *
   * Always the Prep screen, never the session directly. Prep is where the camera
   * permission is asked for and where the prompts are fetched, so entering
   * further in lands on a screen with nothing to show.
   */
  MIRROR_WORK: (nav) =>
    inExploreTab(nav, "DailyPracticeStack", {
      screen: "CognitivePracticeStack",
      params: { screen: "MirrorWorkPrep", params: { practiceData: {} } },
    }),

  /** A bare tab, no stack, no params. */
  BUDDY: (nav) => nav.navigate("Root", { screen: ROUTE_NAMES.COMMUNITY }),

  /**
   * Registered in BOTH HomeStack and ExploreStack. From Home the bare name
   * resolves within the Home stack, which is what the Level card already relies
   * on, so it is deliberately NOT routed through Explore.
   */
  PROGRESS: (nav, params) =>
    nav.navigate("ProgressDetail", { scrollTo: params?.scrollTo ?? "growth" }),

  /** Root-level siblings of the tab navigator. */
  PAYWALL: (nav) => nav.navigate("PremiumModal"),
  AVATAR_STUDIO: (nav) => nav.navigate("AvatarStudio"),

  /**
   * The one asynchronous intent. `FirstCall` needs a whole `offer` object that
   * only the server can produce, so this fetches before navigating rather than
   * letting the card carry an offer that may be stale by the time it is tapped.
   * A missing offer is a silent no-op: better nothing than a broken call screen.
   */
  FIRST_CALL: async (nav) => {
    const offer = await fetchFirstCallOffer();
    if (offer?.available) nav.navigate("FirstCall", { offer });
  },
};

/**
 * Can this build reach the intent at all?
 *
 * Checked BEFORE render so a card the app cannot honour never appears. That is
 * what makes publishing a card with a new intent safe on older installs: they
 * simply do not show it, rather than showing something that does nothing.
 */
export const isKnownIntent = (intent: string | null | undefined): boolean =>
  !!intent && intent in PRIORITY_CARD_INTENTS;

/** Runs an intent. Safe to call with anything; unknown values do nothing. */
export const runIntent = async (
  intent: string,
  nav: Nav,
  params?: Params,
): Promise<void> => {
  const handler = PRIORITY_CARD_INTENTS[intent];
  if (!handler) {
    if (__DEV__) {
      console.warn(
        `[PriorityCard] Unknown intent "${intent}" — this build cannot reach it.`,
      );
    }
    return;
  }
  await handler(nav, params);
};
