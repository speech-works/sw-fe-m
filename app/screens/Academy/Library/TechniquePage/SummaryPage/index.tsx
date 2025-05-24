import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React from "react";
import ScreenView from "../../../../../components/ScreenView";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import {
  LibStackNavigationProp,
  LibStackParamList,
} from "../../../../../navigators/stacks/AcademyStack/LibraryStack/types";
import Icon from "react-native-vector-icons/FontAwesome5";
import { theme } from "../../../../../Theme/tokens";
import CustomScrollView from "../../../../../components/CustomScrollView";
import { parseTextStyle } from "../../../../../util/functions/parseStyles";

const SummaryPage = () => {
  const navigation =
    useNavigation<LibStackNavigationProp<keyof LibStackParamList>>();
  const route = useRoute<RouteProp<LibStackParamList, "SummaryPage">>();
  const { techniqueId, techniqueName } = route.params;
  return (
    <ScreenView style={styles.screenView}>
      <View style={styles.container}>
        <View style={styles.topNavigationContainer}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.topNavigation}
          >
            <Icon name="arrow-left" />
            <Text style={styles.topNavigationText}>{techniqueName}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => {}}>
            <Icon
              name="question-circle"
              size={16}
              color={theme.colors.text.default}
            />
          </TouchableOpacity>
        </View>

        <CustomScrollView>
          <View></View>
        </CustomScrollView>
      </View>
    </ScreenView>
  );
};

export default SummaryPage;

const styles = StyleSheet.create({
  screenView: {
    paddingBottom: 0,
  },
  container: {
    gap: 32,
    flex: 1,
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
