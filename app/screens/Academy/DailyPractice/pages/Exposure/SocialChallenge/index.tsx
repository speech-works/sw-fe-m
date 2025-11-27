import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React from "react";
import ScreenView from "../../../../../../components/ScreenView";
import Icon from "react-native-vector-icons/FontAwesome5";
import CustomScrollView, {
  SHADOW_BUFFER,
} from "../../../../../../components/CustomScrollView";
import { theme } from "../../../../../../Theme/tokens";
import { parseTextStyle } from "../../../../../../util/functions/parseStyles";
import { useNavigation } from "@react-navigation/native";
import ListOfSocialChallenges from "./components/ListOfSocialChallenges";
import {
  SCEDPStackNavigationProp,
  SCEDPStackParamList,
} from "../../../../../../navigators/stacks/AcademyStack/DailyPracticeStack/ExposureStack/SocialChallengeStack/types";

const SocialChallenge = () => {
  const navigation =
    useNavigation<SCEDPStackNavigationProp<keyof SCEDPStackParamList>>();
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
            <Text style={styles.topNavigationText}>Social Challenges</Text>
          </TouchableOpacity>
        </View>
        <CustomScrollView contentContainerStyle={styles.scrollContainer}>
          <ListOfSocialChallenges
            onSelectSC={(sc) => {
              navigation.navigate("SCBriefing", {
                sc,
              });
            }}
          />
        </CustomScrollView>
      </View>
    </ScreenView>
  );
};

export default SocialChallenge;

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
    padding: SHADOW_BUFFER,
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
