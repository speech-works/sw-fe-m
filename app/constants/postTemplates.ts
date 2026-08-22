import { PracticePayloadField, TemplateId } from "../api/threads/types";

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
  id: TemplateId;
  label: string;
  /** MaterialCommunityIcons name. */
  icon: string;
  /** expo-linear-gradient colors. */
  gradient: readonly [string, string, ...string[]];
  emphasizes: PracticePayloadField[];
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
    id: "courage",
    label: "Courage",
    icon: "shield-star",
    gradient: ["#FF6B00", "#BF5000"],
    // `growthDelta` led this list and is gone. Behaviour is unchanged: neither
    // it nor `activityName` ever produced a chip, so this emphasis has always
    // been a no-op and the card falls through to STAT_ORDER.
    emphasizes: ["activityName"],
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
    blurb: "Clean and simple, your words",
  },
];

/**
 * `"streak"` is RETIRED and deliberately absent from the list above.
 *
 * It emphasised `streakDays` — a true consecutive-day count with a flame — which
 * is the one mechanic this product will not ship: a broken streak is a documented
 * cause of quitting, and it lands hardest on people who blame themselves, which
 * is our whole audience. `streakDays` is also gone from the composer's candidate
 * fields and from STAT_ORDER, so it can no longer be toggled on or rendered.
 *
 * The id stays in `TemplateId` and the fallback below still resolves, so posts
 * already shared with `templateId: "streak"` render as `minimal` rather than
 * crashing. Nothing is migrated.
 *
 * NOT affected: the Explore weekly chart, which counts days inside a week and
 * cannot break.
 */
export const getPostTemplate = (id: TemplateId): PostTemplate =>
  POST_TEMPLATES.find((t) => t.id === id) ?? POST_TEMPLATES[POST_TEMPLATES.length - 1];
