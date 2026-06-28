import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import React, { useMemo, useRef, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
  Dimensions,
} from "react-native";
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
import {
  useTheme,
  spacing,
  space,
  radius,
  size,
  IconButton,
  Text,
  Spinner,
  TabDock,
} from "../../../design-system";
import Achievements from "./components/Achievements";
import DetailedWeeklySummary, {
  WeeklySummarySkeleton,
} from "./components/DetailedWeeklySummary";
import DPSummary, { DPSummarySkeleton } from "./components/DPSummary";
import LifetimeGrowthJourneyCard from "./components/LifetimeGrowthJourneyCard";
import LifetimeJourneyCard from "./components/LifetimeJourneyCard";
import MoodSummary, { MoodSummarySkeleton } from "./components/MoodSummary";
import WeeklyGrowthCard from "./components/WeeklyGrowthCard";

type ReportTimeframe = "weekly" | "lifetime";

const TABS: { key: ReportTimeframe; label: string; icon: string }[] = [
  { key: "weekly", label: "This Week", icon: "calendar-week" },
  { key: "lifetime", label: "Lifetime", icon: "infinity" },
];

const ProgressDetail = () => {
  const { colors } = useTheme();
  const navigation =
    useNavigation<ExploreStackNavigationProp<keyof ExploreStackParamList>>();
  const route = useRoute<ExploreStackRouteProp<"ProgressDetail">>();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const horizontalScrollRef = useRef<ScrollView>(null);
  const achievementsY = useRef<number>(0);
  const screenWidth = Dimensions.get("window").width;

  const initialTab = route.params?.scrollTo === "achievements" ? "lifetime" : "weekly";
  const [activeTab, setActiveTab] = useState<ReportTimeframe>(initialTab);
  const [refreshing, setRefreshing] = useState(false);

  const { user } = useUserStore();
  const { weeklyReport, lifetimeReport, loading, errors, fetchReport } =
    useProgressReportStore();

  const loadActiveReport = React.useCallback(
    async (timeframe: ReportTimeframe, isRefresh = false) => {
      if (!user?.id) return;
      await fetchReport(user.id, timeframe, isRefresh);
    },
    [fetchReport, user?.id],
  );

  React.useEffect(() => {
    if (!user?.id) return;
    const reportForTab = activeTab === "weekly" ? weeklyReport : lifetimeReport;
    if (!reportForTab && !loading[activeTab]) {
      void loadActiveReport(activeTab);
    }
  }, [activeTab, lifetimeReport, loadActiveReport, loading, user?.id, weeklyReport]);

  useFocusEffect(
    React.useCallback(() => {
      if (!user?.id) return;
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
        scrollRef.current?.scrollTo({ y: achievementsY.current, animated: true });
        navigation.setParams({ scrollTo: undefined });
      }, 450);
      return () => clearTimeout(timer);
    }
  }, [activeTab, lifetimeReport, navigation, route.params?.scrollTo]);

  React.useEffect(() => {
    horizontalScrollRef.current?.scrollTo({
      x: activeTab === "weekly" ? 0 : screenWidth,
      animated: true,
    });
  }, [activeTab, screenWidth]);

  const onRefresh = async () => {
    if (!user?.id) return;
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
        <View style={styles.skeletonStack}>
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
          variant="dark"
          title={currentEmptyState.title}
          message={currentEmptyState.message}
          style={styles.errorCard}
        />
      );
    }
    if (!weeklyReport) return null;
    return (
      <>
        <DetailedWeeklySummary summary={weeklyReport.summary} loading={loading.weekly} hasError={Boolean(errors.weekly)} />
        <WeeklyGrowthCard growth={weeklyReport.growth} loading={loading.weekly} hasError={Boolean(errors.weekly)} />
        <DPSummary distribution={weeklyReport.distribution} timeframe="weekly" loading={loading.weekly} hasError={Boolean(errors.weekly)} />
        <MoodSummary moodStats={weeklyReport.mood} loading={loading.weekly} hasError={Boolean(errors.weekly)} />
      </>
    );
  };

  const renderLifetime = () => {
    if (loading.lifetime && !lifetimeReport) {
      return (
        <View style={[styles.loadingFallback, { backgroundColor: colors.surface.default }]}>
          <Spinner size="small" />
          <Text variant="bodySm" color="secondary">Building your lifetime report...</Text>
        </View>
      );
    }
    if (!lifetimeReport && errors.lifetime) {
      return (
        <ErrorStateCard
          onRetry={() => loadActiveReport("lifetime", true)}
          variant="dark"
          title={currentEmptyState.title}
          message={currentEmptyState.message}
          style={styles.errorCard}
        />
      );
    }
    if (!lifetimeReport) return null;
    return (
      <>
        <LifetimeJourneyCard journey={lifetimeReport.journey} loading={loading.lifetime} hasError={Boolean(errors.lifetime)} />
        <LifetimeGrowthJourneyCard growthJourney={lifetimeReport.growthJourney} loading={loading.lifetime} hasError={Boolean(errors.lifetime)} />
        <DPSummary distribution={lifetimeReport.distribution} timeframe="lifetime" loading={loading.lifetime} hasError={Boolean(errors.lifetime)} />
        <View onLayout={(event) => { achievementsY.current = event.nativeEvent.layout.y; }}>
          <Achievements stageData={lifetimeReport.achievements} />
        </View>
      </>
    );
  };

  const renderHeader = () => (
    <View>
      <View style={styles.backBar}>
        <IconButton name="arrow-left" onPress={() => navigation.goBack()} />
      </View>
      <Text variant="h1" style={styles.title}>Progress Report</Text>
    </View>
  );

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={colors.action.primary}
      colors={[colors.action.primary]}
    />
  );

  return (
    <ScreenView style={[styles.screenView, { backgroundColor: colors.background.canvas }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Paged content — the whole page (title + cards) scrolls */}
      <ScrollView
        ref={horizontalScrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const pageIndex = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
          setActiveTab(pageIndex === 0 ? "weekly" : "lifetime");
        }}
        style={styles.flex}
      >
        <View style={{ width: screenWidth }}>
          <ScrollView
            contentContainerStyle={[styles.scrollView, { paddingTop: insets.top + space.inlineGap }]}
            showsVerticalScrollIndicator={false}
            refreshControl={refreshControl}
          >
            {renderHeader()}
            {renderWeekly()}
          </ScrollView>
        </View>
        <View style={{ width: screenWidth }}>
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={[styles.scrollView, { paddingTop: insets.top + space.inlineGap }]}
            showsVerticalScrollIndicator={false}
            refreshControl={refreshControl}
          >
            {renderHeader()}
            {renderLifetime()}
          </ScrollView>
        </View>
      </ScrollView>

      {/* Opaque status-bar cap — title tucks behind the clock when scrolled */}
      {insets.top > 0 ? (
        <View style={[styles.statusCap, { height: insets.top, backgroundColor: colors.background.canvas }]} />
      ) : null}

      {/* Internal menu dock — the same component as the app's bottom nav */}
      <TabDock
        items={TABS}
        activeKey={activeTab}
        onSelect={(key) => setActiveTab(key as ReportTimeframe)}
      />
    </ScreenView>
  );
};

export default ProgressDetail;

const styles = StyleSheet.create({
  screenView: {
    paddingBottom: 0,
  },
  flex: {
    flex: 1,
  },
  statusCap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  backBar: {
    minHeight: size.backBtn,
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    marginTop: space.titleGap,
    marginBottom: spacing.xs,
  },
  scrollView: {
    gap: spacing["2xl"],
    paddingHorizontal: space.screenX,
    paddingBottom: 140,
  },
  skeletonStack: {
    gap: spacing["2xl"],
  },
  errorCard: {
    marginVertical: 0,
  },
  loadingFallback: {
    borderRadius: radius.card,
    paddingVertical: spacing["2xl"],
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
});
