/**
 * Reminder template definitions.
 *
 * Each template has a visual identity (icon, color), a deep-link navigation
 * target, and a pool of title+body pairs that rotate for variety.
 *
 * Message guidelines:
 *  - Stateless: never reference user history, streaks, or behavior we can't verify
 *  - Genuine: warm and encouraging, never gimmicky or manipulative
 *  - Actionable: each message nudges toward a specific app action
 */

export type ReminderCategory =
  | "DAILY_PRACTICE"
  | "BREATHING"
  | "READING"
  | "CHALLENGE"
  | "MOOD_CHECKIN"
  | "CUSTOM";

export interface ReminderMessage {
  title: string;
  body: string;
}

export interface ReminderTemplate {
  category: ReminderCategory;
  label: string;
  description: string;
  icon: string; // MaterialCommunityIcons name
  color: string;
  bgColor: string; // Light tint for card backgrounds
  messages: ReminderMessage[];
  /** Navigation path when the user taps the notification */
  deepLink: {
    screen: string;
    params?: Record<string, any>;
  };
}

export const REMINDER_TEMPLATES: ReminderTemplate[] = [
  {
    category: "DAILY_PRACTICE",
    label: "Daily Practice",
    description: "Build your speaking habit",
    icon: "bullseye-arrow",
    color: "#F59E0B",
    bgColor: "#FFFBEB",
    messages: [
      {
        title: "Time to practice",
        body: "A few minutes of focused practice can make a real difference.",
      },
      {
        title: "Practice makes progress",
        body: "Even a short session strengthens your confidence.",
      },
      {
        title: "Your practice is ready",
        body: "Everything is set up. Jump in whenever you're ready.",
      },
      {
        title: "A good day to practice",
        body: "Small steps lead to lasting change. Start when you can.",
      },
      {
        title: "Invest in your voice",
        body: "A few minutes now, more confidence later.",
      },
    ],
    deepLink: {
      screen: "Root",
      params: { screen: "Home" },
    },
  },
  {
    category: "BREATHING",
    label: "Breathing & Calm",
    description: "Reset your nervous system",
    icon: "weather-windy",
    color: "#06B6D4",
    bgColor: "#ECFEFF",
    messages: [
      {
        title: "Take a breathing break",
        body: "A couple of minutes to slow down and reset.",
      },
      {
        title: "Breathe with intention",
        body: "Focused breathing helps calm the mind and steady the voice.",
      },
      {
        title: "A moment for yourself",
        body: "Step away from the noise. Your breathing practice is here.",
      },
      {
        title: "Calm is a skill",
        body: "Practice it like any other. A quick session can shift your whole day.",
      },
      {
        title: "Settle in, breathe out",
        body: "Two minutes of breathing can change how the rest of your day feels.",
      },
    ],
    deepLink: {
      screen: "ExploreStack",
      params: {
        screen: "DailyPracticeStack",
        params: {
          screen: "CognitivePracticeStack",
          params: { screen: "CognitivePractice" },
        },
      },
    },
  },
  {
    category: "READING",
    label: "Reading Practice",
    description: "Sharpen your vocal flow",
    icon: "book-open-variant",
    color: "#8B5CF6",
    bgColor: "#F5F3FF",
    messages: [
      {
        title: "Time to read aloud",
        body: "Reading aloud builds confidence and vocal ease.",
      },
      {
        title: "Your reading session awaits",
        body: "Stories, poems, or quotes — pick one and start.",
      },
      {
        title: "Give your voice some range",
        body: "Reading aloud is one of the best ways to build speaking confidence.",
      },
      {
        title: "A page a day",
        body: "Consistent reading practice builds a natural, steady flow.",
      },
      {
        title: "Read, speak, grow",
        body: "Every word you read aloud strengthens your voice.",
      },
    ],
    deepLink: {
      screen: "ExploreStack",
      params: {
        screen: "DailyPracticeStack",
        params: {
          screen: "ReadingPracticeStack",
          params: { screen: "ReadingPractice" },
        },
      },
    },
  },
  {
    category: "CHALLENGE",
    label: "Challenge Mode",
    description: "Push your comfort zone",
    icon: "phone-in-talk",
    color: "#EF4444",
    bgColor: "#FEF2F2",
    messages: [
      {
        title: "Ready for a challenge?",
        body: "Growth happens at the edge of comfort. Give it a try.",
      },
      {
        title: "Step into the challenge",
        body: "Practice calls and real-world scenarios build lasting confidence.",
      },
      {
        title: "Face it, don't avoid it",
        body: "The things that feel hard today will feel normal tomorrow.",
      },
      {
        title: "One challenge at a time",
        body: "You don't have to be fearless. Just willing to try.",
      },
      {
        title: "Courage is a muscle",
        body: "Every exposure practice makes the next one easier.",
      },
    ],
    deepLink: {
      screen: "ExploreStack",
      params: {
        screen: "DailyPracticeStack",
        params: {
          screen: "ExposureStack",
          params: { screen: "Exposure" },
        },
      },
    },
  },
  {
    category: "MOOD_CHECKIN",
    label: "Mood Check-in",
    description: "Track how you're feeling",
    icon: "emoticon-happy-outline",
    color: "#10B981",
    bgColor: "#ECFDF5",
    messages: [
      {
        title: "How are you feeling?",
        body: "A quick check-in helps you understand your patterns.",
      },
      {
        title: "Take a moment to reflect",
        body: "Noticing how you feel is the first step to feeling better.",
      },
      {
        title: "Check in with yourself",
        body: "Tracking your mood helps you see what's working.",
      },
      {
        title: "A minute for your mind",
        body: "Log how you're feeling — it's a small act of self-awareness.",
      },
      {
        title: "Your feelings matter",
        body: "Capture this moment. It tells a story over time.",
      },
    ],
    deepLink: {
      screen: "ExploreStack",
      params: {
        screen: "MoodCheckStack",
        params: { screen: "CheckIn" },
      },
    },
  },
];

