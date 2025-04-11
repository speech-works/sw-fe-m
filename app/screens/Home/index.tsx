import { StyleSheet, Text, View, Image } from "react-native";
import * as SecureStore from "expo-secure-store";
import React, { useContext, useEffect } from "react";
import Button from "../../components/Button";
import { parseTextStyle } from "../../util/functions/parseFont";
import { theme } from "../../Theme/tokens";
import CountdownTimer from "../../components/CountdownTimer";
import Stepper from "../../components/Stepper";
import { useUserStore } from "../../stores/user";
import { createPracticeActivity, createSession } from "../../api";
import { useSessionStore } from "../../stores/session";
import {
  PracticeActivityOrder,
  PracticeStepType,
} from "../../api/practiceActivities";
import { useActivityStore } from "../../stores/activity";
import { useNavigation } from "@react-navigation/native";
import { HomeStackNavigationProp, HomeStackParamList } from "../../navigators";
import { AuthContext } from "../../contexts/AuthContext";
import { handle401Error } from "../../util/functions/errorHandling";
import { clearAsyncStorage } from "../../util/functions/asyncStorage";

const Home = () => {
  const { logout } = useContext(AuthContext);
  const user = useUserStore((state) => state.user);
  const { practiceSession, setSession, clearSession } = useSessionStore();
  const { setActivity, activity, clearActivity } = useActivityStore();

  useEffect(() => {
    // AsyncStorage.removeItem(ASYNC_KEYS_NAME.IS_FIRST_BREATHING_PENDING);
    // AsyncStorage.removeItem("sw-zstore-practice-session");
    // AsyncStorage.removeItem("sw-zstore-practice-activity");
    // AsyncStorage.removeItem("sw-zstore-user");
    console.log("activity change in Home", { activity });
  }, [activity]);

  const handleLogout = async () => {
    await logout();
  };

  const navigation =
    useNavigation<HomeStackNavigationProp<keyof HomeStackParamList>>();

  const handleStartPractice = async () => {
    clearActivity();
    clearSession();
    clearAsyncStorage();
    if (user) {
      try {
        const session = await createSession({ userId: user.id });
        setSession(session);
        const activity = await createPracticeActivity({
          sessionId: session.id,
          stepType: PracticeStepType.BREATHING,
        });
        setActivity(activity);
        navigation.navigate("PracticeBreathing");
      } catch (error) {
        if (error instanceof Error) {
          await handle401Error(error, handleLogout);
        } else {
          console.error("An unknown error occurred:", error);
        }
      }
    }
  };

  const PracticeTypeToRoute: Record<
    PracticeStepType,
    keyof HomeStackParamList
  > = {
    [PracticeStepType.BREATHING]: "PracticeBreathing",
    [PracticeStepType.AFFIRMATION]: "PracticeAffirmation",
    [PracticeStepType.SMOOTH_SPEECH]: "PracticeSmoothSpeech",
    [PracticeStepType.EXPOSURE]: "PracticeExposure",
  };

  const handleResumePractice = () => {
    if (!activity) return;
    const targetRoute = PracticeTypeToRoute[activity.stepType];
    console.log("target route", targetRoute, activity.stepType);
    // Navigate to the practice screen corresponding to the current activity
    navigation.navigate(targetRoute);
  };

  const steps = [
    { name: "[B] Breathing", key: PracticeStepType.BREATHING },
    { name: "[A] Affirmation", key: PracticeStepType.AFFIRMATION },
    { name: "[S] Smooth Speech", key: PracticeStepType.SMOOTH_SPEECH },
    { name: "[E] Exposure", key: PracticeStepType.EXPOSURE },
  ];

  useEffect(() => {
    console.log("HOME MOUNTED....");
    return () => {
      console.log("HOME UNMOUNTED....");
    };
  }, []);

  return (
    <View style={styles.wrapperView}>
      <View style={styles.userNameWrapper}>
        <Text style={styles.userNameText}>
          Hi, {`${user?.name.split(" ")[0]}`}
        </Text>
      </View>
      <View>
        <CountdownTimer
          onComplete={() => {
            // alert('Timer completed');
          }}
        />
      </View>
      {practiceSession ? (
        <>
          <View style={styles.titleTextWrapper}>
            <Text style={styles.titleText}>Today's practice</Text>
          </View>
          {activity ? (
            <View>
              <Stepper
                steps={steps.map((step) => ({
                  name: step.name,
                  completed:
                    activity.stepType === step.key
                      ? PracticeActivityOrder[activity.stepType] >=
                          PracticeActivityOrder[step.key] &&
                        activity.status === "completed"
                      : PracticeActivityOrder[activity.stepType] >=
                        PracticeActivityOrder[step.key],
                }))}
              />
            </View>
          ) : null}
        </>
      ) : (
        <View style={styles.imgContainer}>
          <Text style={styles.titleText}>Let's start</Text>
          <Image
            source={require("../../assets/m1yobg.png")}
            style={styles.placeHolderImg}
          />
        </View>
      )}
      <View style={styles.buttonWrapper}>
        <Button
          size="large"
          variant="ghost"
          onPress={handleResumePractice}
          disabled={!activity}
        >
          <Text>Resume practice</Text>
        </Button>
        <Button size="large" onPress={handleStartPractice}>
          <Text>{practiceSession ? "Restart practice" : "Start practice"}</Text>
        </Button>
      </View>
    </View>
  );
};

export default Home;

const styles = StyleSheet.create({
  wrapperView: {
    paddingHorizontal: 24,
    gap: 24,
    backgroundColor: theme.colors.neutral.white,
  },
  userNameWrapper: {
    alignItems: "center",
    paddingTop: 36,
  },
  userNameText: {
    ...parseTextStyle(theme.typography.f1.heavy_576),
    color: theme.colors.neutral[3],
  },
  buttonWrapper: {
    gap: 12,
  },
  titleText: {
    ...parseTextStyle(theme.typography.f4.heavy_0),
    color: theme.colors.neutral.black,
  },
  titleTextWrapper: {
    alignItems: "center",
  },
  placeHolderImg: {
    height: 150, // Set the desired height
    resizeMode: "contain", // Ensures the image scales uniformly
  },
  imgContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
