import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import PromoCard from "../screens/Home/components/PromoCard";

interface Props {
  onPress: () => void;
  /** How many required questions the person has actually answered. */
  answered: number;
  /** How many required questions the flow has in total. */
  total: number;
  /** The next question they'd be asked, used as the card's subtitle. */
  nextQuestionText?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * COUNTS ANSWERS, NOT POSITION.
 *
 * This used to take `currentStep`/`totalSteps` derived from the onboarding
 * store's screen counter, which measures where somebody last WAS, not what they
 * have DONE. Two things went wrong with that:
 *
 *   - Resuming at screen 13 showed "Step 13 of 13" with a full bar and twelve
 *     questions unanswered — a card promising one tap and delivering thirteen,
 *     to precisely the people who had abandoned it once already.
 *   - Home fell back to `totalSteps = 1` whenever the flow had not been fetched,
 *     producing "Step 1 of 1", also full.
 *
 * Counting answers is honest for a gap anywhere — Act 1, Act 2, or both — which
 * is what the card has to cover now that skipping is permanent.
 */
const OnboardingReminderCard: React.FC<Props> = ({
  onPress,
  answered,
  total,
  nextQuestionText,
  style,
}) => {
  const safeTotal = total > 0 ? total : 0;
  const safeAnswered = Math.min(Math.max(answered, 0), safeTotal);
  const percentage = safeTotal > 0 ? (safeAnswered / safeTotal) * 100 : 0;

  return (
    <PromoCard
      variant="onboarding"
      onPress={onPress}
      style={style}
      // Naming the actual next question beats a generic prompt, and it is the
      // only wording that stays true whichever half of the flow is unanswered.
      // The hardcoded variant copy names screen 1's question, which is wrong
      // for anyone resuming past it.
      title={safeAnswered > 0 ? "Pick up where you left off" : undefined}
      subtitle={safeAnswered > 0 ? nextQuestionText : undefined}
      progress={{
        leftLabel: `${safeAnswered} of ${safeTotal} answered`,
        percentage,
      }}
    />
  );
};

export default React.memo(OnboardingReminderCard);
