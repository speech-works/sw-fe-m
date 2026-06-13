import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import Icon from "react-native-vector-icons/FontAwesome5";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ErrorStateCard from "../../../components/Dashboard/ErrorStateCard";
import ScreenView from "../../../components/ScreenView";
import {
  ExploreStackNavigationProp,
  ExploreStackParamList,
  ExploreStackRouteProp,
} from "../../../navigators/stacks/ExploreStack/types";
import { useProgressReportStore } from "../../../stores/progressReport";
import { useUserStore } from "../../../stores/user";
import { theme } from "../../../Theme/tokens";
import { parseTextStyle } from "../../../util/functions/parseStyles";
import Achievements from "./components/Achievements";
import DetailedWeeklySummary, {
  WeeklySummarySkeleton,
} from "./components/DetailedWeeklySummary";
import DPSummary, { DPSummarySkeleton } from "./components/DPSummary";
import LifetimeGrowthJourneyCard from "./components/LifetimeGrowthJourneyCard";
import LifetimeJourneyCard from "./components/LifetimeJourneyCard";
import MoodSummary, { MoodSummarySkeleton } from "./components/MoodSummary";
import WeeklyGrowthCard from "./components/WeeklyGrowthCard";
import SegmentedTabs from "../../../components/SegmentedTabs";

type ReportTimeframe = "weekly" | "lifetime";

