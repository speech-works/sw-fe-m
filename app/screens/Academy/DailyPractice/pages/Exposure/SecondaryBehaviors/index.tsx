import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React from "react";
import ScreenView from "../../../../../../components/ScreenView";
import CustomScrollView, {
  SHADOW_BUFFER,
} from "../../../../../../components/CustomScrollView";
import { theme } from "../../../../../../Theme/tokens";
import Icon from "react-native-vector-icons/FontAwesome5";
import {
  SBEDPStackParamList,
  SBEDPStackNavigationProp,
} from "../../../../../../navigators/stacks/AcademyStack/DailyPracticeStack/ExposureStack/SecondaryBehaviorsStack/types";
import { useNavigation } from "@react-navigation/native";
import { parseTextStyle } from "../../../../../../util/functions/parseStyles";

const SecondaryBehaviors = () => {
  const navigation =
    useNavigation<SBEDPStackNavigationProp<keyof SBEDPStackParamList>>();
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
          <Text>Secondary Behaviors Screen</Text>
        </CustomScrollView>
      </View>
    </ScreenView>
  );
};

export default SecondaryBehaviors;

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
});
