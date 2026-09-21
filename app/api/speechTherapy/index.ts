import axiosClient from "../axiosClient";

/**
 * The route to a speech and language therapist, by country.
 *
 * DELIBERATELY SEPARATE FROM `../crisis`, and it must stay that way. That one
 * answers "I need to talk to somebody now" and returns suicide and mental
 * health helplines. This one answers "does a profession exist that does this,
 * and how would I find one". Merging them would eventually route somebody
 * looking for speech therapy at a crisis line.
 *
 * Mirrors sw-be-2/src/config/SpeechTherapyResources.ts, where every URL was
 * opened by hand before it shipped.
 */

export type TherapyRouteKind =
  /** A statutory register. Confirms somebody is qualified. */
  | "REGULATOR"
  /** A professional association's public directory of practitioners. */
  | "DIRECTORY"
  /** Plain-language guidance on what therapy involves and how to get it. */
  | "GUIDANCE"
  /** Peer-led self-help, run by people who stutter. Not clinical. */
  | "PEER_SUPPORT";

export interface TherapyRoute {
  name: string;
  kind: TherapyRouteKind;
  url: string;
  /** One line a user reads. Says what this is, honestly. */
  description: string;
  /**
   * A quirk that makes the destination silently return nothing. Render it
   * whenever it is present: the Indian directory matches state names and not
   * city names, and the Australian one needs the location picked from its
   * autocomplete. A user who hits either concludes there is nobody near them.
   */
  howToUse?: string;
}

export interface SpeechTherapyResource {
  countryCode: string;
  routes: TherapyRoute[];
  /** Honest note about access in this country, where there is a source. */
  accessNote?: string;
}

/**
 * GET /speech-therapy-resources — resolved from the caller's stored country,
 * or an explicit override. Countries without a verified list fall back to
 * international peer support and say plainly that we have no clinician list
 * for them yet.
 */
export async function getSpeechTherapyResource(
  country?: string,
): Promise<SpeechTherapyResource> {
  const response = await axiosClient.get("/speech-therapy-resources", {
    params: country ? { country } : undefined,
  });
  return response.data;
}
