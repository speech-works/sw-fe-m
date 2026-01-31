import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import Icon from "react-native-vector-icons/FontAwesome5";
import ConfettiAnimation from "../../../components/ConfettiAnimation";
import Button from "../../../components/Button";
import { getOasesProgress } from "../../../api/oases";
import { OasesProgress } from "../../../api/oases/types";
import { theme } from "../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../util/functions/parseStyles";

const { width } = Dimensions.get("window");

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
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color={theme.colors.actionPrimary.default}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Confetti Celebration */}
      <ConfettiAnimation />

      {/* Immersive Background */}
      <View style={StyleSheet.absoluteFillObject}>
        <LinearGradient
          colors={["#FFF7ED", "#FFEDD5", "#FFF"]} // Peach -> Warm -> White
          locations={[0, 0.4, 1]}
          style={{ flex: 1 }}
        />
      </View>

      <View style={styles.content}>
        {/* Success Icon */}
        <View style={styles.checkmarkContainer}>
          <LinearGradient
            colors={["#10B981", "#059669"]} // Green Gradient
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.checkmarkCircle}
          >
            <Icon name="check" size={50} color="#FFFFFF" />
          </LinearGradient>
        </View>

        {/* Text Header */}
        <View style={styles.headerText}>
          <Text style={styles.title}>All Done for Today!</Text>
          <Text style={styles.subtitle}>
            Great job! You've captured today's insights.
          </Text>
        </View>

        {/* Stats Card - Glassmorphism */}
        {progress && (
          <View style={styles.statsCard}>
            <View style={styles.statsHeader}>
              <Text style={styles.statsTitle}>
                Day {progress.dayNumber} Complete
              </Text>
              <Text style={styles.statsSubtitle}>
                {7 - progress.dayNumber === 0
                  ? "Profile complete!"
                  : `${7 - progress.dayNumber} days until profile unlock`}
              </Text>
            </View>

            <View style={styles.progressContainer}>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${progress.completionPercentage}%` },
                  ]}
                />
              </View>
              <Text style={styles.percentText}>
                {Math.round(progress.completionPercentage)}% Complete
              </Text>
            </View>
          </View>
        )}

        <View style={{ flex: 1 }} />

        {/* Action Button */}
        <View style={{ width: "100%", paddingBottom: 20 }}>
          <Button text="Back to Dashboard" onPress={handleDone} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.light,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40, // Safe Area padding
    alignItems: "center",
    gap: 32,
  },
  checkmarkContainer: {
    marginTop: 20, // Add some spacing top if needed
  },
  checkmarkCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  headerText: {
    alignItems: "center",
    gap: 8,
  },
  title: {
    ...parseTextStyle(theme.typography.Heading1),
    color: theme.colors.text.title,
    textAlign: "center",
    fontSize: 28,
  },
  subtitle: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    textAlign: "center",
    opacity: 0.8,
    maxWidth: "80%",
  },
  statsCard: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.6)", // Glass effect
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.8)",
    gap: 16,
    ...parseShadowStyle(theme.shadow.elevation1),
    shadowColor: "rgba(249, 115, 22, 0.1)", // Orange tint shadow
  },
  statsHeader: {
    alignItems: "center",
    gap: 4,
  },
  statsTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },
  statsSubtitle: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
    opacity: 0.7,
  },
  progressContainer: {
    gap: 8,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#F97316",
    borderRadius: 4,
  },
  percentText: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: theme.colors.text.default,
    textAlign: "right",
    fontWeight: "600",
  },
  actionButton: {
    width: "100%",
    height: 56,
    backgroundColor: "#FFF",
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  actionButtonText: {
    ...parseTextStyle(theme.typography.Button),
    color: theme.colors.text.title,
  },
});

export default OASESComplete;
