import axiosClient from "../axiosClient";

/**
 * ============================================================================
 * THE ONCE-IN-A-LIFETIME FIRST CALL
 * ----------------------------------------------------------------------------
 * Every user gets exactly one AI call, ever, free, matched to the act they
 * named as hardest in onboarding — and it arrives as an INCOMING call rather
 * than one they have to place, because deciding to dial is the hardest part
 * and the wrong thing to charge somebody on first contact.
 *
 * THE OFFER IS SPENT ONLY WHEN A CALL ACTUALLY CONNECTS. Never when it is
 * shown, declined, postponed, or blocked for want of headphones. Nothing in
 * this module spends anything — the server spends it at activity start, and
 * gives it back if our side is what broke.
 * ============================================================================
 */

/** Mirrors the backend `SpeechSituation` values used for first-call routing. */
export type FirstCallAction = string;

export interface FirstCallScenario {
  /** The ExposurePractice id — passed straight to the calling widget. */
  activityId: string;
  /** Shown on the ringing screen: "Maya". */
  callerName: string;
  /** The line under the name: "A friend of a friend". */
  callerDesignation: string;
  /** FontAwesome5 glyph, matching what CallingWidget renders. */
  icon: string;
  /** The act this was matched to, for the after-call copy. */
  action: FirstCallAction | null;
}

export interface FirstCallOffer {
  available: boolean;
  /**
   * `not_eligible` = the account predates the feature. The first call is a
   * WELCOME, so it goes to people who signed up once it existed; handing one to
   * every established account would be a re-engagement campaign with a real
   * per-call cost, which is a different decision.
   */
  reason?: "already_taken" | "no_content" | "not_eligible";
  scenario?: FirstCallScenario;
}

/**
 * Is there a first call waiting, and who is on the other end?
 *
 * Returns an unavailable offer rather than throwing. A brand-new user opening
 * Home while the network is flaky should see the ordinary app, not an error
 * about a feature they have never heard of — and because nothing is spent
 * here, the offer is still intact the next time they open it.
 */
export async function fetchFirstCallOffer(): Promise<FirstCallOffer> {
  try {
    const res = await axiosClient.get("/first-call");
    return res.data ?? { available: false };
  } catch (err) {
    console.warn("[firstCall] Could not load the first-call offer", err);
    return { available: false };
  }
}
