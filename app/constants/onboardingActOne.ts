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
  "introduce_yourself",
  "order_or_ask",
  "answer_questions",
  "explain",
  "speak_up",
  "present",
  "push_back",
  "open_chat",
  "disclose",
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

/** Mirrors sw-be-2 `DifficultyShape`. Each value routes to exactly one pack. */
export const ACT_ONE_SHAPE_VALUES = [
  "anticipation",
  "in_the_moment",
  "aftermath",
  "recurring_thoughts",
  "not_understanding",
  "not_sure",
] as const;

/**
 * The five adaptiveKeys Act 1 collects.
 *
 * THESE MUST BE A CONTIGUOUS PREFIX of the server's v2.0 flow — screens 1..5,
 * in the same order. The post-signup resume finds the first screen with an
 * unanswered required question, then walks forward one screen at a time. A gap
 * anywhere in the prefix therefore lands someone mid-flow and marches them back
 * through questions they already answered.
 *
 * `experience.therapy` was in this list and moved to screen 6 (post-signup) to
 * make room for `difficulty.shape` without lengthening Act 1. It routes nothing
 * today; difficulty.shape reaches five programmes no other answer can.
 */
export const ACT_ONE_ADAPTIVE_KEYS = [
  "speech.situations",
  "situation.most_frequent",
  "difficulty.shape",
  "goal.primary",
  "avoidance.frequency",
  "distress.overall",
] as const;

/**
 * Short reflections shown at the TOP of the following screen — recognition
 * delivered DURING the flow rather than only at the end. Keyed by the value the
 * person just chose.
 */
export const SITUATION_PHRASE: Record<string, string> = {
  introduce_yourself: "saying your own name",
  order_or_ask: "asking for what you want",
  answer_questions: "being put on the spot",
  explain: "explaining something properly",
  speak_up: "getting a word in",
  present: "standing in front of a room",
  push_back: "saying no",
  open_chat: "talking with no script",
  disclose: "telling people you stammer or stutter",
};

const opt = (
  value: string,
  optionText: string,
  orderIndex: number,
  exclusive?: true,
) => ({
  // The submitted answer IS this id — see the note above.
  id: value,
  value,
  optionText,
  orderIndex,
  exclusive,
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
      questionText: "Which of these feels hardest?",
      description: "Pick as many as fit. This is what we build your plan around.",
      questionType: "MULTI",
      layout: "wrap",
      isRequired: true,
      adaptiveKey: "speech.situations",
      options: [
        opt("introduce_yourself", "Saying my name or introducing myself", 1),
        opt("order_or_ask", "Ordering or asking for something", 2),
        opt("answer_questions", "Answering questions about myself", 3),
        opt("explain", "Explaining something in detail", 4),
        opt("speak_up", "Speaking up in a group when nobody asked me", 5),
        opt("present", "Presenting to a room", 6),
        opt("push_back", "Pushing back — complaining, saying no", 7),
        opt("open_chat", "Open conversation with no script", 8),
        opt("disclose", "Telling someone I stammer or stutter", 9),
        // exclusive: selecting either replaces any real picks, and picking a
        // real situation afterwards retracts it — see OnboardingQuestion's
        // handlePressOption.
        opt("none", "None of these", 10, true),
        opt("not_sure", "I'm not sure", 11, true),
      ],
    },
    {
      // WHAT IS FREQUENT, where the screen before asks what is HARD, and the
      // two are routinely different people. Priya dreads presenting and
      // presents twice a year; Sam finds asking for things mildly hard and does
      // it a dozen times a day. Their answers to the previous screen are
      // identical, and nothing could tell them apart.
      //
      // ONE SINGLE-SELECT rather than a rating per pick, measured rather than
      // assumed: rating every pick changes the top match for 39.5% of
      // multi-pick users, naming the most frequent act changes it for 50.3%. A
      // decisive nomination beats a nuanced rating, because most nuanced
      // ratings come out near-flat and move nothing.
      //
      // ALL NINE ACTS, not only the ones they called hard. Naming a frequent
      // act they did not flag is real information, and static options need no
      // dependency on the previous answer. Weighting only ever touches acts
      // they DID pick, so an unpicked answer is simply neutral.
      id: "act1-most-frequent",
      screenNumber: 2,
      orderIndex: 1,
      questionText: "Which of these comes up most in an ordinary week?",
      description: "Not the hardest — the one you run into most often.",
      questionType: "SINGLE",
      layout: "list",
      isRequired: true,
      adaptiveKey: "situation.most_frequent",
      options: [
        opt("introduce_yourself", "Saying my name or introducing myself", 1),
        opt("order_or_ask", "Ordering or asking for something", 2),
        opt("answer_questions", "Answering questions about myself", 3),
        opt("explain", "Explaining something in detail", 4),
        opt("speak_up", "Speaking up in a group when nobody asked me", 5),
        opt("present", "Presenting to a room", 6),
        opt("push_back", "Pushing back — complaining, saying no", 7),
        opt("open_chat", "Open conversation with no script", 8),
        opt("disclose", "Telling someone I stammer or stutter", 9),
        opt("not_sure", "I'm not sure", 10, true),
      ],
    },
    {
      // THE ROUTING PARTNER TO SITUATIONS, and the only question that can reach
      // five of the ten programmes.
      //
      // Situations answer WHERE speaking is hard. Five programmes are built
      // around a where; the other five are built around a WHEN or a WHAT — the
      // build-up before, the physical moment, the replay afterwards, the
      // thoughts that keep returning, and not understanding what is happening.
      // Nothing we asked could separate those, so four programmes could not be
      // surfaced by any answer anyone was able to give. Measured, not assumed.
      //
      // It sits pre-signup because the teaser can then quote it back — "you
      // said the build-up beforehand is the hardest part" is the most
      // recognisable sentence we can show someone sixty seconds in.
      id: "act1-difficulty-shape",
      screenNumber: 3,
      orderIndex: 1,
      questionText: "When speaking is hardest, what's the worst part?",
      description: "Different people get stuck in different places.",
      questionType: "SINGLE",
      layout: "list",
      isRequired: true,
      adaptiveKey: "difficulty.shape",
      options: [
        opt("anticipation", "The build-up beforehand", 1),
        opt("in_the_moment", "Getting the words out", 2),
        opt("aftermath", "Going over it afterwards", 3),
        opt("recurring_thoughts", "Thoughts that keep coming back", 4),
        opt("not_understanding", "Not understanding why it happens", 5),
        opt("not_sure", "I'm not sure", 6),
      ],
    },
    {
      id: "act1-goal",
      screenNumber: 4,
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
      screenNumber: 5,
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
      screenNumber: 6,
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
  ],
} as unknown as OnboardingFlow;
