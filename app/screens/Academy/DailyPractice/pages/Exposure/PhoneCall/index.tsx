import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
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
import {
  ExposurePracticeType,
  PhoneCallScenario,
} from "../../../../../../api/dailyPractice/types";
import { triggerToast } from "../../../../../../util/functions/toast";
import axios from "axios";

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
              <Text style={styles.topNavigationText}>AI Phone Calls</Text>
            </TouchableOpacity>
          </View>
          <CustomScrollView contentContainerStyle={styles.scrollContainer}>
            {selectedScenario && (
              <ScenarioCard
                onToggle={() => setIsModalVisible(true)}
                selectedScenario={selectedScenario}
              />
            )}
          </CustomScrollView>
          {user && (
            <View style={styles.footerView}>
              <CallingWidget
                userId={user.id}
                //websocketUrl={"wss://api.speechworks.in"}
                websocketUrl="ws://192.168.1.8:3000"
                //websocketUrl="ws://localhost:3000"
                scenarioId={selectedScenario?.id}
              />
            </View>
          )}
        </View>
      </ScreenView>

      <BottomSheetModal
        visible={isModalVisible}
        onClose={closeModal}
        maxHeight="80%"
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
      </BottomSheetModal>
    </>
  );
};

export default PhoneCall;

const styles = StyleSheet.create({
  screenView: {
    paddingBottom: 0,
  },
  container: {
    flex: 1,
    gap: 32,
  },
  scrollContainer: {
    gap: 32,
    padding: SHADOW_BUFFER,
    flexGrow: 1,
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
  footerView: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: SHADOW_BUFFER,
  },
  modalContent: {
    paddingVertical: 24,
    width: "100%",
    flex: 1,
    flexDirection: "column",
    gap: 32,
  },
  modalTitleContainer: {
    gap: 12,
    alignItems: "center",
  },
  modalTitleText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },
  modalDescText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
  modalScrollView: {
    flex: 1,
    padding: 4,
  },
  modalScrollContainer: {
    gap: 16,
    alignItems: "center",
    paddingBottom: 32,
  },
  scenarioCard: {
    width: "100%",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: theme.colors.surface.elevated,
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  selectedScenarioCard: {
    backgroundColor: theme.colors.actionPrimary.default,
  },
  selectedCardText: {
    color: theme.colors.text.onDark,
  },
  scenarioIconContainer: {
    height: 40,
    width: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: theme.colors.surface.default,
  },
  scenarioDescContainer: {
    gap: 4,
    flexShrink: 1,
  },
  scenarioNameText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
    fontWeight: "600",
  },
  scenarioDetailText: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: theme.colors.text.default,
  },
});
