import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React, { useState } from "react";
import Icon from "react-native-vector-icons/FontAwesome5";
import ScreenView from "../../../../../../components/ScreenView";
import { theme } from "../../../../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../../util/functions/parseStyles";
import { useNavigation } from "@react-navigation/native";
import {
  RDPStackNavigationProp,
  RDPStackParamList,
} from "../../../../../../navigators/stacks/AcademyStack/DailyPracticeStack/ReadingPracticeStack/types";
import DonePractice from "../../../components/DonePractice";
import SpeechTools from "../../../components/SpeechTools";
import PageCounter from "../components/PageCounter";
import CustomScrollView, {
  SHADOW_BUFFER,
} from "../../../../../../components/CustomScrollView";
import Metronome from "../../../../Library/TechniquePage/components/Metronome";
import RecordingWidget from "../../../../Library/TechniquePage/components/RecordingWidget";
import RecorderWidget from "../../../../Library/TechniquePage/components/RecorderWidget";
import Button from "../../../../../../components/Button";

const QuotePractice = () => {
  const navigation =
    useNavigation<RDPStackNavigationProp<keyof RDPStackParamList>>();
  const [practiceComplete, setPracticeComplete] = useState(false);
  const onBackPress = () => {
    navigation.goBack();
  };
  return (
    <ScreenView style={styles.screenView}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.topNavigation} onPress={onBackPress}>
          <Icon name="arrow-left" size={16} color={theme.colors.text.default} />
          <Text style={styles.topNavigationText}>Quote</Text>
        </TouchableOpacity>
        {practiceComplete ? (
          <DonePractice />
        ) : (
          <CustomScrollView contentContainerStyle={styles.scrollContainer}>
            <SpeechTools />
            <View style={styles.activityContainer}>
              <View style={styles.quoteContainer}>
                <View style={styles.quoteIconContainer}>
                  <Icon
                    name="quote-right"
                    size={24}
                    color={theme.colors.actionPrimary.default}
                  />
                </View>
                <Text style={styles.quoteText}>
                  Success is not final, failure is not fatal: it is the courage
                  to continue that counts."
                </Text>
                <Text style={styles.quoteAuthor}>Winston Churchill</Text>
              </View>
              <Metronome />
              <RecordingWidget />
              <RecorderWidget />
            </View>
            <Button
              text="Mark Complete"
              onPress={() => {
                setPracticeComplete(true);
              }}
            />
          </CustomScrollView>
        )}
      </View>
    </ScreenView>
  );
};

export default QuotePractice;

const styles = StyleSheet.create({
  screenView: {
    paddingBottom: 0,
  },
  container: {
    gap: 32,
    flex: 1,
  },
  scrollContainer: {
    gap: 32,
    padding: SHADOW_BUFFER,
  },
  topNavigation: {
    position: "relative",
    top: 0,
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  topNavigationText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },
  activityContainer: {
    padding: 24,
    gap: 24,
    borderRadius: 16,
    backgroundColor: theme.colors.surface.elevated,
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  quoteContainer: {
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  quoteIconContainer: {
    height: 64,
    width: 64,
    borderRadius: "50%",
    backgroundColor: theme.colors.surface.default,
    justifyContent: "center",
    alignItems: "center",
  },
  quoteText: {
    ...parseTextStyle(theme.typography.Heading2),
    color: theme.colors.text.title,
    textAlign: "center",
  },
  quoteAuthor: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.default,
  },
});
