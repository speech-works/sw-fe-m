import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { getOasesProgress } from "../../../api/oases";
import { OasesProgress } from "../../../api/oases/types";
import ScreenView from "../../../components/ScreenView";
import Button from "../../../components/Button";
import { theme } from "../../../Theme/tokens";
import { parseTextStyle } from "../../../util/functions/parseStyles";
import Icon from "react-native-vector-icons/FontAwesome5";

const OASESComplete = () => {
  const navigation = useNavigation<any>();
  const [progress, setProgress] = useState<OasesProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const data = await getOasesProgress();
        setProgress(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProgress();
  }, []);

  const handleDone = () => {
    navigation.navigate("DailyPractice"); // Or go back to Dashboard/Home
  };

  if (loading) {
    return (
      <ScreenView>
        <View style={[styles.center, { flex: 1 }]}>
          <ActivityIndicator
            size="large"
            color={theme.colors.actionPrimary.default}
          />
        </View>
      </ScreenView>
    );
  }

  return (
    <ScreenView>
      <View style={[styles.center, { marginTop: 60, gap: 24 }]}>
        <View style={styles.iconCircle}>
          <Icon name="check" size={40} color="#fff" />
        </View>

        <Text style={styles.title}>All Done for Today!</Text>

        {progress && (
          <View style={styles.statsCard}>
            <Text style={styles.dayText}>
              Day {progress.dayNumber} Complete
            </Text>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${progress.completionPercentage}%` },
                ]}
              />
            </View>
            <Text style={styles.percentText}>
              {progress.completionPercentage}% of 7-Day Pulse
            </Text>
          </View>
        )}

        <Text style={styles.sub}>
          Come back tomorrow for your next set of questions.
        </Text>
      </View>

      <View style={{ flex: 1 }} />

      <View style={{ paddingBottom: 20 }}>
        <Button text="Back to Dashboard" onPress={handleDone} />
      </View>
    </ScreenView>
  );
};

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.actionPrimary.default,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    ...parseTextStyle(theme.typography.Heading2),
    color: theme.colors.text.title,
    textAlign: "center",
  },
  sub: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    textAlign: "center",
    maxWidth: "80%",
  },
  statsCard: {
    width: "100%",
    backgroundColor: theme.colors.background.default,
    padding: 24,
    borderRadius: 16,
    gap: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.border.default,
  },
  dayText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },
  progressBarBg: {
    width: "100%",
    height: 8,
    backgroundColor: theme.colors.border.default,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: theme.colors.actionPrimary.default,
    borderRadius: 4,
  },
  percentText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
});

export default OASESComplete;
