import { axiosClient } from "../axiosClient";
import {
  ExposurePractice,
  CognitivePractice,
  FunPractice,
  ReadingPractice,
} from "../dailyPractice/types";

export interface GuidedActivity {
  id: string;
  contentType:
    | "EXPOSURE_PRACTICE"
    | "COGNITIVE_PRACTICE"
    | "FUN_PRACTICE"
    | "READING_PRACTICE";
  exposurePractice?: ExposurePractice;
  cognitivePractice?: CognitivePractice;
  funPractice?: FunPractice;
  readingPractice?: ReadingPractice;
  createdAt: Date;
  updatedAt: Date;
}

export const getGuidedActivity = async (
  id: string,
): Promise<GuidedActivity> => {
  const response = await axiosClient.get(`/guided-activities/${id}`);
  return response.data;
};
