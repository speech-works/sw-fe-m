import axiosClient from "../axiosClient";
import {
  FormRecall,
  FormRecallItem,
  PackBrochure,
  PackModule,
  PackProgress,
  PackRecommendation,
  ProgramEvidenceSummary,
} from "./types";

export const getRecommendedPack = async (): Promise<PackRecommendation> => {
  try {
    const response = await axiosClient.get("/packs/recommended");
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getPackProgress = async (
  packId: string
): Promise<PackProgress> => {
  try {
    const response = await axiosClient.get(`/packs/${packId}/progress`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const startModule = async (
  packId: string,
  moduleId: string
): Promise<void> => {
  try {
    await axiosClient.post(`/packs/${packId}/modules/${moduleId}/start`);
  } catch (error) {
    throw error;
  }
};

/**
 * `skipBreakdown` carries WHY the user skipped any exposure challenges in this
 * module — `tooChallenging` (avoidance), `notNow` (no time / not in the mood,
 * NOT avoidance) or `eased` (took the gentler challenge and did it, which is an
 * approach). It ends up on the Courage approach rate.
 *
 * Omit it entirely when the user wasn't asked or dismissed the question. Do NOT
 * send `{}`: the backend metric branches on truthiness, so an empty object
 * reads as "zero avoidance" instead of "unknown", which is worse than no data.
 */
export const completeModule = async (
  packId: string,
  moduleId: string,
  skipBreakdown?: {
    tooChallenging?: number;
    notNow?: number;
    eased?: number;
  } | null
): Promise<void> => {
  try {
    await axiosClient.post(
      `/packs/${packId}/modules/${moduleId}/complete`,
      skipBreakdown ? { skipBreakdown } : {}
    );
  } catch (error) {
    throw error;
  }
};

/**
 * OWNERS ONLY — 402 PACK_NOT_OWNED for anyone else. Use `getPackBrochure` for
 * a pack the user may not have bought. This must never be used as a fallback
 * when a gated call fails: doing that is what produced a real pack title over
 * an empty module with a "1 of 1" progress bar.
 */
/**
 * Start an owned pack over from day 1.
 *
 * Resets every module to NOT_STARTED, clears the completion, restarts the arc
 * clock and bumps `restartCount` — which is also what gives a re-run its own
 * set of program goals. Free and unlimited by design.
 */
export const restartPack = async (packId: string): Promise<void> => {
  await axiosClient.post(`/packs/${packId}/restart`);
};

export const getPack = async (packId: string): Promise<any> => {
  try {
    const response = await axiosClient.get(`/packs/${packId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * The SALES view — safe for any signed-in user, owned or not. Pitch, arc
 * length and the module outline; never blocks. Identical for everyone.
 */
export const getPackBrochure = async (
  packId: string
): Promise<PackBrochure> => {
  try {
    const response = await axiosClient.get(`/packs/${packId}/brochure`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getModule = async (
  packId: string,
  moduleId: string
): Promise<PackModule> => {
  try {
    const response = await axiosClient.get(
      `/packs/${packId}/modules/${moduleId}`
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * GET /packs/{packId}/modules/{moduleId}/blocks/{blockId}/recall — the user's
 * own earlier answers for a form step that shows them (BTT day 5's "after"
 * form shows the saved prediction and the first number).
 *
 * NEVER THROWS. The panel is extra: a server that predates the endpoint
 * (404), a network error or an odd body all come back as "nothing to show",
 * and the form works exactly as it did before.
 */
export const getFormRecall = async (
  packId: string,
  moduleId: string,
  blockId: string
): Promise<FormRecall> => {
  const empty: FormRecall = { items: [], savedAt: null };
  try {
    const response = await axiosClient.get(
      `/packs/${packId}/modules/${moduleId}/blocks/${blockId}/recall`
    );
    const items = response.data?.items;
    if (!Array.isArray(items)) return empty;
    const clean = items.filter(
      (i: any): i is FormRecallItem =>
        typeof i?.label === "string" &&
        typeof i?.value === "string" &&
        i.value.trim() !== ""
    );
    return clean.length
      ? { items: clean, savedAt: response.data?.savedAt ?? null }
      : empty;
  } catch {
    return empty;
  }
};

/**
 * GET /packs/{catalogKey}/evidence — every claim a program's teaching rests
 * on, with its source, its limit in plain words, and the date somebody last
 * read the paper.
 *
 * Takes the CATALOG KEY ("art_of_disclosure"), not the pack id, because this
 * is about the program as a published thing rather than about one row.
 *
 * It is what makes "updates are free" checkable: the dates come from the data,
 * so nothing has to be written into copy and go stale.
 */
export const getProgramEvidence = async (
  catalogKey: string
): Promise<ProgramEvidenceSummary> => {
  try {
    const response = await axiosClient.get(`/packs/${catalogKey}/evidence`);
    return response.data;
  } catch (error) {
    throw error;
  }
};
