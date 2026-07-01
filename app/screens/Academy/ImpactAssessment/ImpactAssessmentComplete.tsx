import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { StatusBar, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getImpactAssessmentProgress } from "../../../api/impactAssessment";
import { ImpactAssessmentProgress } from "../../../api/impactAssessment/types";
import ConfettiAnimation from "../../../components/ConfettiAnimation";
import ScreenView from "../../../components/ScreenView";
import {
  Button,
  Icon,
  ProgressBar,
  Spinner,
  Surface,
  Text,
  icons,
  radius,
  space,
  spacing,
  useTheme,
} from "../../../design-system";

const ImpactAssessmentComplete = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [progress, setProgress] = useState<ImpactAssessmentProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const data = await getImpactAssessmentProgress();
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
    navigation.navigate("Root");
  };

  if (loading) {
    return (
      <ScreenView style={styles.screen}>
        <StatusBar barStyle="light-content" />
        <View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: colors.background.canvas },
          ]}
        />
        <View style={styles.loadingContainer}>
          <Spinner size="large" />
        </View>
      </ScreenView>
    );
  }

  return (
    <ScreenView style={styles.screen}>
      <StatusBar barStyle="light-content" />
      {/* Dark canvas (overrides the legacy light BgWrapper gradient). */}
      <View
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: colors.background.canvas },
        ]}
      />

      {/* Confetti Celebration */}
      <ConfettiAnimation />

      <View style={styles.content}>
        {/* Success Icon — solid accent disc (no gradient). */}
        <View
          style={[
            styles.checkmarkCircle,
            { backgroundColor: colors.accent.success },
          ]}
        >
          <Icon name={icons.success} size={56} color={colors.accentOn.success} />
        </View>

        {/* Text Header */}
        <View style={styles.headerText}>
          <Text variant="h1" color="primary" center>
            Assessment Complete!
          </Text>
          <Text variant="body" color="secondary" center style={styles.subtitle}>
            You've completed the impact assessment. Your personalized profile is
            now being generated.
          </Text>
        </View>

        {/* Stats Card */}
        {progress && (
          <Surface level="elevated" rounded="card" style={styles.statsCard}>
            <View style={styles.statsHeader}>
              <Text variant="h3" color="primary">
                {progress.totalAnswered} Questions Answered
              </Text>
              <Text variant="bodySm" color="tertiary">
                Completed over {progress.dayNumber} day
                {progress.dayNumber !== 1 ? "s" : ""}
              </Text>
            </View>

            <View style={styles.progressContainer}>
              <ProgressBar
                value={progress.completionPercentage}
                max={100}
                color={colors.action.primary}
              />
              <Text
                variant="bodySm"
                color="secondary"
                style={styles.percentText}
              >
                {Math.round(progress.completionPercentage)}% Complete
              </Text>
            </View>
          </Surface>
        )}
      </View>

      {/* Action Button */}
      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom + spacing.md, spacing["3xl"]) },
        ]}
      >
        <Button label="Back to Dashboard" onPress={handleDone} />
      </View>
    </ScreenView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
    paddingHorizontal: space.screenX,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing["3xl"],
  },
  checkmarkCircle: {
    width: 120,
    height: 120,
    borderRadius: radius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  headerText: {
    alignItems: "center",
    gap: spacing.sm,
  },
  subtitle: {
    maxWidth: "85%",
  },
  statsCard: {
    width: "100%",
    padding: spacing["2xl"],
    gap: spacing.lg,
  },
  statsHeader: {
    alignItems: "center",
    gap: spacing.xs,
  },
  progressContainer: {
    gap: spacing.sm,
  },
  percentText: {
    textAlign: "right",
  },
  footer: {
    paddingHorizontal: space.screenX,
    paddingTop: spacing.sm,
  },
});

export default ImpactAssessmentComplete;
