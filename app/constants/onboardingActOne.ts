import { OnboardingFlow } from "../api/onboarding/types";

/**
 * ACT 1 — the five questions asked BEFORE an account exists.
 *
 * Bundled rather than fetched. Three reasons, in order of weight:
 *
 *  1. It is the first screen anyone ever sees. The server flow is behind auth
 *     (`/onboarding` sits in the express protectedRoutes list), so serving it
 *     pre-signup would mean opening a new public endpoint — a fresh attack
 *     surface plus its own rate limiter, for content that never changes.
 *  2. No network call means no dead Start button on a bad connection.
 *  3. No request means no server-side processing record for someone who has
 *     not yet consented to anything (GDPR Art. 9 — these are health-adjacent
 *     answers).
 *
 * THE ANSWERS ARE THE `value` STRINGS BELOW, VERBATIM.
 * They are matched by the backend against SpeechSituation / SpeechGoal /
 * AvoidanceFrequency / TherapyExperience enums and against PACK_SITUATION_MAP.
 * If a single one drifts, the replayed answer becomes unreadable and the whole
 * recommendation silently degrades to a clinical guess — exactly the failure
 * that ran for months when the app submitted random `opt-…` tokens instead of
 * these values. `onboardingActOne.test.ts` and the backend's own seed test both
 * pin them; do not edit either list without the other.
 */

/** Mirrors sw-be-2 `SpeechSituation`. */
export const ACT_ONE_SITUATION_VALUES = [
  "phone_calls",
  "ordering_food",
  "group_discussions",
  "meeting_people",
  "public_speaking",
  "stress_talking",
  "authority",
  "none",
  "not_sure",
] as const;

/** Mirrors sw-be-2 `SpeechGoal`. */
export const ACT_ONE_GOAL_VALUES = [
  "FEEL_CALMER",
  "STOP_AVOIDING",
  "SPEAK_EASIER",
  "HANDLE_SITUATIONS",
  "NOT_SURE",
] as const;

/** Mirrors sw-be-2 `AvoidanceFrequency`. */
export const ACT_ONE_AVOIDANCE_VALUES = [
  "very_often",
  "often",
  "sometimes",
  "rarely",
  "never",
] as const;

/** Mirrors sw-be-2 `TherapyExperience`. */
export const ACT_ONE_THERAPY_VALUES = ["current", "past", "never"] as const;

/** The four adaptiveKeys Act 1 collects, plus the safety one. */
export const ACT_ONE_ADAPTIVE_KEYS = [
  "speech.situations",
  "goal.primary",
  "avoidance.frequency",
  "distress.overall",
  "experience.therapy",
] as const;

/**
 * Short reflections shown at the TOP of the following screen — recognition
 * delivered DURING the flow rather than only at the end. Keyed by the value the
 * person just chose.
 */
export const SITUATION_PHRASE: Record<string, string> = {
  phone_calls: "phone calls",
  ordering_food: "ordering out loud",
  group_discussions: "speaking up in groups",
  meeting_people: "meeting new people",
  public_speaking: "speaking in front of people",
  stress_talking: "talking under pressure",
  authority: "talking to people in charge",
};

const opt = (value: string, optionText: string, orderIndex: number) => ({
  // The submitted answer IS this id — see the note above.
  id: value,
  value,
  optionText,
  orderIndex,
});

/**
 * Ordered by VALUE, so a person who abandons halfway has still told us the most
 * useful things. Question 1 alone is the entire recommender.
 */
export const ACT_ONE_FLOW: OnboardingFlow = {
  id: "act-one-bundled",
  version: "2.0",
  isActive: true,
  createdAt: "",
  updatedAt: "",
  questions: [
    {
      id: "act1-situations",
      screenNumber: 1,
      orderIndex: 1,
      questionText: "Where does speaking feel hardest?",
      description: "Pick as many as fit. This is what we build your plan around.",
      questionType: "MULTI",
      layout: "wrap",
      isRequired: true,
      adaptiveKey: "speech.situations",
      options: [
        opt("phone_calls", "Phone calls", 1),
        opt("ordering_food", "Ordering food", 2),
        opt("group_discussions", "Group discussions", 3),
        opt("meeting_people", "Meeting new people", 4),
        opt("public_speaking", "Public speaking", 5),
        opt("stress_talking", "Talking when stressed", 6),
        opt("authority", "Talking to people in charge", 7),
        opt("none", "None of these", 8),
        opt("not_sure", "I'm not sure", 9),
      ],
    },
    {
      id: "act1-goal",
      screenNumber: 2,
      orderIndex: 1,
      questionText: "What matters most to you right now?",
      description: "This shapes what we put in front of you first.",
      questionType: "SINGLE",
      layout: "wrap",
      isRequired: true,
      adaptiveKey: "goal.primary",
      options: [
        opt("FEEL_CALMER", "Feel calmer about speaking", 1),
        opt("STOP_AVOIDING", "Stop avoiding situations", 2),
        opt("SPEAK_EASIER", "Make speaking feel easier", 3),
        opt("HANDLE_SITUATIONS", "Handle the moments that count", 4),
        opt("NOT_SURE", "Not sure yet — guide me", 5),
      ],
    },
    {
      id: "act1-avoidance",
      screenNumber: 3,
      orderIndex: 1,
      questionText: "How often do you stay quiet when you'd rather speak?",
      description: "Most people do. It's completely okay to answer honestly.",
      questionType: "SINGLE",
      layout: "scale",
      isRequired: true,
      adaptiveKey: "avoidance.frequency",
      // LOW TO HIGH, like every other scale in the flow. This one used to run
      // the other way ("Very often" first) while the distress scale below ran
      // upward, so two scales three taps apart pointed in opposite directions —
      // the reliable way to make someone answer the second one on the first
      // one's muscle memory.
      //
      // Only the DISPLAY order changed. Each value stays glued to its own
      // label, and the submitted answer is the value, so nothing about scoring
      // or already-collected data moves. `orderIndex` is display order only.
      options: [
        opt("never", "Almost never", 1),
        opt("rarely", "Rarely", 2),
        opt("sometimes", "Sometimes", 3),
        opt("often", "Often", 4),
        opt("very_often", "Very often", 5),
      ],
    },
    {
      // The safety signal. Answered outside the top bracket, it is what lets us
      // honestly offer higher-intensity work before any clinical data exists.
      id: "act1-distress",
      screenNumber: 4,
      orderIndex: 1,
      questionText: "How heavy does it feel right now?",
      description: "This is about today, not about how you stutter.",
      questionType: "SINGLE",
      layout: "scale",
      isRequired: true,
      adaptiveKey: "distress.overall",
      options: [
        opt("1", "Not heavy at all", 1),
        opt("2", "A little heavy", 2),
        opt("3", "Moderately heavy", 3),
        opt("4", "Very heavy", 4),
        opt("5", "Extremely heavy", 5),
      ],
    },
    {
      id: "act1-therapy",
      screenNumber: 5,
      orderIndex: 1,
      questionText: "Have you worked with a speech therapist?",
      description: "So we pitch things at the right level for you.",
      questionType: "SINGLE",
      layout: "wrap",
      isRequired: true,
      adaptiveKey: "experience.therapy",
      options: [
        opt("current", "Yes, currently", 1),
        opt("past", "Yes, in the past", 2),
        opt("never", "No, never", 3),
      ],
    },
  ],
} as unknown as OnboardingFlow;
