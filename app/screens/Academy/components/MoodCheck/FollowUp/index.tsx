import {
  RouteProp,
  useNavigation,
  useRoute,
  useIsFocused,
} from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import {  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
  BackHandler,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ScreenView from "../../../../../components/ScreenView";
import CustomScrollView from "../../../../../components/CustomScrollView";
import {
  SchemeStatusBar,
  Sheet,
  Gradient,
  Text,
  Icon,
  IconName,
  IconButton,
  useTheme,
  icons,
  withAlpha,
  spacing,
  space,
  radius,
  SemanticColors,
} from "../../../../../design-system";

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

type AccentKey = keyof SemanticColors["accent"];

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

// Map mood to content and activities. `accentKey` resolves the mood tint via the
// DS accent roles (angry→danger, calm→success, happy→warning, sad→info).
const moodContentMap = {
  [MoodType.HAPPY]: {
    title: "What’s been making you smile today?",
    desc: "Celebrating wins—big or small—boosts confidence. Share your joy.",
    FaceComponent: HappyFace,
    accentKey: "warning" as AccentKey,
  },
  [MoodType.ANGRY]: {
    title: "Got some steam to let off?",
    desc: "Naming anger and putting it into words helps you release tension.",
    FaceComponent: AngryFace,
    accentKey: "danger" as AccentKey,
  },
  [MoodType.SAD]: {
    title: "Need to lighten your heart?",
    desc: "Expressing tough feelings eases the load. Let it out in speech or text.",
    FaceComponent: SadFace,
    accentKey: "info" as AccentKey,
  },
  [MoodType.CALM]: {
    title: "Feeling peaceful right now?",
    desc: "Capture this calm—it’ll be your anchor when things get hectic.",
    FaceComponent: CalmFace,
    accentKey: "success" as AccentKey,
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
  const { colors } = useTheme();
  const HEADER_HEIGHT = 60;

  const { FaceComponent, title, desc, accentKey } = moodContentMap[mood];
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
      iconName: icons.spokeUp,
      gradientToken: "sunrise" as const,
      ink: colors.accentOn.warning,
    },
    {
      title: "Write it down",
      description: "Express your thoughts through writing",
      onPress: () => {
        setExpressionType(EXPRESSION_TYPE_ENUM.WRITE);
      },
      iconName: "edit-3" as const,
      gradientToken: "aurora" as const,
      ink: colors.accentOn.purple,
    },
  ];

  const navigateToHome = () => {
    // Unwind the mood-check flow so this screen UNMOUNTS on exit. Otherwise it
    // lingers in the Explore tab's stack and its window-level exit prompt (a
    // Sheet) can paint over whatever screen is focused in any tab.
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
  // (A Sheet renders at the window level, so a lingering FollowUp
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
          // Real Life Challenges (activityType "CHALLENGE") only work when
          // launched from a pack — the standalone screen never starts/records
          // the activity. Hide them from recommendations so RLC stays pack-only.
          setRecommendations(data.filter((r) => r.activityType !== "CHALLENGE"));
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
          iconName: "book-open",
          action: rec.activityType === "QUOTE" ? "QuotePractice" : rec.activityType === "POEM" ? "PoemPractice" : "StoryPractice",
          gradientToken: "sunrise" as const,
          ink: colors.accentOn.warning,
          params: { id: rec.id, from: "MOOD_CHECK" },
        };
      case "FUN_PRACTICE":
        return {
          iconName:
            rec.activityType === "TONGUE_TWISTER"
              ? "smile"
              : rec.activityType === "ROLEPLAY"
              ? "film"
              : "mic",
          action:
            rec.activityType === "TONGUE_TWISTER"
              ? "TwisterExercise"
              : rec.activityType === "ROLEPLAY"
              ? "RoleplayBriefing"
              : rec.activityType === "CHARACTER_VOICE"
              ? "CVExercise"
              : "TwisterPracticeStack",
          gradientToken: "meadow" as const,
          ink: colors.accentOn.success,
          params: { id: rec.id, from: "MOOD_CHECK" },
        };
      case "COGNITIVE_PRACTICE":
        return {
          iconName:
            rec.activityType === "MEDITATION"
              ? "sparkles"
              : rec.activityType === "REFRAME"
              ? "refresh-cw"
              : rec.activityType === "CHALLENGE"
              ? "clipboard"
              : "wind",
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
          gradientToken:
            rec.activityType === "REFRAME"
              ? ("sunrise" as const)
              : rec.activityType === "MEDITATION"
              ? ("aurora" as const)
              : rec.activityType === "CHALLENGE"
              ? ("meadow" as const)
              : ("aurora" as const),
          ink:
            rec.activityType === "REFRAME"
              ? colors.accentOn.warning
              : rec.activityType === "MEDITATION"
              ? colors.accentOn.purple
              : rec.activityType === "CHALLENGE"
              ? colors.accentOn.success
              : colors.accentOn.info,
          accentColors:
            rec.activityType === "MEDITATION" || rec.activityType === "CHALLENGE" || rec.activityType === "REFRAME"
              ? undefined
              : ([colors.accent.info, colors.accent.info] as const),
          params: { id: rec.id, from: "MOOD_CHECK" },
        };
      case "EXPOSURE_PRACTICE":
        return {
          iconName:
            rec.activityType === "CHALLENGE"
              ? "flag"
              : rec.activityType === "DRILL"
              ? "activity"
              : rec.activityType === "ROLEPLAY"
              ? "film"
              : "feather",
          action:
            rec.activityType === "CHALLENGE"
              ? "RealLifeChallenge"
              : rec.activityType === "ROLEPLAY"
              ? "RoleplayBriefing"
              : rec.activityType === "DRILL" || rec.activityType === "TECHNIQUE"
              ? "TechniquePage"
              : "ExposurePractice",
          gradientToken:
            rec.activityType === "CHALLENGE"
              ? ("aurora" as const)
              : ("sunrise" as const),
          ink:
            rec.activityType === "CHALLENGE"
              ? colors.accentOn.info
              : colors.accentOn.warning,
          accentColors:
            rec.activityType === "CHALLENGE"
              ? ([colors.accent.info, colors.accent.info] as const)
              : undefined,
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
          iconName: icons.play,
          action: "StoryPractice",
          gradientToken: "aurora" as const,
          ink: colors.accentOn.info,
          accentColors: [colors.accent.info, colors.accent.info] as const,
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
        <SchemeStatusBar />
        {/* Dark canvas background */}
        <View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: colors.background.canvas },
          ]}
        />
        {/* Mood-tinted top fade — the mood accent bleeding into the dark canvas. */}
        <Gradient
          colors={[colors.accentTint[accentKey], colors.background.canvas]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.55 }}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />

        {/* Header — standard back button, no title (matches every other screen). */}
        <View
          style={[
            styles.header,
            { paddingTop: insets.top + 10, height: HEADER_HEIGHT + insets.top },
          ]}
        >
          <IconButton name={icons.back} onPress={navigateToHome} />
        </View>

        <View style={styles.container}>
          <CustomScrollView
            contentContainerStyle={[
              styles.innerContainer,
              { paddingTop: HEADER_HEIGHT + insets.top + space.sectionGap },
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
                <Text variant="h2" color="primary" center>
                  {title}
                </Text>
                <Text variant="body" color="secondary" center>
                  {desc}
                </Text>
              </View>
            )}
            {submitted ? (
              <View style={styles.helpfulActContianer}>
                <View style={styles.helpfulHeader}>
                  <Text variant="h2" color="primary" center>
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
                          <View
                            style={[
                              styles.focusBadge,
                              { backgroundColor: colors.accent.warning },
                            ]}
                          >
                            <Text
                              variant="caption"
                              style={[
                                styles.focusBadgeText,
                                { color: colors.accentOn.warning },
                              ]}
                            >
                              Focus: /{rec.dominantPhoneme}/
                            </Text>
                          </View>
                        )}
                        <TouchableOpacity
                          activeOpacity={0.9}
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
                        >
                          <Gradient
                            token={config.gradientToken}
                            colors={(config as { accentColors?: readonly [string, string] }).accentColors}
                            style={styles.recCard}
                          >
                            {/* Icon chip in the card's dark ink (dark-on-bright),
                                so it's legible on the vivid gradient. */}
                            <View
                              style={[
                                iconContainerStyle,
                                { backgroundColor: withAlpha(config.ink, 0.16) },
                              ]}
                            >
                              <Icon
                                name={config.iconName as IconName}
                                size={20}
                                color={config.ink}
                              />
                            </View>
                            <View style={styles.recTextContainer}>
                              <Text
                                variant="title"
                                style={{ color: config.ink }}
                              >
                                {rec.title}
                              </Text>
                              <Text
                                variant="bodySm"
                                style={{ color: config.ink }}
                              >
                                {rec.description}
                              </Text>
                            </View>
                          </Gradient>
                        </TouchableOpacity>
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
                      <Gradient
                        token={item.gradientToken}
                        style={styles.gradientCard}
                      >
                        <View style={styles.cardContent}>
                          <View>
                            <Text
                              variant="h3"
                              style={[styles.cardTitle, { color: item.ink }]}
                            >
                              {item.title}
                            </Text>
                            <Text
                              variant="bodySm"
                              style={{ color: item.ink }}
                            >
                              {item.description}
                            </Text>
                          </View>
                          <View style={styles.iconContainer}>
                            <View style={styles.iconWrapper}>
                              <Icon name={item.iconName} size={56} color={item.ink} />
                            </View>
                          </View>
                        </View>
                        <View
                          style={[
                            styles.playButton,
                            { backgroundColor: colors.action.secondary },
                          ]}
                        >
                          <Icon
                            name={icons.play}
                            size={12}
                            color={colors.action.onSecondary}
                          />
                          <Text
                            variant="bodySm"
                            style={[
                              styles.playText,
                              { color: colors.action.onSecondary },
                            ]}
                          >
                            Start
                          </Text>
                        </View>
                      </Gradient>
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
                <Text variant="body" color="secondary" style={styles.skipButtonText}>
                  I&apos;ll do it later
                </Text>
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

      <Sheet
        visible={showExitPromptSheet && isFocused}
        onClose={() => setShowExitPromptSheet(false)}
      >
        <View
          style={[
            styles.sheetContainer,
            { paddingBottom: Math.max(insets.bottom, 28) },
          ]}
        >
          <View
            style={[
              styles.sheetIconShell,
              { backgroundColor: colors.accentTint.warning },
            ]}
          >
            <Gradient token="brand" style={styles.sheetIconGradient}>
              <Icon
                name={icons.warning}
                size={24}
                color={colors.accentOn.warning}
              />
            </Gradient>
          </View>

          <Text variant="h2" color="primary" center style={styles.sheetTitle}>
            Mood not recorded today
          </Text>
          <Text variant="body" color="secondary" center style={styles.sheetDesc}>
            Your mood check-in for today is still incomplete. You can stay here
            and record it now, or head back home and skip it for the day.
          </Text>

          <TouchableOpacity
            style={styles.sheetPrimaryButton}
            onPress={() => setShowExitPromptSheet(false)}
            activeOpacity={0.9}
          >
            <Gradient token="brand" style={styles.sheetPrimaryGradient}>
              <Text
                variant="body"
                style={[styles.sheetPrimaryButtonText, { color: colors.accentOn.warning }]}
              >
                Record mood now
              </Text>
            </Gradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.sheetSecondaryButton,
              {
                backgroundColor: colors.action.secondary,
                borderColor: colors.border.default,
              },
            ]}
            onPress={() => {
              setShowExitPromptSheet(false);
              navigateToHome();
            }}
            activeOpacity={0.8}
          >
            <Text
              variant="body"
              style={[styles.sheetSecondaryButtonText, { color: colors.action.onSecondary }]}
            >
              Skip for today
            </Text>
          </TouchableOpacity>
        </View>
      </Sheet>

      <Sheet
        visible={recoverySheet.visible}
        onClose={handleCancelRecovery}
        color={colors.surface.default}
      >
        <View
          style={[
            styles.sheetContainer,
            { paddingBottom: Math.max(insets.bottom, 28) },
          ]}
        >
          <View
            style={[
              styles.sheetIconShell,
              { backgroundColor: colors.accentTint.danger },
            ]}
          >
            <Gradient token="sunrise" style={styles.sheetIconGradient}>
              <Icon
                name={icons.danger}
                size={28}
                color={colors.accentOn.danger}
              />
            </Gradient>
          </View>

          <Text
            variant="label"
            center
            style={[styles.sheetEyebrow, { color: colors.feedback.dangerText }]}
          >
            Couldn&apos;t finish
          </Text>
          <Text variant="h2" color="primary" center style={styles.sheetTitle}>
            {recoveryTitle}
          </Text>
          <Text variant="body" color="secondary" center style={styles.sheetDesc}>
            {recoveryDescription}
          </Text>

          <TouchableOpacity
            style={styles.sheetPrimaryButton}
            onPress={handleRetryExpression}
            activeOpacity={0.9}
          >
            <Gradient token="sunrise" style={styles.sheetPrimaryGradient}>
              <Text
                variant="body"
                style={[styles.sheetPrimaryButtonText, { color: colors.accentOn.danger }]}
              >
                {recoveryPrimaryActionText}
              </Text>
            </Gradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.sheetSecondaryButton,
              {
                backgroundColor: colors.action.secondary,
                borderColor: colors.border.default,
              },
            ]}
            onPress={handleCancelRecovery}
            activeOpacity={0.8}
          >
            <Text
              variant="body"
              style={[styles.sheetSecondaryButtonText, { color: colors.action.onSecondary }]}
            >
              Back to home
            </Text>
          </TouchableOpacity>
        </View>
      </Sheet>

      <Sheet
        visible={showSuccessSheet}
        onClose={() => setShowSuccessSheet(false)}
      >
        <View
          style={[
            styles.sheetContainer,
            { paddingBottom: Math.max(insets.bottom, 28) },
          ]}
        >
          <View
            style={[
              styles.sheetIconShell,
              { backgroundColor: colors.accentTint.success },
            ]}
          >
            <Gradient token="meadow" style={styles.sheetIconGradient}>
              <Icon
                name={icons.success}
                size={28}
                color={colors.accentOn.success}
              />
            </Gradient>
          </View>

          <Text variant="h2" color="primary" center style={styles.sheetTitle}>
            Mood recorded
          </Text>
          <Text variant="body" color="secondary" center style={styles.sheetDesc}>
            Your check-in has been saved successfully. We&apos;ve refreshed your
            progress and prepared a few helpful next steps for you.
          </Text>

          <TouchableOpacity
            style={styles.sheetPrimaryButton}
            onPress={() => setShowSuccessSheet(false)}
            activeOpacity={0.9}
          >
            <Gradient token="meadow" style={styles.sheetPrimaryGradient}>
              <Text
                variant="body"
                style={[styles.sheetPrimaryButtonText, { color: colors.accentOn.success }]}
              >
                See recommendations
              </Text>
            </Gradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.sheetSecondaryButton,
              {
                backgroundColor: colors.action.secondary,
                borderColor: colors.border.default,
              },
            ]}
            onPress={() => {
              setShowSuccessSheet(false);
              navigateToHome();
            }}
            activeOpacity={0.8}
          >
            <Text
              variant="body"
              style={[styles.sheetSecondaryButtonText, { color: colors.action.onSecondary }]}
            >
              Back to home
            </Text>
          </TouchableOpacity>
        </View>
      </Sheet>
    </>
  );
};

