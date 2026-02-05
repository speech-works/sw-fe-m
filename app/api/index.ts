export {
  registerUser,
  loginUser,
  logoutUser,
  refreshToken,
  handleOAuthCallback,
} from "./auth";
export {
  createSession,
  getAllSessionsOfUser,
  getSessionById,
  completeSession,
  deleteSession,
} from "./practiceSessions";
export {
  createPracticeActivity,
  startPracticeActivity,
  completePracticeActivity,
  getAllPracticeActivitiesBySessionId,
  getCurrentPracticeActivityForSession,
} from "./practiceActivities";
export {
  getDailyActivityStatsForTheWeek,
  getWeeklyMoodReport,
  getDetailedWeeklySummary,
} from "./progressReport";
export { logMood, updateMoodByMoodId } from "./moodCheck";
export {
  getRecordingById,
  getRecordings,
  createRecording,
  deleteRecording,
  deleteRecordingsByUser,
} from "./recordings";
export { getUserById, updateUserById, deleteUserById } from "./users";
export {
  getAllSubscriptionsOfUser,
  getSubscriptionById,
  updateSubscriptionById,
  createSubscription,
  deleteSubscriptionById,
} from "./subscription";
export { getUserStats } from "./stats";

// Form Submission API (for exposure feedback, pack reflections, etc.)
export { submitFormResponse } from "./forms";
export type {
  FormSubmitRequest,
  FormResponse,
  FormContext,
} from "./forms/types";

// Quiz API (mastery tracking)
export {
  submitQuizAnswer,
  getAllMasteryRecords,
  getTopicMastery,
  checkTopicAccess,
} from "./quiz";
export type {
  QuizSubmitRequest,
  QuizSubmissionResult,
  UserKnowledgeMastery,
  CanAccessResponse,
} from "./quiz/types";

// Overall State API (clinical + engagement metrics for home page)
export { getCurrentOverallState, getOverallStateHistory } from "./overallState";
export type {
  ClinicalSummary,
  EngagementSummary,
  CombinedView,
  UserOverallStateAggregate,
} from "./overallState/types";
