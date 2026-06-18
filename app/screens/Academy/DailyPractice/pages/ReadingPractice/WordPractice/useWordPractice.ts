import { ReadingPracticeType } from "../../../../../../api/dailyPractice/types";
import { useReadingPracticeBase } from "../shared/useReadingPracticeBase";

export const useWordPractice = () => {
  const { state, actions } = useReadingPracticeBase({
    type: ReadingPracticeType.WORD,
    logTag: "useWordPractice",
    withToolFreeNudgeTracking: true,
  });

  const { items, currentItem, ...restState } = state;

  return {
    state: {
      ...restState,
      allWords: items,
      currentWord: currentItem,
    },
    actions,
  };
};
