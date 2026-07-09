import { useNavigation } from "@react-navigation/native";
import React from "react";
import {
  SBEDPStackNavigationProp,
  SBEDPStackParamList,
} from "../../../../../../navigators/stacks/ExploreStack/DailyPracticeStack/ExposureStack/SecondaryBehaviorsStack/types";
import { Page, Text } from "../../../../../../design-system";

const SecondaryBehaviors = () => {
  const navigation =
    useNavigation<SBEDPStackNavigationProp<keyof SBEDPStackParamList>>();
  return (
    <Page title="AI Phone Calls" onBack={() => navigation.goBack()}>
      <Text variant="body" color="secondary">
        Secondary Behaviors Screen
      </Text>
    </Page>
  );
};

export default SecondaryBehaviors;
