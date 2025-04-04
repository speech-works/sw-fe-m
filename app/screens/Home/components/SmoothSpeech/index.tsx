import { StyleSheet, Text, View } from "react-native";
import React, { useContext, useEffect } from "react";
import * as SecureStore from "expo-secure-store";
import Scripts from "./Scripts/Scripts";
import { useSessionStore } from "../../../../stores/session";
import { createPracticeActivity, logoutUser } from "../../../../api";
import { PracticeStepType } from "../../../../api/practiceActivities";
import { useActivityStore } from "../../../../stores/activity";
import { AuthContext } from "../../../../contexts/AuthContext";
import { handle401Error } from "../../../../util/functions/errorHandling";

const SmoothSpeech = () => {
  const { logout } = useContext(AuthContext);
  const { practiceSession } = useSessionStore();
  const { activity, setActivity } = useActivityStore();

  const handleLogout = async () => {
    const accessToken = await SecureStore.getItemAsync("accessToken");
    const refreshToken = await SecureStore.getItemAsync("refreshToken");
    if (refreshToken && accessToken) {
      await logoutUser({ refreshToken, accessToken });
      logout();
    }
  };

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
    <View>
      <Scripts />
    </View>
  );
};

export default SmoothSpeech;

const styles = StyleSheet.create({});
