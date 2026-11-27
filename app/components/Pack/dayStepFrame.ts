/**
 * Which frame a step of the program day gets (see DayFrame): the height of the orange zone, what the zone says, and Pip.
 * Pure, so the choice can be tested without a screen. A step that is not listed here gets the slim frame.
 *
 *   start (bridge_in)    medium. The day's own title is the zone title, with "Day N of 7 · Step N of M" above it. Pip at the
 *                        right, large: he comes up warm and waves once.
 *   close (bridge_out)   medium, the twin of the start. The zone title is the step's own kind line ("What comes next").
 *                        Pip comes up proud, opens his palms once, ends calm.
 *   yesterday (recall)   medium. The header keeps the day title; the zone title is "From yesterday". Pip at the right, small:
 *                        thinking, a hand to his cheek once; he nods when an answer is picked.
 *   practice (activity)  tall: the step's one moment (mock 04). Pip in the centre, large. He comes up curious, then settles
 *                        (his "settle" body move). Step already done: he comes up warm and nods once.
 *   log (form)           tall, the same frame as the practice card (mock 05). He comes up listening and leans in once (his
 *                        "lean" body move). Step already done: warm, one nod.
 *   video                medium, no Pip (the video has its own characters). The day's title is the zone title with the
 *                        day line above it, as on the start step (mock 09).
 *
 * PIP'S MOVES are his real ones only (Pip.tsx): faces, the five hand moves, the body moves. A hand move starts and ends on
 * the calm face and owns the face while it plays, so a face is set before it (he comes up with it) or after it.
 */
import { ContentBlockType, ModuleContentBlock, QuizBlockContent, TextBlockContent } from "../../api/packs/types";
import type { PipBeat, PipFace } from "../Pip/Pip";
import { dayStep } from "../../util/packs/stepList";

export type DayZone = "slim" | "medium" | "tall";
/** right, large (start, close) / right, small (yesterday) / centre, the step's one moment (practice and log cards). */
export type DayPipKind = "large" | "small" | "hero";
export type DayStepKind = "start" | "close" | "yesterday" | "practice" | "log" | "video" | "work";

export interface DayStepFrame {
  kind: DayStepKind;
  zone: DayZone;
  /** The header row beside the back disc shows the day title and the "Day N of 7 · Step N of M" line. */
  headerText: boolean;
  /** The large title in the zone (medium zone only). */
  zoneTitle: string | null;
  /** The "Day N of 7 · Step N of M" line sits above the zone title (when the header row does not show it). */
  zoneMeta: boolean;
  pip: DayPipKind | null;
  /** The face he comes up with. */
  pipFace: PipFace;
  /** How far his hands reach toward the zone's text during this step's moves, from his middle, as a share of his width
   *  (0 = no further than his head). The text keeps clear of it. Open palms come out on both sides (0.4, measured on
   *  h-palms); the wave and the hand to the cheek are on his other side. */
  pipReach: number;
  /** What he does once he is up. */
  pipUp: PipBeat[];
  /** How long the sheet's text waits for him (ms; 0 = it is there at once). */
  textDelay: number;
}

// Pip.tsx: FACE_MS and PIP_MOVE_MS (copied, so this file stays free of the drawing code and can be tested alone)
const FACE_MS = 340;
const PIP_MOVE_MS = { "h-wave": 4050, "h-palms": 3280, "h-cheek": 3400 } as const;
/** He settles for a moment after he has come up, then his hands move. */
const SETTLE = 260;

/** Start: one wave, then the warm face again (the wave ends on the calm face). */
export const PIP_START_UP: PipBeat[] = [{ at: SETTLE, move: "h-wave", low: true }, { at: SETTLE + FACE_MS + PIP_MOVE_MS["h-wave"] + 80, face: "warm" }];
/** Close: he holds the proud face for a beat, then palms open; the move leaves him calm. */
export const PIP_CLOSE_UP: PipBeat[] = [{ at: 700, move: "h-palms" }, { at: 700 + FACE_MS + PIP_MOVE_MS["h-palms"] + 80, face: "calm" }];
/** From yesterday: a hand to his cheek once, then he keeps thinking while the options are open. */
export const PIP_YESTERDAY_UP: PipBeat[] = [{ at: SETTLE, move: "h-cheek" }, { at: SETTLE + FACE_MS + PIP_MOVE_MS["h-cheek"] + 80, face: "thinking" }];
/** An answer is picked (any answer, before Check): he listens and nods once. Never a mark of right or wrong. */
export const PIP_PICKED: PipBeat[] = [{ at: 0, face: "listening" }, { at: 120, body: "nod" }];
/** The answer sheet has closed and he is back: warm, then calm. */
export const PIP_BACK: PipBeat[] = [{ at: 0, face: "warm" }, { at: 1600, face: "calm" }];

