import { ReadingPracticeType } from "../../../../../../api/dailyPractice/types";
import { useReadingPracticeBase } from "../shared/useReadingPracticeBase";

export const useQuotePractice = () => {
  const { state, actions } = useReadingPracticeBase({
    type: ReadingPracticeType.QUOTE,
    logTag: "useQuotePractice",
  });

  const { items, currentItem, ...restState } = state;

  return {
    state: {
      ...restState,
      allQuotes: items,
      currentQuote: currentItem,
    },
    actions,
  };
};
