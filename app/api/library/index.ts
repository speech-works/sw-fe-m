import axiosClient from "../axiosClient";
import { parseTechniquesToLibrary } from "./helper";
import {
  ExerciseItem,
  Library,
  QuizQuestion,
  TECHNIQUES_ENUM,
  Tutorial,
} from "./types";

export async function getLibraryDetails(): Promise<Library[]> {
  try {
    const response = await axiosClient.get(`/library/techniques`, {
      params: {
        includeCategory: true,
      },
    });
    const techniques = response.data;
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
