import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React, { useEffect, useState } from "react";
import ScreenView from "../../../../components/ScreenView";
import CustomScrollView from "../../../../components/CustomScrollView";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import {
  LibStackNavigationProp,
  LibStackParamList,
} from "../../../../navigators/stacks/AcademyStack/LibraryStack/types";
import { theme } from "../../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../util/functions/parseStyles";
import Icon from "react-native-vector-icons/FontAwesome5";
import PageStepper from "./components/PageStepper";
import TutorialPage from "./TutorialPage";
import PracticePage from "./PracticePage";
import QuizPage from "./QuizPage";
import BottomSheetModal from "../../../../components/BottomSheetModal";

const TechniquePage = () => {
  const navigation =
    useNavigation<LibStackNavigationProp<keyof LibStackParamList>>();

  const route = useRoute<RouteProp<LibStackParamList, "TechniquePage">>();
  const { techniqueId, techniqueName, techniqueDesc, techniqueLevel, stage } =
    route.params;
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const RenderPage =
    activeStageIndex === 0 ? (
      <TutorialPage
        setActiveStageIndex={setActiveStageIndex}
        techniqueId={techniqueId}
      />
    ) : activeStageIndex === 1 ? (
      <PracticePage
        setActiveStageIndex={setActiveStageIndex}
        techniqueId={techniqueId}
      />
    ) : activeStageIndex === 2 ? (
      <QuizPage techniqueId={techniqueId} techniqueName={techniqueName} />
    ) : null;

  const closeModal = () => setIsModalVisible(false);

  useEffect(() => {
    if (stage === "TUTORIAL") {
      setActiveStageIndex(0);
    } else if (stage === "EXERCISE") {
      setActiveStageIndex(1);
    }
  }, [stage]);

  return (
    <>
      <ScreenView style={styles.screenView}>
        <View style={styles.container}>
          <View style={styles.topNavigationContainer}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.topNavigation}
            >
              <Icon
                name="chevron-left"
                size={16}
                color={theme.colors.text.default}
              />
              <Text style={styles.topNavigationText}>{techniqueName}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setIsModalVisible((old) => !old);
              }}
            >
              <Icon
                name="question-circle"
                size={16}
                color={theme.colors.text.default}
              />
            </TouchableOpacity>
          </View>
          <PageStepper
            steps={[
              { label: "Tutorial", icon: "play" },
              { label: "Exercise", icon: "microphone" },
              { label: "Quiz", icon: "check" },
            ]}
            currentStepIndex={activeStageIndex}
            onStepChange={(index) => setActiveStageIndex(index)}
          />
          <CustomScrollView>{RenderPage}</CustomScrollView>
        </View>
      </ScreenView>
      <BottomSheetModal
        visible={isModalVisible}
        onClose={closeModal}
        maxHeight="50%"
      >
        <View style={styles.modalContent}>
          <View style={styles.modalTitleContainer}>
            <Text style={styles.modalTiteText}>{techniqueName}</Text>
          </View>

          <CustomScrollView
            style={styles.scrollView}
            nestedScrollEnabled={true}
            contentContainerStyle={styles.scrollContainer2}
          >
            <Text style={styles.modalDescText}>{techniqueDesc}</Text>
          </CustomScrollView>
        </View>
      </BottomSheetModal>
    </>
  );
};

export default TechniquePage;

const styles = StyleSheet.create({
  screenView: {
    paddingBottom: 0,
  },
  container: {
    gap: 32,
    flex: 1,
  },
  innerContainer: {
    gap: 16,
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
  videoContainer: {
    height: 420,
    width: "100%",
    borderRadius: 16,
    backgroundColor: theme.colors.background.default,
    position: "relative",
  },
  videoMeta: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    padding: 16,
    backgroundColor: "black",
    opacity: 0.6,
    borderBottomEndRadius: 16,
    borderBottomStartRadius: 16,
  },
  videoMetaTitleText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.onDark,
  },
  videoMetaDescText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
  learningPathContainer: {
    padding: 16,
    gap: 16,
    borderRadius: 12,
    backgroundColor: theme.colors.background.default,
  },
  learningPathTitleText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
  },
  learningPathObjectives: {
    gap: 12,
  },
  objective: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  objectiveText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },

  // modal
  modalTitleContainer: {
    gap: 12,
    alignItems: "center",
  },
  modalTiteText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },
  modalDescText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
  modalContent: {
    paddingVertical: 24,
    width: "100%",
    flex: 1, // ← valid because the parent Animated.View has a fixed height
    flexDirection: "column",
    gap: 32,
  },
  scrollView: {
    flex: 1, // ← forces ScrollView to fill all vertical space under the title
  },
  scrollContainer2: {
    gap: 16,
    alignItems: "center",
    // NO flex:1 here—let content size itself
  },
});
