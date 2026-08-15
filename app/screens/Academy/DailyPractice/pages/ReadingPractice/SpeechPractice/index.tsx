import React from "react";

import ProsePracticeScreen, {
  ProsePracticeConfig,
} from "../shared/ProsePracticeScreen";
import { ReadingPracticeType } from "../../../../../../api/dailyPractice/types";
import { readingPracticeAccents, readingTips } from "../data";

/**
 * Speeches — oratory read as oratory.
 *
 * Shares the long-form reading screen with stories. What differs is the shelf
 * it reads from and the framing: a speech asks for projection and a deliberate
 * pace, and its entries are passages from a longer address rather than whole
 * pieces, so the closing marker says so instead of "THE END".
 */
const config: ProsePracticeConfig = {
  type: ReadingPracticeType.SPEECH,
  screen: "SpeechPractice",
  accent: readingPracticeAccents.speech,
  title: "Speech Practice",
  description: "Read aloud as if to a room. Projection, pace and pause.",
  category: "SPEECH",
  practiceName: "speech practice",
  tips: readingTips.speech,
  endMark: "END OF PASSAGE",
  logTag: "useSpeechPractice",
};

const SpeechPractice = () => <ProsePracticeScreen config={config} />;

export default SpeechPractice;
