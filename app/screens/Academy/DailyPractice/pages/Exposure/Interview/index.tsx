import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React from "react";
import ScreenView from "../../../../../../components/ScreenView";
import Icon from "react-native-vector-icons/FontAwesome5";
import CustomScrollView from "../../../../../../components/CustomScrollView";
import { theme } from "../../../../../../Theme/tokens";
import { parseTextStyle } from "../../../../../../util/functions/parseStyles";
import { useNavigation } from "@react-navigation/native";
import ListOfInterviews from "./components/ListOfInterviews";

const Interview = () => {
  const navigation = useNavigation();
  return (
    <ScreenView style={styles.screenView}>
      <View style={styles.container}>
        <View style={styles.topNavigationContainer}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.topNavigation}
          >
            <Icon name="arrow-left" />
            <Text style={styles.topNavigationText}>Exposure</Text>
          </TouchableOpacity>
        </View>
        <CustomScrollView contentContainerStyle={styles.scrollContainer}>
          <ListOfInterviews onSelectInterview={() => {}} />
        </CustomScrollView>
      </View>
    </ScreenView>
  );
};

export default Interview;

const styles = StyleSheet.create({
  screenView: {
    paddingBottom: 0,
  },
  container: {
    gap: 32,
    flex: 1,
  },
  scrollContainer: {
    gap: 32,
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
