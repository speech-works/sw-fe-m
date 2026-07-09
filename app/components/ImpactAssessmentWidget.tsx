import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import PromoCard from "../screens/Home/components/PromoCard";

interface Props {
  onPress: () => void;
  dayNumber?: number;
  totalDays?: number;
  totalRemaining?: number;
  style?: StyleProp<ViewStyle>;
}

const TOTAL_QUESTIONS = 100; // Structured impact assessment total

const ImpactAssessmentWidget: React.FC<Props> = ({
  onPress,
  totalRemaining = 100,
  style,
}) => {
  const questionsAnswered = TOTAL_QUESTIONS - totalRemaining;
  const progressPercentage = Math.min(
    Math.max((questionsAnswered / TOTAL_QUESTIONS) * 100, 0),
    100,
  );

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
