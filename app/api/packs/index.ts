import axiosClient from "../axiosClient";
import { PackRecommendation, PackProgress, PackModule } from "./types";

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

export const startPack = async (packId: string): Promise<void> => {
  try {
    await axiosClient.post(`/packs/${packId}/start`);
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

export const getPack = async (packId: string): Promise<any> => {
  try {
    const response = await axiosClient.get(`/packs/${packId}`);
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
