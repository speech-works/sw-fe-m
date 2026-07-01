import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import TherapistFace from "../../../../assets/sw-faces/TherapistFace";
import BottomSheetModal from "../../../../components/BottomSheetModal";
import {
  LibStackNavigationProp,
  LibStackParamList,
} from "../../../../navigators/stacks/ExploreStack/LibraryStack/types";
import { useUserStore } from "../../../../stores/user";
import {
  Page,
  Text,
  Button,
  IconButton,
  Divider,
  useTheme,
  spacing,
  radius,
} from "../../../../design-system";
import BentoPathSelector from "./components/BentoPathSelector";
import PracticePage from "./PracticePage";
import QuizPage from "./QuizPage";
import TutorialPage from "./TutorialPage";

const TechniquePage = () => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useUserStore();
  const navigation =
    useNavigation<LibStackNavigationProp<keyof LibStackParamList>>();

  const route = useRoute<RouteProp<LibStackParamList, "TechniquePage">>();

  const { techniqueId, techniqueName, techniqueDesc, stage, hasFree, from } =
    route.params;

  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const isContentAccessible = user?.isPaid || hasFree;
  const closeModal = () => setIsModalVisible(false);

  const handleStepChange = (index: number) => {
    if (index > 0 && !isContentAccessible) {
      return;
    }
    setActiveStageIndex(index);
  };

  const handleChildStageChange = (value: React.SetStateAction<number>) => {
    const index =
      typeof value === "function"
        ? (value as (prev: number) => number)(activeStageIndex)
        : value;

    handleStepChange(index);
  };

  const RenderPage =
    activeStageIndex === 0 ? (
      <TutorialPage
        setActiveStageIndex={handleChildStageChange}
        techniqueId={techniqueId}
      />
    ) : activeStageIndex === 1 && isContentAccessible ? (
      <PracticePage
        setActiveStageIndex={handleChildStageChange}
        techniqueId={techniqueId}
      />
    ) : activeStageIndex === 2 && isContentAccessible ? (
      <QuizPage
        techniqueId={techniqueId}
        techniqueName={techniqueName}
        from={from}
      />
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
      <Page
        title={techniqueName}
        onBack={() =>
          from === "MOOD_CHECK"
            ? navigation.navigate("Root" as any, { screen: "HOME" })
            : navigation.navigate("Library", { from })
        }
        right={
          <IconButton
            name="info"
            onPress={() => setIsModalVisible(true)}
          />
        }
        scroll={false}
        contentGap={spacing.lg}
      >
        {/* Stepper (Navigation) — dark tab bar */}
        <BentoPathSelector
          steps={[
            {
              label: "Learn",
              icon: "play",
              disabled: false,
            },
            {
              label: "Practice",
              icon: "mic-vocal",
              disabled: !isContentAccessible,
            },
            {
              label: "Test",
              icon: "square-check",
              disabled: !isContentAccessible,
            },
          ]}
          currentStepIndex={activeStageIndex}
          onStepChange={handleStepChange}
        />

        {/* Main Content — child pages own their own scroll/dock. */}
        <View style={styles.contentContainer}>{RenderPage}</View>
      </Page>

      {/* Info Modal (dark) */}
      <BottomSheetModal
        visible={isModalVisible}
        onClose={closeModal}
        showCloseButton={true}
        fitContent={true}
        backgroundColor={colors.surface.default}
      >
        <View
          style={[
            styles.modalContent,
            { paddingBottom: Math.max(insets.bottom, spacing["2xl"]) },
          ]}
        >
          {/* Therapist Face */}
          <View style={styles.modalFaceContainer}>
            <TherapistFace width={120} height={120} />
          </View>

          <Text variant="h2" color="primary" center style={styles.modalTitle}>
            {techniqueName}
          </Text>

          <View style={styles.modalDivider}>
            <Divider />
          </View>

          <Text variant="body" color="secondary" center style={styles.modalDesc}>
            {techniqueDesc}
          </Text>

          <Button
            label="Dismiss"
            onPress={closeModal}
            style={styles.modalButton}
          />
        </View>
      </BottomSheetModal>
    </>
  );
};

export default TechniquePage;

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    borderRadius: radius.card,
    overflow: "hidden",
  },
  // Info sheet content
  modalContent: {
    padding: spacing["3xl"],
    alignItems: "center",
  },
  modalFaceContainer: {
    marginBottom: spacing.xl,
  },
  modalTitle: {
    marginBottom: spacing.lg,
  },
  modalDivider: {
    width: 60,
    marginBottom: spacing.xl,
  },
  modalDesc: {
    lineHeight: 24,
    marginBottom: spacing["3xl"],
  },
  modalButton: {
    width: "100%",
    maxWidth: 280,
  },
});