/** Practice card: he has come up with the curious face; one settle (a breath out), then only his own idle. */
export const PIP_PRACTICE_UP: PipBeat[] = [{ at: SETTLE, body: "settle" }];
/** Log card: he has come up with the listening face; he leans in once. */
export const PIP_LOG_UP: PipBeat[] = [{ at: SETTLE, body: "lean" }];
/** A card whose step is already done: he has come up with the warm face (set again here, for a step that was marked done
 *  while he was coming up); one nod. No stars, no XP, nothing else. */
export const PIP_CARD_DONE_UP: PipBeat[] = [{ at: 0, face: "warm" }, { at: SETTLE, body: "nod" }];
/** Back on the card with the step just done (he is already up): warm face, one nod. It starts after the screen that was
 *  over the card has gone. */
export const PIP_CARD_DONE: PipBeat[] = [{ at: 380, face: "warm" }, { at: 600, body: "nod" }];

const SLIM: DayStepFrame = { kind: "work", zone: "slim", headerText: true, zoneTitle: null, zoneMeta: false, pip: null, pipFace: "calm", pipReach: 0, pipUp: [], textDelay: 0 };

export function dayStepFrame(block: ModuleContentBlock | undefined, dayTitle: string, state: { completed?: boolean } = {}): DayStepFrame {
  if (!block) return SLIM;
  if (block.type === ContentBlockType.ACTIVITY || block.type === ContentBlockType.FORM) {
    const practice = block.type === ContentBlockType.ACTIVITY;
    const card = { kind: practice ? "practice" : "log", zone: "tall", headerText: true, zoneTitle: null, zoneMeta: false, pip: "hero", pipReach: 0, textDelay: 0 } as const;
    if (state.completed) return { ...card, pipFace: "warm", pipUp: PIP_CARD_DONE_UP };
    return practice ? { ...card, pipFace: "curious", pipUp: PIP_PRACTICE_UP } : { ...card, pipFace: "listening", pipUp: PIP_LOG_UP };
  }
  if (block.type === ContentBlockType.VIDEO) {
    return { kind: "video", zone: "medium", headerText: false, zoneTitle: dayTitle, zoneMeta: true, pip: null, pipFace: "calm", pipReach: 0, pipUp: [], textDelay: 0 };
  }
  if (block.type === ContentBlockType.TEXT) {
    const role = (block.content as TextBlockContent).role;
    if (role === "bridge_in") {
      return { kind: "start", zone: "medium", headerText: false, zoneTitle: dayTitle, zoneMeta: true, pip: "large", pipFace: "warm", pipReach: 0, pipUp: PIP_START_UP, textDelay: 620 };
    }
    if (role === "bridge_out") {
      return { kind: "close", zone: "medium", headerText: false, zoneTitle: dayStep(block).kind || dayTitle, zoneMeta: true, pip: "large", pipFace: "proud", pipReach: 0.4, pipUp: PIP_CLOSE_UP, textDelay: 620 };
    }
    return SLIM;
  }
  if (block.type === ContentBlockType.QUIZ) {
    const quiz = block.content as QuizBlockContent;
    if (quiz.mode === "recall" && (quiz.questions?.length ?? 0) > 0) {
      return { kind: "yesterday", zone: "medium", headerText: true, zoneTitle: "From yesterday", zoneMeta: false, pip: "small", pipFace: "thinking", pipReach: 0, pipUp: PIP_YESTERDAY_UP, textDelay: 0 };
    }
  }
  return SLIM;
}

/**
 * The zone title's size: 30 (system.md), 26 or 24 on a long title. The largest size at which the longest word fits the
 * room beside Pip and the title needs at most three lines. A word that fits is never cut; the text wraps and the zone
 * grows with it. Widths are estimated (Inter ExtraBold is about 0.53 em a letter, measured on the day titles).
 * `maxLines` (default 3): a screen with a shorter zone asks for fewer lines before the title goes down a size.
 * `maxSize` (default 30): a zone whose sheet needs the room (the video step: 26) starts at a smaller size.
 */
export const ZONE_TITLE_SIZES = [30, 26, 24] as const;
export function zoneTitleSize(title: string, room: number, maxLines = 3, maxSize: number = ZONE_TITLE_SIZES[0]): { fontSize: number; lineHeight: number; lines: number } {
  const words = title.trim().split(/\s+/).filter(Boolean);
  const EM = 0.53;
  const linesAt = (size: number) => {
    const w = (n: number) => n * size * EM;
    let lines = 1, used = 0;
    for (const x of words) {
      const need = used === 0 ? w(x.length) : used + w(x.length + 1);
      if (need > room && used > 0) { lines += 1; used = w(x.length); } else used = need;
    }
    return lines;
  };
  const pick = (fontSize: number) => ({ fontSize, lineHeight: fontSize + 6, lines: linesAt(fontSize) });
  for (const size of ZONE_TITLE_SIZES) {
    if (size > maxSize) continue;
    if (words.some((x) => x.length * size * EM > room)) continue;
    if (linesAt(size) <= maxLines) return pick(size);
  }
  return pick(ZONE_TITLE_SIZES[ZONE_TITLE_SIZES.length - 1]);
}
