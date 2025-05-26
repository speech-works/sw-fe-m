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
  RDPStackNavigationProp,
  RDPStackParamList,
} from "../../../../../navigators/stacks/AcademyStack/DailyPracticeStack/ReadingPracticeStack/types";
import DonePractice from "../../components/DonePractice";

const iconContiainerStyle: ViewStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  height: 48,
  width: 48,
  borderRadius: 24,
};

const ReadingPractice = () => {
  const navigation =
    useNavigation<RDPStackNavigationProp<keyof RDPStackParamList>>();

  const readingPracticeData: Array<ListCardProps> = [
    {
      title: "Stories",
      description: "Short stories & tales",
      onPress: () => {
        navigation.navigate("StoryPractice");
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
            name="bookmark"
            size={20}
            color={theme.colors.library.blue[400]}
          />
        </View>
      ),
    },
    {
      title: "Poems",
      description: "Verses & rhymes",
      onPress: () => {
        navigation.navigate("PoemPractice");
      },
      icon: (
        <View
          style={[
            iconContiainerStyle,
            { backgroundColor: theme.colors.library.green[100] },
          ]}
        >
          <Icon
            name="feather"
            size={20}
            color={theme.colors.library.green[500]}
          />
        </View>
      ),
    },
    {
      title: "Quotes",
      description: "Inspirational quotes",
      onPress: () => {
        navigation.navigate("QuotePractice");
      },
      icon: (
        <View
          style={[
            iconContiainerStyle,
            { backgroundColor: theme.colors.library.purple[100] },
          ]}
        >
          <Icon
            name="quote-right"
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
          <Icon name="arrow-left" />
          <Text style={styles.topNavigationText}>Reading Practice</Text>
        </TouchableOpacity>
        <CustomScrollView>
          <View style={styles.listContainer}>
            {readingPracticeData.map((item, index) => (
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

export default ReadingPractice;

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
