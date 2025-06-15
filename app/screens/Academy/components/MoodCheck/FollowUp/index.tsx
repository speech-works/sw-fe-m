import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import LottieView from "lottie-react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import ScreenView from "../../../../../components/ScreenView";
import { theme } from "../../../../../Theme/tokens";
import { parseTextStyle } from "../../../../../util/functions/parseStyles";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";

import ListCard, {
  ListCardProps,
} from "../../../DailyPractice/components/ListCard";
import CustomScrollView from "../../../../../components/CustomScrollView";

import { MOOD } from "../../../../../types/mood";
import { MoodCheckStackParamList } from "../../../../../navigators/stacks/AcademyStack/MoodCheckStack/types";

const iconContainerStyle: ViewStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  height: 48,
  width: 48,
  borderRadius: 24,
};

// Map mood to content and activities
const moodContentMap = {
  [MOOD.HAPPY]: {
    title: "What’s been making you smile today?",
    desc: "Celebrating wins—big or small—boosts confidence. Share your joy.",
    Icon: "Happy1",
    helpful: [
      {
        title: "Share a funny story",
        description: "Record or write a moment that made you laugh",
        icon: (
          <View
            style={[
              iconContainerStyle,
              { backgroundColor: theme.colors.library.pink[100] },
            ]}
          >
            <Icon
              name="laugh-beam"
              size={20}
              color={theme.colors.library.pink[500]}
            />
          </View>
        ),
        action: "FunnyStory", // route name placeholder
      },
      {
        title: "Uplifting affirmations",
        description: "Listen to or record a positive mantra",
        icon: (
          <View
            style={[
              iconContainerStyle,
              { backgroundColor: theme.colors.library.yellow[100] },
            ]}
          >
            <Icon
              name="sun"
              size={20}
              color={theme.colors.library.yellow[400]}
            />
          </View>
        ),
        action: "Affirmations",
      },
    ],
  },
  [MOOD.ANGRY]: {
    title: "Got some steam to let off?",
    desc: "Naming anger and putting it into words helps you release tension.",
    Icon: "Angry1",
    helpful: [
      {
        title: "Breath pacing technique",
        description: "Guided exercise to help you calm down",
        icon: (
          <View
            style={[
              iconContainerStyle,
              { backgroundColor: theme.colors.library.blue[100] },
            ]}
          >
            <Icon
              solid
              name="wind"
              size={20}
              color={theme.colors.library.blue[400]}
            />
          </View>
        ),
        action: "BreathPacing",
      },
      {
        title: "Progressive muscle relax",
        description: "Tense and release muscles step by step",
        icon: (
          <View
            style={[
              iconContainerStyle,
              { backgroundColor: theme.colors.library.green[100] },
            ]}
          >
            <Icon
              name="dumbbell"
              size={20}
              color={theme.colors.library.green[500]}
            />
          </View>
        ),
        action: "MuscleRelax",
      },
    ],
  },
  [MOOD.SAD]: {
    title: "Need to lighten your heart?",
    desc: "Expressing tough feelings eases the load. Let it out in speech or text.",
    Icon: "Sad1",
    helpful: [
      {
        title: "Write a gratitude list",
        description: "Note three things you appreciate",
        icon: (
          <View
            style={[
              iconContainerStyle,
              { backgroundColor: theme.colors.library.orange[100] },
            ]}
          >
            <Icon
              name="list"
              size={20}
              color={theme.colors.library.orange[400]}
            />
          </View>
        ),
        action: "GratitudeList",
      },
      {
        title: "Body scan meditation",
        description: "Release tension and find your center",
        icon: (
          <View
            style={[
              iconContainerStyle,
              { backgroundColor: theme.colors.library.green[100] },
            ]}
          >
            <Icon
              name="user-alt"
              size={20}
              color={theme.colors.library.green[500]}
            />
          </View>
        ),
        action: "BodyScan",
      },
    ],
  },
  [MOOD.CALM]: {
    title: "Feeling peaceful right now?",
    desc: "Capture this calm—it’ll be your anchor when things get hectic.",
    Icon: "Calm1",
    helpful: [
      {
        title: "Mindful breathing",
        description: "Short guided breath awareness",
        icon: (
          <View
            style={[
              iconContainerStyle,
              { backgroundColor: theme.colors.library.blue[100] },
            ]}
          >
            <Icon
              solid
              name="wind"
              size={20}
              color={theme.colors.library.blue[400]}
            />
          </View>
        ),
        action: "MindfulBreathing",
      },
      {
        title: "Reflective journaling",
        description: "Write down what’s going well",
        icon: (
          <View
            style={[
              iconContainerStyle,
              { backgroundColor: theme.colors.library.pink[100] },
            ]}
          >
            <Icon
              name="edit"
              size={20}
              color={theme.colors.library.pink[500]}
            />
          </View>
        ),
        action: "ReflectiveJournaling",
      },
    ],
  },
};

