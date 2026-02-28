import {
  RouteProp,
  useNavigation,
  useRoute,
  useIsFocused,
} from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
  BackHandler,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import ScreenView from "../../../../../components/ScreenView";
import { theme } from "../../../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../util/functions/parseStyles";

import CustomScrollView from "../../../../../components/CustomScrollView";
import ListCard from "../../../DailyPractice/components/ListCard";

import { MoodType } from "../../../../../api/moodCheck/types";
import {
  MoodFUStackNavigationProp,
  MoodFUStackParamList,
} from "../../../../../navigators/stacks/AcademyStack/MoodCheckStack/FollowUpStack/types";
import ExpressYourself, {
  EXPRESSION_TYPE_ENUM,
} from "./components/ExpressYourself";

import AngryFace from "../../../../../assets/mood-check/AngryFace";
import CalmFace from "../../../../../assets/mood-check/CalmFace";
import HappyFace from "../../../../../assets/mood-check/HappyFace";
import SadFace from "../../../../../assets/mood-check/SadFace";

const { width } = Dimensions.get("window");

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
    FaceComponent: HappyFace,
    gradientColor: theme.colors.moodcheck.happy,
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
        gradientColors: [theme.colors.library.orange[400], "#F43F5E"] as const,
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
        gradientColors: ["#34D399", "#059669"] as const,
      },
    ],
  },
  [MoodType.ANGRY]: {
    title: "Got some steam to let off?",
    desc: "Naming anger and putting it into words helps you release tension.",
    FaceComponent: AngryFace,
    gradientColor: theme.colors.moodcheck.angry,
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
        gradientColors: ["#A78BFA", "#7C3AED"] as const,
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
        gradientColors: [
          theme.colors.library.green[400],
          theme.colors.library.green[600],
        ] as const,
      },
    ],
  },
  [MoodType.SAD]: {
    title: "Need to lighten your heart?",
    desc: "Expressing tough feelings eases the load. Let it out in speech or text.",
    FaceComponent: SadFace,
    gradientColor: theme.colors.moodcheck.sad,
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
        gradientColors: [
          theme.colors.library.blue[400],
          theme.colors.library.blue[600],
        ] as const,
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
        gradientColors: [
          theme.colors.library.green[400],
          theme.colors.library.green[600],
        ] as const,
      },
    ],
  },
  [MoodType.CALM]: {
    title: "Feeling peaceful right now?",
    desc: "Capture this calm—it’ll be your anchor when things get hectic.",
    FaceComponent: CalmFace,
    gradientColor: theme.colors.moodcheck.calm,
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
        gradientColors: [
          theme.colors.library.blue[400],
          theme.colors.library.blue[600],
        ] as const,
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
        gradientColors: [
          theme.colors.library.green[400],
          theme.colors.library.green[600],
        ] as const,
      },
    ],
  },
};

