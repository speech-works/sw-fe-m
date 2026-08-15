import React from "react";

import ProsePracticeScreen, {
  ProsePracticeConfig,
} from "../shared/ProsePracticeScreen";
import { ReadingPracticeType } from "../../../../../../api/dailyPractice/types";
import { readingPracticeAccents, readingTips } from "../data";

/**
 * Stories. The screen itself is shared with SPEECH — see ProsePracticeScreen.
 */
const config: ProsePracticeConfig = {
  type: ReadingPracticeType.STORY,
  screen: "StoryPractice",
  accent: readingPracticeAccents.story,
  title: "Story Practice",
  description: "Develop stamina and narrative flow through engaging stories.",
  category: "STORY",
  practiceName: "story practice",
  tips: readingTips.story,
  endMark: "THE END",
  logTag: "useStoryPractice",
};

const StoryPractice = () => <ProsePracticeScreen config={config} />;

export default StoryPractice;