/** Custom category has no template — user writes their own title/body. */
export const CUSTOM_CATEGORY: Pick<
  ReminderTemplate,
  "category" | "label" | "description" | "icon" | "color" | "bgColor"
> = {
  category: "CUSTOM",
  label: "Custom",
  description: "Write your own reminder",
  icon: "pencil-outline",
  color: "#64748B",
  bgColor: "#F8FAFC",
};

/**
 * Get a random message from a template's pool.
 * Optionally pass the last used index to avoid repetition.
 */
export function getRandomMessage(
  category: ReminderCategory,
  lastUsedIndex?: number,
): { message: ReminderMessage; index: number } {
  const template = REMINDER_TEMPLATES.find((t) => t.category === category);
  if (!template) {
    return {
      message: { title: "Reminder", body: "Time for your practice!" },
      index: 0,
    };
  }

  const pool = template.messages;
  let index: number;

  if (lastUsedIndex !== undefined && pool.length > 1) {
    // Pick any index except the last used one
    do {
      index = Math.floor(Math.random() * pool.length);
    } while (index === lastUsedIndex);
  } else {
    index = Math.floor(Math.random() * pool.length);
  }

  return { message: pool[index], index };
}

/**
 * Get the template definition for a given category.
 */
export function getTemplateForCategory(
  category: ReminderCategory,
): ReminderTemplate | undefined {
  return REMINDER_TEMPLATES.find((t) => t.category === category);
}

/**
 * Map a practice activity type (from DonePractice context) to a template category.
 * Used for auto-selecting the template when the user taps "Set Reminder" from the Done screen.
 */
export function mapPracticeToCategory(
  practiceType?: string,
): ReminderCategory | undefined {
  if (!practiceType) return undefined;

  const lower = practiceType.toLowerCase();

  if (lower.includes("breath") || lower.includes("meditation") || lower.includes("calm")) {
    return "BREATHING";
  }
  if (lower.includes("read") || lower.includes("poem") || lower.includes("story") || lower.includes("quote")) {
    return "READING";
  }
  if (lower.includes("phone") || lower.includes("call") || lower.includes("exposure") || lower.includes("challenge") || lower.includes("interview")) {
    return "CHALLENGE";
  }
  if (lower.includes("mood") || lower.includes("check")) {
    return "MOOD_CHECKIN";
  }

  return "DAILY_PRACTICE";
}
