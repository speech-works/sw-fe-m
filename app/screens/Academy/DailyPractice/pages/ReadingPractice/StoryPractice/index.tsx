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
import CustomScrollView from "../../../../../../components/CustomScrollView";
import Metronome from "../../../../Library/TechniquePage/components/Metronome";
import RecordingWidget from "../../../../Library/TechniquePage/components/RecordingWidget";
import RecorderWidget from "../../../../Library/TechniquePage/components/RecorderWidget";
import Button from "../../../../../../components/Button";

const StoryPractice = () => {
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
          <Icon name="arrow-left" />
          <Text style={styles.topNavigationText}>Story</Text>
        </TouchableOpacity>
        {practiceComplete ? (
          <DonePractice />
        ) : (
          <CustomScrollView contentContainerStyle={styles.scrollContainer}>
            <SpeechTools />
            <View style={styles.readingPageContainer}>
              <PageCounter currentPage={1} totalPages={3} />
              <View style={styles.readingPieceContainer}>
                <View>
                  <Text style={styles.readingPieceTitleText}>
                    The Little Red Riding Hood
                  </Text>
                  <View style={styles.readingPieceMeta}>
                    <Text style={styles.readingTime}>5 min read</Text>
                    <Text>•</Text>
                    <Text style={styles.readingLevel}>Level: Easy</Text>
                  </View>
                </View>
                <View style={styles.readingTextContainer}>
                  <Text style={styles.readingText}>
                    Once upon a time, there was a little girl who lived in a
                    village near the forest. Whenever she went out, the little
                    girl wore a red riding cloak, so everyone in the village
                    called her Little Red Riding Hood.
                  </Text>
                  <Text style={styles.readingText}>
                    One morning, Little Red Riding Hood asked her mother if she
                    could go to visit her grandmother as it had been awhile
                    since they'd seen each other.
                  </Text>
                </View>
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

export default StoryPractice;

const styles = StyleSheet.create({
  screenView: {
    paddingBottom: 0,
  },
  container: {
    gap: 32,
    flex: 1,
  },
  scrollContainer: { gap: 32 },
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
  readingPageContainer: {
    padding: 24,
    gap: 24,
    borderRadius: 16,
    backgroundColor: theme.colors.surface.elevated,
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  readingPieceContainer: {
    gap: 12,
  },
  readingPieceTitleText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },
  readingPieceMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  readingTime: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: theme.colors.text.default,
  },
  readingLevel: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: theme.colors.text.default,
  },
  readingTextContainer: {
    gap: 16,
  },
  readingText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
  },
});
