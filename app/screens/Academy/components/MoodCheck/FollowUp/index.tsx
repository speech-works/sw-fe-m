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
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BottomSheetModal from "../../../../../components/BottomSheetModal";
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

const RECOVERY_SHEET_CLOSE_DELAY_MS = 320;

interface RecoverySheetState {
  visible: boolean;
  message: string;
  retryExpressionType: EXPRESSION_TYPE_ENUM | null;
}

type PendingSheetState =
  | { type: "success" }
  | {
      type: "recovery";
      payload: {
        message: string;
        retryExpressionType: EXPRESSION_TYPE_ENUM;
      };
    }
  | null;

const FollowUp = () => {
  const navigation =
    useNavigation<MoodFUStackNavigationProp<keyof MoodFUStackParamList>>();
  const route = useRoute<RouteProp<MoodFUStackParamList, "FollowUp">>();
  const isFocused = useIsFocused();
  const { mood } = route.params;
  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = 60;

  const { FaceComponent, title, desc, helpful, gradientColor } =
    moodContentMap[mood];
  const [expressionType, setExpressionType] =
    useState<EXPRESSION_TYPE_ENUM | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [showSuccessSheet, setShowSuccessSheet] = useState(false);
  const [showExitPromptSheet, setShowExitPromptSheet] = useState(false);
  const [recoverySheet, setRecoverySheet] = useState<RecoverySheetState>({
    visible: false,
    message: "",
    retryExpressionType: null,
  });
  const [pendingSheet, setPendingSheet] = useState<PendingSheetState>(null);

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

  const requestNavigateHome = () => {
    if (submitted) {
      navigateToHome();
      return;
    }

    setShowExitPromptSheet(true);
  };

  const closeRecoverySheet = () => {
    setRecoverySheet({
      visible: false,
      message: "",
      retryExpressionType: null,
    });
  };

  const handleCancelRecovery = () => {
    closeRecoverySheet();
    navigateToHome();
  };

  const handleRetryExpression = () => {
    const nextExpressionType = recoverySheet.retryExpressionType;
    closeRecoverySheet();

    if (!nextExpressionType) {
      navigateToHome();
      return;
    }

    setTimeout(() => {
      setExpressionType(nextExpressionType);
    }, RECOVERY_SHEET_CLOSE_DELAY_MS);
  };

  const closeExpressionSheet = () => {
    setExpressionType(null);
  };

  const recoveryTitle =
    recoverySheet.message ||
    (recoverySheet.retryExpressionType === EXPRESSION_TYPE_ENUM.TALK
      ? "We couldn't upload that recording"
      : "We couldn't save that note");
  const recoveryPrimaryActionText =
    recoverySheet.retryExpressionType === EXPRESSION_TYPE_ENUM.TALK
      ? "Record again"
      : "Try writing again";
  const recoveryDescription =
    recoverySheet.retryExpressionType === EXPRESSION_TYPE_ENUM.TALK
      ? "Nothing has been saved yet. You can head home for now or reopen the recorder and try again."
      : "Nothing has been saved yet. You can head home for now or reopen the writing flow and try again.";

  useEffect(() => {
    const onBackPress = () => {
      requestNavigateHome();
      return true;
    };
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress,
    );
    return () => subscription.remove();
  }, [navigation, submitted]);

  const handleExpressionSheetAfterClose = () => {
    if (!pendingSheet) return;

    if (pendingSheet.type === "success") {
      setSubmitted(true);
      setShowSuccessSheet(true);
    } else {
      setRecoverySheet({
        visible: true,
        message: pendingSheet.payload.message,
        retryExpressionType: pendingSheet.payload.retryExpressionType,
      });
    }

    setPendingSheet(null);
  };

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

        {/* Header */}
        <BlurView
          intensity={80}
          tint="light"
          style={[
            styles.header,
            { paddingTop: insets.top + 10, height: HEADER_HEIGHT + insets.top },
          ]}
        >
          <TouchableOpacity
            onPress={requestNavigateHome}
            style={styles.backButton}
          >
            <Icon
              name="chevron-left"
              size={16}
              color={theme.colors.text.title}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Daily Log</Text>
          <View style={{ width: 32 }} />
        </BlurView>

        <View style={styles.container}>
          <CustomScrollView
            contentContainerStyle={[
              styles.innerContainer,
              { paddingTop: HEADER_HEIGHT + insets.top + 20 },
            ]}
          >
            {!submitted && (
              <View style={styles.titleWrapper}>
                <View style={styles.faceContainer}>
                  <FaceComponent
                    width={180}
                    height={180}
                    shouldAnimate={isFocused}
                  />
                </View>
                <Text style={styles.titleText}>{title}</Text>
                <Text style={styles.descText}>{desc}</Text>
              </View>
            )}
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
                            <View style={styles.iconWrapper}>{item.icon}</View>
                          </View>
                        </View>
                        <View style={styles.playButton}>
                          <Icon name="play" size={12} color={item.colors[1]} />
                          <Text
                            style={[styles.playText, { color: item.colors[1] }]}
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
              <TouchableOpacity onPress={requestNavigateHome}>
                <Text style={styles.skipText}>I'll do it later</Text>
              </TouchableOpacity>
            </View>
          </CustomScrollView>
        </View>
      </ScreenView>

      <ExpressYourself
        moodType={mood}
        expressionType={expressionType}
        onClose={closeExpressionSheet}
        onAfterClose={handleExpressionSheetAfterClose}
        onSubmit={() => {
          setPendingSheet({ type: "success" });
          closeExpressionSheet();
        }}
        onError={({ message, expressionType: failedExpressionType }) => {
          setPendingSheet({
            type: "recovery",
            payload: {
              message,
              retryExpressionType: failedExpressionType,
            },
          });
          closeExpressionSheet();
        }}
      />

      <BottomSheetModal
        visible={showExitPromptSheet}
        onClose={() => setShowExitPromptSheet(false)}
        fitContent
        showCloseButton={true}
        showHandle={false}
      >
        <View
          style={[
            styles.exitPromptSheetContainer,
            { paddingBottom: Math.max(insets.bottom, 28) },
          ]}
        >
          <View style={styles.exitPromptIconShell}>
            <LinearGradient
              colors={["#FDBA74", "#F97316"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.exitPromptIconGradient}
            >
              <Icon name="exclamation" size={24} color="#FFFFFF" />
            </LinearGradient>
          </View>

          <Text style={styles.exitPromptTitle}>Mood not recorded today</Text>
          <Text style={styles.exitPromptDesc}>
            Your mood check-in for today is still incomplete. You can stay here
            and record it now, or head back home and skip it for the day.
          </Text>

          <TouchableOpacity
            style={styles.exitPromptPrimaryButton}
            onPress={() => setShowExitPromptSheet(false)}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={["#FDBA74", "#F97316"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.exitPromptPrimaryGradient}
            >
              <Text style={styles.exitPromptPrimaryButtonText}>
                Record mood now
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.exitPromptSecondaryButton}
            onPress={() => {
              setShowExitPromptSheet(false);
              navigateToHome();
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.exitPromptSecondaryButtonText}>
              Skip for today
            </Text>
          </TouchableOpacity>
        </View>
      </BottomSheetModal>

      <BottomSheetModal
        visible={recoverySheet.visible}
        onClose={handleCancelRecovery}
        fitContent
        showCloseButton={false}
        closeOnBackdropPress={false}
        backgroundColor="#FFF7F2"
      >
        <View
          style={[
            styles.recoverySheetContainer,
            { paddingBottom: Math.max(insets.bottom, 28) },
          ]}
        >
          <View style={styles.recoveryIconShell}>
            <LinearGradient
              colors={["#FF8A5B", "#FF5A5F"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.recoveryIconGradient}
            >
              <Icon name="exclamation" size={28} color="#FFFFFF" />
            </LinearGradient>
          </View>

          <Text style={styles.recoverySheetEyebrow}>Couldn&apos;t finish</Text>
          <Text style={styles.recoverySheetTitle}>{recoveryTitle}</Text>
          <Text style={styles.recoverySheetDesc}>{recoveryDescription}</Text>

          <TouchableOpacity
            style={styles.recoveryPrimaryButton}
            onPress={handleRetryExpression}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={["#FF8A5B", "#FF5A5F"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.recoveryPrimaryGradient}
            >
              <Text style={styles.recoveryPrimaryButtonText}>
                {recoveryPrimaryActionText}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.recoverySecondaryButton}
            onPress={handleCancelRecovery}
            activeOpacity={0.8}
          >
            <Text style={styles.recoverySecondaryButtonText}>
              Back to home
            </Text>
          </TouchableOpacity>
        </View>
      </BottomSheetModal>

      <BottomSheetModal
        visible={showSuccessSheet}
        onClose={() => setShowSuccessSheet(false)}
        fitContent
        showCloseButton={true}
        showHandle={false}
      >
        <View
          style={[
            styles.successSheetContainer,
            { paddingBottom: Math.max(insets.bottom, 28) },
          ]}
        >
          <View style={styles.successIconShell}>
            <LinearGradient
              colors={["#34D399", "#059669"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.successIconGradient}
            >
              <Icon name="check" size={28} color="#FFFFFF" />
            </LinearGradient>
          </View>

          <Text style={styles.successSheetTitle}>Mood recorded</Text>
          <Text style={styles.successSheetDesc}>
            Your check-in has been saved successfully. We&apos;ve refreshed your
            progress and prepared a few helpful next steps for you.
          </Text>

          <TouchableOpacity
            style={styles.successPrimaryButton}
            onPress={() => setShowSuccessSheet(false)}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={["#34D399", "#059669"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.successPrimaryGradient}
            >
              <Text style={styles.successPrimaryButtonText}>
                See recommendations
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.successSecondaryButton}
            onPress={() => {
              setShowSuccessSheet(false);
              navigateToHome();
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.successSecondaryButtonText}>Back to home</Text>
          </TouchableOpacity>
        </View>
      </BottomSheetModal>
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
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  headerTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
    marginTop: 2,
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
  successSheetContainer: {
    paddingHorizontal: 24,
    paddingTop: 32,
    alignItems: "center",
    backgroundColor: "#F8FFFC",
  },
  successIconShell: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  successIconGradient: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  successSheetTitle: {
    ...parseTextStyle(theme.typography.Heading2),
    color: theme.colors.text.title,
    textAlign: "center",
    marginBottom: 10,
  },
  successSheetDesc: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  successPrimaryButton: {
    width: "100%",
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 12,
  },
  successPrimaryGradient: {
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  successPrimaryButtonText: {
    ...parseTextStyle(theme.typography.Body),
    color: "#FFFFFF",
    fontWeight: "700",
  },
  successSecondaryButton: {
    width: "100%",
    height: 50,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
  },
  successSecondaryButtonText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
    fontWeight: "600",
  },
  exitPromptSheetContainer: {
    paddingHorizontal: 24,
    paddingTop: 32,
    alignItems: "center",
    backgroundColor: "#FFF9F3",
  },
  exitPromptIconShell: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: "rgba(249, 115, 22, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  exitPromptIconGradient: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  exitPromptTitle: {
    ...parseTextStyle(theme.typography.Heading2),
    color: theme.colors.text.title,
    textAlign: "center",
    marginBottom: 10,
  },
  exitPromptDesc: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  exitPromptPrimaryButton: {
    width: "100%",
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 12,
  },
  exitPromptPrimaryGradient: {
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  exitPromptPrimaryButtonText: {
    ...parseTextStyle(theme.typography.Body),
    color: "#FFFFFF",
    fontWeight: "700",
  },
  exitPromptSecondaryButton: {
    width: "100%",
    height: 50,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
  },
  exitPromptSecondaryButtonText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
    fontWeight: "600",
  },
  recoverySheetContainer: {
    paddingHorizontal: 24,
    paddingTop: 32,
    alignItems: "center",
    backgroundColor: "#FFF7F2",
  },
  recoveryIconShell: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: "rgba(255, 122, 89, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  recoveryIconGradient: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  recoverySheetEyebrow: {
    ...parseTextStyle(theme.typography.BodySmall),
    textAlign: "center",
    color: "#F97316",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  recoverySheetTitle: {
    ...parseTextStyle(theme.typography.Heading2),
    color: theme.colors.text.title,
    textAlign: "center",
    marginBottom: 10,
  },
  recoverySheetDesc: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  recoveryPrimaryButton: {
    width: "100%",
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 12,
  },
  recoveryPrimaryGradient: {
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  recoveryPrimaryButtonText: {
    ...parseTextStyle(theme.typography.Body),
    color: "#FFFFFF",
    fontWeight: "700",
  },
  recoverySecondaryButton: {
    width: "100%",
    height: 50,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
  },
  recoverySecondaryButtonText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
    fontWeight: "600",
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
