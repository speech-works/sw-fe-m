import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import {
  PhoneCallEDPStackNavigationProp,
  PhoneCallEDPStackParamList,
} from "../../../../../../navigators/stacks/AcademyStack/DailyPracticeStack/ExposureStack/PhoneCallStack/types";
import ScreenView from "../../../../../../components/ScreenView";
import CustomScrollView, {
  SHADOW_BUFFER,
} from "../../../../../../components/CustomScrollView";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../../util/functions/parseStyles";
import { theme } from "../../../../../../Theme/tokens";
import Icon from "react-native-vector-icons/FontAwesome5";
import ScenarioCard from "./components/ScenarioCard";
import { useUserStore } from "../../../../../../stores/user";
import CallingWidget from "../../../../../../components/CallingWidget";
import BottomSheetModal from "../../../../../../components/BottomSheetModal";
import { getPhoneCallScenarios } from "../../../../../../api/dailyPractice";
import { PhoneCallScenario } from "../../../../../../api/dailyPractice/types";
import { triggerToast } from "../../../../../../util/functions/toast";
import axios from "axios";
const RINGING_SOUND_FILE = require("../../../../../../assets/sounds/ringback-tone.wav");

const PhoneCall = () => {
  const navigation =
    useNavigation<
      PhoneCallEDPStackNavigationProp<keyof PhoneCallEDPStackParamList>
    >();
  const { user } = useUserStore();

  const [scenarioData, setScenarioData] = useState<PhoneCallScenario[]>([]); // Placeholder for scenario data
  // State for the currently selected scenario, initialized with the first item
  const [selectedScenario, setSelectedScenario] = useState<PhoneCallScenario>();

  // State for bottom sheet visibility
  const [isModalVisible, setIsModalVisible] = useState(false);
  const closeModal = () => setIsModalVisible(false);

  useEffect(() => {
    const fetchScenarios = async () => {
      try {
        const data = await getPhoneCallScenarios();

        setScenarioData(data);
        if (data.length > 0) {
          setSelectedScenario(data[0]);
        }
      } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
          triggerToast(
            "error",
            "Try Later",
            error.response.data.error ||
              "An error occurred while fetching call scenarios."
          );
        }
      }
    };
    fetchScenarios();
  }, []);

  return (
    <>
      <View style={styles.container}>
        <LinearGradient
          colors={["#020617", "#1e1b4b", "#2e1065"] as const} // Deep Slate -> Indigo -> Violet
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Safe Area Top Layout */}
        <View style={styles.topHeader}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButtonGlass}
          >
            <Icon name="chevron-left" size={14} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerTextContainer}
            onPress={() => setIsModalVisible(true)}
          >
            <Text style={styles.headerTitleModern}>AI Conversation</Text>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Text style={styles.headerSubtitleModern}>
                {selectedScenario?.name || "Select Scenario"}
              </Text>
              <Icon
                name="caret-down"
                size={12}
                color="rgba(255,255,255,0.7)"
                style={{ marginTop: 4 }}
              />
            </View>
          </TouchableOpacity>
          {/* Placeholder for settings/tips or balance */}
          <View style={{ width: 40 }} />
        </View>

        {/* Main Calling UI Place */}
        <View style={styles.mainContent}>
          {user && (
            <CallingWidget
              key={selectedScenario?.id}
              userId={user.id}
              websocketUrl="ws://192.168.1.9:3000"
              scenarioId={selectedScenario?.id}
              scenarioIcon={selectedScenario?.icon || "robot"}
              agentName={selectedScenario?.agent.name || "AI Agent"}
              agentDesignation={
                selectedScenario?.agent.designation || "Assistant"
              }
              ringtoneAsset={RINGING_SOUND_FILE}
              // We will add new props for styling later if needed,
              // but for now CallingWidget needs to be refactored to fit this container
            />
          )}
        </View>
      </View>

      <BottomSheetModal
        visible={isModalVisible}
        onClose={closeModal}
        maxHeight="80%"
      >
        <LinearGradient
          colors={["#0f172a", "#1e1b4b", "#2e1065"] as const}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ flex: 1, width: "100%" }}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalTitleContainer}>
              <Text style={styles.modalTitleText}>Practice Scenarios</Text>
              <Text style={styles.modalDescText}>
                Select a scenario to practice
              </Text>
            </View>

            <CustomScrollView
              style={styles.modalScrollView}
              nestedScrollEnabled={true}
              contentContainerStyle={styles.modalScrollContainer}
            >
              {scenarioData.map((scenario, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.scenarioCard,
                    selectedScenario?.id === scenario.id &&
                      styles.selectedScenarioCard,
                  ]}
                  onPress={() => {
                    setSelectedScenario(scenario);
                    closeModal();
                  }}
                >
                  <View style={styles.scenarioIconContainer}>
                    <Icon
                      solid
                      name={scenario.icon}
                      size={24}
                      color={theme.colors.actionPrimary.default}
                    />
                  </View>
                  <View style={styles.scenarioDescContainer}>
                    <Text
                      style={[
                        styles.scenarioNameText,
                        selectedScenario?.id === scenario.id &&
                          styles.selectedCardText,
                      ]}
                    >
                      {scenario.name}
                    </Text>
                    <Text
                      style={[
                        styles.scenarioDetailText,
                        selectedScenario?.id === scenario.id &&
                          styles.selectedCardText,
                      ]}
                    >
                      {scenario.description}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </CustomScrollView>
          </View>
        </LinearGradient>
      </BottomSheetModal>
    </>
  );
};

export default PhoneCall;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60, // Adjust for safe area approximately
    paddingBottom: 20,
    zIndex: 10,
  },
  backButtonGlass: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)", // Glass effect
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  headerTextContainer: {
    alignItems: "center",
  },
  headerTitleModern: {
    fontFamily: "Outfit-Medium", // Assuming font exists, based on other files
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  headerSubtitleModern: {
    fontFamily: "Outfit-Bold",
    color: "#FFFFFF",
    fontSize: 16,
    marginTop: 4,
  },
  mainContent: {
    flex: 1,
    position: "relative",
  },

  // Modal Styles (kept largely same)
  // Modal Styles (Updated for Futuristic Theme)
  modalContent: {
    paddingVertical: 24,
    width: "100%",
    flex: 1,
    flexDirection: "column",
    gap: 32,
    backgroundColor: "#0f172a", // Fallback
  },
  modalTitleContainer: {
    gap: 12,
    alignItems: "center",
  },
  modalTitleText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: "#FFFFFF",
    fontSize: 22,
    letterSpacing: 1,
  },
  modalDescText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "rgba(255,255,255,0.6)",
  },
  modalScrollView: {
    flex: 1,
    padding: 4,
  },
  modalScrollContainer: {
    gap: 16,
    alignItems: "center",
    paddingBottom: 32,
    paddingHorizontal: 16,
  },
  scenarioCard: {
    width: "100%",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: "rgba(255,255,255,0.05)", // Glass effect
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  selectedScenarioCard: {
    backgroundColor: "rgba(56, 189, 248, 0.15)", // Sky blue tint
    borderColor: theme.colors.actionPrimary.default,
  },
  selectedCardText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  scenarioIconContainer: {
    height: 44,
    width: 44,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  scenarioDescContainer: {
    gap: 4,
    flexShrink: 1,
  },
  scenarioNameText: {
    ...parseTextStyle(theme.typography.Body),
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
  scenarioDetailText: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: "rgba(255,255,255,0.5)",
  },
});
