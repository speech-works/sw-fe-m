import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useRef } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import ScreenView from "../../../components/ScreenView";
import {
  PDStackNavigationProp,
  PDStackParamList,
  PDStackRouteProp,
} from "../../../navigators/stacks/AcademyStack/ProgressDetailStack/types";
import { theme } from "../../../Theme/tokens";
import { parseTextStyle } from "../../../util/functions/parseStyles";
import Achievements from "./components/Achievements";
import DetailedWeeklySummary from "./components/DetailedWeeklySummary";
import DPSummary from "./components/DPSummary";
import MoodSummary from "./components/MoodSummary";

import { LinearGradient } from "expo-linear-gradient";

const ProgressDetail = () => {
  const navigation =
    useNavigation<PDStackNavigationProp<keyof PDStackParamList>>();
  const route = useRoute<PDStackRouteProp<"ProgressDetail">>();
  const scrollRef = useRef<ScrollView>(null);
  const achievementsY = useRef<number>(0);

  React.useEffect(() => {
    if (route.params?.scrollTo === "achievements") {
      const timer = setTimeout(() => {
        scrollRef.current?.scrollTo({
          y: achievementsY.current,
          animated: true,
        });
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [route.params?.scrollTo]);

  return (
    <ScreenView style={styles.screenView}>
      {/* Background Gradient */}
      <View style={StyleSheet.absoluteFillObject}>
        <LinearGradient
          colors={["#FFF7ED", "#FFF", "#FFF"]}
          locations={[0, 0.4, 1]}
          style={{ flex: 1 }}
        />
      </View>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="chevron-left" size={16} color={theme.colors.text.title} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Progress Report</Text>
        <View style={{ width: 32 }} />
      </View>
      <View style={styles.container}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollView}
          showsVerticalScrollIndicator={false}
          decelerationRate={0.9}
        >
          <DetailedWeeklySummary />
          <DPSummary />
          <MoodSummary />
          <View
            onLayout={(e) => {
              achievementsY.current = e.nativeEvent.layout.y;
            }}
          >
            <Achievements />
          </View>
          {/* <TutStats /> */}
        </ScrollView>
      </View>
    </ScreenView>
  );
};

export default ProgressDetail;

const styles = StyleSheet.create({
  screenView: {
    paddingBottom: 0,
  },
  container: {
    gap: 32,
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.6)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  headerTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
    marginTop: 2,
  },
  scrollView: {
    gap: 16,
    paddingVertical: 16,
    paddingHorizontal: 6,
  },
});
