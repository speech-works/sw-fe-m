import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  LayoutAnimation,
  Platform,
  UIManager,
  Animated,
} from "react-native";
import React, { useState, useRef } from "react";
import ScreenView from "../../../../../components/ScreenView";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import {
  LibStackNavigationProp,
  LibStackParamList,
} from "../../../../../navigators/stacks/AcademyStack/LibraryStack/types";
import Icon from "react-native-vector-icons/FontAwesome5";
import { theme } from "../../../../../Theme/tokens";
import CustomScrollView, {
  SHADOW_BUFFER,
} from "../../../../../components/CustomScrollView";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../util/functions/parseStyles";
import Button from "../../../../../components/Button";

// Enable LayoutAnimation on Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SummaryPage = () => {
  const navigation =
    useNavigation<LibStackNavigationProp<keyof LibStackParamList>>();
  const route = useRoute<RouteProp<LibStackParamList, "SummaryPage">>();
  const { techniqueId, techniqueName, finalAnswers } = route.params;

  // Track expanded state per question
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Prepare rotation animations synchronously to avoid undefined
  const rotationAnim = useRef<Record<string, Animated.Value>>({}).current;
  finalAnswers.forEach((item) => {
    if (!rotationAnim[item.question.id]) {
      rotationAnim[item.question.id] = new Animated.Value(0);
    }
  });

  const toggleExplanation = (id: string) => {
    // Smooth expand/collapse
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    const isExp = !expanded[id];
    setExpanded((prev) => ({ ...prev, [id]: isExp }));

    // Animate arrow rotation
    Animated.timing(rotationAnim[id], {
      toValue: isExp ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  return (
    <ScreenView style={styles.screenView}>
      <View style={styles.container}>
        <CustomScrollView contentContainerStyle={styles.scrollView}>
          <View style={styles.okContainer}>
            <Icon
              name="check"
              size={52}
              color={theme.colors.library.green[400]}
            />
          </View>
          <View style={styles.titleTextContainer}>
            <Text style={styles.titleText}>Great Job</Text>
            <Text style={styles.descText}>
              You've completed {techniqueName} practice for the day. Don’t
              forget to check for more in the library.
            </Text>
          </View>

          <View style={styles.questContainer}>
            {finalAnswers.map((item, index) => {
              const isCorrect = item.yourAnswer.isCorrect;
              const yourAnswerText = item.yourAnswer.optionText;
              const correctAnswer = item.question.options.find(
                (opt) => opt.isCorrect
              );
              const correctAnswerText = correctAnswer?.optionText;
              const questionText = item.question.questionText;
              const explanation = correctAnswer?.explanation;

              const rotate = rotationAnim[item.question.id].interpolate({
                inputRange: [0, 1],
                outputRange: ["0deg", "180deg"],
              });

              return (
                <View style={styles.questCard} key={item.question.id}>
                  {/* Meta Row */}
                  <View style={styles.metaRow}>
                    <Text style={styles.labelText}>Question {index + 1}</Text>
                    <View style={styles.resultContainer}>
                      <Icon
                        solid
                        name={isCorrect ? "check-circle" : "times-circle"}
                        color={
                          isCorrect
                            ? theme.colors.library.green[400]
                            : theme.colors.library.red[400]
                        }
                        size={16}
                      />
                      <Text
                        style={[
                          styles.resultText,
                          !isCorrect && styles.resultTextErr,
                        ]}
                      >
                        {isCorrect ? "Correct" : "Incorrect"}
                      </Text>
                    </View>
                  </View>

                  {/* Question Text */}
                  <Text style={styles.questionText}>{questionText}</Text>

                  {/* Your Answer */}
                  <View style={[styles.ansRow, !isCorrect && styles.ansRowErr]}>
                    <Icon
                      name={isCorrect ? "check" : "times"}
                      size={16}
                      color={
                        isCorrect
                          ? theme.colors.library.green[400]
                          : theme.colors.library.red[400]
                      }
                    />
                    <Text
                      style={[styles.ansText, !isCorrect && styles.ansTextErr]}
                    >
                      {yourAnswerText}
                    </Text>
                  </View>

                  {/* Correct Answer if wrong */}
                  {!isCorrect && (
                    <View style={styles.ansRow}>
                      <Icon
                        name="check"
                        size={16}
                        color={theme.colors.library.green[400]}
                      />
                      <Text style={styles.ansText}>{correctAnswerText}</Text>
                    </View>
                  )}

                  {/* Explanation */}
                  {explanation && (
                    <View>
                      <TouchableOpacity
                        style={styles.explanationToggle}
                        onPress={() => toggleExplanation(item.question.id)}
                      >
                        <Text style={styles.explanationToggleText}>
                          {expanded[item.question.id]
                            ? "Explanation"
                            : "Explanation"}
                        </Text>
                        <Animated.View style={{ transform: [{ rotate }] }}>
                          <Icon
                            name="chevron-down"
                            size={14}
                            color={theme.colors.text.title}
                          />
                        </Animated.View>
                      </TouchableOpacity>

                      {expanded[item.question.id] && (
                        <Text style={styles.explanationText}>
                          {explanation}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {/* Back Button */}
          <View style={styles.btnContainer}>
            <Button
              text="Back to Library"
              onPress={() => navigation.navigate("Library")}
              elevation={1}
            />
          </View>
        </CustomScrollView>
      </View>
    </ScreenView>
  );
};

export default SummaryPage;

const styles = StyleSheet.create({
  screenView: { paddingBottom: 0 },
  container: { gap: 32, flex: 1 },
  scrollView: { padding: SHADOW_BUFFER, paddingVertical: 32, gap: 32 },
  okContainer: {
    height: 128,
    width: 128,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    borderRadius: 64,
    backgroundColor: theme.colors.library.green[200],
  },
  titleTextContainer: { alignItems: "center", gap: 16 },
  titleText: {
    ...parseTextStyle(theme.typography.Heading1),
    color: theme.colors.text.title,
  },
  descText: {
    textAlign: "center",
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
  },
  questContainer: { gap: 24, width: "100%" },
  questCard: {
    padding: 24,
    gap: 16,
    borderRadius: 12,
    backgroundColor: theme.colors.surface.elevated,
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  labelText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
  resultContainer: { flexDirection: "row", alignItems: "center", gap: 8 },
  resultText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.library.green[400],
  },
  resultTextErr: { color: theme.colors.library.red[400] },
  questionText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
  },
  ansRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderRadius: 12,
    backgroundColor: theme.colors.library.green[100],
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: theme.colors.library.green[400],
  },
  ansRowErr: {
    backgroundColor: theme.colors.library.red[100],
    borderColor: theme.colors.library.red[400],
  },
  ansText: {
    flexShrink: 1,
    color: theme.colors.library.green[400],
  },
  ansTextErr: { color: theme.colors.library.red[400] },
  btnContainer: { gap: 12, width: "100%" },
  explanationToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  explanationToggleText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.title,
  },
  explanationText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
    paddingTop: 8,
    lineHeight: 20,
  },
});
