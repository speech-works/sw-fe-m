import axiosClient from "../axiosClient";
import {
  GoalBlock,
  GoalReport,
  ProgramGoal,
  ProgramGoalState,
  ReachSummary,
} from "./types";

/**
 * Everything one program's goal screens need, in one call: the question to
 * ask, the goals already set, and which of the two gates is owed.
 */
export const getProgramGoals = async (
  packId: string,
): Promise<ProgramGoalState> => {
  const response = await axiosClient.get(`/program-goals/pack/${packId}`);
  return response.data;
};

/**
 * `nouns` is ORDERED. Index 0 is the one the user said they would do first.
 * The server stores that order and never re-sorts it.
 *
 * Re-postable until the first report, so backing out of the confirm screen and
 * answering again works.
 */
export const setProgramGoals = async (
  packId: string,
  nouns: string[],
): Promise<ProgramGoal[]> => {
  const response = await axiosClient.post(`/program-goals/pack/${packId}`, {
    nouns,
  });
  return response.data;
};

/**
 * The report gate. Every goal needs an answer, and any set of answers closes
 * the program, including "not yet" on all of them.
 */
export const reportProgramGoals = async (
  packId: string,
  reports: { goalId: string; report: GoalReport }[],
): Promise<{ goals: ProgramGoal[]; packClosed: boolean }> => {
  const response = await axiosClient.post(
    `/program-goals/pack/${packId}/report`,
    { reports },
  );
  return response.data;
};

/**
 * One goal answered later, away from the report screen.
 *
 * `null` is UNDO for the daily log's one-tap chips. The server refuses it once
 * the program has closed, because by then the answers are the record.
 */
export const updateProgramGoal = async (
  goalId: string,
  report: GoalReport | null,
): Promise<ProgramGoal & { isFurthest: boolean; xpAwarded: number }> => {
  const response = await axiosClient.patch(`/program-goals/${goalId}`, {
    report,
  });
  return response.data;
};

/** Every goal this user has ever set, grouped by program run. This is Reach. */
export const getAllProgramGoals = async (): Promise<GoalBlock[]> => {
  const response = await axiosClient.get("/program-goals");
  return response.data;
};

/** The oldest goal they said "not yet" to and have not closed since. */
export const getWaitingGoal = async (): Promise<ProgramGoal | null> => {
  const response = await axiosClient.get("/program-goals/waiting");
  return response.data?.goal ?? null;
};

/** Four counts and one sentence, for the Home row. Constant in size. */
export const getReachSummary = async (): Promise<ReachSummary> => {
  const response = await axiosClient.get("/program-goals/summary");
  return response.data;
};
