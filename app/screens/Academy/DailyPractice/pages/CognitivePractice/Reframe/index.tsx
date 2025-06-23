import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React, { useEffect, useState } from "react";
import ScreenView from "../../../../../../components/ScreenView";
import Icon from "react-native-vector-icons/FontAwesome5";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../../util/functions/parseStyles";
import { theme } from "../../../../../../Theme/tokens";
import { useNavigation } from "@react-navigation/native";
import {
  CDPStackNavigationProp,
  CDPStackParamList,
} from "../../../../../../navigators/stacks/AcademyStack/DailyPracticeStack/CognitivePracticeStack/types";
import CustomScrollView, {
  SHADOW_BUFFER,
} from "../../../../../../components/CustomScrollView";
import TextArea from "../../../../../../components/TextArea";
import Button from "../../../../../../components/Button";
import {
  AcademyStackNavigationProp,
  AcademyStackParamList,
} from "../../../../../../navigators/stacks/AcademyStack/types";
import { getCognitivePracticeByType } from "../../../../../../api/dailyPractice";
import {
  CognitivePracticeType,
  ReframingThoughtScenarioData,
} from "../../../../../../api/dailyPractice/types";
import { useActivityStore } from "../../../../../../stores/activity";
import { useSessionStore } from "../../../../../../stores/session";
import { createPracticeActivity } from "../../../../../../api";
import {
  completePracticeActivity,
  startPracticeActivity,
} from "../../../../../../api/practiceActivities";
import { PracticeActivityContentType } from "../../../../../../api/practiceActivities/types";
import DonePractice from "../../../components/DonePractice";

const Reframe = () => {
  const navigation =
    useNavigation<CDPStackNavigationProp<keyof CDPStackParamList>>();
  const academyNav =
    useNavigation<AcademyStackNavigationProp<keyof AcademyStackParamList>>();
  const [selectedReframe, setSelectedReframe] = React.useState<string | null>(
    null
  );
  const { updateActivity, addActivity, doesActivityExist } = useActivityStore();
  const { practiceSession } = useSessionStore();
  const [currentActivityId, setCurrentActivityId] = useState<string | null>(
    null
  );
  const [writtenReframe, setWrittenReframe] = React.useState<string>("");
  const [scenarios, setScenarios] = useState<ReframingThoughtScenarioData[]>(
    []
  );
  const [selectedScenarioIndex, setSelectedScenarioIndex] = useState<number>(0);
  const [cognitivePracticeId, setCognitivePracticeId] = useState<string | null>(
    null
  );
  const [isDone, setIsDone] = useState(false);

  const onBackPress = () => {
    navigation.goBack();
  };

  const toggleIndex = () => {
    if (scenarios && scenarios.length > 0) {
      setSelectedScenarioIndex(
        (prevIndex) => (prevIndex + 1) % scenarios.length
      );
    }
  };

  const markActivityStart = async () => {
    if (!practiceSession || !cognitivePracticeId) return;
    const newActivity = await createPracticeActivity({
      sessionId: practiceSession.id,
      contentType: PracticeActivityContentType.COGNITIVE_PRACTICE,
      contentId: cognitivePracticeId,
    });
    setCurrentActivityId(newActivity.id);
    const startedActivity = await startPracticeActivity({ id: newActivity.id });
    addActivity({
      ...startedActivity,
    });
  };

  const markActivityComplete = async () => {
    if (
      !practiceSession ||
      !currentActivityId ||
      !doesActivityExist(currentActivityId)
    )
      return;
    const completedActivity = await completePracticeActivity({
      id: currentActivityId,
    });
    updateActivity(currentActivityId, {
      ...completedActivity,
    });
  };

  // Fetch all reframe scenarios once on mount
  useEffect(() => {
    const fetchScenarios = async () => {
      const rs = await getCognitivePracticeByType(
        CognitivePracticeType.REFRAMING_THOUGHTS
      );
      setScenarios(rs[0].reframingThoughtsData?.scenarios || []);
      setCognitivePracticeId(rs[0]?.id || null);
    };
    fetchScenarios();
  }, []);

  return (
    <ScreenView style={styles.screenView}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.topNavigation} onPress={onBackPress}>
          <Icon
            name="chevron-left"
            size={16}
            color={theme.colors.text.default}
          />
          <Text style={styles.topNavigationText}>Reframe Thoughts</Text>
        </TouchableOpacity>
        <CustomScrollView contentContainerStyle={styles.scrollView}>
          <>
            {isDone ? (
              <DonePractice />
            ) : (
              <>
                <View style={styles.negativeContainer}>
                  <View style={styles.negativeTextContainer}>
                    <View style={styles.scenario}>
                      <Text style={styles.negativeTitleText}>
                        Current Negative Thought
                      </Text>
                      <TouchableOpacity onPress={toggleIndex}>
                        <Icon
                          name={"random"}
                          size={14}
                          color={theme.colors.actionPrimary.default}
                        />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.negativeBox}>
                      <Text style={styles.negativeText}>
                        {scenarios[selectedScenarioIndex]?.negativeThought}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.ideaContainer}>
                    <Icon
                      solid
                      size={14}
                      name="lightbulb"
                      color={theme.colors.library.orange[800]}
                    />
                    <Text style={styles.ideaText}>
                      Let's transform this thought into something more
                      empowering
                    </Text>
                  </View>
                </View>
                <View style={styles.positiveContainer}>
                  <Text style={styles.positiveTitleText}>
                    Choose a Positive Reframe
                  </Text>
                  <View style={styles.reframeListContainer}>
                    {scenarios[selectedScenarioIndex]?.reframedThoughts.map(
                      (item, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.reframeTextBox}
                          onPress={() => {
                            setSelectedReframe(item);
                          }}
                        >
                          <View
                            style={[
                              styles.selectIconContainer,
                              selectedReframe === item &&
                                styles.selectedIconContainer,
                            ]}
                          >
                            {selectedReframe === item && (
                              <Icon
                                solid
                                name="check"
                                size={12}
                                color={theme.colors.text.onDark}
                              />
                            )}
                          </View>
                          <Text style={styles.reframeText}>{item}</Text>
                        </TouchableOpacity>
                      )
                    )}
                  </View>
                  <View style={styles.writeContainer}>
                    <Text style={styles.writeTitleText}>
                      Write Your Own Reframe
                    </Text>
                    <View style={styles.textFieldContainer}>
                      <TextArea
                        value={writtenReframe}
                        onChangeText={setWrittenReframe}
                        placeholder="Type your positive perspective here..."
                        numberOfLines={5}
                        containerStyle={styles.textAreaContainer}
                        inputStyle={styles.textAreaInput}
                      />
                    </View>
                  </View>
                </View>
                <View style={styles.btnContainer}>
                  {(selectedReframe || writtenReframe.length > 0) && (
                    <Button
                      text="Submit"
                      onPress={async () => {
                        await markActivityStart();
                        await markActivityComplete();
                        setIsDone(true);
                      }}
                    />
                  )}
                  <Button
                    variant="ghost"
                    text="Home"
                    onPress={() => {
                      academyNav.navigate("Academy");
                    }}
                    style={{
                      backgroundColor: theme.colors.surface.elevated,
                      borderColor: "transparent",
                    }}
                  />
                </View>
              </>
            )}
          </>
        </CustomScrollView>
      </View>
    </ScreenView>
  );
};

