import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React, { useCallback, useEffect, useState, useRef } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleProp,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import CustomScrollView from "../../components/CustomScrollView";
import ScreenView from "../../components/ScreenView";
import Timeline, { TimelineHandle } from "../../components/Timeline";
import BuddySupportSheet from "../../components/BuddySupportSheet";
import PressableScale from "../../components/PressableScale";
import {
  useTheme,
  spacing,
  space,
  radius,
  fonts,
  typography,
  elevation,
  Text,
  TabDock,
  PageHeader,
} from "../../design-system";
import {
  BuddySummary,
  BuddyTeam,
  getBuddyReport,
  getBuddyTeam,
  getMyBuddy,
  leaveBuddy,
  setReportConsent,
  attachInviteCode,
} from "../../api/buddies";
import { Signal, Thread, getThread } from "../../api/threads";
import { getLevelStage, LevelStage } from "../../api/users";
import { useUserStore } from "../../stores/user";
import { useInboxStore } from "../../stores/inbox";
import { useCommunityDock } from "../../stores/communityDock";
import { shareBuddyInvite } from "../../util/functions/share";
import { ROUTE_NAMES } from "../../constants/routes";
import { track } from "../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../util/analytics/analyticsEvents";

const screenWidth = Dimensions.get("window").width;

/** Buddy's shared progress (from GET /buddies/report; null when they don't share). */
interface BuddyReport {
  name?: string;
  level?: number;
  totalXp?: number;
  lastPracticeAt?: string | Date | null;
}

const monthYear = (d?: string | Date | null) =>
  d ? new Date(d).toLocaleDateString(undefined, { month: "short", year: "numeric" }) : null;

const relativeAgo = (d?: string | Date | null): string | null => {
  if (!d) return null;
  const t = new Date(d).getTime();
  if (Number.isNaN(t)) return null;
  const mins = Math.floor((Date.now() - t) / 60000);
  if (mins < 60) return "just now";
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(d).toLocaleDateString();
};

/** Map a level number to its stage title using the (global) stage ladder from my own LevelStage. */
const stageTitleForLevel = (stage: LevelStage | null, level?: number): string => {
  if (!stage || typeof level !== "number") return "—";
  const found = stage.stages.find(
    (s) => level >= s.minLevel && (s.maxLevel == null || level <= s.maxLevel),
  );
  return found?.title ?? stage.title;
};

/** Strong ease-out — the built-in curves are too weak for UI motion. */
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

const daysBetween = (d?: string | Date | null): number => {
  if (!d) return 0;
  const t = new Date(d).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / 86400000));
};

/** Counts up 0 → value on mount (easeOutCubic); instant under reduced motion. */
const AnimatedNumber = ({
  value,
  variant = "h1",
  color,
  duration = 700,
}: {
  value: number;
  variant?: "h1" | "display" | "h2";
  color?: string;
  duration?: number;
}) => {
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(reduceMotion ? value : 0);
  useEffect(() => {
    if (reduceMotion || value <= 0) {
      setDisplay(value);
      return;
    }
    let raf = 0;
    const start = Date.now();
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, reduceMotion]);
  return <Text variant={variant} color={color}>{display.toLocaleString()}</Text>;
};

/** Visual half of the share toggle — thumb slides + track crossfades on `on`. */
const ToggleSwitch = ({ on }: { on: boolean }) => {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const v = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    v.value = reduceMotion
      ? on
        ? 1
        : 0
      : withTiming(on ? 1 : 0, { duration: 180, easing: EASE_OUT });
  }, [on, reduceMotion]);
  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(v.value, [0, 1], [colors.surface.control, colors.action.primary]),
  }));
  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: v.value * 18 }] }));
  return (
    <Animated.View style={[styles.toggleTrack, trackStyle]}>
      <Animated.View style={[styles.toggleThumb, { backgroundColor: colors.surface.inverse }, thumbStyle]} />
    </Animated.View>
  );
};

/** Section header with an optional right-side hint. */
const SectionHeading = ({
  title,
  hint,
  topMargin,
}: {
  title: string;
  hint?: string;
  topMargin?: number;
}) => (
  <View style={[styles.sectionHeadRow, topMargin != null ? { marginTop: topMargin } : null]}>
    <Text variant="h3">{title}</Text>
    {hint ? (
      <Text variant="caption" color="tertiary">
        {hint}
      </Text>
    ) : null}
  </View>
);

