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
import GradientActionCard from "../../../DailyPractice/components/GradientActionCard";

import { MoodType } from "../../../../../api/moodCheck/types";
import {
  MoodFUStackNavigationProp,
  MoodFUStackParamList,
} from "../../../../../navigators/stacks/ExploreStack/MoodCheckStack/FollowUpStack/types";
import ExpressYourself, {
  EXPRESSION_TYPE_ENUM,
} from "./components/ExpressYourself";
import { getPracticeSuggestions } from "../../../../../api/recommendations";
import { PracticeSuggestion } from "../../../../../api/recommendations/types";
import SyncLoader from "../../../../../components/SyncLoader";

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

const ACTIVITY_ID_TO_TECHNIQUE: Record<string, string> = {
  // Motor / Fluency
  "30000000-0000-4000-8000-000000000101": "EASY_ONSET",
  "30000000-0000-4000-8000-000000000102": "LIGHT_ARTICULATORY_CONTACT",
  "30000000-0000-4000-8000-000000000107": "PULL_OUTS",
  "30000000-0000-4000-8000-000000000110": "CANCELLATIONS",
  "30000000-0000-4000-8000-000000000118": "CONTINUOUS_PHONATION",
  "30000000-0000-4000-8000-000000000109": "PASSIVE_AIRFLOW",
  "30000000-0000-4000-8000-000000000007": "DIAPHRAGMATIC_BREATHING",
  "30000000-0000-4000-8000-000000000008": "DIAPHRAGMATIC_BREATHING", // Fallback for Box Breathing to same page for now
  // Cognitive / Relaxation
  "30000000-0000-4000-8000-000000000010": "COGNITIVE_RESTRUCTURING",
  "30000000-0000-4000-8000-000000000105": "SELF_DISCLOSURE",
};

