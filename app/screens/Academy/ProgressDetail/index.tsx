import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import React, { useMemo, useRef, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  Dimensions,
} from "react-native";
import { BlurView } from "expo-blur";
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
  radius,
  borderWidth,
  Segmented,
  Text,
  IconButton,
  Spinner,
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
  const HEADER_HEIGHT = 60;
  const [dynamicHeaderHeight, setDynamicHeaderHeight] = useState(HEADER_HEIGHT + 60);

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
        <View style={[styles.loadingFallback, { backgroundColor: colors.surface.default }]}>
          <Spinner size="small" />
          <Text variant="bodySm" color="secondary">
            Building your lifetime report...
          </Text>
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
      <BlurView
        intensity={40}
        tint="dark"
        onLayout={(e) => setDynamicHeaderHeight(e.nativeEvent.layout.height)}
        style={[
          styles.header,
          { paddingTop: insets.top + 10, borderBottomColor: colors.border.hairline },
        ]}
      >
        <View style={styles.headerRow}>
          <IconButton name="chevron-left" onPress={() => navigation.goBack()} />
          <Text variant="h3">Progress Report</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.tabs}>
          <Segmented
            options={["This Week", "Lifetime"]}
            value={activeTab === "weekly" ? "This Week" : "Lifetime"}
            onChange={(v) => setActiveTab(v === "This Week" ? "weekly" : "lifetime")}
          />
        </View>
      </BlurView>

      <View style={styles.container}>
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
          style={styles.flex}
        >
          <View style={{ width: screenWidth }}>
            <ScrollView
              contentContainerStyle={[styles.scrollView, { paddingTop: dynamicHeaderHeight + 12 }]}
              showsVerticalScrollIndicator={false}
              refreshControl={refreshControl}
            >
              {renderWeekly()}
            </ScrollView>
          </View>

          <View style={{ width: screenWidth }}>
            <ScrollView
              ref={scrollRef}
              contentContainerStyle={[styles.scrollView, { paddingTop: dynamicHeaderHeight + 12 }]}
              showsVerticalScrollIndicator={false}
              refreshControl={refreshControl}
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
  flex: {
    flex: 1,
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
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: borderWidth.hairline,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerSpacer: {
    width: 44,
  },
  tabs: {
    marginTop: spacing.lg,
  },
  scrollView: {
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: 130,
  },
  skeletonStack: {
    gap: spacing.lg,
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