/** A pulsing placeholder block for the loading skeleton. */
const SkeletonBlock = ({ style }: { style?: StyleProp<ViewStyle> }) => {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const o = useSharedValue(0.5);
  useEffect(() => {
    o.value = reduceMotion
      ? 0.6
      : withRepeat(withTiming(1, { duration: 850, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [reduceMotion]);
  const s = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[styles.skelBlock, { backgroundColor: colors.surface.elevated }, style, s]} />;
};

/** Shimmer skeleton that mirrors the paired layout while data loads. */
const CommunitySkeleton = ({ topPad }: { topPad: number }) => (
  <View style={{ paddingTop: topPad }}>
    <SkeletonBlock style={styles.skelBanner} />
    <SkeletonBlock style={styles.skelLabel} />
    <SkeletonBlock style={styles.skelCard} />
    <SkeletonBlock style={styles.skelToggle} />
    <SkeletonBlock style={styles.skelLabelSm} />
    <SkeletonBlock style={styles.skelDock} />
  </View>
);

/** A small pulsing "live" dot for the buddy-freshness row. */
const PulseDot = ({ color }: { color?: string }) => {
  const { colors } = useTheme();
  const c = color ?? colors.action.primary;
  const reduceMotion = useReducedMotion();
  const s = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion) return;
    s.value = withRepeat(
      withTiming(2, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
      -1,
      false,
    );
  }, [reduceMotion]);
  const ring = useAnimatedStyle(() => ({
    transform: [{ scale: s.value }],
    opacity: 0.5 * (2 - s.value),
  }));
  return (
    <View style={styles.liveDotWrap}>
      {!reduceMotion ? <Animated.View style={[styles.liveDotPulse, ring, { backgroundColor: c }]} /> : null}
      <View style={[styles.liveDot, { backgroundColor: c }]} />
    </View>
  );
};

const Community = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  const [summary, setSummary] = useState<BuddySummary | null>(null);
  const [report, setReport] = useState<BuddyReport | null>(null);
  const [team, setTeam] = useState<BuddyTeam | null>(null);
  const [myStage, setMyStage] = useState<LevelStage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [thread, setThread] = useState<Thread | null>(null);
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);
  // The morphing dock state lives in a shared store so the global CustomTabBar
  // (the single dock owner) can render the Us/Timeline switcher while focused.
  const view = useCommunityDock((s) => s.view);
  const setView = useCommunityDock((s) => s.setView);
  const setDockMode = useCommunityDock((s) => s.setMode);
  const setDockEnabled = useCommunityDock((s) => s.setEnabled);
  const enterDock = useCommunityDock((s) => s.enter);
  const leaveDock = useCommunityDock((s) => s.leave);
  const scrollViewRef = useRef<ScrollView>(null);
  const timelineRef = useRef<TimelineHandle>(null);
  const [supportSignal, setSupportSignal] = useState<Signal | null>(null);
  const [buddyCode, setBuddyCode] = useState("");
  const [submittingCode, setSubmittingCode] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const user = useUserStore((s) => s.user);
  const unreadCount = useInboxStore((s) => s.unreadCount);
  const reduceMotion = useReducedMotion();
  // Scroll-cue anchor: the content offset past which the in-page Us/Timeline
  // switcher has scrolled off the top (hands the switcher to the bottom dock).
  const [cueAnchor, setCueAnchor] = useState(0);
  const screenReaderRef = useRef(false);
  // Previous scroll offset — the cue is edge-triggered (fires only on crossing).
  const lastScrollYRef = useRef(0);

  // Sync state -> scroll
  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        x: view === "us" ? 0 : screenWidth,
        animated: true,
      });
    }
  }, [view]);

  const load = useCallback(async () => {
    try {
      setError(false);
      const data = await getMyBuddy();
      setSummary(data);
      if (data.link?.status === "active") {
        useInboxStore.getState().setHasBuddy(true);
        try {
          const t = await getThread();
          setThread(t);
          useInboxStore.getState().setUnreadCount(t?.unreadCount ?? 0);
        } catch {
          setThread(null);
        }
        try {
          setMyStage(await getLevelStage());
        } catch {
          setMyStage(null);
        }
        if (data.link.buddySharesReports) {
          try {
            setReport((await getBuddyReport()) as BuddyReport);
          } catch {
            setReport(null);
          }
        } else {
          setReport(null);
        }
        // Cooperative team score (server-computed)
        try {
          setTeam(await getBuddyTeam());
        } catch {
          setTeam(null);
        }
      } else {
        useInboxStore.getState().setHasBuddy(false);
        setThread(null);
        setMyStage(null);
        setReport(null);
        setTeam(null);
      }
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  // Screen-reader state — the scroll cue is suppressed while it's on (AT users
  // don't "scroll past" spatially; they morph the dock via the explicit controls).
  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled().then((v) => {
      screenReaderRef.current = v;
    });
    const sub = AccessibilityInfo.addEventListener("screenReaderChanged", (v) => {
      screenReaderRef.current = v;
    });
    return () => sub.remove();
  }, []);

  useFocusEffect(
    useCallback(() => {
      lastScrollYRef.current = 0; // reset the cue baseline so re-entry crosses cleanly
      enterDock(); // claim the bottom dock, land on Us in nav mode
      track(ANALYTICS_EVENTS.BUDDY_INVITE_VIEWED, { source: "community" });
      load();
      return () => leaveDock(); // release the dock back to global nav on blur
    }, [load, enterDock, leaveDock]),
  );

  // Scroll cue: morph the dock to TABS once the in-page switcher scrolls off the
  // top, and back to NAV when it returns. EDGE-triggered (fires only on crossing
  // the threshold) so a manual Menu/pill tap is never re-asserted while still
  // scrolled past the anchor; hysteresis bands; off for screen readers.
  const handleScrollY = useCallback(
    (y: number) => {
      const prev = lastScrollYRef.current;
      lastScrollYRef.current = y;
      if (!cueAnchor || screenReaderRef.current) return;
      const enterAt = cueAnchor; // scrolling down past this → tabs
      const exitAt = cueAnchor - 48; // scrolling back up past this → nav
      const mode = useCommunityDock.getState().mode;
      if (mode === "nav" && prev <= enterAt && y > enterAt) setDockMode("tabs");
      else if (mode === "tabs" && prev >= exitAt && y < exitAt) setDockMode("nav");
    },
    [cueAnchor, setDockMode],
  );

  const link = summary?.link ?? null;
  const isPaired = link?.status === "active";
  const isPending = link?.status === "pending";

  // The morph is only available once paired (the invite screen has no Us/Timeline).
  useEffect(() => {
    setDockEnabled(isPaired);
  }, [isPaired, setDockEnabled]);

  const handleStartPractice = () => {
    navigation.navigate("Root", { screen: ROUTE_NAMES.EXPLORE });
  };

  const handleOpenMoment = () => {
    track(ANALYTICS_EVENTS.MOMENT_COMPOSER_OPENED, { source: "community" });
    navigation.navigate("ShareMoment", {
      threadId: thread?.id ?? "",
      buddyName: buddyFirstName,
      onCreated: () => setFeedRefreshKey((k) => k + 1),
    });
  };

  const handleShare = async () => {
    if (!summary?.referralCode) return;
    const shared = await shareBuddyInvite(summary.referralCode);
    if (shared) {
      track(ANALYTICS_EVENTS.BUDDY_INVITE_SHARED, { source: "community" });
    }
  };

  const handleSubmitCode = async () => {
    if (!buddyCode.trim()) return;
    setSubmittingCode(true);
    try {
      await attachInviteCode(buddyCode.trim().toUpperCase());
      setBuddyCode("");
      track(ANALYTICS_EVENTS.BUDDY_INVITE_SHARED, { source: "community_redeem" });
      await load();
      // Show welcome if buddy link is now active
      const fresh = useInboxStore.getState().hasBuddy;
      if (fresh) setShowWelcome(true);
    } catch (e: any) {
      setErrorMessage(e.response?.data?.message || "Please check the code and try again.");
      setShowError(true);
    } finally {
      setSubmittingCode(false);
    }
  };

  const handleConsent = async (shared: boolean) => {
    if (!link) return;
    try {
      const updated = await setReportConsent(shared);
      track(ANALYTICS_EVENTS.BUDDY_REPORT_CONSENT_SET, { shared });
      setSummary((prev) => (prev ? { ...prev, link: updated } : prev));
    } catch (e) {
      Alert.alert("Couldn't update", "Please try again.");
    }
  };

  const handleLeave = () => {
    Alert.alert(
      "Leave buddy?",
      "You'll stop sharing progress with each other, and your slot frees up to invite someone else.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            try {
              setBusy(true);
              await leaveBuddy();
              track(ANALYTICS_EVENTS.BUDDY_LEFT, { by: "me" });
              await load();
            } catch (e) {
              Alert.alert("Couldn't leave", "Please try again.");
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  const buddyName = link?.buddy?.name ?? "Your Buddy";
  const buddyFirstName = buddyName.split(" ")[0];

  // In-flow header — title + subtitle + the in-page Us/Timeline switcher all
  // scroll away like every other page. The switcher's bottom feeds the scroll cue.
  const renderHeader = () => {
    return (
      <View>
        <PageHeader
          title="Community"
          description={
            isPaired
              ? `You & ${buddyFirstName} — keep it up together.`
              : "Practice sticks when someone's in it with you."
          }
          standalone
        />
        {isPaired && (
          <View
            style={styles.headerTabs}
            onLayout={(e) => {
              const { y, height } = e.nativeEvent.layout;
              setCueAnchor(y + height);
            }}
          >
            <TabDock
              inline
              fitContent
              accessibilityLabel="Community page tabs"
              items={[
                { key: "us", label: "Us", icon: "account-multiple-outline" },
                { key: "timeline", label: "Timeline", icon: "history", badge: unreadCount },
              ]}
              activeKey={view}
              onSelect={(k) => setView(k as "us" | "timeline")}
            />
          </View>
        )}
      </View>
    );
  };

  const renderInvite = () => (
    <View style={styles.inviteCardWrapper}>
      <View style={styles.howItWorksSection}>
        <View style={styles.stepItem}>
          <View style={[styles.stepIconBox, { backgroundColor: colors.action.primaryTint }]}>
            <MaterialCommunityIcons name="share-variant" size={24} color={colors.action.primary} />
          </View>
          <View style={styles.stepTextContent}>
            <Text variant="title">Share your code</Text>
            <Text variant="bodySm" color="secondary">Send your invite code to a friend.</Text>
          </View>
        </View>

        <View style={styles.stepItem}>
          <View style={[styles.stepIconBox, { backgroundColor: colors.action.primaryTint }]}>
            <MaterialCommunityIcons name="account-plus" size={24} color={colors.action.primary} />
          </View>
          <View style={styles.stepTextContent}>
            <Text variant="title">They sign up</Text>
            <Text variant="bodySm" color="secondary">They enter it when they create their account.</Text>
          </View>
        </View>

        <View style={styles.stepItem}>
          <View style={[styles.stepIconBox, { backgroundColor: colors.action.primaryTint }]}>
            <MaterialCommunityIcons name="rocket-launch" size={24} color={colors.action.primary} />
          </View>
          <View style={styles.stepTextContent}>
            <Text variant="title">Grow together</Text>
            <Text variant="bodySm" color="secondary">Keep each other going — share wins and cheer each other on.</Text>
          </View>
        </View>
      </View>

      <View style={{ flexGrow: 1, minHeight: 40 }} />

      <View style={[styles.inviteCard, { backgroundColor: colors.surface.elevated }, elevation.e2]}>
        {/* Watermark Layer */}
        <View style={styles.watermarkLayer} pointerEvents="none">
          <MaterialCommunityIcons name="gift" size={260} color={colors.action.primary} style={styles.watermarkIcon} />
        </View>

        <View style={styles.inviteTextContainer}>
          <Text variant="h2">Don't practice alone</Text>
          <Text variant="bodySm" color="secondary" style={styles.inviteSubtitleText}>
            You'll both show up more often when someone's counting on you.
          </Text>
        </View>

        {/* Fixed spacer for consistent breathing room */}
        <View style={{ height: 24 }} />

        <View style={styles.bottomBlock}>
          {isPending && (
            <View style={[styles.pendingPillImm, { backgroundColor: colors.action.primaryTint }]}>
              <MaterialCommunityIcons name="clock-fast" size={14} color={colors.action.primary} />
              <Text variant="caption" color={colors.action.primary} style={styles.bold}>Waiting for them to join…</Text>
            </View>
          )}
          <View style={[styles.codeBox, { backgroundColor: colors.surface.control, borderColor: colors.border.strong }]}>
            <View style={styles.codeRow}>
              <MaterialCommunityIcons name="content-copy" size={20} color={colors.action.primary} style={{ marginRight: 12 }} />
              <Text variant="h2" style={styles.codeValueImm}>{summary?.referralCode ?? "—"}</Text>
            </View>
          </View>
          <PressableScale
            onPress={handleShare}
            disabled={!summary?.referralCode}
            style={[styles.sharePill, { backgroundColor: colors.action.primary }]}
          >
            <Text variant="body" color={colors.action.onPrimary} style={styles.bold}>Invite my buddy</Text>
          </PressableScale>

          <View style={styles.dividerBox}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border.default }]} />
            <Text variant="caption" color="tertiary" style={styles.dividerText}>OR</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border.default }]} />
          </View>

          <View style={[styles.inputBox, { backgroundColor: colors.input.bg, borderColor: colors.input.border }]}>
            <TextInput
              style={[styles.codeInput, { color: colors.text.primary }]}
              placeholder="Enter invite code"
              placeholderTextColor={colors.input.placeholder}
              value={buddyCode}
              onChangeText={setBuddyCode}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={10}
            />
            <PressableScale
              onPress={handleSubmitCode}
              disabled={submittingCode || !buddyCode.trim()}
              style={[styles.submitCodeBtn, { backgroundColor: colors.action.primary }, (!buddyCode.trim() || submittingCode) && { opacity: 0.5 }]}
            >
              {submittingCode ? (
                <ActivityIndicator color={colors.action.onPrimary} size="small" />
              ) : (
                <MaterialCommunityIcons name="arrow-right-thick" size={20} color={colors.action.onPrimary} />
              )}
            </PressableScale>
          </View>
        </View>
      </View>
    </View>
  );

  const renderPaired = () => {
    const buddy = link?.buddy;
    const buddyShares = !!link?.buddySharesReports;
    const iShare = !!link?.iShareReports;
    const since = monthYear(link?.activatedAt ?? link?.createdAt);

    const myInitials = (user?.name ?? "You").substring(0, 1).toUpperCase();
    const buddyInitials = buddyName.substring(0, 1).toUpperCase();

    const me = {
      stage: myStage?.title ?? "—",
      level: myStage?.level ?? user?.level ?? 1,
      xp: myStage?.totalXp ?? user?.totalXp,
      active: relativeAgo(user?.lastLogin) ?? "—",
    };
    const them = {
      stage: stageTitleForLevel(myStage, report?.level),
      level: report?.level ?? 1,
      xp: report?.totalXp,
      active: relativeAgo(report?.lastPracticeAt) ?? "—",
    };

    const renderAvatar = (url?: string | null, initials?: string) =>
      url ? (
        <Image source={{ uri: url }} style={[styles.pAvatarImg, { backgroundColor: colors.surface.control }]} />
      ) : (
        <View style={[styles.pAvatarFallback, { backgroundColor: colors.surface.control }]}>
          <Text variant="h3" color={colors.action.primary}>{initials}</Text>
        </View>
      );

    // Cooperative figures — server-computed, cumulative, never a contest.
    const bondCeil = team?.bondXpCeiling ?? 1;
    const bondXpVal = team?.bondXp ?? 0;
    const bondToNext = Math.max(0, bondCeil - bondXpVal);
    const daysTogether =
      team?.daysTogether ?? daysBetween(link?.activatedAt ?? link?.createdAt);
    const momentumLine = team?.buddyLastPracticeAt
      ? `${buddyFirstName} practiced ${relativeAgo(team.buddyLastPracticeAt)}`
      : null;

    const enter = (i: number) =>
      reduceMotion ? FadeIn.duration(220) : FadeInDown.duration(280).delay(i * 60);

    return (
      <View style={styles.pairedWrapper}>
        {/* Partnership banner — overlapping avatars + stage pills */}
        <Animated.View entering={enter(0)} style={[styles.partnerCard, elevation.e2]}>
          <View style={[styles.partnerInner, { backgroundColor: colors.action.primary }]}>
            <View style={styles.overlappingAvatars}>
              <View style={[styles.avatarWrapper, { zIndex: 2, borderColor: colors.action.primary }]}>
                {renderAvatar(user?.profilePictureUrl, myInitials)}
              </View>
              <View style={[styles.avatarWrapper, { zIndex: 1, marginLeft: -20, borderColor: colors.action.primary }]}>
                {renderAvatar(buddy?.profilePictureUrl, buddyInitials)}
              </View>
            </View>
            <Text variant="h2" color={colors.action.onPrimary}>You & {buddyFirstName}</Text>
            {since ? (
              <View style={styles.partnerMeta}>
                <MaterialCommunityIcons name="calendar-heart" size={14} color={colors.action.onPrimary} />
                <Text variant="caption" color={colors.action.onPrimary}>Practice partners since {since}</Text>
              </View>
            ) : null}
            <View style={styles.stagePillsRow}>
              <View style={[styles.stagePill, { backgroundColor: colors.surface.default }]}>
                <Text variant="caption" color="primary" numberOfLines={1} style={styles.bold}>
                  {me.stage}
                </Text>
              </View>
              {buddyShares ? (
                <View style={[styles.stagePill, { backgroundColor: colors.surface.default }]}>
                  <Text variant="caption" color="primary" numberOfLines={1} style={styles.bold}>
                    {buddyFirstName} · {them.stage}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </Animated.View>

        {/* Together — cooperative progress, bento layout */}
        <Animated.View entering={enter(1)}>
          <SectionHeading title="Together" />
          <View style={styles.bento}>
            {/* Bond Level — hero tile */}
            <View style={[styles.bondCard, { backgroundColor: colors.accent.warning }]}>
              <View style={styles.tierRow}>
                <View style={[styles.statIconCircle, { backgroundColor: colors.surface.default, marginBottom: 0 }]}>
                  <MaterialCommunityIcons
                    name={(team?.bondStageIcon ?? "account-heart") as any}
                    size={20}
                    color={colors.accent.warning}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text variant="h3" color={colors.accentOn.warning}>{team?.bondStageTitle ?? "Kindred"}</Text>
                  <Text variant="bodySm" color={colors.accentOn.warning}>Bond Level {team?.bondLevel ?? 1}</Text>
                </View>
                <View style={[styles.bondXpBadge, { backgroundColor: colors.surface.default }]}>
                  <Text variant="caption" color="primary" style={styles.bold}>{bondXpVal.toLocaleString()} XP</Text>
                </View>
              </View>
              <Text variant="caption" color={colors.accentOn.warning}>
                {bondToNext.toLocaleString()} XP to Bond Level {(team?.bondLevel ?? 1) + 1}
                {team && !team.buddyShares
                  ? ` · ${buddyFirstName}'s XP joins once they share`
                  : ""}
              </Text>
              {momentumLine ? (
                <View style={[styles.liveRow, { borderTopColor: colors.accentOn.warning }]}>
                  <PulseDot color={colors.accentOn.warning} />
                  <Text variant="caption" color={colors.accentOn.warning} style={styles.liveText}>{momentumLine}</Text>
                </View>
              ) : null}
            </View>

            {/* Two stat tiles */}
            <View style={styles.statsRow}>
              <View style={[styles.statTile, { backgroundColor: colors.accent.purple }]}>
                <View style={[styles.statIconCircle, { backgroundColor: colors.surface.default }]}>
                  <MaterialCommunityIcons name="lightning-bolt" size={20} color={colors.accent.purple} />
                </View>
                <AnimatedNumber value={team?.combinedXpThisWeek ?? 0} color={colors.accentOn.purple} />
                <Text variant="caption" color={colors.accentOn.purple} style={[styles.statTileLabel]}>XP THIS WEEK</Text>
              </View>
              <View style={[styles.statTile, { backgroundColor: colors.accent.info }]}>
                <View style={[styles.statIconCircle, { backgroundColor: colors.surface.default }]}>
                  <MaterialCommunityIcons name="calendar-heart" size={20} color={colors.accent.info} />
                </View>
                <AnimatedNumber value={daysTogether} color={colors.accentOn.info} />
                <Text variant="caption" color={colors.accentOn.info} style={[styles.statTileLabel]}>DAYS TOGETHER</Text>
              </View>
            </View>

            {/* Weekly shared quest — vs your own pace, celebrated, never penalised */}
            <View style={[styles.questCard, { backgroundColor: colors.accent.danger }]}>
              <View style={styles.goalHeader}>
                <Text variant="caption" color={colors.accentOn.danger} style={[styles.goalCaption]}>THIS WEEK, TOGETHER</Text>
                <Text variant="caption" color={colors.accentOn.danger} style={styles.bold}>
                  {team?.weeklyCombinedDays ?? 0}/{team?.weeklyQuestTarget ?? 4} days
                </Text>
              </View>
              {team && team.weeklyCombinedDays >= team.weeklyQuestTarget ? (
                <View style={[styles.liveRow, { borderTopColor: colors.accentOn.danger }]}>
                  <Text variant="body">🎉</Text>
                  <Text variant="caption" color={colors.accentOn.danger} style={styles.liveText}>You hit this week's goal together!</Text>
                </View>
              ) : team?.bothActiveThisWeek ? (
                <View style={[styles.liveRow, { borderTopColor: colors.accentOn.danger }]}>
                  <MaterialCommunityIcons name="fire" size={16} color={colors.accentOn.danger} />
                  <Text variant="caption" color={colors.accentOn.danger} style={styles.liveText}>You hit this week's goal together!</Text>
                </View>
              ) : null}
            </View>
          </View>
        </Animated.View>

        {/* Actions & Settings — unified bento box */}
        <Animated.View entering={enter(3)}>
          <SectionHeading title="Manage" />
          <View style={[styles.actionGroup, { backgroundColor: colors.surface.elevated }, elevation.e1]}>
            {/* Share Progress */}
            <PressableScale style={styles.actionRow} scaleTo={0.98} onPress={() => handleConsent(!iShare)}>
              <View style={[styles.actionIconSquare, { backgroundColor: colors.surface.control }]}>
                <MaterialCommunityIcons name="chart-box" size={24} color={colors.text.primary} />
              </View>
              <View style={styles.actionTextWrap}>
                <Text variant="title">Share my progress</Text>
                <Text variant="bodySm" color="secondary">Let {buddyFirstName} see your XP and level.</Text>
              </View>
              <ToggleSwitch on={iShare} />
            </PressableScale>

            <View style={[styles.actionDivider, { backgroundColor: colors.border.default }]} />

            {/* Help & Resources */}
            <PressableScale style={styles.actionRow} scaleTo={0.98} onPress={() => navigation.navigate("Resources")}>
              <View style={[styles.actionIconSquare, { backgroundColor: colors.surface.control }]}>
                <MaterialCommunityIcons name="lifebuoy" size={24} color={colors.text.primary} />
              </View>
              <View style={styles.actionTextWrap}>
                <Text variant="title">Help & Resources</Text>
                <Text variant="bodySm" color="secondary">Learn more about community.</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={colors.text.tertiary} />
            </PressableScale>

            <View style={[styles.actionDivider, { backgroundColor: colors.border.default }]} />

            {/* Leave Buddy */}
            <PressableScale style={styles.actionRow} scaleTo={0.98} onPress={handleLeave}>
              <View style={[styles.actionIconSquare, { backgroundColor: colors.accentTint.danger }]}>
                <MaterialCommunityIcons name="exit-run" size={24} color={colors.feedback.dangerText} />
              </View>
              <View style={styles.actionTextWrap}>
                <Text variant="title" color={colors.feedback.dangerText}>Leave buddy</Text>
                <Text variant="bodySm" color="secondary">End this partnership.</Text>
              </View>
            </PressableScale>
          </View>
        </Animated.View>
      </View>
    );
  };

  return (
    <ScreenView style={[styles.screenView, { backgroundColor: colors.background.canvas }]}>
      <StatusBar barStyle="light-content" />
      {/* Dark canvas behind everything */}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.background.canvas }]} />

      <View style={styles.container}>
        {loading ? (
          <CommunitySkeleton topPad={insets.top + 20} />
        ) : error ? (
          <View style={styles.center}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={48}
              color={colors.text.tertiary}
              style={{ marginBottom: 12 }}
            />
            <Text variant="body" color="secondary" style={{ marginBottom: 20 }}>Couldn't load Community.</Text>
            <PressableScale onPress={load} style={[styles.retryBtn, { backgroundColor: colors.action.primary }]}>
              <Text variant="body" color={colors.action.onPrimary} style={styles.bold}>Retry</Text>
            </PressableScale>
          </View>
        ) : isPaired ? (
          <View style={{ flex: 1 }}>
            <ScrollView
              ref={scrollViewRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const offsetX = e.nativeEvent.contentOffset.x;
                const pageIndex = Math.round(offsetX / screenWidth);
                setView(pageIndex === 0 ? "us" : "timeline");
              }}
              style={{ flex: 1 }}
            >
              <View style={{ width: screenWidth }}>
                <CustomScrollView
                  contentContainerStyle={[styles.scrollView, { paddingBottom: 130, flexGrow: 1 }]}
                  onScrollY={handleScrollY}
                  refreshControl={
                    <RefreshControl
                      refreshing={refreshing}
                      onRefresh={onRefresh}
                      tintColor={colors.action.primary}
                      colors={[colors.action.primary]}
                      progressViewOffset={insets.top + 8}
                    />
                  }
                >
                  {renderHeader()}
                  {renderPaired()}
                </CustomScrollView>
              </View>
              <View style={{ width: screenWidth }}>
                <CustomScrollView
                  contentContainerStyle={[styles.scrollView, { paddingBottom: 130, flexGrow: 1 }]}
                  onScrollY={handleScrollY}
                  onEndReached={() => timelineRef.current?.loadMore()}
                  refreshControl={
                    <RefreshControl
                      refreshing={refreshing}
                      onRefresh={onRefresh}
                      tintColor={colors.action.primary}
                      colors={[colors.action.primary]}
                      progressViewOffset={insets.top + 8}
                    />
                  }
                >
                  {renderHeader()}
                  {thread ? (
                    <Timeline
                      ref={timelineRef}
                      key={`timeline-${feedRefreshKey}`}
                      threadId={thread.id}
                      buddyName={buddyFirstName}
                      onStartPractice={handleStartPractice}
                      onReachOut={setSupportSignal}
                    />
                  ) : null}
                </CustomScrollView>

                <TouchableOpacity
                  style={[styles.stickyFab, { backgroundColor: colors.action.primary, shadowColor: colors.shadow }]}
                  activeOpacity={0.85}
                  onPress={handleOpenMoment}
                >
                  <MaterialCommunityIcons name="plus" size={24} color={colors.action.onPrimary} />
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        ) : (
          <CustomScrollView
            contentContainerStyle={[
              styles.scrollView,
              { paddingBottom: 130 },
              { flexGrow: 1 },
            ]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.action.primary}
                colors={[colors.action.primary]}
                progressViewOffset={insets.top + 8}
              />
            }
          >
            {renderHeader()}
            {renderInvite()}
          </CustomScrollView>
        )}
      </View>

      {/* Opaque status-bar cap — content scrolls under the clock cleanly. */}
      {insets.top > 0 ? (
        <View
          style={[styles.statusCap, { height: insets.top, backgroundColor: colors.background.canvas }]}
          pointerEvents="none"
        />
      ) : null}

      {/* ── Buddy Welcome Modal ── */}
      <Modal visible={showWelcome} transparent animationType="fade" onRequestClose={() => setShowWelcome(false)}>
        <View style={[wm.overlay, { backgroundColor: colors.overlay.scrim }]}>
          <Animated.View entering={FadeInDown.springify().damping(18).stiffness(140)} style={[wm.card, { backgroundColor: colors.surface.elevated }, elevation.e3]}>
            {/* Watermark */}
            <View style={wm.watermarkLayer} pointerEvents="none">
              <MaterialCommunityIcons name="handshake" size={220} color={colors.action.primary} style={wm.watermarkIcon} />
            </View>

            {/* Close */}
            <TouchableOpacity onPress={() => setShowWelcome(false)} style={wm.closeBtn} activeOpacity={0.7}>
              <MaterialCommunityIcons name="close" size={20} color={colors.text.tertiary} />
            </TouchableOpacity>

            {/* Tag */}
            <Text variant="caption" color={colors.action.primary} style={wm.tag}>BUDDY CONNECTED</Text>

            {/* Title */}
            <Text variant="h2" style={wm.title}>You're now paired!</Text>

            {/* Message */}
            <Text variant="bodySm" color="secondary" style={wm.message}>
              Share your journey, support each other, and grow together.
            </Text>

            {/* CTA */}
            <TouchableOpacity style={[wm.cta, { backgroundColor: colors.action.primary }]} activeOpacity={0.85} onPress={() => setShowWelcome(false)}>
              <Text variant="body" color={colors.action.onPrimary} style={styles.bold}>Let's Go!</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {/* ── Invalid Code Error Modal ── */}
      <Modal visible={showError} transparent animationType="fade" onRequestClose={() => setShowError(false)}>
        <View style={[wm.overlay, { backgroundColor: colors.overlay.scrim }]}>
          <Animated.View entering={FadeInDown.springify().damping(18).stiffness(140)} style={[wm.card, { backgroundColor: colors.surface.elevated }, elevation.e3]}>
            {/* Watermark */}
            <View style={wm.watermarkLayer} pointerEvents="none">
              <MaterialCommunityIcons name="alert-circle" size={220} color={colors.feedback.danger} style={wm.watermarkIcon} />
            </View>

            {/* Close */}
            <TouchableOpacity onPress={() => setShowError(false)} style={wm.closeBtn} activeOpacity={0.7}>
              <MaterialCommunityIcons name="close" size={20} color={colors.text.tertiary} />
            </TouchableOpacity>

            {/* Tag */}
            <Text variant="caption" color={colors.feedback.dangerText} style={wm.tag}>INVALID CODE</Text>

            {/* Title */}
            <Text variant="h2" style={wm.title}>Couldn't Connect</Text>

            {/* Message */}
            <Text variant="bodySm" color="secondary" style={wm.message}>
              {errorMessage}
            </Text>

            {/* CTA */}
            <TouchableOpacity style={[wm.cta, { backgroundColor: colors.feedback.danger }]} activeOpacity={0.85} onPress={() => setShowError(false)}>
              <Text variant="body" color={colors.accentOn.danger} style={styles.bold}>Try Again</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      <BuddySupportSheet
        visible={!!supportSignal}
        signal={supportSignal}
        onClose={() => setSupportSignal(null)}
        onSupported={() => setFeedRefreshKey((k) => k + 1)}
      />
    </ScreenView>
  );
};

