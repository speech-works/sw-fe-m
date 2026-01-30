import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  startOasesCollection,
  getTodayOasesQuestions,
} from "../../../api/oases";
import { useOasesStore } from "../../../stores/oases";
import { theme } from "../../../Theme/tokens";
import ScreenView from "../../../components/ScreenView";
import axios from "axios";

const OASESIntro = () => {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const setDailyBatch = useOasesStore((state) => state.setDailyBatch);

  useEffect(() => {
    const init = async () => {
      try {
        console.log("[OASESIntro] init: Starting...");
        // 1. Start Collection (Soft Fail)
        await startOasesCollection().catch((err) => {
          console.warn(
            "[OASESIntro] Start failed, attempting to fetch questions anyway:",
            err.response?.data || err.message,
          );
        });

        // 2. Fetch Questions
        const batch = await getTodayOasesQuestions();
        console.log("[OASESIntro] Daily Batch stored:", batch);
        setDailyBatch(batch);

        // 3. Navigate
        if (batch.isComplete) {
          console.log(
            "[OASESIntro] Batch is complete. Navigating to OASESComplete.",
          );
          navigation.replace("OASESComplete");
          return; // Ensure no further navigation occurs
        }

        console.log("[OASESIntro] Navigating to OASESQuestions.");
        // Only navigate to questions if NOT complete
        navigation.replace("OASESQuestions");
      } catch (error: any) {
        console.error(
          "[OASESIntro] Critical Failure:",
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
        Alert.alert(
          "Error",
          "Could not load daily questions. Please try again.",
        );
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

export default OASESIntro;
