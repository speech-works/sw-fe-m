import axiosClient from "../axiosClient";
import {
  CognitivePractice,
  CognitivePracticeType,
  ExposurePractice,
  ExposurePracticeType,
  FunPractice,
  FunPracticeType,
  PhoneCallScenario,
  ReadingPractice,
  ReadingPracticeType,
} from "./types";

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

export async function getCognitivePracticeByType(
  type: CognitivePracticeType
): Promise<CognitivePractice[]> {
  try {
    const response = await axiosClient.get("/cognitive-practice", {
      params: { type },
    });
    return response.data;
  } catch (error) {
    console.error(
      "There was a problem with getting all cognitive practice by type:",
      error
    );
    throw error;
  }
}

export async function getExposurePracticeByType(
  type: ExposurePracticeType
): Promise<ExposurePractice[]> {
  try {
    const response = await axiosClient.get("/exposure-practice", {
      params: { type },
    });
    const data: ExposurePractice[] = response.data.map((practice: any) => ({
      ...practice,
      practiceData:
        practice.interviewPracticeData || practice.socialChallengeData,
    }));
    return data;
  } catch (error) {
    console.error(
      "There was a problem with getting all exposure practice by type:",
      error
    );
    throw error;
  }
}

export async function getReadingPracticeByType(
  type: ReadingPracticeType
): Promise<ReadingPractice[]> {
  try {
    const response = await axiosClient.get("/reading-practice", {
      params: { type },
    });
    return response.data;
  } catch (error) {
    console.error(
      "There was a problem with getting all reading practice by type:",
      error
    );
    throw error;
  }
}

export async function getPhoneCallScenarios(): Promise<PhoneCallScenario[]> {
  try {
    const response = await axiosClient.get(
      "/exposure-practice/phone-call-scenarios"
    );
    const data = response.data;
    const mappedData = data.map((scenario: PhoneCallScenario) => ({
      ...scenario,
      type: ExposurePracticeType.PHONE_CALL_SIMULATION,
    }));
    console.log("Fetched phone call scenarios:", mappedData);
    return mappedData;
  } catch (error) {
    console.error(
      "There was a problem with getting phone call scenarios:",
      error
    );
    throw error;
  }
}