const moodLottieMap = {
  [MOOD.HAPPY]: require("../../../../../assets/mood-check/lottie/Happy1.json"),
  [MOOD.ANGRY]: require("../../../../../assets/mood-check/lottie/Angry1.json"),
  [MOOD.SAD]: require("../../../../../assets/mood-check/lottie/Sad1.json"),
  [MOOD.CALM]: require("../../../../../assets/mood-check/lottie/Calm1.json"),
};

const FollowUp = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<MoodCheckStackParamList, "FollowUp">>();
  const { mood } = route.params;

  const { Icon: MoodIcon, title, desc, helpful } = moodContentMap[mood];

  const followUpAct: Array<ListCardProps> = [
    {
      title: "Talk it out",
      description: "Record your thoughts with your voice",
      onPress: () => {
        // navigation.navigate("VoiceJournal")
      },
      icon: (
        <View
          style={[
            iconContainerStyle,
            { backgroundColor: theme.colors.library.orange[100] },
          ]}
        >
          <Icon
            solid
            name="microphone"
            size={20}
            color={theme.colors.library.orange[400]}
          />
        </View>
      ),
    },
    {
      title: "Write it down",
      description: "Express your thoughts through writing",
      onPress: () => {
        // navigation.navigate("VoiceJournal")
      },
      icon: (
        <View
          style={[
            iconContainerStyle,
            { backgroundColor: theme.colors.library.pink[100] },
          ]}
        >
          <Icon name="edit" size={20} color={theme.colors.library.pink[500]} />
        </View>
      ),
    },
  ];

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
            <Text style={styles.topNavigationText}>Back</Text>
          </TouchableOpacity>
        </View>
        <CustomScrollView contentContainerStyle={styles.innerContainer}>
          <View style={styles.titleWrapper}>
            {/* <MoodIcon width={80} height={80} /> */}
            <LottieView
              source={moodLottieMap[mood]}
              autoPlay
              loop
              style={styles.lottie}
            />
            <Text style={styles.titleText}>{title}</Text>
            <Text style={styles.descText}>{desc}</Text>
          </View>

          <View style={styles.followUpActContainer}>
            {followUpAct.map((item, idx) => (
              <ListCard
                noChevron
                key={idx}
                title={item.title}
                description={item.description}
                icon={item.icon}
                onPress={item.onPress}
              />
            ))}
          </View>

          <View style={styles.helpfulActContaner}>
            <Text style={styles.helpfulTitleText}>
              Or try one of these tailored activities:
            </Text>
            {helpful.map((item, idx) => (
              <ListCard
                noChevron
                key={idx}
                title={item.title}
                description={item.description}
                icon={item.icon}
                onPress={() => {
                  // navigation.navigate(item.action)
                }}
              />
            ))}
          </View>

          <View style={styles.skipContainer}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        </CustomScrollView>
      </View>
    </ScreenView>
  );
};

export default FollowUp;

const styles = StyleSheet.create({
  screenView: {
    paddingBottom: 0,
  },
  container: {
    gap: 32,
    flex: 1,
  },
  innerContainer: {
    gap: 32,
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
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  topNavigationText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },

  titleWrapper: {
    gap: 16,
    alignItems: "center",
  },
  titleText: {
    ...parseTextStyle(theme.typography.Heading2),
    color: theme.colors.text.title,
    textAlign: "center",
  },
  descText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.default,
    textAlign: "center",
    fontWeight: "400",
  },

  followUpActContainer: {
    gap: 16,
  },
  helpfulActContaner: {
    gap: 20,
  },
  helpfulTitleText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },
  skipContainer: {
    alignItems: "center",
    marginTop: 16,
    marginBottom: 32,
  },

  skipText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    textDecorationLine: "underline",
  },
  lottie: {
    width: 80,
    height: 80,
  },
});