// Map mood to content and activities
const moodContentMap = {
  [MoodType.HAPPY]: {
    title: "What’s been making you smile today?",
    desc: "Celebrating wins—big or small—boosts confidence. Share your joy.",
    FaceComponent: HappyFace,
    gradientColor: theme.colors.moodcheck.happy,
  },
  [MoodType.ANGRY]: {
    title: "Got some steam to let off?",
    desc: "Naming anger and putting it into words helps you release tension.",
    FaceComponent: AngryFace,
    gradientColor: theme.colors.moodcheck.angry,
  },
  [MoodType.SAD]: {
    title: "Need to lighten your heart?",
    desc: "Expressing tough feelings eases the load. Let it out in speech or text.",
    FaceComponent: SadFace,
    gradientColor: theme.colors.moodcheck.sad,
  },
  [MoodType.CALM]: {
    title: "Feeling peaceful right now?",
    desc: "Capture this calm—it’ll be your anchor when things get hectic.",
    FaceComponent: CalmFace,
    gradientColor: theme.colors.moodcheck.calm,
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

  const { FaceComponent, title, desc, gradientColor } =
    moodContentMap[mood];
  const [recommendations, setRecommendations] = useState<
    PracticeSuggestion[]
  >([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] =
    useState(false);
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
    // Unwind the mood-check flow so this screen UNMOUNTS on exit. Otherwise it
    // lingers in the Explore tab's stack and its window-level exit prompt (a
    // BottomSheetModal) can paint over whatever screen is focused in any tab.
    // Pop the MoodCheckStack off the parent (Explore) stack, then go Home.
    // Degrades safely: if the parent can't go back, we just navigate Home and
    // the focus-gate on the prompt still prevents any leak.
    const exploreNav = navigation.getParent()?.getParent() as
      | { canGoBack?: () => boolean; goBack?: () => void }
      | undefined;
    if (exploreNav?.canGoBack?.()) {
      exploreNav.goBack?.();
    }
    navigation.navigate("Root" as any);
  };

  const requestNavigateHome = () => {
    if (submitted) {
      navigateToHome();
      return;
    }

    setShowExitPromptSheet(true);
  };

  // Safety: never let the exit prompt render while this screen is backgrounded.
  // (A BottomSheetModal renders at the window level, so a lingering FollowUp
  // could otherwise paint its prompt over other screens.)
  useEffect(() => {
    if (!isFocused) setShowExitPromptSheet(false);
  }, [isFocused]);

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
    if (submitted) {
      const fetchRecommendations = async () => {
        setIsLoadingRecommendations(true);
        try {
          console.log("[Debug] Fetching suggestions for mood:", mood);
          const data = await getPracticeSuggestions(mood);
          setRecommendations(data);
        } catch (error) {
          console.error("Failed to fetch recommendations", error);
        } finally {
          setIsLoadingRecommendations(false);
        }
      };
      fetchRecommendations();
    }
  }, [submitted, mood]);

  const getActivityConfig = (rec: PracticeSuggestion) => {
    switch (rec.contentType) {
      case "READING_PRACTICE":
        return {
          icon: (
            <View
              style={[
                iconContainerStyle,
                { backgroundColor: theme.colors.library.orange[100] },
              ]}
            >
              <Icon
                solid
                name="book-open"
                size={20}
                color={theme.colors.library.orange[500]}
              />
            </View>
          ),
          action: rec.activityType === "QUOTE" ? "QuotePractice" : rec.activityType === "POEM" ? "PoemPractice" : "StoryPractice",
          colors: [theme.colors.library.orange[400], "#F43F5E"] as const,
          params: { id: rec.id, from: "MOOD_CHECK" },
        };
      case "FUN_PRACTICE":
        return {
          icon: (
            <View
              style={[
                iconContainerStyle,
                { backgroundColor: theme.colors.library.green[100] },
              ]}
            >
              <Icon
                solid
                name={
                  rec.activityType === "TONGUE_TWISTER"
                    ? "grin-squint" 
                    : rec.activityType === "ROLEPLAY"
                    ? "theater-masks"
                    : "microphone-alt"
                }
                size={20}
                color={theme.colors.library.green[400]}
              />
            </View>
          ),
          action:
            rec.activityType === "TONGUE_TWISTER"
              ? "TwisterExercise"
              : rec.activityType === "ROLEPLAY"
              ? "RoleplayBriefing"
              : rec.activityType === "CHARACTER_VOICE"
              ? "CVExercise"
              : "TwisterPracticeStack",
          colors: ["#34D399", "#059669"] as const,
          params: { id: rec.id, from: "MOOD_CHECK" },
        };
      case "COGNITIVE_PRACTICE":
        return {
          icon: (
            <View
              style={[
                iconContainerStyle,
                {
                  backgroundColor:
                    rec.activityType === "REFRAME"
                      ? theme.colors.library.orange[100]
                      : rec.activityType === "MEDITATION"
                      ? "#F5F3FF" // Light purple
                      : theme.colors.library.blue[100],
                },
              ]}
            >
              <Icon
                solid
                name={
                  rec.activityType === "MEDITATION"
                    ? "spa"
                    : rec.activityType === "REFRAME"
                    ? "brain"
                    : rec.activityType === "CHALLENGE"
                    ? "clipboard-list"
                    : "wind"
                }
                size={20}
                color={
                  rec.activityType === "REFRAME"
                    ? theme.colors.library.orange[400]
                    : rec.activityType === "MEDITATION"
                    ? "#7C3AED"
                    : rec.activityType === "CHALLENGE"
                    ? theme.colors.library.green[500]
                    : theme.colors.library.blue[400]
                }
              />
            </View>
          ),
          action:
            rec.activityType === "MEDITATION"
              ? "MeditationPractice"
              : rec.activityType === "REFRAME"
              ? "ReframePractice"
              : rec.activityType === "CHALLENGE"
              ? "RealLifeChallenge"
              : rec.activityType === "MEDITATION"
              ? "MeditationPractice"
              : "BreathingPractice",
          colors:
            rec.activityType === "REFRAME"
              ? ([theme.colors.library.orange[400], theme.colors.library.orange[600]] as const)
              : rec.activityType === "MEDITATION"
              ? (["#A78BFA", "#7C3AED"] as const)
              : rec.activityType === "CHALLENGE"
              ? ([theme.colors.library.green[400], theme.colors.library.green[600]] as const)
              : ([theme.colors.library.blue[400], theme.colors.library.blue[600]] as const),
          params: { id: rec.id, from: "MOOD_CHECK" },
        };
      case "EXPOSURE_PRACTICE":
        return {
          icon: (
            <View
              style={[
                iconContainerStyle,
                {
                  backgroundColor:
                    rec.activityType === "CHALLENGE"
                      ? theme.colors.library.blue[100]
                      : theme.colors.library.orange[100],
                },
              ]}
            >
              <Icon
                solid
                name={
                  rec.activityType === "CHALLENGE"
                    ? "mountain"
                    : rec.activityType === "DRILL"
                    ? "dumbbell"
                    : rec.activityType === "ROLEPLAY"
                    ? "theater-masks"
                    : "feather-alt"
                }
                size={20}
                color={
                  rec.activityType === "CHALLENGE"
                    ? theme.colors.library.blue[400]
                    : theme.colors.library.orange[400]
                }
              />
            </View>
          ),
          action:
            rec.activityType === "CHALLENGE"
              ? "RealLifeChallenge"
              : rec.activityType === "ROLEPLAY"
              ? "RoleplayBriefing"
              : rec.activityType === "DRILL" || rec.activityType === "TECHNIQUE"
              ? "TechniquePage"
              : "ExposurePractice",
          colors:
            rec.activityType === "CHALLENGE"
              ? ([theme.colors.library.blue[400], theme.colors.library.blue[600]] as const)
              : ([theme.colors.library.orange[400], theme.colors.library.orange[600]] as const),
          params: {
            techniqueId: ACTIVITY_ID_TO_TECHNIQUE[rec.id] || rec.id,
            techniqueDesc: rec.description,
            techniqueLevel: "BEGINNER",
            hasFree: true,
            id: rec.id,
            title: rec.title, // Pass title for RoleplayBriefing
            description: rec.description, // Pass description for RoleplayBriefing
            from: "MOOD_CHECK",
          },
        };
      default:
        return {
          icon: (
            <View
              style={[
                iconContainerStyle,
                { backgroundColor: theme.colors.library.gray[100] },
              ]}
            >
              <Icon
                solid
                name="play"
                size={20}
                color={theme.colors.library.gray[500]}
              />
            </View>
          ),
          action: "StoryPractice",
          colors: [
            theme.colors.library.blue[400],
            theme.colors.library.blue[600],
          ] as const,
          params: { id: rec.id, from: "MOOD_CHECK" },
        };
    }
  };

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
            onPress={navigateToHome}
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
              { paddingTop: HEADER_HEIGHT + insets.top },
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
                <View style={styles.helpfulHeader}>
                  <Text style={styles.helpfulTitleText}>
                    Try one of these tailored activities:
                  </Text>
                </View>

                {isLoadingRecommendations ? (
                  <View style={styles.loadingContainer}>
                    <SyncLoader />
                  </View>
                ) : (
                  recommendations.map((rec, idx) => {
                    const config = getActivityConfig(rec);
                    return (
                      <View key={rec.id || idx} style={styles.cardContainer}>
                        {rec.dominantPhoneme && (
                          <View style={styles.focusBadge}>
                            <Text style={styles.focusBadgeText}>
                              Focus: /{rec.dominantPhoneme}/
                            </Text>
                          </View>
                        )}
                        <GradientActionCard
                          noChevron
                          title={rec.title}
                          description={rec.description}
                          icon={config.icon}
                          gradientColors={config.colors}
                          onPress={() => {
                            navigation.navigate({
                              name: config.action as any,
                              params: config.action === "TechniquePage" ? {
                                ...config.params,
                                techniqueName: rec.title,
                                stage: "TUTORIAL",
                                from: "MOOD_CHECK"
                              } : {
                                ...config.params,
                                mood: config.action === "MeditationPractice" ? mood : undefined,
                                from: "MOOD_CHECK"
                              }
                            });
                          }}
                        />
                      </View>
                    );
                  })
                )}
                
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
              <TouchableOpacity
                onPress={requestNavigateHome}
                style={styles.skipButton}
                activeOpacity={0.8}
              >
                <Text style={styles.skipButtonText}>I&apos;ll do it later</Text>
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
        visible={showExitPromptSheet && isFocused}
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
    gap: 16,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  helpfulHeader: {
    alignItems: "center",
    justifyContent: "center",
  },
  // hardMode styles removed
  loadingContainer: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  cardContainer: {
    position: "relative",
  },
  focusBadge: {
    position: "absolute",
    top: -8,
    right: 16,
    backgroundColor: "#F97316",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    zIndex: 10,
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  focusBadgeText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
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
    gap: 16,
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
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  skipButtonText: {
    ...parseTextStyle(theme.typography.Button),
    color: theme.colors.text.default,
    fontWeight: "600",
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
