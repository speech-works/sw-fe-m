import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  Dimensions,
} from "react-native";
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
import BentoPathSelector from "./components/BentoPathSelector";
import TutorialPage from "./TutorialPage";
import PracticePage from "./PracticePage";
import QuizPage from "./QuizPage";
import BottomSheetModal from "../../../../components/BottomSheetModal";
import { useUserStore } from "../../../../stores/user";
import BgPattern_EtherealFlow from "../../../../assets/sw-bg/BgPattern_EtherealFlow";
import TherapistFace from "../../../../assets/sw-faces/TherapistFace";
import { LinearGradient } from "expo-linear-gradient";
import { TECHNIQUES_ENUM } from "../../../../api/library/types";

// Helper for Icon Mapping (Duplicated from Library/index.tsx for now - ideally refactor to shared)
const getIconForTechnique = (id: string): string => {
  // Simple mapping based on known IDs or structure
  // This relies on the groupings defined in Library/index.tsx
  // We'll do a quick check based on ID prefixes or known list
  // For robustness, we default to 'brain' if uncertain, or we could copy the full map.
  // Let's copy a simplified map for the main known techniques.
  const ID = id as TECHNIQUES_ENUM;

  if ([TECHNIQUES_ENUM.IDENTIFICATION].includes(ID)) return "brain"; // Understanding

  if (
    [
      TECHNIQUES_ENUM.CANCELLATIONS,
      TECHNIQUES_ENUM.PULL_OUTS,
      TECHNIQUES_ENUM.PREPARATORY_SETS,
      TECHNIQUES_ENUM.VOLUNTARY_STUTTERING,
    ].includes(ID)
  )
    return "tools"; // Modification

  if (
    [
      TECHNIQUES_ENUM.CONTINUOUS_PHONATION,
      TECHNIQUES_ENUM.EASY_ONSET,
      TECHNIQUES_ENUM.PASSIVE_AIRFLOW,
      TECHNIQUES_ENUM.PROLONGED_SPEECH,
      TECHNIQUES_ENUM.LIGHT_ARTICULATORY_CONTACT,
    ].includes(ID)
  )
    return "feather"; // Fluency

  if (
    [TECHNIQUES_ENUM.YAWN_SIGH_TECHNIQUE, TECHNIQUES_ENUM.GLOTTAL_FRY].includes(
      ID
    )
  )
    return "spa"; // Relaxation

  return "lightbulb"; // Default
};

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

  const isContentAccessible = user?.isPaid || hasFree;
  const closeModal = () => setIsModalVisible(false);

  // Icon for this technique
  const techniqueIcon = getIconForTechnique(techniqueId);

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
        {/* Full-Screen Premium Gradient */}
        <LinearGradient
          colors={["#FFFCF9", "#FFF7ED", "#F5F7FA"]}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        {/* Dynamic Background Watermark */}
        <View style={styles.watermarkContainer} pointerEvents="none">
          <Icon
            name={techniqueIcon}
            size={240}
            color={theme.colors.library.orange[200]}
            style={{ opacity: 0.15, transform: [{ rotate: "-20deg" }] }}
          />
        </View>

        <View style={styles.container}>
          {/* Header */}
          <View style={styles.topNavigationContainer}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Icon
                name="chevron-left"
                size={16}
                color={theme.colors.text.title}
              />
            </TouchableOpacity>

            <Text style={styles.headerTitle} numberOfLines={1}>
              {techniqueName}
            </Text>

            <TouchableOpacity
              style={styles.infoButton}
              onPress={() => setIsModalVisible(true)}
            >
              <Icon
                name="question"
                size={14}
                color={theme.colors.library.orange[500]}
              />
            </TouchableOpacity>
          </View>

          {/* Stepper (Navigation) - Floating Bento Path */}
          <View style={styles.stepperContainer}>
            <BentoPathSelector
              steps={[
                {
                  label: "Learn",
                  icon: "play",
                  disabled: false,
                  colorStart: "#F97316", // Orange 500
                  colorEnd: "#EA580C", // Orange 600
                },
                {
                  label: "Practice",
                  icon: "dumbbell",
                  disabled: !isContentAccessible,
                  colorStart: "#06B6D4", // Cyan 500
                  colorEnd: "#0891B2", // Cyan 600
                },
                {
                  label: "Test",
                  icon: "brain",
                  disabled: !isContentAccessible,
                  colorStart: "#10B981", // Emerald 500
                  colorEnd: "#059669", // Emerald 600
                },
              ]}
              currentStepIndex={activeStageIndex}
              onStepChange={handleStepChange}
            />
          </View>

          {/* Main Content - Glassmorphic Card */}
          <View style={styles.glassContentContainer}>
            {/* 
                We removed CustomScrollView here because PracticePage needs to manage its own scrolling 
                for the sticky footer to work. Child pages (Tutorial, Quiz) must now wrap themselves 
                in ScrollView/CustomScrollView if they need scrolling.
            */}
            {RenderPage}
          </View>
        </View>
      </ScreenView>

      {/* Info Modal */}
      <BottomSheetModal
        visible={isModalVisible}
        onClose={closeModal}
        // maxHeight="50%" // Removed to allow auto-height
      >
        {/* Reusing Premium Style for Info Modal as well */}
        <LinearGradient
          colors={["#FFFCF9", "#FFF7ED"]}
          style={styles.modalGradientContainer}
        >
          {/* Watermark */}
          <View style={styles.modalWatermark} pointerEvents="none">
            <Icon
              name="question-circle"
              size={180}
              color={theme.colors.library.orange[200]}
              style={{ opacity: 0.15, transform: [{ rotate: "15deg" }] }}
            />
          </View>

          {/* Icon Bubble */}
          <View style={styles.modalIconBubble}>
            <Icon
              name={techniqueIcon}
              size={32}
              color={theme.colors.library.orange[500]}
            />
          </View>

          <View style={styles.modalTitleContainer}>
            <Text style={styles.modalTiteText}>{techniqueName}</Text>
          </View>

          <Text style={styles.modalDescText}>{techniqueDesc}</Text>

          <TouchableOpacity
            onPress={closeModal}
            style={styles.modalCloseButton}
          >
            <Text style={styles.modalCloseButtonText}>Dismiss</Text>
          </TouchableOpacity>
        </LinearGradient>
      </BottomSheetModal>
    </>
  );
};

