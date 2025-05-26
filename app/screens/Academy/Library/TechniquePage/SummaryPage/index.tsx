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
import CustomScrollView from "../../../../../components/CustomScrollView";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../util/functions/parseStyles";
import Button from "../../../../../components/Button";

const SummaryPage = () => {
  const navigation =
    useNavigation<LibStackNavigationProp<keyof LibStackParamList>>();
  const route = useRoute<RouteProp<LibStackParamList, "SummaryPage">>();
  const { techniqueId, techniqueName } = route.params;
  return (
    <ScreenView style={styles.screenView}>
      <View style={styles.container}>
        <View style={styles.topNavigationContainer}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.topNavigation}
          >
            <Icon name="arrow-left" />
            <Text style={styles.topNavigationText}>{techniqueName}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => {}}>
            <Icon
              name="question-circle"
              size={16}
              color={theme.colors.text.default}
            />
          </TouchableOpacity>
        </View>

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
            <View style={styles.questCard}>
              <View style={styles.metaRow}>
                <Text style={styles.labelText}>Question 1</Text>
                <View style={styles.resultContainer}>
                  <Icon
                    solid
                    name="check-circle"
                    color={theme.colors.library.green[400]}
                    size={16}
                  />
                  <Text style={styles.resultText}>Correct</Text>
                </View>
              </View>
              <Text style={styles.questionText}>
                What is the main purpose of the {techniqueName} technique?
              </Text>
              <View style={styles.ansRow}>
                <Icon
                  name="check"
                  size={16}
                  color={theme.colors.library.green[400]}
                />
                <Text style={styles.ansText}>
                  To modify the moment of stuttering
                </Text>
              </View>
            </View>
            <View style={styles.questCard}>
              <View style={styles.metaRow}>
                <Text style={styles.labelText}>Question 2</Text>
                <View style={styles.resultContainer}>
                  <Icon
                    solid
                    name="times-circle"
                    color={theme.colors.library.red[400]}
                    size={16}
                  />
                  <Text style={styles.resultTextErr}>Incorrect</Text>
                </View>
              </View>
              <Text style={styles.questionText}>
                When should you begin the {techniqueName} movement?
              </Text>
              <View style={[styles.ansRow, styles.ansRowErr]}>
                <Icon
                  name="times"
                  size={16}
                  color={theme.colors.library.red[400]}
                />
                <Text style={[styles.ansText, styles.ansTextErr]}>
                  After completing the word
                </Text>
              </View>
              <View style={styles.ansRow}>
                <Icon
                  name="check"
                  size={16}
                  color={theme.colors.library.green[400]}
                />
                <Text style={styles.ansText}>
                  As soon as you feel tension building
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.btnContainer}>
            <Button text="Practice Again" onPress={() => {}} elevation={1} />
            <Button
              variant="ghost"
              text="Back to Library"
              onPress={() => {}}
              elevation={1}
              style={{
                backgroundColor: theme.colors.surface.elevated,
                borderColor: "transparent",
              }}
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
    //alignItems: "center",
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
  },
  ansTextErr: {
    color: theme.colors.library.red[400],
  },
  btnContainer: {
    gap: 12,
    width: "100%",
  },
});
