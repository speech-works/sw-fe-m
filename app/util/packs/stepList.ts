import {
  ContentBlockType,
  FormBlockContent,
  ModuleContentBlock,
  QuizBlockContent,
  ReferenceBlockContent,
  TextBlockContent,
} from "../../api/packs/types";
import { teachParts } from "./teachParts";

/**
 * ── TODAY'S STEPS, NAMED ────────────────────────────────────────────────────
 * The round list button on a program day opens the whole day as a list
 * (program UX review, 2026-11-25). Every name comes from content the day
 * already has: a step's own title override, the lesson's first heading, the
 * number of questions. Nothing is written for the list.
 */
export interface DayStep {
  title: string;
  /** What kind of step it is, in plain words. */
  kind: string;
  /** Minutes, only when the content says so. */
  minutes?: number;
}

function firstHeading(markdown: string): string {
  const parts = teachParts(markdown);
  return parts[0]?.title ?? "";
}

export function dayStep(block: ModuleContentBlock): DayStep {
  switch (block.type) {
    case ContentBlockType.TEXT: {
      const c = block.content as TextBlockContent;
      if (c.role === "bridge_in") return { title: "Start", kind: "Where you are" };
      if (c.role === "bridge_out") return { title: "Close", kind: "What comes next" };
      const parts = teachParts(c.markdown);
      return {
        title: firstHeading(c.markdown) || "Lesson",
        kind: parts.length > 1 ? `Lesson · ${parts.length} parts` : "Lesson",
      };
    }
    case ContentBlockType.QUIZ: {
      const c = block.content as QuizBlockContent;
      const n = c.questions?.length ?? 0;
      const count = n === 1 ? "1 question" : n > 1 ? `${n} questions` : "Questions";
      return c.mode === "recall"
        ? { title: "Yesterday", kind: count }
        : { title: "Questions", kind: count };
    }
    case ContentBlockType.ACTIVITY: {
      const c = block.content as ReferenceBlockContent & { estimatedMinutes?: number };
      return {
        title: c.titleOverride || "Practice",
        kind: "Practice",
        minutes: typeof c.estimatedMinutes === "number" ? c.estimatedMinutes : undefined,
      };
    }
    case ContentBlockType.FORM: {
      const c = block.content as FormBlockContent;
      return { title: c.titleOverride || c.configuration?.title || "Log", kind: "Log" };
    }
    case ContentBlockType.VIDEO:
      return { title: "Video", kind: "Watch" };
    case ContentBlockType.GOALS:
      return { title: "Your goals", kind: "Goals" };
    case ContentBlockType.WEEK_REVIEW:
      return { title: "Your week", kind: "Review" };
    default:
      return { title: "Step", kind: "" };
  }
}

export function dayStepList(blocks: ModuleContentBlock[]): DayStep[] {
  return blocks.map(dayStep);
}
