import axiosClient from "../axiosClient";
import { parseTechniquesToLibrary } from "./helper";
import {
  ExerciseItem,
  Library,
  QuizQuestion,
  TECHNIQUES_ENUM,
  Tutorial,
} from "./types";

/**
 * Fetches all techniques and parses them into the Library structure.
 * * RECOMMENDED UPDATE: Add `includeTutorial: true` to params
 * to fetch tutorial data (like isFree, id) all at once.
 */
export async function getLibraryDetails(): Promise<Library[]> {
  try {
    const response = await axiosClient.get(`/library/techniques`, {
      params: {
        includeCategory: true,
        includeTutorial: true, // <-- RECOMMENDED ADDITION
      },
    });
    const techniques = response.data;
    // Your helper may need to be updated to parse the new tutorial data
    return parseTechniquesToLibrary({ techniques });
  } catch (error) {
    console.error("There was a problem with the get library api call:", error);
    throw error;
  }
}

export async function getTutorialByTechnique(
  techniqueId: TECHNIQUES_ENUM
): Promise<Tutorial> {
  try {
    const response = await axiosClient.get(
      `/library/techniques/${techniqueId}/tutorial`
    );
    const tut = response.data;
    console.log("Fetched Tutorial Data:", tut);
    return tut;
  } catch (error) {
    console.error(
      "There was a problem with the getTutorialByTechnique api call:",
      error
    );
    throw error;
  }
}

export async function getQuizByTechnique(
  techniqueId: TECHNIQUES_ENUM
): Promise<QuizQuestion[]> {
  try {
    const response = await axiosClient.get(`/library/quiz-questions`, {
      params: {
        techniqueId,
      },
    });
    const quiz = response.data;
    return quiz;
  } catch (error) {
    console.error(
      "There was a problem with the getQuizByTechnique api call:",
      error
    );
    throw error;
  }
}

export async function getAllExerciseItems(): Promise<ExerciseItem[]> {
  try {
    const response = await axiosClient.get(`/exercise-items`, {
      params: {
        includeCategory: true,
      },
    });
    const items = response.data;
    return items;
  } catch (error) {
    console.error(
      "There was a problem with the  getAllExerciseItems api call:",
      error
    );
    throw error;
  }
}

// -----------------------------------------------------
//  NEW VIDEO PAYWALL FUNCTIONS
// -----------------------------------------------------

/**
 * Fetches a secure, short-lived URL for a *premium* video.
 * This will only succeed if the user is authenticated and has a paid subscription.
 * @param tutorialId The unique ID (UUID) of the tutorial, not the techniqueId.
 * @returns An object containing the secure videoUrl.
 */
export async function getPremiumVideoUrl(
  tutorialId: string
): Promise<{ videoUrl: string }> {
  try {
    const response = await axiosClient.get(
      `/library/tutorials/${tutorialId}/video-url`
    );
    return response.data; // e.g., { videoUrl: "https://s3.signed..." }
  } catch (error) {
    console.error(
      "There was a problem with the getPremiumVideoUrl api call:",
      error
    );
    // This will throw a 403 "Forbidden" error if the user is not premium
    throw error;
  }
}

/**
 * Fetches a secure, public URL for a *free glimpse* video.
 * This does not require authentication.
 * @param tutorialId The unique ID (UUID) of the tutorial.
 * @returns An object containing the secure videoUrl for the glimpse.
 */
export async function getGlimpseVideoUrl(
  tutorialId: string
): Promise<{ videoUrl: string }> {
  try {
    const response = await axiosClient.get(
      `/library/tutorials/${tutorialId}/glimpse-url`
    );
    return response.data; // e.g., { videoUrl: "https://s3.signed..." }
  } catch (error) {
    console.error(
      "There was a problem with the getGlimpseVideoUrl api call:",
      error
    );
    throw error;
  }
}
