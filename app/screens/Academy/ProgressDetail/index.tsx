import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import React, { useMemo, useRef, useState } from "react";
import {
  RefreshControl,
  ScrollView,
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
  SchemeStatusBar,
  useTheme,
  spacing,
  size,
  space,
  radius,
  Text,
  Spinner,
  TabDock,
  PageHeader,
  icons,
  type IconName,
  useNavBarInset,
} from "../../../design-system";
import { track } from "../../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../../util/analytics/analyticsEvents";
import Achievements from "./components/Achievements";
import DetailedWeeklySummary, {
  WeeklySummarySkeleton,
} from "./components/DetailedWeeklySummary";
import DPSummary, { DPSummarySkeleton } from "./components/DPSummary";
import LifetimeJourneyCard from "./components/LifetimeJourneyCard";
import MoodSummary, { MoodSummarySkeleton } from "./components/MoodSummary";

type ReportTimeframe = "weekly" | "lifetime";

const TABS: { key: ReportTimeframe; label: string; icon: IconName }[] = [
  { key: "weekly", label: "This Week", icon: icons.weekly },
  { key: "lifetime", label: "Lifetime", icon: icons.lifetime },
];

const ProgressDetail = () => {
  const { colors } = useTheme();
  const navigation =
    useNavigation<ExploreStackNavigationProp<keyof ExploreStackParamList>>();
  const route = useRoute<ExploreStackRouteProp<"ProgressDetail">>();
  const insets = useSafeAreaInsets();
  const navBarInset = useNavBarInset();
  const scrollRef = useRef<ScrollView>(null);
  const horizontalScrollRef = useRef<ScrollView>(null);
  const achievementsY = useRef<number>(0);
  const growthY = useRef<number>(0);
  const screenWidth = Dimensions.get("window").width;

  // BOTH scroll targets live on the Lifetime tab, so either one opens there.
  // This used to name "achievements" alone, which would have landed a growth
  // tap on the weekly tab and then bounced it across a beat later.
  const initialTab = route.params?.scrollTo ? "lifetime" : "weekly";
  const [activeTab, setActiveTab] = useState<ReportTimeframe>(initialTab);
  const [refreshing, setRefreshing] = useState(false);

  const { user } = useUserStore();
  const { weeklyReport, lifetimeReport, loading, errors, fetchReport } =
    useProgressReportStore();

  /**
   * "DOES ANYONE OPEN THIS?" — previously unanswerable.
   *
   * Fired from an effect on `activeTab` rather than from the three places that
   * set it (the TabDock, the horizontal swipe, and the scrollTo effect below).
   * Instrumenting the call sites would triple-count a single switch and miss
   * the route-param one entirely; deriving it from the state counts each change
   * exactly once, whatever caused it.
   *
   * `source` is INFERRED, not passed. `scrollTo` is only ever set by Home — the
   * Level card asks for "achievements", the growth summary for "growth" — and
   * nothing distinguishes Settings from Explore, so both report "direct".
   * Saying so is honest about the limit; inventing a finer split would not be.
   */
  const opened = useRef(false);
  React.useEffect(() => {
    const from = route.params?.scrollTo;
    if (opened.current) {
      track(ANALYTICS_EVENTS.PROGRESS_REPORT_TAB_SWITCHED, { tab: activeTab });
      return;
    }
    opened.current = true;
    track(ANALYTICS_EVENTS.PROGRESS_REPORT_OPENED, {
      tab: activeTab,
      source:
        from === "achievements"
          ? "home_level"
          : from === "growth"
            ? "home_growth"
            : "direct",
    });
  }, [activeTab, route.params?.scrollTo]);

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

  /**
   * Open the report AT something, not at the top.
   *
   * Generalised from the single "achievements" case so Home's growth summary
   * can land on the growth card. Both targets are on the Lifetime tab, so this
   * switches tab first and scrolls on the next pass once the report has
   * rendered and the measured offsets exist.
   *
   * The growth card sits ABOVE `LifetimeJourneyCard` and is the first thing on
   * the tab, so its offset is effectively the top — but it is measured rather
   * than assumed, because anything inserted above it later would silently break
   * a hardcoded zero.
   */
  const target = route.params?.scrollTo;
  React.useEffect(() => {
    if (!target) return;
    if (activeTab !== "lifetime") {
      setActiveTab("lifetime");
      return;
    }
    if (!lifetimeReport) return;
    const timer = setTimeout(() => {
      const y = target === "growth" ? growthY.current : achievementsY.current;
      scrollRef.current?.scrollTo({ y, animated: true });
      navigation.setParams({ scrollTo: undefined });
    }, 450);
    return () => clearTimeout(timer);
  }, [activeTab, lifetimeReport, navigation, target]);

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

  const fetchErrorCopy = useMemo(() => {
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
          title={fetchErrorCopy.title}
          message={fetchErrorCopy.message}
          style={styles.errorCard}
        />
      );
    }
    if (!weeklyReport) return null;
    return (
      <>
        <DetailedWeeklySummary summary={weeklyReport.summary} loading={loading.weekly} hasError={Boolean(errors.weekly)} />
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
          title={fetchErrorCopy.title}
          message={fetchErrorCopy.message}
          style={styles.errorCard}
        />
      );
    }
    if (!lifetimeReport) return null;
    return (
      <>
        {/* FIRST, above the app's own numbers. LifetimeJourneyCard below is
            practice time, practice count, practice days and level — all of it
            about the app. This is the only thing on the screen about the
            person's life, so it leads. It carries its own null and empty
            states and is independent of `lifetimeReport`, which is why it sits
            outside the report's loading and error branches above. */}
        <View
          onLayout={(event) => {
            growthY.current = event.nativeEvent.layout.y;
          }}
        >
        </View>
        <LifetimeJourneyCard journey={lifetimeReport.journey} loading={loading.lifetime} hasError={Boolean(errors.lifetime)} />
        <DPSummary distribution={lifetimeReport.distribution} timeframe="lifetime" loading={loading.lifetime} hasError={Boolean(errors.lifetime)} />
        <View onLayout={(event) => { achievementsY.current = event.nativeEvent.layout.y; }}>
          <Achievements stageData={lifetimeReport.achievements} />
        </View>
      </>
    );
  };

  const renderHeader = () => (
    <PageHeader title="Progress Report" onBack={() => navigation.goBack()} />
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
      <SchemeStatusBar translucent backgroundColor="transparent" />

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
            contentContainerStyle={[
              styles.scrollView,
              // Clearance follows the in-page dock, which edge-to-edge moves up by the
              // nav bar. 0 on iOS.
              { paddingTop: insets.top + space.inlineGap, paddingBottom: size.tabBarSafe + navBarInset },
            ]}
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
            contentContainerStyle={[
              styles.scrollView,
              // Clearance follows the in-page dock, which edge-to-edge moves up by the
              // nav bar. 0 on iOS.
              { paddingTop: insets.top + space.inlineGap, paddingBottom: size.tabBarSafe + navBarInset },
            ]}
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
        <View pointerEvents="none" style={[styles.statusCap, { height: insets.top, backgroundColor: colors.background.canvas }]} />
      ) : null}

      {/* Internal menu dock — the same component as the app's bottom nav */}
      <TabDock
        items={TABS}
        activeKey={activeTab}
        onSelect={(key) => setActiveTab(key as ReportTimeframe)}
        fitContent
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
  scrollView: {
    gap: spacing["2xl"],
    paddingHorizontal: space.screenX,
    paddingBottom: size.tabBarSafe,
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