const ProgressDetail = () => {
  const navigation =
    useNavigation<ExploreStackNavigationProp<keyof ExploreStackParamList>>();
  const route = useRoute<ExploreStackRouteProp<"ProgressDetail">>();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const horizontalScrollRef = useRef<ScrollView>(null);
  const achievementsY = useRef<number>(0);
  const screenWidth = Dimensions.get("window").width;
  const HEADER_HEIGHT = 60;

  const initialTab = route.params?.scrollTo === "achievements"
    ? "lifetime"
    : "weekly";
  const [activeTab, setActiveTab] = useState<ReportTimeframe>(initialTab);
  const [refreshing, setRefreshing] = useState(false);

  const { user } = useUserStore();
  const {
    weeklyReport,
    lifetimeReport,
    loading,
    errors,
    fetchReport,
  } = useProgressReportStore();

  const loadActiveReport = React.useCallback(
    async (timeframe: ReportTimeframe, isRefresh = false) => {
      if (!user?.id) {
        return;
      }
      await fetchReport(user.id, timeframe, isRefresh);
    },
    [fetchReport, user?.id],
  );

  React.useEffect(() => {
    if (!user?.id) {
      return;
    }

    const reportForTab = activeTab === "weekly" ? weeklyReport : lifetimeReport;
    if (!reportForTab && !loading[activeTab]) {
      void loadActiveReport(activeTab);
    }
  }, [
    activeTab,
    lifetimeReport,
    loadActiveReport,
    loading,
    user?.id,
    weeklyReport,
  ]);

  useFocusEffect(
    React.useCallback(() => {
      if (!user?.id) {
        return;
      }

      void loadActiveReport(activeTab, true);
    }, [activeTab, loadActiveReport, user?.id]),
  );

  React.useEffect(() => {
    if (route.params?.scrollTo === "achievements" && activeTab !== "lifetime") {
      setActiveTab("lifetime");
      return;
    }

    if (
      route.params?.scrollTo === "achievements" &&
      activeTab === "lifetime" &&
      lifetimeReport
    ) {
      const timer = setTimeout(() => {
        scrollRef.current?.scrollTo({
          y: achievementsY.current,
          animated: true,
        });
        navigation.setParams({ scrollTo: undefined });
      }, 450);

      return () => clearTimeout(timer);
    }
  }, [activeTab, lifetimeReport, navigation, route.params?.scrollTo]);

  React.useEffect(() => {
    if (activeTab === "weekly") {
      horizontalScrollRef.current?.scrollTo({ x: 0, animated: true });
    } else {
      horizontalScrollRef.current?.scrollTo({ x: screenWidth, animated: true });
    }
  }, [activeTab, screenWidth]);

  const onRefresh = async () => {
    if (!user?.id) {
      return;
    }

    setRefreshing(true);
    await loadActiveReport(activeTab, true);
    setRefreshing(false);
  };

  const currentEmptyState = useMemo(() => {
    if (activeTab === "weekly") {
      return {
        title: "Weekly Report Unavailable",
        message:
          "We couldn't load your weekly progress right now. Try again in a moment.",
      };
    }

    return {
      title: "Lifetime Report Unavailable",
      message:
        "We couldn't load your lifetime journey right now. Try again in a moment.",
    };
  }, [activeTab]);

  const renderWeekly = () => {
    if (loading.weekly && !weeklyReport) {
      return (
        <View style={{ gap: 16 }}>
          <WeeklySummarySkeleton />
          <DPSummarySkeleton />
          <MoodSummarySkeleton />
        </View>
      );
    }

    if (!weeklyReport && errors.weekly) {
      return (
        <ErrorStateCard
          onRetry={() => loadActiveReport("weekly", true)}
          variant="light"
          title={currentEmptyState.title}
          message={currentEmptyState.message}
          style={{ marginVertical: 0 }}
        />
      );
    }

    if (!weeklyReport) {
      return null;
    }

    return (
      <>
        <DetailedWeeklySummary
          summary={weeklyReport.summary}
          loading={loading.weekly}
          hasError={Boolean(errors.weekly)}
        />
        <WeeklyGrowthCard
          growth={weeklyReport.growth}
          loading={loading.weekly}
          hasError={Boolean(errors.weekly)}
        />
        <DPSummary
          distribution={weeklyReport.distribution}
          timeframe="weekly"
          loading={loading.weekly}
          hasError={Boolean(errors.weekly)}
        />
        <MoodSummary
          moodStats={weeklyReport.mood}
          loading={loading.weekly}
          hasError={Boolean(errors.weekly)}
        />
      </>
    );
  };

  const renderLifetime = () => {
    if (loading.lifetime && !lifetimeReport) {
      return (
        <View style={styles.loadingFallback}>
          <ActivityIndicator
            size="small"
            color={theme.colors.actionPrimary.default}
          />
          <Text style={styles.loadingFallbackText}>
            Building your lifetime report...
          </Text>
        </View>
      );
    }

    if (!lifetimeReport && errors.lifetime) {
      return (
        <ErrorStateCard
          onRetry={() => loadActiveReport("lifetime", true)}
          variant="light"
          title={currentEmptyState.title}
          message={currentEmptyState.message}
          style={{ marginVertical: 0 }}
        />
      );
    }

    if (!lifetimeReport) {
      return null;
    }

    return (
      <>
        <LifetimeJourneyCard
          journey={lifetimeReport.journey}
          loading={loading.lifetime}
          hasError={Boolean(errors.lifetime)}
        />
        <LifetimeGrowthJourneyCard
          growthJourney={lifetimeReport.growthJourney}
          loading={loading.lifetime}
          hasError={Boolean(errors.lifetime)}
        />
        <DPSummary
          distribution={lifetimeReport.distribution}
          timeframe="lifetime"
          loading={loading.lifetime}
          hasError={Boolean(errors.lifetime)}
        />
        <View
          onLayout={(event) => {
            achievementsY.current = event.nativeEvent.layout.y;
          }}
        >
          <Achievements stageData={lifetimeReport.achievements} />
        </View>
      </>
    );
  };

  return (
    <ScreenView style={[styles.screenView, { paddingHorizontal: 0 }]}>
      <View style={StyleSheet.absoluteFillObject}>
        <LinearGradient
          colors={["#FFF7ED", "#FFF", "#FFF"]}
          locations={[0, 0.4, 1]}
          style={{ flex: 1 }}
        />
      </View>

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
        <View style={{ paddingHorizontal: 16, paddingTop: HEADER_HEIGHT + insets.top + 16, paddingBottom: 16 }}>
          <View style={{ marginBottom: 4 }}>
            <SegmentedTabs
              tabs={[
                { key: "weekly", label: "This Week", icon: "calendar-week" },
                { key: "lifetime", label: "Lifetime", icon: "infinity" },
              ]}
              active={activeTab}
              onChange={(k) => setActiveTab(k as ReportTimeframe)}
              activeColor={theme.colors.actionPrimary.default}
            />
          </View>
        </View>

        <ScrollView
          ref={horizontalScrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const offsetX = e.nativeEvent.contentOffset.x;
            const pageIndex = Math.round(offsetX / screenWidth);
            setActiveTab(pageIndex === 0 ? "weekly" : "lifetime");
          }}
          style={{ flex: 1 }}
        >
          <View style={{ width: screenWidth }}>
            <ScrollView
              contentContainerStyle={[styles.scrollView, { paddingTop: 0 }]}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={theme.colors.actionPrimary.default}
                  colors={[theme.colors.actionPrimary.default]}
                />
              }
            >
              {renderWeekly()}
            </ScrollView>
          </View>

          <View style={{ width: screenWidth }}>
            <ScrollView
              ref={scrollRef}
              contentContainerStyle={[styles.scrollView, { paddingTop: 0 }]}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={theme.colors.actionPrimary.default}
                  colors={[theme.colors.actionPrimary.default]}
                />
              }
            >
              {renderLifetime()}
            </ScrollView>
          </View>
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
  loadingFallback: {
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 20,
    paddingVertical: 28,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  loadingFallbackText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
  },
});
