import axiosClient from "../axiosClient";
import {
  PackBrochure,
  PackModule,
  PackProgress,
  PackRecommendation,
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
