import axiosClient from "../axiosClient";

/**
 * Why someone turned something down.
 *
 * Three reasons, not two, and the wording of each one is doing real work.
 * The model is COM-B: a behaviour needs Capability, Opportunity and
 * Motivation, and losing any one stops it — for completely different reasons.
 * ONLY `MOTIVATION` is avoidance. The other two are feedback about US: content
 * we taught badly, or timing we got wrong.
 */
export enum DeclineReason {
  /** "I'd need to be shown how first." */
  CAPABILITY = "CAPABILITY",
  /** "Today's not the day." */
  OPPORTUNITY = "OPPORTUNITY",
  /** "This one's too big a jump right now." */
  MOTIVATION = "MOTIVATION",
}

export interface RecordDeclineInput {
  /**
   * What was on offer. The server resolves the sub-type, the difficulty and
   * the intensity from these — deliberately, because at a pack block we know
   * the content id and the broad type but nothing about whether it is a phone
   * call or a drill, and because difficulty is the thing being measured.
   */
  contentType: string;
  contentId: string;
  practiceActivityId?: string | null;
  /** Omit when they were never asked — the intended path if they took the smaller version. */
  reason?: DeclineReason;
  /** Did THIS screen actually show a smaller version? Not "could one exist". */
  easierOffered?: boolean;
  /** They took the smaller version. An approach, not an avoidance. */
  easierAccepted?: boolean;
}

export interface RecordDeclineResult {
  /** False when this interaction moves no number — nothing was written. */
  recorded: boolean;
  growthPointKey: string | null;
  easierAvailable: boolean;
}

/**
 * Record that someone turned something down.
 *
 * NEVER BLOCKS THE USER. A decline is already a moment where someone has said
 * they can't face something; making them wait on a network call, or showing
 * them an error, would be the worst possible time to do it. Failures are
 * swallowed and the flow continues — losing one row is a far smaller cost than
 * standing between a struggling person and the way out.
 */
export async function recordGrowthPointDecline(
  input: RecordDeclineInput,
): Promise<RecordDeclineResult | null> {
  try {
    const res = await axiosClient.post("/growth-points/declines", input);
    return res.data ?? null;
  } catch (err) {
    console.warn("[growthPoints] Failed to record a decline", err);
    return null;
  }
}
