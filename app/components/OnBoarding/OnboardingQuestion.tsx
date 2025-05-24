import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React, { useState } from "react";
import { parseTextStyle } from "../../util/functions/parseStyles";
import { theme } from "../../Theme/tokens";
import Icon from "react-native-vector-icons/FontAwesome5";

interface Onboardingquestion {
  id: string;
  question: string;
  options: OnboardingAnswer[];
  description: string;
  onAnswer?: (questionId: string, answerId: string) => void;
}

interface OnboardingAnswer {
  id: string;
  answer: string;
  description: string;
}

const Onboardingquestion = ({
  id,
  question,
  description,
  options,
  onAnswer,
}: Onboardingquestion) => {
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const handleOptionPress = (questionId: string, answerId: string) => {
    setSelectedAnswer(answerId);
    onAnswer && onAnswer(questionId, answerId);
  };

  return (
    <View key={id} style={styles.questionBlock}>
      <View style={styles.group}>
        <Text style={styles.questionText}>{question}</Text>
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
              <View style={[styles.radio, isSelected && styles.radioSelected]}>
                {isSelected && <Icon name="check" style={styles.checkmark} />}
              </View>
              <View style={styles.smallGroup}>
                <Text style={[styles.optionText]}>{opt.answer}</Text>
                <Text style={[styles.optionDescriptionText]}>
                  {opt.description}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export default Onboardingquestion;

const styles = StyleSheet.create({
  questionBlock: {
    display: "flex",
    flexDirection: "column",
    gap: 32,
  },
  group: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  smallGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
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
    paddingVertical: 12,
    borderRadius: 12,
    borderColor: theme.colors.border.default,
    borderWidth: 1,
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  optionButtonSelected: {
    borderColor: theme.colors.border.selected,
  },
  optionText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
  },
  optionDescriptionText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderColor: theme.colors.border.default,
    borderWidth: 1,
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
    fontSize: 12,
    fontWeight: "bold",
  },
});
