import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import PromoCard from "../screens/Home/components/PromoCard";

interface Props {
  onPress: () => void;
  /** Answered so far — from the server, not assumed. */
  totalAnswered?: number;
  totalRemaining?: number;
  style?: StyleProp<ViewStyle>;
}

const ImpactAssessmentWidget: React.FC<Props> = ({
  onPress,
  totalAnswered = 0,
  totalRemaining = 0,
  style,
}) => {
  // Derive the denominator instead of hardcoding it.
  //
  // This used to assume `TOTAL_QUESTIONS = 100` while the bank actually holds
  // 42, so a user who had answered nothing was shown a bar sitting at 58%
  // ((100 - 42) / 100) — and it could never reach 100%. Deriving it from
  // answered + remaining is exact, and self-corrects if the bank ever changes
  // size or the flow becomes phased.
  const total = totalAnswered + totalRemaining;
  const progressPercentage =
    total > 0
      ? Math.min(Math.max((totalAnswered / total) * 100, 0), 100)
      : 0;

  return (
    <PromoCard
      variant="impactAssessment"
      onPress={onPress}
      style={style}
      subtitle={`${totalRemaining} question${
        totalRemaining !== 1 ? "s" : ""
      } remaining • Answer at your own pace.`}
      progress={{ leftLabel: "Progress", percentage: progressPercentage }}
    />
  );
};

export default React.memo(ImpactAssessmentWidget);
