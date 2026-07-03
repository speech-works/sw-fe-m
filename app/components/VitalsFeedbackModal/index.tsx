import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  AnimatedModal,
  Button,
  Slider,
  Text,
  spacing,
} from "../../design-system";

interface VitalsFeedbackModalProps {
  visible: boolean;
  onSubmit: (vitals: {
    effortScore: number;
    autonomyScore: number;
    accuracyScore?: number;
  }) => void;
  onSkip: () => void;
  showAccuracy?: boolean; // Show 3rd slider for TECHNIQUE_DRILL
  /** Category accent for the sliders + Submit (defaults to the brand orange, so
   *  callers with no category colour — e.g. Exposure — stay orange). */
  accentColor?: string;
  onAccentColor?: string;
}

const MIN = 20;
const MAX = 100;
const INITIAL = 60;

/** One labelled 0–100 vitals slider with left/right anchor captions. */
const VitalsQuestion: React.FC<{
  label: string;
  left: string;
  right: string;
  value: number;
  onChange: (v: number) => void;
  accentColor?: string;
}> = ({ label, left, right, value, onChange, accentColor }) => (
  <View style={styles.question}>
    <Text variant="title" color="primary">
      {label}
    </Text>
    <View style={styles.range}>
      <Text variant="caption" color="tertiary">
        {left}
      </Text>
      <Text variant="caption" color="tertiary">
        {right}
      </Text>
    </View>
    <Slider
      minimumValue={MIN}
      maximumValue={MAX}
      step={1}
      value={value}
      onValueChange={onChange}
      accentColor={accentColor}
      haptic={false}
    />
  </View>
);

/**
 * Post-practice "how did it go?" vitals form (effort / autonomy, plus accuracy
 * for technique drills). Dark DS card via `AnimatedModal` — same content grammar
 * as the other dark modals (centred h2 + bodySm header, gap-driven spacing,
 * stacked full-width buttons). The sliders + Submit inherit the caller's category
 * accent (Reframe blue, Breathing rose, …). The "Skip" button and a backdrop tap
 * both dismiss, so there's no redundant close X.
 */
export const VitalsFeedbackModal: React.FC<VitalsFeedbackModalProps> = ({
  visible,
  onSubmit,
  onSkip,
  showAccuracy = false,
  accentColor,
  onAccentColor,
}) => {
  const [effort, setEffort] = useState(INITIAL);
  const [autonomy, setAutonomy] = useState(INITIAL);
  const [accuracy, setAccuracy] = useState(INITIAL);

  const handleSubmit = () => {
    onSubmit({
      effortScore: Math.round(effort),
      autonomyScore: Math.round(autonomy),
      ...(showAccuracy && { accuracyScore: Math.round(accuracy) }),
    });
  };

  return (
    <AnimatedModal visible={visible} onClose={onSkip} maxWidth={420}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text variant="h2" color="primary" center>
            How did it go?
          </Text>
          <Text variant="bodySm" color="secondary" center>
            Help us personalize your journey
          </Text>
        </View>

        {showAccuracy && (
          <VitalsQuestion
            label="How accurate was your technique?"
            left="Poor Form"
            right="Perfect"
            value={accuracy}
            onChange={setAccuracy}
            accentColor={accentColor}
          />
        )}
        <VitalsQuestion
          label="How difficult was this?"
          left="Very Easy"
          right="Very Hard"
          value={effort}
          onChange={setEffort}
          accentColor={accentColor}
        />
        <VitalsQuestion
          label="How much control did you feel?"
          left="Forced"
          right="Fully In Control"
          value={autonomy}
          onChange={setAutonomy}
          accentColor={accentColor}
        />

        <View style={styles.buttons}>
          <Button
            label="Submit"
            onPress={handleSubmit}
            variant="primary"
            accentColor={accentColor}
            onAccentColor={onAccentColor}
          />
          <Button
            label="Skip"
            onPress={onSkip}
            variant="ghost"
            onColor={accentColor}
          />
        </View>
      </View>
    </AnimatedModal>
  );
};

export default VitalsFeedbackModal;

const styles = StyleSheet.create({
  content: {
    gap: spacing.xl,
  },
  header: {
    alignItems: "center",
    gap: spacing.xs,
  },
  question: {
    gap: spacing.sm,
  },
  range: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xs,
  },
  buttons: {
    gap: spacing.md,
    marginTop: spacing.xs,
  },
});
