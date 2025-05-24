import { StyleSheet, View } from "react-native";
import React from "react";
import ScreenView from "../../components/ScreenView";
import MoodCheck from "./components/MoodCheck";
import Progress from "./components/Progress";
import DailyPractice from "./components/DailyPractice";
import Tiles from "./components/Tiles";
import CustomScrollView from "../../components/CustomScrollView";

const Academy = () => {
  return (
    <ScreenView style={styles.screenView}>
      <CustomScrollView>
        <View style={styles.innerContainer}>
          <MoodCheck />
          <Progress />
          <DailyPractice />
          <Tiles />
        </View>
      </CustomScrollView>
    </ScreenView>
  );
};

export default Academy;

const styles = StyleSheet.create({
  screenView: {
    paddingBottom: 0,
  },
  innerContainer: {
    gap: 32,
    flex: 1,
  },
});