export default Reframe;

const styles = StyleSheet.create({
  screenView: {
    paddingBottom: 0,
  },
  container: {
    gap: 32,
    flex: 1,
  },
  scrollContainer: { gap: 32 },
  topNavigation: {
    position: "relative",
    top: 0,
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
    gap: 32,
    padding: SHADOW_BUFFER,
  },
  negativeContainer: {
    padding: 24,
    gap: 16,
    backgroundColor: theme.colors.surface.elevated,
    borderRadius: 16,
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  scenario: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  negativeTextContainer: {
    gap: 12,
  },
  negativeTitleText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },
  negativeBox: {
    padding: 16,
    backgroundColor: theme.colors.surface.default,
    borderRadius: 16,
  },
  negativeText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
  },
  ideaContainer: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  ideaText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
  positiveContainer: {
    gap: 20,
  },
  positiveTitleText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },
  reframeListContainer: {
    gap: 16,
  },
  reframeTextBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: theme.colors.surface.elevated,
    borderRadius: 16,
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  reframeText: {
    flexShrink: 1,
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
  },
  selectIconContainer: {
    height: 24,
    width: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    justifyContent: "center",
    alignItems: "center",
  },
  selectedIconContainer: {
    backgroundColor: theme.colors.library.orange[400],
    borderColor: "transparent",
  },
  writeContainer: {
    padding: 24,
    gap: 12,
    borderRadius: 16,
    backgroundColor: theme.colors.surface.elevated,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
  },
  writeTitleText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },
  textFieldContainer: {
    display: "flex",
    flex: 1,
    borderRadius: 12,
    backgroundColor: theme.colors.background.default,
  },
  textAreaContainer: {
    flex: 1,
    backgroundColor: theme.colors.background.default,
  },
  textAreaInput: {
    minHeight: 50,
    backgroundColor: theme.colors.background.default,
    ...parseTextStyle(theme.typography.BodySmall),
  },

  btnContainer: {
    gap: 12,
    paddingBottom: 32,
  },
});
