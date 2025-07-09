import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import React from "react";
import { useNavigation } from "@react-navigation/native";
import {
  PDStackNavigationProp,
  PDStackParamList,
} from "../../../navigators/stacks/AcademyStack/ProgressDetailStack/types";
import ScreenView from "../../../components/ScreenView";
import CustomScrollView from "../../../components/CustomScrollView";
import { theme } from "../../../Theme/tokens";
import Icon from "react-native-vector-icons/FontAwesome5";
import { parseTextStyle } from "../../../util/functions/parseStyles";
import MoodSummary from "./components/MoodSummary";
import DPSummary from "./components/DPSummary";
import DetailedWeeklySummary from "./components/DetailedWeeklySummary";
import Achievements from "./components/Achievements";
import TutStats from "./components/TutStats";

const ProgressDetail = () => {
  const navigation =
    useNavigation<PDStackNavigationProp<keyof PDStackParamList>>();

  return (
    <ScreenView style={styles.screenView}>
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.topNavigation}
          onPress={() => navigation.goBack()}
        >
          <Icon
            name="chevron-left"
            size={16}
            color={theme.colors.text.default}
          />
          <Text style={styles.topNavigationText}>Progress Report</Text>
        </TouchableOpacity>
        <CustomScrollView contentContainerStyle={styles.scrollView}>
          <DetailedWeeklySummary />
          <DPSummary />
          <Achievements />
          <TutStats />
          <MoodSummary />
        </CustomScrollView>
      </View>
    </ScreenView>
  );
};

export default ProgressDetail;

const styles = StyleSheet.create({
  screenView: {
    paddingBottom: 0,
  },
  container: {
    gap: 32,
    flex: 1,
  },
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
    gap: 16,
    paddingVertical: 16,
  },
});
