import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import React from "react";
import Angry1 from "../../../../assets/mood-check/Angry1";
import Calm1 from "../../../../assets/mood-check/Calm1";
import Happy1 from "../../../../assets/mood-check/Happy1";
import Sad1 from "../../../../assets/mood-check/Sad1";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../util/functions/parseStyles";
import { theme } from "../../../../Theme/tokens";
import Icon from "react-native-vector-icons/FontAwesome5";
import { useNavigation } from "@react-navigation/native";
import {
  AcademyStackNavigationProp,
  AcademyStackParamList,
} from "../../../../navigators/stacks/AcademyStack/types";
import { MoodType } from "../../../../api/moodCheck/types";

const emotions = [
  {
    id: MoodType.ANGRY,
    name: "Angry",
    description: "Something's clearly up! Share it.",
    icon: Angry1,
    bgColor: theme.colors.moodcheck.angry,
  },
  {
    id: MoodType.CALM,
    name: "Calm",
    description: "What's your go-to for zen?",
    icon: Calm1,
    bgColor: theme.colors.moodcheck.calm,
  },
  {
    id: MoodType.HAPPY,
    name: "Happy",
    description: "Tell us all about it!",
    icon: Happy1,
    bgColor: theme.colors.moodcheck.happy,
  },
  {
    id: MoodType.SAD,
    name: "Sad",
    description: "Thinking of you! Share with us.",
    icon: Sad1,
    bgColor: theme.colors.moodcheck.sad,
  },
];

const MoodCheck = () => {
  const academyNavigation =
    useNavigation<AcademyStackNavigationProp<keyof AcademyStackParamList>>();

  return (
    <View style={styles.container}>
      <Text style={styles.titleText}>How do you feel today?</Text>
      <View style={styles.emotionsContainer}>
        {emotions.map((emo, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.emotionBlock, { backgroundColor: emo.bgColor }]}
            onPress={() => {
              academyNavigation.navigate("MoodCheckStack", {
                screen: "FollowUpStack",
                params: { mood: emo.id },
              });
              // moodCheckNavigation.navigate("FollowUp");
            }}
          >
            <emo.icon width={48} height={48} />
            <View style={styles.emotionTextContainer}>
              <Text style={styles.emotionText}>{emo.name}</Text>
              <Text style={styles.emotionDescriptionText}>
                {emo.description}
              </Text>
            </View>
            <Icon name="chevron-right" style={styles.chevronIcon} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

export default MoodCheck;

const styles = StyleSheet.create({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  titleText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },
  emotionsContainer: {
    display: "flex",
    gap: 16,
  },
  emotionBlock: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 8,
    paddingVertical: 16,
    borderRadius: 12,
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  emotionTextContainer: {
    display: "flex",
    flexDirection: "column",
    gap: 0,
  },
  emotionText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
  },
  emotionDescriptionText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  chevronIcon: {
    position: "absolute",
    right: 16,
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
  },
});
