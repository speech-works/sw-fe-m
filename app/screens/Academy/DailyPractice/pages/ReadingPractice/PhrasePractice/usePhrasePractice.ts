import { ReadingPracticeType } from "../../../../../../api/dailyPractice/types";
import { useReadingPracticeBase } from "../shared/useReadingPracticeBase";

export const usePhrasePractice = () => {
  const { state, actions } = useReadingPracticeBase({
    type: ReadingPracticeType.PHRASE,
    logTag: "usePhrasePractice",
  });

  const { items, currentItem, ...restState } = state;

  return {
    state: {
      ...restState,
      allPhrases: items,
      currentPhrase: currentItem,
    },
    actions,
  };
};
