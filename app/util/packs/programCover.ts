import type { ImageSourcePropType } from "react-native";

/**
 * ===========================================================================
 * EACH PROGRAM'S COVER: THE APP SHIPS THE ART, THE SERVER MAY ADD MORE
 * ---------------------------------------------------------------------------
 * The ten seeded programs have their covers bundled here, keyed by
 * `catalogKey`. They are not fetched, because there is nowhere to fetch them
 * from: the URLs the seeds used to carry pointed at an S3 bucket that has never
 * existed, and every bucket the backend does have blocks public reads. Bundled
 * art also draws on the first frame, works offline, and still changes without a
 * store release, since an OTA update carries the image assets with the JS.
 *
 * `packs.coverImage` is the second source, for a program this build has no
 * art for (one made in the console, or one added after this build shipped). It
 * never overrides the bundled art: a typo in a console field must not be able
 * to blank the cover of a program that has a good one.
 *
 * Neither source means no cover, and every surface then draws the card it drew
 * before covers existed.
 * ===========================================================================
 */

const BUNDLED_COVERS: Record<string, ImageSourcePropType> = {
  interview_ready: require("../../assets/program-covers/interview_ready.png"),
  hard_conversations: require("../../assets/program-covers/hard_conversations.png"),
  panic_button: require("../../assets/program-covers/panic_button.png"),
  understanding_your_voice: require("../../assets/program-covers/understanding_your_voice.png"),
  breaking_thought_traps: require("../../assets/program-covers/breaking_thought_traps.png"),
  bouncing_back: require("../../assets/program-covers/bouncing_back.png"),
  dating_intimacy: require("../../assets/program-covers/dating_intimacy.png"),
  speech_toolkit: require("../../assets/program-covers/speech_toolkit.png"),
  art_of_disclosure: require("../../assets/program-covers/art_of_disclosure.png"),
  word_swap: require("../../assets/program-covers/word_swap.png"),
};

/**
 * What each picture shows, for a screen reader. Written from the round 3
 * covers (sw-landing/artwork/program-covers/BRIEF.md): what is in the picture,
 * never what the program promises. The iceberg is the one cover with words
 * on it, so its description reads them out.
 */
const COVER_DESCRIPTIONS: Record<string, string> = {
  interview_ready:
    "A video call on a desktop monitor. A person in a suit and tie looks ready to answer. Yellow sticky notes are stuck all round the screen. Some notes are crossed out and one has a tick.",
  hard_conversations:
    "A hand holds a phone. A person with a headset rises out of the screen, looking worried, in the middle of a sentence. A green speech bubble carries their words out past the edge of the phone.",
  panic_button:
    "A big red no sign. Inside it, a person with blonde hair blowing sideways looks flustered, eyes wide and teeth gritted. Pale hands reach in from a blue cloud behind them, and the red bar of the sign crosses the hands out.",
  understanding_your_voice:
    "An iceberg with a small tip above the water and a much bigger part below. Labels on the tip say Blocks and Repetitions. Labels below the water say Fear, Swapped words, Avoidance and Tiredness. A person in a headscarf looks out of a yellow submarine, and a few fish swim past.",
  breaking_thought_traps:
    "A big head seen from the side, eyes closed and calm. At the back of the head a door stands open. A small version of the same person runs out of it, toward a flight of stairs.",
  bouncing_back:
    "A person with braids and glasses springs up out of a jack-in-the-box, both arms raised high, with confetti all around.",
  dating_intimacy:
    "Two profile cards lean toward each other. In one photo a person laughs, and in the other a person glances across at them. A heart and two speech bubbles sit between the cards.",
  speech_toolkit:
    "A person in star-shaped glasses, a hard hat and a hi-vis vest stands behind an open toolbox. Tools are scattered all around: a wrench, a saw, a hammer, a drill, a tape measure, a level and a paintbrush.",
  art_of_disclosure:
    "A person in a cowboy hat looks over the top of a brick wall with a warm smile, fingers curled over the edge.",
  word_swap:
    "A person with blonde pigtails sits up to the shoulders in a heap of speech bubbles of every shape. One orange bubble beside them stands out from the rest.",
};

/** The programs that ship with art, pinned by a test against the seeds. */
export const BUNDLED_COVER_KEYS = Object.keys(BUNDLED_COVERS);

export interface ProgramCover {
  source: ImageSourcePropType;
  /**
   * What the art shows, for a screen reader. Null for a remote cover, which
   * nobody has described.
   */
  description: string | null;
}

export function programCoverFor(
  catalogKey: string | null | undefined,
  coverImage?: string | null,
): ProgramCover | null {
  // `hasOwnProperty`, not `in` or a bare index, for the reason `packIconFor`
  // gives: "constructor" would otherwise come back as a cover.
  if (catalogKey && Object.prototype.hasOwnProperty.call(BUNDLED_COVERS, catalogKey)) {
    return {
      source: BUNDLED_COVERS[catalogKey],
      description: COVER_DESCRIPTIONS[catalogKey] ?? null,
    };
  }
  // https only. iOS refuses plain http, so an http cover would draw an empty
  // box where the plain card would have been the better answer.
  const url = coverImage?.trim();
  if (url && /^https:\/\/\S+$/i.test(url)) {
    return { source: { uri: url }, description: null };
  }
  return null;
}
