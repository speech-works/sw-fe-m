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

export const completeModule = async (
  packId: string,
  moduleId: string
): Promise<void> => {
  try {
    await axiosClient.post(`/packs/${packId}/modules/${moduleId}/complete`);
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
