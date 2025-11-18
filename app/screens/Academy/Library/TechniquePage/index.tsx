import { StyleSheet, Text, TouchableOpacity, View, Alert } from "react-native";
import React, { useEffect, useState } from "react";
import ScreenView from "../../../../components/ScreenView";
import CustomScrollView from "../../../../components/CustomScrollView";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import {
  LibStackNavigationProp,
  LibStackParamList,
} from "../../../../navigators/stacks/AcademyStack/LibraryStack/types";
import { theme } from "../../../../Theme/tokens";
import { parseTextStyle } from "../../../../util/functions/parseStyles";
import Icon from "react-native-vector-icons/FontAwesome5";
import PageStepper from "./components/PageStepper";
import TutorialPage from "./TutorialPage";
import PracticePage from "./PracticePage";
import QuizPage from "./QuizPage";
import BottomSheetModal from "../../../../components/BottomSheetModal";
import { useUserStore } from "../../../../stores/user";

const TechniquePage = () => {
  const { user } = useUserStore();
  const navigation =
    useNavigation<LibStackNavigationProp<keyof LibStackParamList>>();

  const route = useRoute<RouteProp<LibStackParamList, "TechniquePage">>();

  // @ts-ignore
  const {
    techniqueId,
    techniqueName,
    techniqueDesc,
    techniqueLevel,
    stage,
    hasFree,
  } = route.params;

  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Logic: Access is granted if user is paid OR the specific technique is marked free
  const isContentAccessible = user?.isPaid || hasFree;

  const closeModal = () => setIsModalVisible(false);

  // 1. The main handler strictly expects a number
  const handleStepChange = (index: number) => {
    if (index > 0 && !isContentAccessible) {
      Alert.alert(
        "Premium Content",
        "Upgrade to Premium to access Practice sessions and Quizzes.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Upgrade",
            onPress: () => navigation.navigate("PaymentStack"),
          },
        ]
      );
      return;
    }
    setActiveStageIndex(index);
  };

  // 2. Helper to unwrap "SetStateAction" (value or function) coming from children
  const handleChildStageChange = (value: React.SetStateAction<number>) => {
    // If the child passes a function (e.g., prev => prev + 1), resolve it
    const index =
      typeof value === "function"
        ? (value as (prev: number) => number)(activeStageIndex)
        : value;

    handleStepChange(index);
  };

  // 3. Update RenderPage to use the helper
  const RenderPage =
    activeStageIndex === 0 ? (
      <TutorialPage
        setActiveStageIndex={handleChildStageChange} // FIXED
        techniqueId={techniqueId}
      />
    ) : activeStageIndex === 1 && isContentAccessible ? (
      <PracticePage
        setActiveStageIndex={handleChildStageChange} // FIXED
        techniqueId={techniqueId}
      />
    ) : activeStageIndex === 2 && isContentAccessible ? (
      <QuizPage techniqueId={techniqueId} techniqueName={techniqueName} />
    ) : null;

  useEffect(() => {
    if (stage === "TUTORIAL") {
      setActiveStageIndex(0);
    } else if (stage === "EXERCISE") {
      if (isContentAccessible) {
        setActiveStageIndex(1);
      } else {
        setActiveStageIndex(0);
      }
    }
  }, [stage, isContentAccessible]);

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
              {
                label: "Tutorial",
                icon: "play",
              },
              {
                label: "Exercise",
                icon: isContentAccessible ? "microphone" : "lock",
              },
              {
                label: "Quiz",
                icon: isContentAccessible ? "check" : "lock",
              },
            ]}
            currentStepIndex={activeStageIndex}
            onStepChange={handleStepChange}
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
    flex: 1,
    flexDirection: "column",
    gap: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContainer2: {
    gap: 16,
    alignItems: "center",
  },
});
