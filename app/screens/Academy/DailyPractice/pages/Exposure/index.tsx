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
  EDPStackNavigationProp,
  EDPStackParamList,
} from "../../../../../navigators/stacks/AcademyStack/DailyPracticeStack/ExposureStack/types";
import { usePracticeStatsStore } from "../../../../../stores/practiceStats";
import { formatDuration } from "../../../../../util/functions/time";
import InterviewFace from "../../../../../assets/sw-faces/InterviewFace";
import RoboticPhoneFace from "../../../../../assets/sw-faces/RoboticPhoneFace";

const iconContiainerStyle: ViewStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  height: 48,
  width: 48,
  borderRadius: 24,
};

const Exposure = () => {
  const navigation =
    useNavigation<EDPStackNavigationProp<keyof EDPStackParamList>>();

  const { practiceStats } = usePracticeStatsStore();

  const exposureData: Array<ListCardProps> = [
    {
      title: "Interview Simulation",
      description: "AI-powered practice",
      onPress: () => {
        navigation.navigate("InterviewSimulationStack");
      },
      icon: <InterviewFace size={52} />,
      disabled: false,
    },
    {
      title: "AI Phone Calls",
      description: "Speak freely, without hesitation",
      onPress: () => {
        navigation.navigate("PhoneCallsStack");
      },
      icon: <RoboticPhoneFace size={52} />,
      disabled: false,
    },
    {
      title: "Secondary Behaviors",
      description: "Coming soon", // Unlearn escape moves
      onPress: () => {
        navigation.navigate("SecondaryBehaviorsStack");
      },
      icon: (
        <View
          style={[
            iconContiainerStyle,
            { backgroundColor: theme.colors.library.gray[200] },
          ]}
        >
          <Icon name="socks" size={20} color={theme.colors.library.gray[100]} />
        </View>
      ),
      disabled: true,
    },
    {
      title: "Random Questions",
      description: "coming soon",
      onPress: () => {},
      icon: (
        <View
          style={[
            iconContiainerStyle,
            { backgroundColor: theme.colors.library.gray[200] },
          ]}
        >
          <Icon
            name="question"
            size={20}
            color={theme.colors.library.gray[100]}
          />
        </View>
      ),
      disabled: true,
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
          <Text style={styles.topNavigationText}>Exposure</Text>
        </TouchableOpacity>
        <CustomScrollView>
          <View style={styles.listContainer}>
            {exposureData.map((item, index) => (
              <ListCard
                key={index}
                title={item.title}
                description={item.description}
                icon={item.icon}
                onPress={item.onPress}
                disabled={item.disabled}
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
                  {practiceStats.find(
                    (stat) => stat.contentType === "EXPOSURE_PRACTICE"
                  )?.itemsCompleted || 0}
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
                  {formatDuration(
                    practiceStats.find(
                      (stat) => stat.contentType === "EXPOSURE_PRACTICE"
                    )?.totalTime
                  )}
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

export default Exposure;

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
