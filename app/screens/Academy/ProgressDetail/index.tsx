import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import React, { useRef, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import ScreenView from "../../../components/ScreenView";
import {
  PDStackNavigationProp,
  PDStackParamList,
  PDStackRouteProp,
} from "../../../navigators/stacks/AcademyStack/ProgressDetailStack/types";
import { theme } from "../../../Theme/tokens";
import { parseTextStyle } from "../../../util/functions/parseStyles";
import Achievements from "./components/Achievements";
import ErrorStateCard from "../../../components/Dashboard/ErrorStateCard";
import DetailedWeeklySummary, {
  WeeklySummarySkeleton,
} from "./components/DetailedWeeklySummary";
import DPSummary, { DPSummarySkeleton } from "./components/DPSummary";
import MoodSummary, { MoodSummarySkeleton } from "./components/MoodSummary";
import { useUserStore } from "../../../stores/user";
import { useProgressReportStore } from "../../../stores/progressReport";
import { LinearGradient } from "expo-linear-gradient";

const ProgressDetail = () => {
  const navigation =
    useNavigation<PDStackNavigationProp<keyof PDStackParamList>>();
  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = 60;
  const route = useRoute<PDStackRouteProp<"ProgressDetail">>();
  const scrollRef = useRef<ScrollView>(null);
  const achievementsY = useRef<number>(0);

  const { user } = useUserStore();
  const {
    fetchAllData,
    loading,
    detailedSummary,
    practiceStats,
    moodReport,
    fetchErrors,
  } = useProgressReportStore();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      if (user?.id) {
        fetchAllData(user.id, true);
      }
    }, [fetchAllData, user?.id]),
  );

  const onRefresh = async () => {
    if (user?.id) {
      setRefreshing(true);
      await fetchAllData(user.id, true);
      setRefreshing(false);
    }
  };

  const handleRetry = () => {
    if (user?.id) {
      fetchAllData(user.id, true);
    }
  };

  const hasAnyData =
    detailedSummary ||
    (practiceStats && practiceStats.length > 0) ||
    moodReport;
  const anyFetchError =
    fetchErrors.detailedSummary ||
    fetchErrors.practiceStats ||
    fetchErrors.moodReport;

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
    <ScreenView style={[styles.screenView, { paddingHorizontal: 0 }]}>
      {/* Background Gradient */}
      <View style={StyleSheet.absoluteFillObject}>
        <LinearGradient
          colors={["#FFF7ED", "#FFF", "#FFF"]}
          locations={[0, 0.4, 1]}
          style={{ flex: 1 }}
        />
      </View>

      {/* Header */}
      <BlurView
        intensity={80}
        tint="light"
        style={[
          styles.header,
          { paddingTop: insets.top + 10, height: HEADER_HEIGHT + insets.top },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="chevron-left" size={16} color={theme.colors.text.title} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Progress Report</Text>
        <View style={{ width: 32 }} />
      </BlurView>
      <View style={styles.container}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            styles.scrollView,
            { paddingTop: HEADER_HEIGHT + insets.top + 16 },
          ]}
          showsVerticalScrollIndicator={false}
          decelerationRate={0.9}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.actionPrimary.default}
              colors={[theme.colors.actionPrimary.default]}
            />
          }
        >
          {loading && !hasAnyData ? (
            <View style={{ gap: 16 }}>
              <WeeklySummarySkeleton />
              <DPSummarySkeleton />
              <MoodSummarySkeleton />
            </View>
          ) : !hasAnyData && anyFetchError ? (
            <ErrorStateCard
              onRetry={handleRetry}
              variant="light"
              title="Progress Summary Unavailable"
              message="We're having trouble loading your progress reports right now. Check your connection or try again."
              style={{ marginVertical: 0 }}
            />
          ) : (
            <>
              <DetailedWeeklySummary />
              <DPSummary />
              <MoodSummary />
            </>
          )}
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
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
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
  refreshButton: {
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
    paddingHorizontal: 16,
  },
});
