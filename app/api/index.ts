export {
    handleOAuthCallback, loginUser,
    logoutUser,
    refreshToken, registerUser
} from "./auth";
export {
    CognitivePracticeType,
    ExposurePracticeType,
    FunPracticeType,
    ReadingPracticeType
} from "./dailyPractice/types";
export {
    abortPracticeActivity, completePracticeActivity, createPracticeActivity,
    createPracticeActivityFromPack, getAllPracticeActivitiesBySessionId,
    getCurrentPracticeActivityForSession,
    getPracticeActivity, startPracticeActivity
} from "./practiceActivities";
export { PracticeActivityContentType } from "./practiceActivities/types";
export type { PracticeActivity } from "./practiceActivities/types";
export {
    completeSession, createSession, deleteSession, getAllSessionsOfUser,
    getSessionById
} from "./practiceSessions";

export { logMood, updateMoodByMoodId } from "./moodCheck";
export {
    getDailyActivityStatsForTheWeek,
} from "./progressReport";
export {
    createRecording,
    deleteRecording,
    deleteRecordingsByUser, getRecordingById,
    getRecordings
} from "./recordings";
export {
    createSubscription,
    deleteSubscriptionById, getAllSubscriptionsOfUser,
    getSubscriptionById,
    updateSubscriptionById
} from "./subscription";
export { deleteUserById, getUserById, updateUserById } from "./users";

// Form Submission API (for exposure feedback, pack reflections, etc.)
export { submitFormResponse } from "./forms";
export type {
    FormContext, FormResponse, FormSubmitRequest
} from "./forms/types";

// Quiz API (mastery tracking)
export {
    checkTopicAccess, getAllMasteryRecords,
    getTopicMastery, submitQuizAnswer
} from "./quiz";
export type {
    CanAccessResponse, QuizSubmissionResult, QuizSubmitRequest, UserKnowledgeMastery
} from "./quiz/types";

// Overall State API (clinical + engagement metrics for home page)
export { getCurrentOverallState, getOverallStateHistory } from "./overallState";
export type {
    ClinicalSummary, CombinedView, EngagementSummary, UserOverallStateAggregate
} from "./overallState/types";
// Recommendations API (post-mood clinical suggestions)
export { getPracticeSuggestions } from "./recommendations";
export type { PracticeSuggestion } from "./recommendations/types";
