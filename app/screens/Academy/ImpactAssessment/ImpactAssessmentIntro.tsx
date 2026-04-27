import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Text, View } from "react-native";
import {
    getTodayImpactAssessmentQuestions,
    startImpactAssessmentCollection,
} from "../../../api/impactAssessment";
import ScreenView from "../../../components/ScreenView";
import { useImpactAssessmentStore } from "../../../stores/impactAssessment";
import { theme } from "../../../Theme/tokens";
import { track } from "../../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../../util/analytics/analyticsEvents";

const ImpactAssessmentIntro = () => {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const setDailyBatch = useImpactAssessmentStore((state) => state.setDailyBatch);

  useEffect(() => {
    let retryCount = 0;
    const MAX_RETRIES = 2;

    const init = async () => {
      try {
        console.log("[ImpactAssessmentIntro] init: Starting...");
        // 1. Start Collection (Soft Fail)
        await startImpactAssessmentCollection().catch((err) => {
          console.warn(
            "[ImpactAssessmentIntro] Start failed, attempting to fetch questions anyway:",
            err.response?.data || err.message,
          );
        });

        // 2. Fetch Questions
        const batch = await getTodayImpactAssessmentQuestions();
        console.log("[ImpactAssessmentIntro] Daily Batch stored:", batch);
        setDailyBatch(batch);

        // 3. Navigate based on state
        if (batch.isComplete) {
          console.log(
            "[ImpactAssessmentIntro] Assessment is complete. Navigating to ImpactAssessmentComplete.",
          );
          navigation.replace("ImpactAssessmentComplete");
          return;
        }

        track(ANALYTICS_EVENTS.ASSESSMENT_STARTED, {
          totalQuestions: batch.questions?.length ?? 0,
        });

        // Edge case: Not complete but no questions (backend guide says retry)
        if (!batch.questions || batch.questions.length === 0) {
          if (retryCount < MAX_RETRIES) {
            retryCount++;
            console.log(
              `[ImpactAssessmentIntro] Empty questions, retrying (${retryCount}/${MAX_RETRIES})...`,
            );
            // Small delay before retry
            await new Promise((resolve) => setTimeout(resolve, 1000));
            await init();
            return;
          }

          console.warn("[ImpactAssessmentIntro] No questions available after retries.");
          Alert.alert(
            "Loading Questions",
            "We're preparing your next set of questions. Please try again in a moment.",
            [{ text: "OK", onPress: () => navigation.goBack() }],
          );
          return;
        }

        console.log("[ImpactAssessmentIntro] Navigating to ImpactAssessmentQuestions.");
        navigation.replace("ImpactAssessmentQuestions");
      } catch (error: any) {
        console.error(
          "[ImpactAssessmentIntro] Critical Failure:",
          error.response?.data || error.message,
        );
        if (axios.isAxiosError(error) && error.response?.status === 400) {
          const msg = error.response.data?.error || "";
          if (msg.includes("Phase 1")) {
            Alert.alert(
              "Onboarding Required",
              "Please complete the clinical intake first.",
              [
                {
                  text: "Go to Onboarding",
                  onPress: () => navigation.navigate("OnboardingStack"),
                },
              ],
            );
            return;
          }
        }
        Alert.alert("Error", "Could not load questions. Please try again.");
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  return (
    <ScreenView>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator
          size="large"
          color={theme.colors.actionPrimary.default}
        />
        <Text style={{ marginTop: 20, color: theme.colors.text.default }}>
          Loading Daily Questions...
        </Text>
      </View>
    </ScreenView>
  );
};

export default ImpactAssessmentIntro;
