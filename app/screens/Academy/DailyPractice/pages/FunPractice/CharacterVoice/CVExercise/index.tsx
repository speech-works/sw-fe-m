import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React, { useState } from "react";
import Icon from "react-native-vector-icons/FontAwesome5";
import CustomScrollView, {
  SHADOW_BUFFER,
} from "../../../../../../../components/CustomScrollView";
import ScreenView from "../../../../../../../components/ScreenView";
import { theme } from "../../../../../../../Theme/tokens";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { CharacterVoiceFDPStackParamList } from "../../../../../../../navigators/stacks/AcademyStack/DailyPracticeStack/FunPracticeStack/CharacterVoicePracticeStack/types";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../../../util/functions/parseStyles";
import RecordingWidget from "../../../../../Library/TechniquePage/components/RecordingWidget";
import RecorderWidget from "../../../../../Library/TechniquePage/components/RecorderWidget";
import Button from "../../../../../../../components/Button";
import DonePractice from "../../../../components/DonePractice";

const CVExercise = () => {
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<CharacterVoiceFDPStackParamList, "CVExercise">>();
  const { name } = route.params;
  const [isDone, setIsDone] = useState(false);
  return (
    <ScreenView style={styles.screenView}>
      <View style={styles.container}>
        <View style={styles.topNavigationContainer}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.topNavigation}
          >
            <Icon
              name="chevron-left"
              size={16}
              color={theme.colors.text.default}
            />
            <Text style={styles.topNavigationText}>Character Voice</Text>
          </TouchableOpacity>
        </View>

        <CustomScrollView contentContainerStyle={styles.scrollContent}>
          {isDone ? (
            <DonePractice />
          ) : (
            <>
              <View style={styles.exerciseCard}>
                <View style={styles.textContainer}>
                  <Text style={styles.titleText}>{name}</Text>
                  <Text style={styles.actualText}>
                    Peter Piper picked a peck of pickled peppers
                  </Text>
                </View>
                <RecordingWidget />
                <View style={styles.recorderContainer}>
                  <RecorderWidget />
                  <Text style={styles.recordTipText}>
                    Tap microphone to {"start"} speaking
                  </Text>
                </View>
              </View>
              <Button
                text="Mark Complete"
                onPress={() => {
                  setIsDone(true);
                }}
              />
            </>
          )}
        </CustomScrollView>
      </View>
    </ScreenView>
  );
};

export default CVExercise;

const styles = StyleSheet.create({
  screenView: {
    paddingBottom: 0,
  },
  container: {
    flex: 1,
    gap: 32,
  },
  scrollContent: {
    gap: 32,
    flexGrow: 1,
    padding: SHADOW_BUFFER,
    paddingBottom: 20,
  },
  topNavigationContainer: {
    position: "relative",
    top: 0,
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topNavigation: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  topNavigationText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },
  exerciseCard: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 32,
    backgroundColor: theme.colors.surface.elevated,
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  textContainer: {
    gap: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  titleText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
    fontWeight: 600,
  },
  actualText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.default,
    textAlign: "center",
    fontWeight: 400,
  },
  recorderContainer: {
    gap: 16,
  },
  recordTipText: {
    textAlign: "center",
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
});
