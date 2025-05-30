import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import React from "react";
import ScreenView from "../../../../../components/ScreenView";
import Icon from "react-native-vector-icons/FontAwesome5";
import CustomScrollView from "../../../../../components/CustomScrollView";
import ListCard, { ListCardProps } from "../../components/ListCard";
import { parseTextStyle } from "../../../../../util/functions/parseStyles";
import { theme } from "../../../../../Theme/tokens";
import { useNavigation } from "@react-navigation/native";

import {
  FDPStackNavigationProp,
  FDPStackParamList,
} from "../../../../../navigators/stacks/AcademyStack/DailyPracticeStack/FunPracticeStack/types";

const iconContiainerStyle: ViewStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  height: 48,
  width: 48,
  borderRadius: 24,
};

const FunPractice = () => {
  const navigation =
    useNavigation<FDPStackNavigationProp<keyof FDPStackParamList>>();
  const funPracticeData: Array<ListCardProps> = [
    {
      title: "Tongue Twisters",
      description: "Fun speech challenges",
      onPress: () => {
        navigation.navigate("TwisterPracticeStack");
      },
      icon: (
        <View
          style={[
            iconContiainerStyle,
            { backgroundColor: theme.colors.library.blue[100] },
          ]}
        >
          <Icon
            solid
            name="grin-tongue"
            size={20}
            color={theme.colors.library.blue[400]}
          />
        </View>
      ),
    },
    {
      title: "Role Play",
      description: "Practice situational speech",
      onPress: () => {
        navigation.navigate("RoleplayPracticeStack");
      },
      icon: (
        <View
          style={[
            iconContiainerStyle,
            { backgroundColor: theme.colors.library.green[100] },
          ]}
        >
          <Icon
            name="theater-masks"
            size={20}
            color={theme.colors.library.green[500]}
          />
        </View>
      ),
    },
    {
      title: "Character Voice",
      description: "Fun voice effects",
      onPress: () => {
        navigation.navigate("CharacterVoicePracticeStack");
      },
      icon: (
        <View
          style={[
            iconContiainerStyle,
            { backgroundColor: theme.colors.library.purple[100] },
          ]}
        >
          <Icon
            name="robot"
            size={20}
            color={theme.colors.library.purple[500]}
          />
        </View>
      ),
    },
  ];

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
          <Text style={styles.topNavigationText}>Fun Practice</Text>
        </TouchableOpacity>
        <CustomScrollView>
          <View style={styles.listContainer}>
            {funPracticeData.map((item, index) => (
              <ListCard
                key={index}
                title={item.title}
                description={item.description}
                icon={item.icon}
                onPress={item.onPress}
              />
            ))}
          </View>
          <View style={styles.activityStatsContainer}>
            <Text style={styles.activityStatsTitleText}>
              Your Activity Stats
            </Text>
            <View style={styles.statContainer}>
              <View style={styles.statInfoContainer}>
                <Text
                  style={[
                    styles.statInfoTitleText,
                    { color: theme.colors.library.blue[500] },
                  ]}
                >
                  24
                </Text>
                <Text style={styles.statInfoDescriptionText}>Completed</Text>
              </View>
              <View style={styles.statInfoContainer}>
                <Text
                  style={[
                    styles.statInfoTitleText,
                    { color: theme.colors.library.green[500] },
                  ]}
                >
                  3.2h
                </Text>
                <Text style={styles.statInfoDescriptionText}>Total Time</Text>
              </View>
            </View>
          </View>
        </CustomScrollView>
      </View>
    </ScreenView>
  );
};

export default FunPractice;

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
  listContainer: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  activityStatsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    paddingVertical: 32,
  },
  activityStatsTitleText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },
  statContainer: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    padding: 16,
    backgroundColor: theme.colors.surface.elevated,
    //...parseShadowStyle(theme.shadow.elevation1),
    borderRadius: 12,
  },
  statInfoContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    flex: 1,
    paddingVertical: 12,
  },
  statInfoTitleText: {
    ...parseTextStyle(theme.typography.Heading2),
    fontWeight: "600",
  },
  statInfoDescriptionText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
});
