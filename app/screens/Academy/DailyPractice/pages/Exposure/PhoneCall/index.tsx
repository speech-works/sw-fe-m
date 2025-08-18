import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React from "react";
import { useNavigation } from "@react-navigation/native";
import {
  PhoneCallEDPStackNavigationProp,
  PhoneCallEDPStackParamList,
} from "../../../../../../navigators/stacks/AcademyStack/DailyPracticeStack/ExposureStack/PhoneCallStack/types";
import ScreenView from "../../../../../../components/ScreenView";
import CustomScrollView, {
  SHADOW_BUFFER,
} from "../../../../../../components/CustomScrollView";
import { parseTextStyle } from "../../../../../../util/functions/parseStyles";
import { theme } from "../../../../../../Theme/tokens";
import Icon from "react-native-vector-icons/FontAwesome5";
import ScenarioCard from "./components/ScenarioCard";
import {
  DifficultyLevel,
  ExposurePracticeType,
} from "../../../../../../api/dailyPractice/types";
import { useUserStore } from "../../../../../../stores/user";
import CallingWidget from "../../../../../../components/CallingWidget";

const PhoneCall = () => {
  const navigation =
    useNavigation<
      PhoneCallEDPStackNavigationProp<keyof PhoneCallEDPStackParamList>
    >();
  const { user } = useUserStore();
  return (
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
          <ScenarioCard
            onToggle={() => {}}
            selectedScenario={{
              id: "1",
              type: ExposurePracticeType.PHONE_CALL_SIMULATION,
              name: "Order a pizza",
              description: "Call Dominos and order a pizza for yourself",
              difficulty: DifficultyLevel.MEDIUM,
            }}
          />
        </CustomScrollView>
        {/* Move CallingWidget outside CustomScrollView if it should always be visible at the bottom */}
        {user && (
          <View style={styles.footerView}>
            <CallingWidget
              userId={user.id}
              websocketUrl={"ws://192.168.1.48:3000"}
            />
          </View>
        )}
      </View>
    </ScreenView>
  );
};

export default PhoneCall;

const styles = StyleSheet.create({
  screenView: {
    paddingBottom: 0,
  },
  container: {
    flex: 1, // This is crucial for the footer to position itself at the bottom
    gap: 32,
  },
  scrollContainer: {
    gap: 32,
    padding: SHADOW_BUFFER,
    flexGrow: 1, // Allows CustomScrollView to take available space
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
    padding: SHADOW_BUFFER, // Add some padding similar to your scrollContainer
    backgroundColor: theme.colors.background.default, // Or whatever background color your screen has
  },
});
