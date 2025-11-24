import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Slider from "@react-native-community/slider";
import Icon from "react-native-vector-icons/FontAwesome5";
import { theme } from "../../Theme/tokens";
import { parseTextStyle } from "../../util/functions/parseStyles";

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
  questionType: "single" | "multi" | "slider";
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
  const isSlider = questionType === "slider";
  const isMulti = questionType === "multi";

  // ---- SLIDER SETUP ----
  const min = 0;
  // Use a max of 1 if no options are present to prevent max=0 errors.
  const max = options.length > 0 ? options.length - 1 : 1;
  const controlledValue = Number(value) || min;

  // Local state for smooth slider interaction
  const [tempValue, setTempValue] = useState(controlledValue);

  // Sync tempValue when the external controlled value changes
  useEffect(() => {
    setTempValue(controlledValue);
  }, [controlledValue]);

  // Calculate percentage for display
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
        currentValues.filter((v) => v !== String(optionId))
      );
    }
    return onChange(id, [...currentValues, String(optionId)]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.question}>
        {sequence ? `${sequence}. ` : ""}
        {question}
      </Text>

      {/* SLIDER RENDERING BLOCK */}
      {isSlider ? (
        <View>
          {description && <Text style={styles.description}>{description}</Text>}
          <View style={styles.sliderBlock}>
            <Slider
              style={styles.slider}
              value={tempValue}
              // REMOVED step={1} to allow smooth dragging visual
              minimumValue={min}
              maximumValue={max}
              onValueChange={(v) => setTempValue(v)}
              onSlidingComplete={(v) => {
                const rounded = Math.round(v);
                // Snap visually to the integer
                setTempValue(rounded);
                // Commit integer value to store
                onChange(id, String(rounded));
              }}
              minimumTrackTintColor={theme.colors.actionPrimary.default}
              maximumTrackTintColor="#E6E6E6"
              thumbTintColor={theme.colors.actionPrimary.default}
            />
            <View style={styles.sliderMeta}>
              <Text style={styles.sliderText}>
                {/* Use Math.round to find the nearest label while dragging */}
                {options[Math.round(tempValue)]?.answer ?? ""}
              </Text>
              <Text style={styles.sliderPercent}>{percentage}%</Text>
            </View>
          </View>
        </View>
      ) : (
        // NON-SLIDER RENDERING BLOCK (Multi-select/Radio)
        <View style={styles.nonSliderBlock}>
          {description && (
            <Text style={[styles.description, { marginBottom: 4 }]}>
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
                        color={theme.colors.actionPrimary.default}
                      />
                    ) : (
                      <View style={styles.radioInner} />
                    ))}
                </View>
                <View style={styles.textWrap}>
                  <Text style={styles.answer}>{opt.answer}</Text>
                  {opt.description && (
                    <Text style={styles.sub}>{opt.description}</Text>
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

const styles = StyleSheet.create({
  container: { gap: 18 },
  question: {
    ...parseTextStyle(theme.typography.Heading1),
    color: theme.colors.text.title,
  },
  description: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
  },
  sliderBlock: {
    marginTop: 12,
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
  sliderText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
  },
  sliderPercent: {
    ...parseTextStyle(theme.typography.Body),
    fontWeight: "700",
    color: theme.colors.text.title,
  },
  nonSliderBlock: {
    gap: 12,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: theme.colors.border.default,
  },
  optionSelected: {
    borderColor: theme.colors.actionPrimary.default,
    backgroundColor: theme.colors.background.default,
  },
  controlOuter: {
    width: 22,
    height: 22,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: theme.colors.border.default,
  },
  radioOuter: { borderRadius: 100 },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 10,
    backgroundColor: theme.colors.actionPrimary.default,
  },
  checkboxOuter: { borderRadius: 6 },
  controlOuterActive: {
    borderColor: theme.colors.actionPrimary.default,
  },
  textWrap: { flex: 1, gap: 4 },
  answer: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
  },
  sub: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
});
