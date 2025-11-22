import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React, { useState } from "react";
import { parseTextStyle } from "../../util/functions/parseStyles";
import { theme } from "../../Theme/tokens";
import Icon from "react-native-vector-icons/FontAwesome5";

interface OnboardingAnswer {
  id: string;
  answer: string;
  description: string;
}

interface OnboardingQuestionProps {
  id: string;
  sequence?: number; // Optional sequence number (e.g., 1, 2)
  question: string;
  options: OnboardingAnswer[];
  description: string;
  onAnswer?: (questionId: string, answerId: string) => void;
}

const OnboardingQuestion = ({
  id,
  sequence,
  question,
  description,
  options,
  onAnswer,
}: OnboardingQuestionProps) => {
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");

  const handleOptionPress = (questionId: string, answerId: string) => {
    setSelectedAnswer(answerId);
    onAnswer && onAnswer(questionId, answerId);
  };

  return (
    <View key={id} style={styles.questionBlock}>
      <View style={styles.group}>
        {/* Render sequence only if provided */}
        <Text style={styles.questionText}>
          {sequence ? `${sequence}. ` : ""}
          {question}
        </Text>

        {description.length > 0 && (
          <Text style={styles.descriptionText}>{description}</Text>
        )}
      </View>

      <View style={styles.group}>
        {options.map((opt) => {
          const isSelected = selectedAnswer === opt.id;
          return (
            <TouchableOpacity
              key={opt.id}
              style={[
                styles.optionButton,
                isSelected && styles.optionButtonSelected,
              ]}
              onPress={() => handleOptionPress(id, opt.id)}
              accessibilityLabel={`Answer: ${opt.answer}`}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
            >
              {/* Radio Button Indicator */}
              <View style={[styles.radio, isSelected && styles.radioSelected]}>
                {isSelected && <Icon name="check" style={styles.checkmark} />}
              </View>

              {/* Text Container - Flex 1 handles overflow */}
              <View style={styles.smallGroup}>
                <Text style={styles.optionText}>{opt.answer}</Text>
                {!!opt.description && (
                  <Text style={styles.optionDescriptionText}>
                    {opt.description}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export default OnboardingQuestion;

const styles = StyleSheet.create({
  questionBlock: {
    display: "flex",
    flexDirection: "column",
    gap: 32,
    marginBottom: 16,
  },
  group: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  smallGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    flex: 1, // CRITICAL: Ensures text wraps instead of pushing off screen
  },
  questionText: {
    ...parseTextStyle(theme.typography.Heading1),
    color: theme.colors.text.title,
  },
  descriptionText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    borderColor: theme.colors.border.default,
    borderWidth: 1,
    display: "flex",
    flexDirection: "row",
    alignItems: "flex-start", // CRITICAL: Aligns radio to top for multi-line text
    gap: 16,
  },
  optionButtonSelected: {
    borderColor: theme.colors.border.selected,
    backgroundColor: theme.colors.background.default,
  },
  optionText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
    flexWrap: "wrap",
  },
  optionDescriptionText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
    flexWrap: "wrap",
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderColor: theme.colors.border.default,
    borderWidth: 1,
    marginTop: 2, // Optical alignment with first line of text
  },
  radioSelected: {
    backgroundColor: theme.colors.actionPrimary.default,
    borderWidth: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  checkmark: {
    color: theme.colors.text.onDark,
    fontSize: 10,
    fontWeight: "bold",
  },
});
