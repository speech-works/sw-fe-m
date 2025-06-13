import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React from "react";
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

const SummaryPage = () => {
  const navigation =
    useNavigation<LibStackNavigationProp<keyof LibStackParamList>>();
  const route = useRoute<RouteProp<LibStackParamList, "SummaryPage">>();
  // Destructure route params to get techniqueId, techniqueName, and finalAnswers
  const { techniqueId, techniqueName, finalAnswers } = route.params;

  return (
    <ScreenView style={styles.screenView}>
      <View style={styles.container}>
        {/* Scrollable Content Area */}
        <CustomScrollView contentContainerStyle={styles.scrollView}>
          {/* Great Job Section */}
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

          {/* Questions Summary Container */}
          <View style={styles.questContainer}>
            {/* Map through finalAnswers to display each question's summary */}
            {finalAnswers.map((item, index) => {
              const isCorrect = item.yourAnswer.isCorrect;
              const yourAnswerText = item.yourAnswer.optionText;
              const correctAnswerText = item.question.options.find(
                (opt) => opt.isCorrect
              )?.optionText;
              const questionText = item.question.questionText;

              return (
                <View style={styles.questCard} key={item.question.id}>
                  {/* Question Meta Row: Question Number and Result (Correct/Incorrect) */}
                  <View style={styles.metaRow}>
                    <Text style={styles.labelText}>Question {index + 1}</Text>
                    <View style={styles.resultContainer}>
                      {/* Icon for correctness */}
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
                      {/* Text for correctness */}
                      <Text
                        style={[
                          styles.resultText,
                          !isCorrect && styles.resultTextErr, // Apply error style if incorrect
                        ]}
                      >
                        {isCorrect ? "Correct" : "Incorrect"}
                      </Text>
                    </View>
                  </View>

                  {/* Question Text */}
                  <Text style={styles.questionText}>{questionText}</Text>

                  {/* Your Answer Row */}
                  <View
                    style={[
                      styles.ansRow,
                      !isCorrect && styles.ansRowErr, // Apply error style if your answer was incorrect
                    ]}
                  >
                    {/* Icon for your answer's correctness */}
                    <Icon
                      name={isCorrect ? "check" : "times"}
                      size={16}
                      color={
                        isCorrect
                          ? theme.colors.library.green[400]
                          : theme.colors.library.red[400]
                      }
                    />
                    {/* Text for your answer */}
                    <Text
                      style={[
                        styles.ansText,
                        !isCorrect && styles.ansTextErr, // Apply error style if your answer was incorrect
                      ]}
                    >
                      {yourAnswerText}
                    </Text>
                  </View>

                  {/* Correct Answer Row (only shown if your answer was incorrect) */}
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
                </View>
              );
            })}
          </View>

          {/* Action Buttons */}
          <View style={styles.btnContainer}>
            {/* <Button
              text="Practice Again"
              onPress={() => {
                navigation.goBack();
              }}
              elevation={1}
            /> */}
            <Button
              //variant="ghost"
              text="Back to Library"
              onPress={() => {
                navigation.navigate("Library");
              }}
              elevation={1}
              // style={{
              //   backgroundColor: theme.colors.surface.elevated,
              //   borderColor: "transparent",
              // }}
            />
          </View>
        </CustomScrollView>
      </View>
    </ScreenView>
  );
};

export default SummaryPage;

const styles = StyleSheet.create({
  screenView: {
    paddingBottom: 0,
  },
  container: {
    gap: 32,
    flex: 1,
  },
  topNavigationContainer: {
    position: "relative",
    top: 0,
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topNavigation: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  topNavigationText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },
  scrollView: {
    padding: SHADOW_BUFFER,
    paddingVertical: 32,
    gap: 32,
  },
  okContainer: {
    height: 128,
    width: 128,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    borderRadius: "50%",
    backgroundColor: theme.colors.library.green[200],
  },
  titleTextContainer: {
    alignItems: "center",
    gap: 16,
  },
  titleText: {
    ...parseTextStyle(theme.typography.Heading1),
    color: theme.colors.text.title,
  },
  descText: {
    textAlign: "center",
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
  },
  questContainer: {
    gap: 24,
    width: "100%",
  },
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
  resultContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
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
    borderWidth: 1,
    borderColor: theme.colors.library.red[400],
  },
  ansText: {
    justifyContent: "flex-start",
    color: theme.colors.library.green[400],
    flexShrink: 1,
  },
  ansTextErr: {
    color: theme.colors.library.red[400],
  },
  btnContainer: {
    gap: 12,
    width: "100%",
  },
});
