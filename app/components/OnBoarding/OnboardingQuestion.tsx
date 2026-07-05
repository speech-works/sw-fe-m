import Slider from "@react-native-community/slider";
import React, { useState } from "react";
import { TouchableOpacity, View } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";

import { makeStyles, Text, useTheme } from "../../design-system";

interface OnboardingOption {
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
  options: OnboardingOption[];
  value?: string;
  values?: string[];
  onChange: (questionId: string, answer: string | string[]) => void;
}

const OnboardingQuestion = ({
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
  const styles = useStyles();
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
      <Text variant="display" color="primary" style={styles.question}>
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
              style={styles.slider}
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
              minimumTrackTintColor={colors.action.primary}
              maximumTrackTintColor={colors.surface.control}
              thumbTintColor={colors.action.primary}
            />
            <View style={styles.sliderMeta}>
              <Text variant="body" color="primary">
                {options[Math.round(tempValue)]?.answer ?? ""}
              </Text>
              <Text variant="title" color="primary">
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
              style={[styles.description, { marginBottom: 4 }]}
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
              <TouchableOpacity
                key={opt.id}
                style={[styles.option, selected && styles.optionSelected]}
                onPress={() => handlePressOption(opt.id)}
                activeOpacity={0.85}
              >
                <View
                  style={[
                    styles.controlOuter,
                    isMulti ? styles.checkboxOuter : styles.radioOuter,
                    selected && styles.controlOuterActive,
                  ]}
                >
                  {selected &&
                    (isMulti ? (
                      <Icon
                        name="check"
                        size={14}
                        color={colors.text.accent}
                      />
                    ) : (
                      <View style={styles.radioInner} />
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
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

export default OnboardingQuestion;

const useStyles = makeStyles((c, t) => ({
  container: {
    gap: t.spacing["3xl"], // Increase gap between Title and content
    paddingVertical: t.spacing.md,
  },
  question: {
    lineHeight: 42,
  },
  description: {
    lineHeight: 24,
  },
  sliderBlock: {
    marginTop: t.spacing.md,
  },
  slider: {
    width: "100%",
    height: 48,
  },
  sliderMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  nonSliderBlock: {
    gap: t.spacing.xl, // Clearer separation between description and options
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.spacing.lg,
    paddingVertical: 18,
    paddingHorizontal: t.spacing.xl,
    borderRadius: t.radius.input,
    borderWidth: 1.5,
    borderStyle: "solid",
    borderColor: c.border.default,
  },
  optionSelected: {
    borderColor: c.action.primary,
    backgroundColor: c.action.primaryTint,
  },
  controlOuter: {
    width: 22,
    height: 22,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: c.border.default,
  },
  radioOuter: { borderRadius: t.radius.full },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 10,
    backgroundColor: c.action.primary,
  },
  checkboxOuter: { borderRadius: 6 },
  controlOuterActive: {
    borderColor: c.action.primary,
  },
  textWrap: { flex: 1, gap: t.spacing.xs, display: "flex", flexDirection: "column" },
}));