export default Community;

const styles = StyleSheet.create({
  screenView: {
    flex: 1,
    paddingHorizontal: 0,
  },
  container: { flex: 1 },
  bold: { fontFamily: fonts.bold },

  // Loading skeleton
  skelBlock: {},
  skelBanner: { height: 196, marginHorizontal: spacing.lg, borderRadius: radius.card, marginBottom: 28 },
  skelLabel: { height: 16, width: 130, marginHorizontal: spacing.lg, borderRadius: radius.sm, marginBottom: 14 },
  skelCard: { height: 184, marginHorizontal: spacing.lg, borderRadius: radius.card, marginBottom: 28 },
  skelToggle: { height: 72, marginHorizontal: spacing.lg, borderRadius: radius.card, marginBottom: 28 },
  skelLabelSm: { height: 16, width: 104, marginHorizontal: spacing.lg, borderRadius: radius.sm, marginBottom: 14 },
  skelDock: { height: 76, marginHorizontal: spacing.lg, borderRadius: radius.card },

  // Header
  statusCap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerTabs: { paddingHorizontal: space.screenX, marginTop: space.titleGap, alignSelf: "flex-start" },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  retryBtn: {
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.md,
    borderRadius: radius.full,
  },
  scrollView: { paddingHorizontal: 0 },

  // Paired — partnership layout
  pairedWrapper: {
    paddingTop: 4,
    paddingBottom: spacing["2xl"],
  },

  // Partnership banner (equal, together)
  partnerCard: {
    marginHorizontal: spacing.lg,
    marginBottom: 28,
    borderRadius: radius.card,
  },
  partnerInner: {
    borderRadius: radius.card,
    paddingVertical: spacing["2xl"],
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    position: "relative",
  },
  overlappingAvatars: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  avatarWrapper: {
    borderRadius: 36,
    borderWidth: 4,
  },
  pAvatarImg: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  pAvatarFallback: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  partnerMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
  },
  stagePillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: 14,
  },
  stagePill: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    maxWidth: 180,
  },

  // Section header (label + hint)
  sectionHeadRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },

  // Together — bento layout
  bento: { marginBottom: spacing.lg },

  // Bond Level — hero tile
  bondCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: radius.card,
    paddingHorizontal: spacing.xl,
    paddingVertical: 18,
  },
  tierRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.lg },
  statIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  bondXpBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.full,
  },

  // Live freshness row (momentum)
  liveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  liveText: { flexShrink: 1 },
  liveDotWrap: { width: 8, height: 8, alignItems: "center", justifyContent: "center" },
  liveDotPulse: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4 },

  // Two stat tiles
  statsRow: { flexDirection: "row", gap: spacing.md, marginHorizontal: spacing.lg, marginBottom: spacing.md },
  statTile: {
    flex: 1,
    borderRadius: radius.chip,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  statTileLabel: {
    marginTop: 4,
    letterSpacing: 0.5,
  },

  // Weekly shared quest tile
  questCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: radius.chip,
    paddingHorizontal: 18,
    paddingVertical: spacing.lg,
  },
  goalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  goalCaption: { letterSpacing: 0.8 },

  // Unified Action Group
  actionGroup: {
    marginHorizontal: spacing.lg,
    marginBottom: 28,
    borderRadius: radius.card,
    overflow: "hidden",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: 14,
  },
  actionDivider: {
    height: 1,
    marginLeft: 16 + 52 + 14, // align with text (paddingLeft + iconSquare + gap)
  },
  actionIconSquare: {
    width: 52,
    height: 52,
    borderRadius: radius.input,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTextWrap: { flex: 1, paddingRight: spacing.sm },
  toggleTrack: {
    width: 44,
    height: 26,
    borderRadius: 13,
    padding: 2,
    justifyContent: "center",
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },

  // Invite Referral Card
  inviteCardWrapper: {
    marginHorizontal: spacing["2xl"],
    flexGrow: 1,
  },
  inviteCard: {
    width: "100%",
    borderRadius: radius.sheet,
    paddingTop: spacing["3xl"],
    paddingBottom: spacing["2xl"],
    paddingHorizontal: spacing["2xl"],
    alignItems: "center",
    zIndex: 1,
  },
  watermarkLayer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.sheet,
    overflow: "hidden",
    zIndex: -1,
  },
  watermarkIcon: {
    position: "absolute",
    right: -50,
    bottom: -50,
    opacity: 0.06,
    transform: [{ rotate: "-15deg" }],
  },
  inviteTextContainer: {
    alignItems: "center",
    marginTop: spacing.md,
  },
  inviteSubtitleText: {
    textAlign: "center",
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  bottomBlock: { alignItems: "center", width: "100%", gap: spacing.lg },
  howItWorksSection: {
    paddingHorizontal: 4,
    paddingTop: spacing.md,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing["2xl"],
    gap: spacing.lg,
  },
  stepIconBox: {
    width: 52,
    height: 52,
    borderRadius: radius.input,
    alignItems: "center",
    justifyContent: "center",
  },
  stepTextContent: {
    flex: 1,
    gap: 2,
  },
  codeBox: {
    width: "100%",
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: radius.input,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  codeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  codeValueImm: {
    letterSpacing: 1,
  },
  sharePill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingVertical: spacing.lg,
    borderRadius: radius.input,
  },
  pendingPillImm: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  stickyFab: {
    position: "absolute",
    bottom: 110,
    right: spacing["2xl"],
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },

  dividerBox: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginVertical: spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 14,
    letterSpacing: 1,
  },
  inputBox: {
    flexDirection: "row",
    width: "100%",
    height: 58,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 6,
    alignItems: "center",
  },
  codeInput: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 14,
    ...typography.body,
    fontFamily: fonts.bold,
    letterSpacing: 1,
  },
  submitCodeBtn: {
    height: 46,
    width: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});

const wm = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing["2xl"],
  },
  card: {
    borderRadius: radius.sheet,
    paddingHorizontal: spacing["3xl"],
    paddingTop: spacing["5xl"],
    paddingBottom: spacing["3xl"],
    width: "100%",
    maxWidth: 380,
    alignItems: "center",
  },
  closeBtn: {
    position: "absolute",
    top: spacing.xl,
    right: spacing.xl,
    zIndex: 10,
  },
  watermarkLayer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.sheet,
    overflow: "hidden",
    zIndex: 0,
  },
  watermarkIcon: {
    position: "absolute",
    right: -40,
    bottom: -40,
    opacity: 0.07,
    transform: [{ rotate: "-15deg" }],
  },
  tag: {
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: spacing.sm,
    zIndex: 1,
  },
  title: {
    textAlign: "center",
    marginBottom: spacing.md,
    zIndex: 1,
  },
  message: {
    textAlign: "center",
    marginBottom: spacing["3xl"],
    zIndex: 1,
  },
  cta: {
    width: "100%",
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
});
