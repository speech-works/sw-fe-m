import { StyleSheet, Text, View } from "react-native";
import React, { useContext, useEffect, useState } from "react";
import Scripts from "./Scripts/Scripts";
import Button from "../../../../components/Button";
import { useSessionStore } from "../../../../stores/session";
import { createPracticeActivity } from "../../../../api";
import {
  PracticeStepType,
  updatePracticeActivity,
} from "../../../../api/practiceActivities";
import { useNavigation } from "@react-navigation/native";
import {
  HomeStackNavigationProp,
  HomeStackParamList,
} from "../../../../navigators";
import { useActivityStore } from "../../../../stores/activity";
import { AuthContext } from "../../../../contexts/AuthContext";
import { handle401Error } from "../../../../util/functions/errorHandling";
import { ASYNC_KEYS_NAME } from "../../../../constants/asyncStorageKeys";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SmoothSpeech = () => {
  const { logout } = useContext(AuthContext);
  const { practiceSession } = useSessionStore();
  const { activity, setActivity } = useActivityStore();
  // practice activity created when smooth speech screen was mounted is compulsary
  const [compulsaryPractice, setCompulsaryPractice] = useState(true);
  const navigation =
    useNavigation<HomeStackNavigationProp<keyof HomeStackParamList>>();

  const pendingPracticeRef = React.useRef(false);

  const markSmoothSpeechDone = async () => {
    navigation.navigate("Home");
  };

  const markScriptStarted = async (scriptId: string) => {
    console.log("markScriptStarted:", scriptId);
    if (!activity || !practiceSession) return;
    const { id } = activity;
    let actId = id;
    try {
      if (!compulsaryPractice) {
        // new activity to be created
        const newSmoothSpeechAct = await createPracticeActivity({
          sessionId: practiceSession.id,
          stepType: PracticeStepType.SMOOTH_SPEECH,
          scriptId,
        });
        actId = newSmoothSpeechAct.id;
        setActivity(newSmoothSpeechAct);
      }
      const updatedActivity = await updatePracticeActivity(actId, {
        startedAt: new Date(),
      });
      setActivity(updatedActivity);
    } catch (error) {
      if (error instanceof Error) {
        await handle401Error(error, handleLogout);
      } else {
        console.error("An unknown error occurred:", error);
      }
    }
  };

  const markScriptComplete = async () => {
    console.log("markScriptComplete");
    if (!activity) return;
    const { id } = activity;
    try {
      const updatedActivity = await updatePracticeActivity(id, {
        status: "completed",
        completedAt: new Date(),
      });
      setActivity(updatedActivity);
      setCompulsaryPractice(false);
      await AsyncStorage.setItem(
        ASYNC_KEYS_NAME.SW_APP_IS_FIRST_SMOOTHSA_PENDING,
        "no"
      );
    } catch (error) {
      if (error instanceof Error) {
        await handle401Error(error, handleLogout);
      } else {
        console.error("An unknown error occurred:", error);
      }
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  useEffect(() => {
    const checkAsyncStorage = async () => {
      // check compulsary/first practice pending
      const isFirstPracticePending = await AsyncStorage.getItem(
        ASYNC_KEYS_NAME.SW_APP_IS_FIRST_SMOOTHSA_PENDING
      );
      if (isFirstPracticePending === null) return;
      setCompulsaryPractice(false);
      // check any breathing pending
      const isAnyPracticePending = await AsyncStorage.getItem(
        ASYNC_KEYS_NAME.SW_APP_IS_FIRST_SMOOTHSA_PENDING
      );
      pendingPracticeRef.current = isAnyPracticePending === "yes";
    };
    checkAsyncStorage();
  }, []);

  useEffect(() => {
    console.log("SmoothSpeech component mounted");
    if (!practiceSession || !activity) return;
    // create a smooth speech practice activity
    const createSmoothSpeechAct = async () => {
      try {
        const newSmoothSpeechAct = await createPracticeActivity({
          sessionId: practiceSession.id,
          stepType: PracticeStepType.SMOOTH_SPEECH,
        });
        setActivity(newSmoothSpeechAct);
      } catch (error) {
        if (error instanceof Error) {
          await handle401Error(error, handleLogout);
        } else {
          console.error(
            "An unknown error occurred while created smooth speech activity:",
            error
          );
        }
      }
    };
    const { stepType } = activity;
    if (stepType === PracticeStepType.AFFIRMATION) {
      createSmoothSpeechAct();
    }
    return () => {
      console.log("SmoothSpeech component unmounted");
    };
  }, []);

  return (
    <View style={styles.wrapperView}>
      <Scripts
        markScriptStarted={(scriptId: string) => markScriptStarted(scriptId)}
        markScriptComplete={markScriptComplete}
      />
      <View style={styles.buttonWrapper}>
        <Button
          size="large"
          onPress={markSmoothSpeechDone}
          disabled={compulsaryPractice}
        >
          <Text>Done</Text>
        </Button>
      </View>
    </View>
  );
};

export default SmoothSpeech;

const styles = StyleSheet.create({
  wrapperView: {},
  buttonWrapper: {
    paddingHorizontal: 25,
    width: "100%",
  },
});
