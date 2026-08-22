import axios from "axios";
import axiosClient from "../axiosClient";
import { PracticeActivity, PracticeActivityContentType } from "./types";
import { ToolType } from "../tools/types";
import type { MirrorWorkComparison } from "../../screens/Academy/DailyPractice/pages/MirrorWork/util/mirrorReflection/types";

import { EVENT_NAMES } from "../../stores/events/constants";
import { dispatchCustomEvent } from "../../util/functions/events";
import { useCelebrationStore } from "../../stores/celebration";

interface CreateActivitySessionReq {
  sessionId?: string; // Optional: backend handles auto-session creation
  contentType: PracticeActivityContentType;
  contentId: string;
}

interface CreateActivityPackReq {
  packId?: string; // Optional: backend handles auto-session creation
  moduleId?: string; // Optional: backend handles auto-session creation
  contentType: PracticeActivityContentType;
  contentId: string;
}

// Create a new practice activity (Session Context)
export async function createPracticeActivity({
  sessionId,
  contentId,
  contentType,
}: CreateActivitySessionReq): Promise<PracticeActivity> {
  try {
    console.log("createPracticeActivity called with:", {
      sessionId,
      contentId,
      contentType,
    });

    const payload = {
      sessionId,
      contentId,
      contentType,
    };

    const response = await axiosClient.post("/practice-activities", payload);
    console.log("createPracticeActivity response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error creating practice activity:", error);
    throw error;
  }
}

// Create a new practice activity (Pack Context)
export async function createPracticeActivityFromPack({
  packId,
  moduleId,
  contentId,
  contentType,
}: CreateActivityPackReq): Promise<PracticeActivity> {
  try {
    console.log("createPracticeActivityFromPack called with:", {
      packId,
      moduleId,
      contentId,
      contentType,
    });

    const payload = {
      packId,
      moduleId,
      contentId,
      contentType,
    };

    const response = await axiosClient.post("/practice-activities", payload);
    console.log("createPracticeActivityFromPack response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error creating practice activity from pack:", error);
    throw error;
  }
}

interface UpdateActivityReq {
  id: string;
  userId: string;
  packId?: string;
  moduleId?: string;
  refundResources?: boolean;
}

// Start a practice activity (update its startedAt timestamp)
export async function startPracticeActivity({
  id,
  userId,
  /**
   * The caller has its own answer for a refused start, so the generic dialog
   * must stay out of the way. Set by the phone-call screen, which opens the
   * top-up sheet for NO_CREDITS — two native modals at once freeze touches
   * app-wide on iOS, so this is a correctness flag, not a cosmetic one.
   */
  suppressErrorModal,
}: UpdateActivityReq & {
  suppressErrorModal?: boolean;
}): Promise<PracticeActivity> {
  console.log(">> API: Starting Practice Activity", { id, userId });
  try {
    const response = await axiosClient.post(
      `/practice-activities/${id}/start`,
      { userId },
    );
    console.log(
      "<< API: Practice Activity Started Successfully",
      response.data,
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      const { errorCode, error: backendError } = error.response.data;

      if (errorCode === "INSUFFICIENT_STAMINA") {
        dispatchCustomEvent(EVENT_NAMES.SHOW_STAMINA_UPSELL, {
          errorMessage: backendError,
        });
      } else if (suppressErrorModal) {
        /* The caller has a better answer than a generic dialog — the phone-call
           screen opens the top-up sheet for NO_CREDITS. Showing both meant two
           native modals presented at once, which is not merely ugly: it freezes
           touches app-wide on iOS. The error still throws, so nothing is
           swallowed; only the duplicate UI is. */
      } else {
        dispatchCustomEvent(EVENT_NAMES.SHOW_ERROR_MODAL, {
          /* NEVER THE RAW SERVER STRING. `data.error` is written for a
             developer reading a log — it carried a user's uuid into a dialog
             on their own screen. Known codes get copy a person can act on;
             everything else gets a plain sentence, and the real text stays in
             the console where it is useful. */
          errorMessage: startErrorMessage(errorCode),
          modalTitle: "Can't start this yet",
        });
      }
    }
    throw error;
  }
}

