import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import PressableScale from "../../../components/PressableScale";
import {
  Icon,
  Slider,
  Text,
  fonts,
  icons,
  radius,
  spacing,
  useTheme,
} from "../../../design-system";

interface AssessmentOption {
  id: string;
  answer: string;
  description?: string;
}

interface Props {
  id: string;
  sequence?: number;
  question: string;
  description?: string;
  questionType: "SINGLE" | "MULTI" | "SLIDER";
  options: AssessmentOption[];
  value?: string;
  values?: string[];
  onChange: (questionId: string, answer: string | string[]) => void;
}

/**
 * Dark-DS question renderer for the Impact Assessment flow. Replicates the
 * SINGLE / MULTI / SLIDER selection + slider-scoring logic of the legacy
 * onboarding question renderer VERBATIM — only the visuals are the Vivid dark
 * design system (this exists so the shared onboarding component stays untouched).
 */
const AssessmentQuestion = ({
  id,
  sequence,
  question,
  description,
  questionType,
  options,
  value,
  values = [],
  onChange,
}: Props) => {
  const { colors } = useTheme();
  const isSlider = questionType === "SLIDER";
  const isMulti = questionType === "MULTI";

  // ---- SLIDER LOGIC ----
  const min = 0;
  const max = options.length > 0 ? options.length - 1 : 1;

  // 1. Determine the correct VISUAL position (Index) based on the SAVED VALUE (ID)
  // We compare Strings to ensure "123" matches 123
  const currentOptionIndex = options.findIndex(
    (opt) => String(opt.id) === String(value),
  );

  // 2. If the saved value is not found in options (or is empty), default to Index 0
  const visualIndex = currentOptionIndex !== -1 ? currentOptionIndex : 0;

  // Local state for smooth slider dragging
  const [tempValue, setTempValue] = useState(visualIndex);

  // Display Percentage
  const percentage = max > 0 ? Math.round((tempValue / max) * 100) : 0;

  // ---- MULTI + RADIO HANDLING ----
  const handlePressOption = (optionId: string) => {
    if (!isMulti) {
      return onChange(id, optionId);
    }
    const currentValues = Array.isArray(values) ? (values as string[]) : [];
    if (currentValues.includes(optionId)) {
      return onChange(
        id,
        currentValues.filter((v) => v !== String(optionId)),
      );
    }
    return onChange(id, [...currentValues, String(optionId)]);
  };

  return (
    <View style={styles.container}>
      <Text variant="h1" color="primary" style={styles.question}>
        {sequence ? `${sequence}. ` : ""}
        {question}
      </Text>

      {/* SLIDER RENDERING BLOCK */}
      {isSlider ? (
        <View>
          {description && (
            <Text variant="body" color="secondary" style={styles.description}>
              {description}
            </Text>
          )}
          <View style={styles.sliderBlock}>
            <Slider
              value={tempValue}
              step={0.01}
              minimumValue={min}
              maximumValue={max}
              onValueChange={(v: number) => setTempValue(v)}
              onSlidingComplete={(v: number) => {
                const normalized = Math.max(0, Math.min(v, max));
                const percentage = (normalized / max) * 100;

                let score = 1;

                if (percentage >= 96) score = 10;
                else if (percentage >= 86) score = 9;
                else if (percentage >= 76) score = 8;
                else if (percentage >= 66) score = 7;
                else if (percentage >= 56) score = 6;
                else if (percentage >= 46) score = 5;
                else if (percentage >= 36) score = 4;
                else if (percentage >= 26) score = 3;
                else if (percentage >= 16) score = 2;
                else score = 1; // 1–15%

                console.log(
                  `[Slider] raw: ${v} → ${percentage.toFixed(
                    1,
                  )}% → Motivation Score: ${score}`,
                );

                onChange(id, score.toString());
              }}
            />
            <View style={styles.sliderMeta}>
              <Text variant="body" color="primary">
                {options[Math.round(tempValue)]?.answer ?? ""}
              </Text>
              <Text variant="body" color="primary" style={styles.sliderPercent}>
                {percentage}%
              </Text>
            </View>
          </View>
        </View>
      ) : (
        // NON-SLIDER RENDERING BLOCK
        <View style={styles.nonSliderBlock}>
          {description && (
            <Text
              variant="body"
              color="secondary"
              style={styles.descriptionTight}
            >
              {description}
            </Text>
          )}
          {options.map((opt) => {
            const normalizedId = String(opt.id);
            const selected = isMulti
              ? values.map(String).includes(normalizedId)
              : String(value) === normalizedId;

            return (
              <PressableScale
                key={opt.id}
                onPress={() => handlePressOption(opt.id)}
                style={[
                  styles.option,
                  {
                    backgroundColor: selected
                      ? colors.action.primaryTint
                      : colors.surface.default,
                    borderColor: selected
                      ? colors.border.selected
                      : colors.border.hairline,
                  },
                ]}
              >
                <View
                  style={[
                    styles.controlOuter,
                    isMulti ? styles.checkboxOuter : styles.radioOuter,
                    {
                      borderColor: selected
                        ? colors.action.primary
                        : colors.border.default,
                    },
                  ]}
                >
                  {selected &&
                    (isMulti ? (
                      <Icon
                        name={icons.checklist}
                        size={14}
                        color={colors.action.primary}
                      />
                    ) : (
                      <View
                        style={[
                          styles.radioInner,
                          { backgroundColor: colors.action.primary },
                        ]}
                      />
                    ))}
                </View>
                <View style={styles.textWrap}>
                  <Text variant="body" color="primary">
                    {opt.answer}
                  </Text>
                  {opt.description && (
                    <Text variant="bodySm" color="secondary">
                      {opt.description}
                    </Text>
                  )}
                </View>
              </PressableScale>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing["3xl"],
    paddingVertical: spacing.md,
  },
  question: {
    lineHeight: 42,
  },
  description: {
    lineHeight: 24,
  },
  descriptionTight: {
    lineHeight: 24,
    marginBottom: spacing.xs,
  },
  sliderBlock: {
    marginTop: spacing.md,
  },
  sliderMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.xs,
  },
  sliderPercent: {
    fontFamily: fonts.bold,
  },
  nonSliderBlock: {
    gap: spacing.xl,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    paddingVertical: 18,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.input,
    borderWidth: 1.5,
  },
  controlOuter: {
    width: 22,
    height: 22,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  radioOuter: { borderRadius: radius.full },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 10,
  },
  checkboxOuter: { borderRadius: 6 },
  textWrap: { flex: 1, gap: spacing.xs },
});

export default AssessmentQuestion;