export default FollowUp;

const styles = StyleSheet.create({
  screenView: {
    paddingBottom: 0,
  },
  container: {
    gap: spacing.lg,
    flex: 1,
  },
  innerContainer: {
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing["4xl"],
  },
  helpfulHeader: {
    alignItems: "center",
    justifyContent: "center",
  },
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
    right: spacing.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    zIndex: 10,
  },
  focusBadgeText: {
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
    justifyContent: "flex-start",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  headerTitle: {
    marginTop: 2,
  },
  titleWrapper: {
    gap: spacing.lg,
    alignItems: "center",
  },
  faceContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  followUpActContainer: {
    gap: spacing.lg,
  },
  helpfulActContianer: {
    gap: spacing.lg,
  },
  skipContainer: {
    alignItems: "center",
    marginTop: spacing.lg,
    marginBottom: spacing["3xl"],
  },
  skipButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  skipButtonText: {
    fontWeight: "600",
  },
  sheetContainer: {
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing["3xl"],
    alignItems: "center",
  },
  sheetIconShell: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  sheetIconGradient: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetEyebrow: {
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },
  sheetTitle: {
    marginBottom: spacing.sm,
  },
  sheetDesc: {
    lineHeight: 22,
    marginBottom: spacing["2xl"],
  },
  sheetPrimaryButton: {
    width: "100%",
    borderRadius: radius.input,
    overflow: "hidden",
    marginBottom: spacing.md,
  },
  sheetPrimaryGradient: {
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetPrimaryButtonText: {
    fontWeight: "700",
  },
  sheetSecondaryButton: {
    width: "100%",
    height: 50,
    borderRadius: radius.input,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  sheetSecondaryButtonText: {
    fontWeight: "600",
  },
  cardWrapper: {
    borderRadius: radius.card,
  },
  gradientCard: {
    borderRadius: radius.card,
    padding: spacing.lg,
    // Natural height with a real gap between the copy and the Start button (a fixed
    // height + space-between crammed them together). Matches the card CTA rhythm.
    gap: space.sectionGap,
    position: "relative",
    overflow: "hidden",
  },
  cardContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    zIndex: 1,
  },
  cardTitle: {
    marginBottom: spacing.xs,
  },
  iconContainer: {
    position: "absolute",
    right: -16,
    bottom: -36,
    zIndex: 0,
    opacity: 0.2,
  },
  iconWrapper: {
    transform: [{ scale: 1.2 }, { rotate: "-10deg" }],
  },
  recCard: {
    borderRadius: radius.card,
    padding: spacing.xl,
    paddingVertical: spacing["2xl"],
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    overflow: "hidden",
  },
  recIconWrapper: {
    // leading icon chip
  },
  recTextContainer: {
    flex: 1,
    gap: space.titleSub,
  },
  playButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.chip,
    alignSelf: "flex-start",
    gap: 6,
    zIndex: 2,
    marginTop: "auto", // Push to bottom
  },
  playText: {
    fontWeight: "700",
  },
});