/**
 * What to SAY when an activity will not start.
 *
 * Keyed on the error code rather than the server's prose, so the wording is
 * owned here — where somebody can read it in the context of the screen it
 * appears on — instead of in a backend exception constructor.
 */
function startErrorMessage(code?: string): string {
  switch (code) {
    case "NO_CREDITS":
      return "You're out of calls right now. Your free weekly call comes back soon.";
    case "PACK_NOT_OWNED":
      return "This one's part of a program you haven't started yet.";
    case "PACK_DAY_LOCKED":
      return "This day hasn't opened yet. It unlocks as you work through the program.";
    default:
      return "We couldn't start this just now. Give it another go in a moment.";
  }
}

// Complete a practice activity (update its status to COMPLETED)
export async function completePracticeActivity({
  id,
  userId,
  packId,
  moduleId,
  toolsUsed,
}: UpdateActivityReq & {
  /** Fluency tools actually activated during this activity (DAF/Chorus/...). */
  toolsUsed?: ToolType[];
}): Promise<PracticeActivity> {
  try {
    // Snapshot pre-completion XP/level so DonePractice can diff a fresh
    // /users/me and celebrate a level-up (XP is awarded server-side). Bound to
    // this activity's id so only THIS completion's success screen can consume it.
    useCelebrationStore.getState().capture(id);

    const requestBody: any = {
      userId,
    };

    if (packId) requestBody.packId = packId;
    if (moduleId) requestBody.moduleId = moduleId;
    if (toolsUsed && toolsUsed.length > 0) requestBody.toolsUsed = toolsUsed;

    console.log(">> API: Completing Practice Activity", { id, requestBody });
    const response = await axiosClient.post(
      `/practice-activities/${id}/complete`,
      requestBody,
    );
    console.log(
      "<< API: Practice Activity Completed Successfully",
      response.data,
    );
    // Which axes this moved, as the server resolved them. Recorded at the
    // chokepoint for the same reason the XP snapshot above is: every practice
    // flow gets it with no per-caller wiring.
    return response.data;
  } catch (error) {
    console.error("Error completing practice activity:", error);
    throw error;
  }
}

export interface MirrorWorkCompletionApiPayload {
  detectedSignals: Record<string, { eventCount: number }>;
  awarenessScores: {
    gazeMaintained: number;
    jawEase: number;
    lipEase: number;
    overallEaseScore: number;
    // Additive (optional): per-region ease across ALL signals + within-session arc.
    regionEase?: Partial<Record<string, number>>;
    withinSession?: {
      thirds: { tensionFraction: number; observedMs: number }[];
      arc: string;
    };
  };
  detectionAccuracyRating: number;
  reflectionText: string;
  promptsAttempted: number;
  nudgeMode: 'ON' | 'OFF';
  sessionDurationSeconds: number;
  /** Version of the score weight table used (lets the backend re-derive later). */
  weightTableVersion?: string;
}

/**
 * Complete a Mirror Work practice activity.
 *
 * Calls the dedicated POST /practice-activities/{id}/complete-mirror-work
 * endpoint, which stores the full session payload (signals, scores,
 * reflection) and feeds overallEaseScore into the IMPAIRMENT_STRUGGLE
 * clinical domain trend.
 */
export async function completeMirrorWorkActivity(
  id: string,
  userId: string,
  mirrorWorkPayload: MirrorWorkCompletionApiPayload,
): Promise<PracticeActivity> {
  // Same pre-completion snapshot as completePracticeActivity — Mirror Work has
  // its own dedicated endpoint but the same level-up celebration on Done.
  // (Mirror Work's success screen passes no activityId, so its snapshot is
  // guarded by the staleness window alone — see useCompletionCelebration.)
  useCelebrationStore.getState().capture(id);

  console.log('>> API: Completing Mirror Work Activity', { id, mirrorWorkPayload });
  const response = await axiosClient.post(
    `/practice-activities/${id}/complete-mirror-work`,
    { userId, mirrorWorkPayload },
  );
  console.log('<< API: Mirror Work Activity Completed Successfully', response.data);
  // Mirror work moves STEADIER and REGULAR. Only Regular is currently shown
  // (see VISIBLE_AXES), so the success screen names that one — recorded here
  // rather than filtered, because what the server says it moved and what we
  // choose to display are separate decisions.
  return response.data;
}



