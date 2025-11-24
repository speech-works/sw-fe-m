import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ViewStyle,
} from "react-native";
import React from "react";
import ScreenView from "../../../components/ScreenView";
import CustomScrollView from "../../../components/CustomScrollView";
import { parseTextStyle } from "../../../util/functions/parseStyles";
import { theme } from "../../../Theme/tokens";
import Icon from "react-native-vector-icons/FontAwesome5";
import ListCard, { ListCardProps } from "./components/ListCard";
import { useNavigation } from "@react-navigation/native";
import {
  DPStackNavigationProp,
  DPStackParamList,
} from "../../../navigators/stacks/AcademyStack/DailyPracticeStack/types";

import ReaderFace from "../../../assets/mood-check/ReaderFace";
import ExposureFace from "../../../assets/sw-faces/ExposureFace";
import BreathingFace from "../../../assets/sw-faces/BreathingFace";
import MovieFace from "../../../assets/sw-faces/MovieFace";

const iconContiainerStyle: ViewStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  height: 48,
  width: 48,
  borderRadius: 24,
};

const DailyPractice = () => {
  const navigation =
    useNavigation<DPStackNavigationProp<keyof DPStackParamList>>();

  const moveToReadingPractice = () => {
    navigation.navigate("ReadingPracticeStack");
  };

  const moveToFunPractice = () => {
    navigation.navigate("FunPracticeStack");
  };
  const moveToCognitiveTherapy = () => {
    navigation.navigate("CognitivePracticeStack");
  };
  const moveToExposure = () => {
    navigation.navigate("ExposureStack");
  };

  const dailyPracticeData: Array<ListCardProps> = [
    {
      title: "Fun Activities",
      description: "Interactive speech games",
      onPress: moveToFunPractice,
      icon: <MovieFace size={52} />,
    },
    {
      title: "Reading Practice",
      description: "Guided reading exercises",
      onPress: moveToReadingPractice,
      icon: <ReaderFace size={52} />,
    },
    {
      title: "Cognitive Therapy",
      description: "Mental exercises & techniques",
      onPress: moveToCognitiveTherapy,
      icon: <BreathingFace size={52} />,
    },
    {
      title: "Exposure",
      description: "Real-world speaking scenarios",
      onPress: moveToExposure,
      icon: <ExposureFace size={52} />,
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
          <Text style={styles.topNavigationText}>Daily Practice</Text>
        </TouchableOpacity>
        <CustomScrollView>
          <View style={styles.listContainer}>
            {dailyPracticeData.map((item, index) => (
              <ListCard
                key={index}
                title={item.title}
                description={item.description}
                icon={item.icon}
                onPress={item.onPress}
              />
            ))}
          </View>
        </CustomScrollView>
      </View>
    </ScreenView>
  );
};

export default DailyPractice;

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
});
