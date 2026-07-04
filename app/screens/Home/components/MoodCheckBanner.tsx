import { useNavigation } from "@react-navigation/native";
import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import {
  ExploreStackNavigationProp,
  ExploreStackParamList,
} from "../../../navigators/stacks/ExploreStack/types";
import { useMoodCheckStore } from "../../../stores/mood";
import PromoCard from "./PromoCard";

interface Props {
  style?: StyleProp<ViewStyle>;
}

const MoodCheckBanner = ({ style }: Props) => {
  const { hasRecordedToday } = useMoodCheckStore();
  const exploreNavigation =
    useNavigation<ExploreStackNavigationProp<keyof ExploreStackParamList>>();

  if (hasRecordedToday) return null;

  return (
    <PromoCard
      variant="mood"
      style={style}
      onPress={() => {
        // @ts-expect-error — nested navigator param types aren't propagated to this screen's nav prop
        exploreNavigation.navigate("ExploreStack", {
          screen: "MoodCheckStack",
          params: { screen: "CheckIn" },
        });
      }}
    />
  );
};

export default React.memo(MoodCheckBanner);
