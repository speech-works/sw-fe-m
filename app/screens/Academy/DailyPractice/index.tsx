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
      icon: (
        <View
          style={[
            iconContiainerStyle,
            { backgroundColor: theme.colors.library.orange[100] },
          ]}
        >
          <Icon
            name="gamepad"
            size={20}
            color={theme.colors.library.orange[500]}
          />
        </View>
      ),
    },
    {
      title: "Reading Practice",
      description: "Guided reading exercises",
      onPress: moveToReadingPractice,
      icon: (
        <View
          style={[
            iconContiainerStyle,
            { backgroundColor: theme.colors.library.blue[100] },
          ]}
        >
          <Icon
            name="book-open"
            size={20}
            color={theme.colors.library.blue[400]}
          />
        </View>
      ),
    },
    {
      title: "Cognitive Therapy",
      description: "Mental exercises & techniques",
      onPress: moveToCognitiveTherapy,
      icon: (
        <View
          style={[
            iconContiainerStyle,
            { backgroundColor: theme.colors.library.green[100] },
          ]}
        >
          <Icon
            name="brain"
            size={20}
            color={theme.colors.library.green[500]}
          />
        </View>
      ),
    },
    {
      title: "Exposure",
      description: "Real-world speaking scenarios",
      onPress: moveToExposure,
      icon: (
        <View
          style={[
            iconContiainerStyle,
            { backgroundColor: theme.colors.library.purple[100] },
          ]}
        >
          <Icon
            name="user-friends"
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
