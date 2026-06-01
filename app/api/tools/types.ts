export enum ToolType {
  DAF = "DAF",
  METRONOME = "METRONOME",
  CHORUS = "CHORUS",
}

export interface Tool {
  id: string;
  description: string;
  configuration: any;
  type: ToolType;
}

export type NudgeVariant = "standard" | "covert";

/**
 * Server-authored fluency-aid over-reliance nudge. The app is a dumb renderer:
 * all copy, the variant, and the threshold logic live on the backend
 * (config/toolGuardrails.ts), delivered on the /users/me payload.
 */
export interface ToolNudgeDirective {
  tool: ToolType;
  variant: NudgeVariant;
  icon: string;
  title: string;
  body: string;
  primaryAction: { label: string; action: "START_WITHOUT_TOOL" };
  secondaryAction: { label: string; action: "DISMISS" };
}
