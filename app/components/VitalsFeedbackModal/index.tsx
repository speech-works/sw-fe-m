import Slider from "@react-native-community/slider";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { theme } from "../../Theme/tokens";
import { parseTextStyle } from "../../util/functions/parseStyles";
import Button from "../Button";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface VitalsFeedbackModalProps {
  visible: boolean;
  onSubmit: (vitals: {
    effortScore: number;
    autonomyScore: number;
    accuracyScore?: number;
  }) => void;
  onSkip: () => void;
  showAccuracy?: boolean; // Show 3rd slider for TECHNIQUE_DRILL
}

export const VitalsFeedbackModal: React.FC<VitalsFeedbackModalProps> = ({
  visible,
  onSubmit,
  onSkip,
  showAccuracy = false,
}) => {
  const [effort, setEffort] = useState(60);
  const [autonomy, setAutonomy] = useState(60);
  const [accuracy, setAccuracy] = useState(60);

  const [isMounted, setIsMounted] = useState(false);
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current; // Subtle slide up

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 20,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsMounted(false);
      });
    }
  }, [visible]);

  const handleSubmit = () => {
    const vitals = {
      effortScore: Math.round(effort),
      autonomyScore: Math.round(autonomy),
      ...(showAccuracy && { accuracyScore: Math.round(accuracy) }),
    };
    onSubmit(vitals);
  };

  if (!isMounted) return null;

  return (
    <Modal
      visible={isMounted}
      transparent
      animationType="none"
      onRequestClose={onSkip}
    >
      <View style={styles.container}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: "rgba(0,0,0,0.5)", opacity: opacityAnim },
          ]}
        />
        <Animated.View
          style={[
            styles.card,
            {
              opacity: opacityAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Header */}
          <Text style={styles.title}>How did it go? 🎉</Text>
          <Text style={styles.subtitle}>
            Your feedback helps us personalize your journey
          </Text>

          {/* Accuracy Slider (Conditional - only for TECHNIQUE_DRILL) */}
          {showAccuracy && (
            <View style={styles.question}>
              <Text style={styles.label}>How accurate was your technique?</Text>
              <View style={styles.range}>
                <Text style={styles.rangeText}>Poor Form</Text>
                <Text style={styles.rangeText}>Perfect</Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={20}
                maximumValue={100}
                step={1}
                value={accuracy}
                onValueChange={setAccuracy}
                minimumTrackTintColor={theme.colors.library.orange[500]}
                maximumTrackTintColor="#E0E0E0"
              />
            </View>
          )}

          {/* Effort Slider (Always) */}
          <View style={styles.question}>
            <Text style={styles.label}>How difficult was this?</Text>
            <View style={styles.range}>
              <Text style={styles.rangeText}>Very Easy</Text>
              <Text style={styles.rangeText}>Very Hard</Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={20}
              maximumValue={100}
              step={1}
              value={effort}
              onValueChange={setEffort}
              minimumTrackTintColor={theme.colors.library.green[500]}
              maximumTrackTintColor="#E0E0E0"
            />
          </View>

          {/* Autonomy Slider (Always) */}
          <View style={styles.question}>
            <Text style={styles.label}>How much control did you feel?</Text>
            <View style={styles.range}>
              <Text style={styles.rangeText}>Forced</Text>
              <Text style={styles.rangeText}>Fully In Control</Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={20}
              maximumValue={100}
              step={1}
              value={autonomy}
              onValueChange={setAutonomy}
              minimumTrackTintColor={theme.colors.library.blue[500]}
              maximumTrackTintColor="#E0E0E0"
            />
          </View>

          {/* Buttons */}
          <View style={styles.buttons}>
            <Button
              text="Skip"
              onPress={onSkip}
              variant="ghost"
              style={styles.skipButton}
            />
            <Button
              text="Submit"
              onPress={handleSubmit}
              variant="normal"
              style={styles.submitButton}
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 28,
    width: "100%",
    maxWidth: 420,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    ...parseTextStyle(theme.typography.Heading2),
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
    color: theme.colors.text.title,
  },
  subtitle: {
    ...parseTextStyle(theme.typography.Body),
    fontSize: 14,
    color: theme.colors.text.disabled,
    marginBottom: 32,
    textAlign: "center",
    lineHeight: 20,
  },
  question: {
    marginBottom: 28,
  },
  label: {
    ...parseTextStyle(theme.typography.Body),
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    color: theme.colors.text.title,
  },
  range: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  rangeText: {
    ...parseTextStyle(theme.typography.BodySmall),
    fontSize: 12,
    color: theme.colors.text.disabled,
    fontWeight: "500",
  },
  slider: {
    width: "100%",
    height: 40,
  },
  buttons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  skipButton: {
    flex: 1,
  },
  submitButton: {
    flex: 1,
  },
});

export default VitalsFeedbackModal;
