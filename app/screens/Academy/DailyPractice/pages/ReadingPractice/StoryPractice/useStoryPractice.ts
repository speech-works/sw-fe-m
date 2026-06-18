import { ReadingPracticeType } from "../../../../../../api/dailyPractice/types";
import { useReadingPracticeBase } from "../shared/useReadingPracticeBase";

export const useStoryPractice = () => {
  const { state, actions } = useReadingPracticeBase({
    type: ReadingPracticeType.STORY,
    logTag: "useStoryPractice",
    withPagination: true,
    preferGoBackOnDone: true,
  });

  const { items, currentItem, ...restState } = state;

  return {
    state: {
      ...restState,
      allStories: items,
      currentStory: currentItem,
    },
    actions,
  };
};