const FollowUp = () => {
  const navigation =
    useNavigation<MoodFUStackNavigationProp<keyof MoodFUStackParamList>>();
  const route = useRoute<RouteProp<MoodFUStackParamList, "FollowUp">>();
  const isFocused = useIsFocused();
  const { mood } = route.params;

  const { FaceComponent, title, desc, helpful, gradientColor } =
    moodContentMap[mood];
  const [expressionType, setExpressionType] =
    useState<EXPRESSION_TYPE_ENUM | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const followUpAct = [
    {
      title: "Talk it out",
      description: "Record your thoughts with your voice",
      onPress: () => {
        setExpressionType(EXPRESSION_TYPE_ENUM.TALK);
      },
      icon: (
        <Icon solid name="microphone" size={80} color="rgba(255,255,255,0.2)" />
      ),
      colors: [theme.colors.library.orange[400], "#F43F5E"] as const,
      accentColor: "#FFF",
    },
    {
      title: "Write it down",
      description: "Express your thoughts through writing",
      onPress: () => {
        setExpressionType(EXPRESSION_TYPE_ENUM.WRITE);
      },
      icon: <Icon solid name="edit" size={80} color="rgba(255,255,255,0.2)" />,
      colors: ["#A78BFA", "#7C3AED"] as const,
      accentColor: "#FFF",
    },
  ];

  const navigateToHome = () => {
    navigation.navigate("Root" as any);
  };

  useEffect(() => {
    const onBackPress = () => {
      navigateToHome();
      return true;
    };
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress,
    );
    return () => subscription.remove();
  }, [navigation]);

  return (
    <>
      <ScreenView style={styles.screenView}>
        {/* Background Gradient */}
        <LinearGradient
          colors={[gradientColor, "#FFFFFF"]}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.6 }}
        />

        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ width: 32 }} />
            <Text style={styles.headerTitle}>Daily Log</Text>
            <View style={{ width: 32 }} />
          </View>

          <CustomScrollView contentContainerStyle={styles.innerContainer}>
            <>
              <View style={styles.titleWrapper}>
                <View style={styles.faceContainer}>
                  <FaceComponent
                    width={180}
                    height={180}
                    shouldAnimate={isFocused}
                  />
                </View>
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
                      gradientColors={item.gradientColors}
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
                      <TouchableOpacity
                        key={idx}
                        activeOpacity={0.9}
                        onPress={item.onPress}
                        style={styles.cardWrapper}
                      >
                        <LinearGradient
                          colors={item.colors}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.gradientCard}
                        >
                          {/* Decorative Bubbles */}
                          <View
                            style={[
                              styles.bubble,
                              { top: -20, right: -20, width: 80, height: 80 },
                            ]}
                          />
                          <View
                            style={[
                              styles.bubble,
                              {
                                bottom: 10,
                                left: 10,
                                width: 40,
                                height: 40,
                                opacity: 0.1,
                              },
                            ]}
                          />

                          <View style={styles.cardContent}>
                            <View>
                              <Text style={styles.cardTitle}>{item.title}</Text>
                              <Text style={styles.cardSubtitle}>
                                {item.description}
                              </Text>
                            </View>
                            <View style={styles.iconContainer}>
                              <View style={styles.iconWrapper}>
                                {item.icon}
                              </View>
                            </View>
                          </View>
                          <View style={styles.playButton}>
                            <Icon
                              name="play"
                              size={12}
                              color={item.colors[1]}
                            />
                            <Text
                              style={[
                                styles.playText,
                                { color: item.colors[1] },
                              ]}
                            >
                              Start
                            </Text>
                          </View>
                        </LinearGradient>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
              <View style={styles.skipContainer}>
                <TouchableOpacity onPress={() => navigateToHome()}>
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
    gap: 16,
    flex: 1,
  },
  innerContainer: {
    gap: 32,
  },
  topNavigationContainer: {
    // Removed
  },
  topNavigation: {
    // Removed
  },
  topNavigationText: {
    // Removed
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.6)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  headerTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
    marginTop: 2,
  },

  titleWrapper: {
    gap: 16,
    alignItems: "center",
  },
  faceContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
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
    ...parseTextStyle(theme.typography.Heading2),
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
    // Removed
  },
  cardWrapper: {
    borderRadius: 24,
    ...parseShadowStyle(theme.shadow.elevation1),
    backgroundColor: "#fff", // Fallback
  },
  gradientCard: {
    borderRadius: 24,
    padding: 20,
    height: 140, // Fixed height for consistency
    position: "relative",
    overflow: "hidden",
    justifyContent: "space-between",
  },
  bubble: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  cardContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    zIndex: 1,
  },
  cardTitle: {
    ...parseTextStyle(theme.typography.Heading2),
    color: "#FFF",
    fontSize: 24,
    marginBottom: 4,
  },
  cardSubtitle: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "rgba(255,255,255,0.9)",
    fontWeight: "500",
  },
  iconContainer: {
    position: "absolute",
    right: -20,
    bottom: -50,
    zIndex: 0,
  },
  iconWrapper: {
    // To allow transforming checks if needed
    transform: [{ scale: 1.2 }, { rotate: "-10deg" }],
    opacity: 0.9,
  },
  playButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: "flex-start",
    gap: 6,
    zIndex: 2,
    ...parseShadowStyle(theme.shadow.elevation1),
    marginTop: "auto", // Push to bottom
  },
  playText: {
    ...parseTextStyle(theme.typography.BodySmall),
    fontWeight: "700",
  },
});
