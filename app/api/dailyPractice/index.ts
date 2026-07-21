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
  type: FunPracticeType,
  hardMode?: boolean,
): Promise<FunPractice[]> {
  try {
    const response = await axiosClient.get("/fun-practice", {
      params: { type, hardMode },
    });
    return response.data;
  } catch (error) {
    console.error(
      "There was a problem with getting all fun practice by type:",
      error,
    );
    throw error;
  }
}

export async function getFunPracticeById(id: string): Promise<FunPractice> {
  try {
    const response = await axiosClient.get(`/fun-practice/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error getting fun practice by ID:", error);
    throw error;
  }
}

export async function getCognitivePracticeByType(
  type: CognitivePracticeType,
): Promise<CognitivePractice[]> {
  try {
    const response = await axiosClient.get("/cognitive-practice", {
      params: { type },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
}

export async function getCognitivePracticeById(
  id: string,
): Promise<CognitivePractice> {
  try {
    const response = await axiosClient.get(`/cognitive-practice/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error getting cognitive practice by ID:", error);
    throw error;
  }
}

export async function getExposurePracticeByType(
  type: ExposurePracticeType,
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
      error,
    );
    throw error;
  }
}

export async function getExposurePracticeById(
  id: string,
): Promise<ExposurePractice> {
  try {
    const response = await axiosClient.get(`/exposure-practice/${id}`);
    const practice = response.data;
    return {
      ...practice,
      practiceData:
        practice.interviewPracticeData || practice.socialChallengeData,
    };
  } catch (error) {
    console.error("Error getting exposure practice by ID:", error);
    throw error;
  }
}

export async function getReadingPracticeByType(
  type: ReadingPracticeType,
  hardMode?: boolean,
): Promise<ReadingPractice[]> {
  try {
    const response = await axiosClient.get("/reading-practice", {
      params: { type, hardMode },
    });
    return response.data;
  } catch (error) {
    console.error(
      "There was a problem with getting all reading practice by type:",
      error,
    );
    throw error;
  }
}

export async function getPhoneCallScenarios(): Promise<PhoneCallScenario[]> {
  try {
    const response = await axiosClient.get(
      "/exposure-practice/phone-call-scenarios",
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
      error,
    );
    throw error;
  }
}

/**
 * One rung down the exposure ladder — a gentler challenge of the same kind.
 *
 * Resolves to `null` when there is nothing easier (the activity is already the
 * gentlest of its kind). That is a normal answer, not an error: the caller must
 * say "this is already the gentlest" rather than surface a failure to someone
 * who has just said they are struggling. The backend also returns null rather
 * than dangle a challenge locked behind a pack the user hasn't bought.
 */
export async function getEasierExposureVariant(
  id: string,
): Promise<ExposurePractice | null> {
  try {
    const response = await axiosClient.get(`/exposure-practice/${id}/easier`);
    const practice = response.data?.activity;
    if (!practice) return null;
    return {
      ...practice,
      practiceData:
        practice.interviewPracticeData || practice.socialChallengeData,
    };
  } catch (error) {
    // Never block the challenge screen on this — the user still has the
    // challenge in front of them, they just don't get a gentler option.
    console.error("Failed to fetch an easier exposure variant", error);
    return null;
  }
}
