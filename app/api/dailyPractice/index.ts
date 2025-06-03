import axiosClient from "../axiosClient";
import { FunPractice, FunPracticeType } from "./types";

// get all fun practice by type
export async function getFunPracticeByType(
  type: FunPracticeType
): Promise<FunPractice[]> {
  try {
    const response = await axiosClient.get("/fun-practice", {
      params: { type },
    });
    return response.data;
  } catch (error) {
    console.error(
      "There was a problem with getting all fun practice by type:",
      error
    );
    throw error;
  }
}
