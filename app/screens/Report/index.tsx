import { StyleSheet, Text, View } from "react-native";
import React, { useEffect } from "react";
import ProfileProgress from "./components/ProfileProgress";
import ProfileInfo from "./components/ProfileInfo";
import Score from "./components/Score";
import ScoreMetric from "./components/ScoreMetric";
import Button from "../../components/Button";
import WeeklyNotes from "./components/WeeklyNotes";

const Report = () => {
  useEffect(() => {
    console.log("P Reports screen mounted");
  }, []);
  return (
    <View style={{ padding: 16, gap: 20 }}>
      <ProfileInfo />
      <ProfileProgress />
      <Score />
      <View style={styles.metricWrapper}>
        <ScoreMetric title="Consistency" metric="Consecutive days" value="14" />
        <ScoreMetric title="Repetition" metric="Weekly sessions" value="3" />
        <ScoreMetric title="Time" metric="Total time" value="5h 30m" />
      </View>
      <WeeklyNotes />
      <View style={styles.btnWrapper}>
        <Button size="medium" onPress={() => {}}>
          <Text>Download report</Text>
        </Button>
        <Button size="medium" variant="ghost" onPress={() => {}}>
          <Text>Share your report</Text>
        </Button>
      </View>
    </View>
  );
};

export default Report;

const styles = StyleSheet.create({
  metricWrapper: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 10,
  },
  btnWrapper: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
