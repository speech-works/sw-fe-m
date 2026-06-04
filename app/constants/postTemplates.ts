import { PostPayloadField, PostTemplateId } from "../api/posts";

/**
 * Card templates the poster chooses from. Visual-only catalog (mirrors buddyCheers.ts).
 * `emphasizes` lists the payload fields a template foregrounds; other included fields
 * render smaller. `minimal` doubles as the "custom" option — it leans on the caption
 * and whatever fields the user manually toggles on.
 *
 * Guardrail note: no template can surface fluency/outcome data — the payload itself
 * only ever contains effort/process facts (see PostPayload).
 */
export interface PostTemplate {
  id: PostTemplateId;
  label: string;
  /** MaterialCommunityIcons name. */
  icon: string;
  /** expo-linear-gradient colors. */
  gradient: readonly [string, string, ...string[]];
  emphasizes: PostPayloadField[];
  blurb: string;
}

export const POST_TEMPLATES: PostTemplate[] = [
  {
    id: "milestone",
    label: "Milestone",
    icon: "trophy-variant",
    gradient: ["#FFEC40", "#FF9040"],
    emphasizes: ["milestoneLabel", "xpEarned", "levelStageTitle"],
    blurb: "Celebrate a count you've reached",
  },
  {
    id: "streak",
    label: "Streak",
    icon: "fire",
    gradient: ["#FF9040", "#FF6B00"],
    emphasizes: ["streakDays", "showedUp"],
    blurb: "Show your consistency",
  },
  {
    id: "courage",
    label: "Courage",
    icon: "shield-star",
    gradient: ["#FF6B00", "#BF5000"],
    emphasizes: ["growthDelta", "activityName"],
    blurb: "You faced a challenge",
  },
  {
    id: "calm",
    label: "Calm",
    icon: "meditation",
    gradient: ["#4ABC40", "#0DA500"],
    emphasizes: ["durationSeconds", "timeOfDay"],
    blurb: "A mindful moment",
  },
  {
    id: "minimal",
    label: "Minimal",
    icon: "card-text-outline",
    gradient: ["#A1A4AA", "#737780"],
    emphasizes: ["activityName"],
    blurb: "Clean and simple — your words",
  },
];

export const getPostTemplate = (id: PostTemplateId): PostTemplate =>
  POST_TEMPLATES.find((t) => t.id === id) ?? POST_TEMPLATES[POST_TEMPLATES.length - 1];