export default TechniquePage;

const styles = StyleSheet.create({
  screenView: {
    paddingBottom: 0,
    backgroundColor: "transparent", // Allow gradient to show
  },
  watermarkContainer: {
    position: "absolute",
    right: -60,
    top: 100,
    zIndex: -1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16, // Adjust for header
    gap: 16,
  },
  // Header
  topNavigationContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.7)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  headerTitle: {
    ...parseTextStyle(theme.typography.Heading2), // Larger premium title
    color: theme.colors.text.title,
    textAlign: "center",
    flex: 1,
    fontSize: 20, // Override if Heading2 is too big for title bar
    fontWeight: "700",
  },
  infoButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,247,237,0.8)", // Orange tint
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.library.orange[200],
  },

  // Stepper
  stepperContainer: {
    // We might want to style the stepper background itself or leave it to the component
  },

  // Content
  glassContentContainer: {
    flex: 1,
    borderRadius: 24,
    overflow: "hidden", // Clip content to radius
  },
  scrollContent: {
    padding: 2, // internal padding
    flexGrow: 1,
  },

  // Modal Styles (Premium)
  modalGradientContainer: {
    padding: 32,
    alignItems: "center",
    paddingBottom: 48,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    position: "relative",
    overflow: "hidden",
  },
  modalWatermark: {
    position: "absolute",
    left: -50,
    top: -30,
    zIndex: 0,
  },
  modalIconBubble: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: theme.colors.library.orange[300],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 1,
  },
  modalTitleContainer: {
    marginBottom: 16,
    zIndex: 1,
  },
  modalTiteText: {
    ...parseTextStyle(theme.typography.Heading2),
    color: "#111827",
    textAlign: "center",
    fontSize: 24,
  },
  modalDescText: {
    ...parseTextStyle(theme.typography.Body),
    color: "#4B5563",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
    zIndex: 1,
  },
  modalCloseButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 20,
    backgroundColor: theme.colors.library.orange[100],
    zIndex: 1,
  },
  modalCloseButtonText: {
    ...parseTextStyle(theme.typography.Button),
    color: theme.colors.library.orange[600],
    fontWeight: "700",
  },
});