// Abort a practice activity (update its status to ABORTED)
export async function abortPracticeActivity({
  id,
  userId,
  packId,
  moduleId,
  refundResources,
}: UpdateActivityReq): Promise<PracticeActivity> {
  try {
    const requestBody: any = { userId };
    if (packId) requestBody.packId = packId;
    if (moduleId) requestBody.moduleId = moduleId;
    if (refundResources) requestBody.refundResources = true;

    console.log(">> API: Aborting Practice Activity", { id, requestBody });
    const response = await axiosClient.patch(
      `/practice-activities/${id}`,
      { status: "ABORTED", ...requestBody },
    );
    console.log("<< API: Practice Activity Aborted Successfully", response.data);
    return response.data;
  } catch (error) {
    console.error("Error aborting practice activity:", error);
    throw error;
  }
}

// Shape of the AI-generated post-call feedback report (mirrors the backend).
export interface PhoneCallReportData {
  headline: string;
  summary: string;
  what_went_well: string[];
  areas_to_improve: string[];
  handled_pressure?: string;
  scores?: { confidence: number; clarity: number; engagement: number };
  score_rationale?: { confidence: string; clarity: string; engagement: string };
  disfluency_moments?: { quote: string; note?: string }[];
  suggested_next_practice?: string;
  encouragement: string;
  // The conversation transcript, returned so the user can verify the report.
  transcript?: string;
}

/**
 * Generate (and cache) the AI post-call feedback report for a completed
 * phone-call practice. The backend generates it from the saved transcript on
 * the first call, then returns the cached report on subsequent calls. We allow
 * extra time because the first call runs an LLM generation.
 */
export async function getPhoneCallReport(
  practiceActivityId: string,
): Promise<PhoneCallReportData | null> {
  try {
    console.log(">> API: Generating phone-call report", { practiceActivityId });
    const response = await axiosClient.post(
      `/practice-activities/${practiceActivityId}/phone-call-report`,
      {},
      { timeout: 30000 },
    );
    // 204 = no report for this call (e.g. running on the Groq provider). Empty
    // body → treat as "no report" so the app skips straight to the done flow.
    if (response.status === 204 || !response.data) {
      return null;
    }
    return response.data;
  } catch (error) {
    console.error("Error generating phone call report:", error);
    throw error;
  }
}

/**
 * Fetch the cross-session comparison for Mirror Work: this session's scores
 * (sent in the body, since the session isn't persisted yet) vs the user's
 * recent stored sessions. Used to render the "since last time" line on the
 * summary. Returns null on any failure so the summary degrades gracefully.
 */
export async function getMirrorWorkComparison(
  userId: string,
  awarenessScores: { overallEaseScore: number; regionEase?: Partial<Record<string, number>> },
  sessionDurationSeconds: number,
): Promise<MirrorWorkComparison | null> {
  try {
    const response = await axiosClient.post(
      `/practice-activities/mirror-work/comparison`,
      { userId, awarenessScores, sessionDurationSeconds },
    );
    const data = response.data;
    // Guard against a 204 / empty / malformed body — the reflection engine relies
    // on `flags` + `vsLast.overall`, so anything else is treated as "no comparison".
    if (
      response.status === 204 ||
      !data ||
      !data.flags ||
      !data.vsLast ||
      !data.vsLast.overall
    ) {
      return null;
    }
    return data as MirrorWorkComparison;
  } catch (error) {
    console.warn("Could not fetch Mirror Work comparison (non-fatal):", error);
    return null;
  }
}
