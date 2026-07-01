import { useNavigation } from "@react-navigation/native";
import React from "react";

import { AccentPicker } from "../../Academy/Tools/VoiceHover/AccentPicker";
import { SettingsStackNavigationProp } from "../../../navigators/stacks/SettingsStack/types";
import { Page } from "../../../design-system";

const ReadingVoice = () => {
  const navigation =
    useNavigation<SettingsStackNavigationProp<"ReadingVoice">>();

  return (
    <Page title="What accent do you want to hear?" onBack={() => navigation.goBack()}>
      <AccentPicker />
    </Page>
  );
};

export default ReadingVoice;
