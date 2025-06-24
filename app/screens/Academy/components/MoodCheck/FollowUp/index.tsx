import React, { useState } from "react";
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

import {
  MoodFUStackNavigationProp,
  MoodFUStackParamList,
} from "../../../../../navigators/stacks/AcademyStack/MoodCheckStack/FollowUpStack/types";
import ExpressYourself, {
  EXPRESSION_TYPE_ENUM,
} from "./components/ExpressYourself";
import { MoodType } from "../../../../../api/moodCheck/types";

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
  [MoodType.HAPPY]: {
    title: "What’s been making you smile today?",
    desc: "Celebrating wins—big or small—boosts confidence. Share your joy.",
    Icon: "Happy1",
    helpful: [
      {
        title: "Read a story",
        description: "Dive into a short, fun story",
        icon: (
          <View
            style={[
              iconContainerStyle,
              { backgroundColor: theme.colors.library.blue[100] },
            ]}
          >
            <Icon
              solid
              name="book-open"
              size={20}
              color={theme.colors.library.blue[500]}
            />
          </View>
        ),
        action: "StoryPractice", // route name placeholder
      },
      {
        title: "Roleplay Session",
        description: "Enact a fun scenario",
        icon: (
          <View
            style={[
              iconContainerStyle,
              { backgroundColor: theme.colors.library.green[100] },
            ]}
          >
            <Icon
              solid
              name="theater-masks"
              size={20}
              color={theme.colors.library.green[400]}
            />
          </View>
        ),
        action: "RoleplayPracticeStack",
      },
    ],
  },
  [MoodType.ANGRY]: {
    title: "Got some steam to let off?",
    desc: "Naming anger and putting it into words helps you release tension.",
    Icon: "Angry1",
    helpful: [
      {
        title: "Guided Breath Pacing",
        description: "Guided breathing to help you calm down",
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
        action: "BreathingPractice",
      },
      {
        title: "Stress Relief Session",
        description: "Guided stress release",
        icon: (
          <View
            style={[
              iconContainerStyle,
              { backgroundColor: theme.colors.library.green[100] },
            ]}
          >
            <Icon
              solid
              name="heart"
              size={20}
              color={theme.colors.library.green[500]}
            />
          </View>
        ),
        action: "MeditationPractice",
      },
    ],
  },
  [MoodType.SAD]: {
    title: "Need to lighten your heart?",
    desc: "Expressing tough feelings eases the load. Let it out in speech or text.",
    Icon: "Sad1",
    helpful: [
      {
        title: "Reframing Session",
        description: "Discover the way you appreciate things",
        icon: (
          <View
            style={[
              iconContainerStyle,
              { backgroundColor: theme.colors.library.blue[100] },
            ]}
          >
            <Icon
              solid
              name="sync-alt"
              size={20}
              color={theme.colors.library.blue[400]}
            />
          </View>
        ),
        action: "ReframePractice",
      },
      {
        title: "Fearlessness Session",
        description: "Embark on a journey to overcome fear",
        icon: (
          <View
            style={[
              iconContainerStyle,
              { backgroundColor: theme.colors.library.green[100] },
            ]}
          >
            <Icon
              solid
              name="shoe-prints"
              size={20}
              color={theme.colors.library.green[500]}
            />
          </View>
        ),
        action: "MeditationPractice",
      },
    ],
  },
  [MoodType.CALM]: {
    title: "Feeling peaceful right now?",
    desc: "Capture this calm—it’ll be your anchor when things get hectic.",
    Icon: "Calm1",
    helpful: [
      {
        title: "Reframing Session",
        description: "Test your resilience with a reframing exercise",
        icon: (
          <View
            style={[
              iconContainerStyle,
              { backgroundColor: theme.colors.library.blue[100] },
            ]}
          >
            <Icon
              solid
              name="sync-alt"
              size={20}
              color={theme.colors.library.blue[400]}
            />
          </View>
        ),
        action: "ReframePractice",
      },
      {
        title: "Body scan meditation",
        description: "Find your center with a body scan",
        icon: (
          <View
            style={[
              iconContainerStyle,
              { backgroundColor: theme.colors.library.green[100] },
            ]}
          >
            <Icon
              solid
              name="user-alt"
              size={20}
              color={theme.colors.library.green[400]}
            />
          </View>
        ),
        action: "MeditationPractice",
      },
    ],
  },
};

const moodLottieMap = {
  [MoodType.HAPPY]: require("../../../../../assets/mood-check/lottie/Happy1.json"),
  [MoodType.ANGRY]: require("../../../../../assets/mood-check/lottie/Angry1.json"),
  [MoodType.SAD]: require("../../../../../assets/mood-check/lottie/Sad1.json"),
  [MoodType.CALM]: require("../../../../../assets/mood-check/lottie/Calm1.json"),
};

const FollowUp = () => {
  const navigation =
    useNavigation<MoodFUStackNavigationProp<keyof MoodFUStackParamList>>();
  const route = useRoute<RouteProp<MoodFUStackParamList, "FollowUp">>();
  const { mood } = route.params;

  const { Icon: MoodIcon, title, desc, helpful } = moodContentMap[mood];
  const [expressionType, setExpressionType] =
    useState<EXPRESSION_TYPE_ENUM | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const followUpAct: Array<ListCardProps> = [
    {
      title: "Talk it out",
      description: "Record your thoughts with your voice",
      onPress: () => {
        setExpressionType(EXPRESSION_TYPE_ENUM.TALK);
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
        setExpressionType(EXPRESSION_TYPE_ENUM.WRITE);
      },
      icon: (
        <View
          style={[
            iconContainerStyle,
            { backgroundColor: theme.colors.library.pink[100] },
          ]}
        >
          <Icon
            solid
            name="edit"
            size={20}
            color={theme.colors.library.pink[500]}
          />
        </View>
      ),
    },
  ];

  return (
    <>
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
            <>
              <View style={styles.titleWrapper}>
                {/* <MoodIcon width={80} height={80} /> */}
                <LottieView
                  source={moodLottieMap[mood]}
                  autoPlay
                  loop
                  style={styles.lottie}
                />
                {!submitted && <Text style={styles.titleText}>{title}</Text>}
                {!submitted && <Text style={styles.descText}>{desc}</Text>}
              </View>
              {submitted ? (
                <View style={styles.helpfulActContianer}>
                  <Text style={styles.helpfulTitleText}>
                    Try one of these tailored activities:
                  </Text>
                  {helpful.map((item, idx) => (
                    <ListCard
                      noChevron
                      key={idx}
                      title={item.title}
                      description={item.description}
                      icon={item.icon}
                      onPress={() => {
                        navigation.navigate({
                          name: item.action as any,
                          params: undefined,
                        });
                      }}
                    />
                  ))}
                </View>
              ) : (
                <>
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
                </>
              )}
              <View style={styles.skipContainer}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                  <Text style={styles.skipText}>Skip for now</Text>
                </TouchableOpacity>
              </View>
            </>
          </CustomScrollView>
        </View>
      </ScreenView>

      <ExpressYourself
        moodType={mood}
        expressionType={expressionType}
        onClose={() => setExpressionType(null)}
        onSubmit={() => {
          setSubmitted(true);
        }}
      />
    </>
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
  helpfulActContianer: {
    gap: 20,
  },
  helpfulTitleText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
    textAlign: "center",
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
