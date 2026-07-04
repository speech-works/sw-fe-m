import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import PromoCard from "../screens/Home/components/PromoCard";

interface Props {
  onPress: () => void;
  currentStep: number;
  totalSteps: number;
  style?: StyleProp<ViewStyle>;
}

const OnboardingReminderCard: React.FC<Props> = ({
  onPress,
  currentStep,
  totalSteps,
  style,
}) => {
  // Guard against divide-by-zero; `currentStep` is 0-indexed so +1 for display,
  // clamped so it can't visually exceed the total (e.g. on the "Done" screen).
  const safeTotal = totalSteps > 0 ? totalSteps : 1;
  const safeCurrent = Math.min(currentStep + 1, safeTotal);
  const progressPercentage = Math.min(
    Math.max((safeCurrent / safeTotal) * 100, 0),
    100,
  );

  return (
    <PromoCard
      variant="onboarding"
      onPress={onPress}
      style={style}
      progress={{
        leftLabel: `Step ${safeCurrent} of ${safeTotal}`,
        percentage: progressPercentage,
      }}
    />
  );
};

export default React.memo(OnboardingReminderCard);
