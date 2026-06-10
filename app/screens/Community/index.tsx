import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
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
import Timeline from "../../components/Timeline";
import ShareMomentSheet from "../../components/ShareMomentSheet";
import BuddySupportSheet from "../../components/BuddySupportSheet";
import SegmentedTabs from "../../components/SegmentedTabs";
import PressableScale from "../../components/PressableScale";
import { theme } from "../../Theme/tokens";
import { parseTextStyle, parseShadowStyle } from "../../util/functions/parseStyles";
import {
  BuddySummary,
  BuddyTeam,
  getBuddyReport,
  getBuddyTeam,
  getMyBuddy,
  leaveBuddy,
  setReportConsent,
} from "../../api/buddies";
import { Signal, Thread, getThread } from "../../api/threads";
import { getLevelStage, LevelStage } from "../../api/users";
import { useUserStore } from "../../stores/user";
import { useInboxStore } from "../../stores/inbox";
import { shareBuddyInvite } from "../../util/functions/share";
import { ROUTE_NAMES } from "../../constants/routes";
import { track } from "../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../util/analytics/analyticsEvents";

const HEADER_HEIGHT = 100;

const C = {
  orange500: theme.colors.library.orange[500], // #FF6B00
  orange600: theme.colors.library.orange[600], // #BF5000
  orange700: theme.colors.library.orange[700], // #803600
  title: theme.colors.text.title, // orange[800] #401B00
  textMuted: theme.colors.text.default, // gray[400]
  peach: "#FFF7ED",
  peachSurface: theme.colors.library.orange[100], // #FFF0E5
  warmBorder: theme.colors.library.orange[200], // #FFDABF
  hairline: theme.colors.library.gray[100], // #ECEDEE
  faint: theme.colors.library.gray[300], // #A1A4AA
  trackOff: "#E5E5EA",
};

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
  style,
  duration = 700,
}: {
  value: number;
  style?: StyleProp<TextStyle>;
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
  return <Text style={style}>{display.toLocaleString()}</Text>;
};

/** A shared-progress bar that fills 0 → ratio on mount. */
const SharedGoalBar = ({ ratio }: { ratio: number }) => {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);
  useEffect(() => {
    const clamped = Math.max(0, Math.min(1, ratio));
    progress.value = reduceMotion
      ? clamped
      : withTiming(clamped, { duration: 700, easing: EASE_OUT });
  }, [ratio, reduceMotion]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));
  return (
    <View style={styles.goalTrack}>
      <Animated.View style={[styles.goalFill, fillStyle]}>
        <LinearGradient
          colors={[theme.colors.library.orange[400], C.orange500]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
};

/** Visual half of the share toggle — thumb slides + track crossfades on `on`. */
const ToggleSwitch = ({ on }: { on: boolean }) => {
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
    backgroundColor: interpolateColor(v.value, [0, 1], [C.trackOff, C.orange500]),
  }));
  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: v.value * 20 }] }));
  return (
    <Animated.View style={[styles.toggleTrack, trackStyle]}>
      <Animated.View style={[styles.toggleThumb, thumbStyle]} />
    </Animated.View>
  );
};

/** Section header with a small organic accent bar + optional right-side hint. */
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
    <Text style={styles.sectionHeadTitle}>{title}</Text>
    {hint ? <Text style={styles.sectionHeadHint}>{hint}</Text> : null}
  </View>
);

/** A pulsing placeholder block for the loading skeleton. */
const SkeletonBlock = ({ style }: { style?: StyleProp<ViewStyle> }) => {
  const reduceMotion = useReducedMotion();
  const o = useSharedValue(0.5);
  useEffect(() => {
    o.value = reduceMotion
      ? 0.6
      : withRepeat(withTiming(1, { duration: 850, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [reduceMotion]);
  const s = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[styles.skelBlock, style, s]} />;
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
const PulseDot = () => {
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
      {!reduceMotion ? <Animated.View style={[styles.liveDotPulse, ring]} /> : null}
      <View style={styles.liveDot} />
    </View>
  );
};

const Community = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [summary, setSummary] = useState<BuddySummary | null>(null);
  const [report, setReport] = useState<BuddyReport | null>(null);
  const [team, setTeam] = useState<BuddyTeam | null>(null);
  const [myStage, setMyStage] = useState<LevelStage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showMoment, setShowMoment] = useState(false);
  const [thread, setThread] = useState<Thread | null>(null);
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);
  const [view, setView] = useState<"us" | "timeline">("us");
  const [supportSignal, setSupportSignal] = useState<Signal | null>(null);
  const user = useUserStore((s) => s.user);
  const unreadCount = useInboxStore((s) => s.unreadCount);
  const reduceMotion = useReducedMotion();

  const load = useCallback(async () => {
    try {
      setError(false);
      const data = await getMyBuddy();
      setSummary(data);
      if (data.link?.status === "active") {
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

  useFocusEffect(
    useCallback(() => {
      track(ANALYTICS_EVENTS.BUDDY_INVITE_VIEWED, { source: "community" });
      load();
    }, [load]),
  );

  const link = summary?.link ?? null;
  const isPaired = link?.status === "active";
  const isPending = link?.status === "pending";

  const handleStartPractice = () => {
    navigation.navigate("Root", { screen: ROUTE_NAMES.EXPLORE });
  };

  const handleOpenMoment = () => {
    track(ANALYTICS_EVENTS.MOMENT_COMPOSER_OPENED, { source: "community" });
    setShowMoment(true);
  };

  const handleShare = async () => {
    if (!summary?.referralCode) return;
    const shared = await shareBuddyInvite(summary.referralCode);
    if (shared) {
      track(ANALYTICS_EVENTS.BUDDY_INVITE_SHARED, { source: "community" });
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

  const renderHeader = () => {
    return (
      <BlurView
        intensity={80}
        tint="light"
        style={[styles.header, { paddingTop: insets.top + 20, height: HEADER_HEIGHT + insets.top }]}
      >
        <Text style={styles.title}>Community</Text>
        <Text style={styles.subtitle}>
          {isPaired
            ? `You & ${buddyFirstName} — keep it up together.`
            : "Practice sticks when someone's in it with you."}
        </Text>
      </BlurView>
    );
  };

  const renderInvite = () => (
    <View style={styles.inviteCardWrapper}>

      <View style={styles.howItWorksSection}>
        <View style={styles.stepItem}>
          <View style={styles.stepIconBox}>
            <MaterialCommunityIcons name="share-variant" size={24} color={C.orange500} />
          </View>
          <View style={styles.stepTextContent}>
            <Text style={styles.stepTitle}>Share your code</Text>
            <Text style={styles.stepDescription}>Send your invite code to a friend.</Text>
          </View>
        </View>

        <View style={styles.stepItem}>
          <View style={styles.stepIconBox}>
            <MaterialCommunityIcons name="account-plus" size={24} color={C.orange500} />
          </View>
          <View style={styles.stepTextContent}>
            <Text style={styles.stepTitle}>They sign up</Text>
            <Text style={styles.stepDescription}>They enter it when they create their account.</Text>
          </View>
        </View>

        <View style={styles.stepItem}>
          <View style={styles.stepIconBox}>
            <MaterialCommunityIcons name="rocket-launch" size={24} color={C.orange500} />
          </View>
          <View style={styles.stepTextContent}>
            <Text style={styles.stepTitle}>Grow together</Text>
            <Text style={styles.stepDescription}>Keep each other going — share wins and cheer each other on.</Text>
          </View>
        </View>
      </View>

      <View style={{ flexGrow: 1, minHeight: 40 }} />

      <View style={styles.inviteCard}>
        {/* Watermark Layer */}
        <View style={styles.watermarkLayer} pointerEvents="none">
          <MaterialCommunityIcons name="gift" size={260} color="#CBD5E1" style={styles.watermarkIcon} />
        </View>

        <View style={styles.inviteTextContainer}>
          <Text style={styles.bigHeadline}>Don't practice alone</Text>
          <Text style={styles.inviteSubtitleText}>
            You'll both show up more often when someone's counting on you.
          </Text>
        </View>

        {/* Fixed spacer for consistent breathing room */}
        <View style={{ height: 24 }} />

        <View style={styles.bottomBlock}>
          {isPending && (
            <View style={styles.pendingPillImm}>
              <MaterialCommunityIcons name="clock-fast" size={14} color={C.orange600} />
              <Text style={styles.pendingTextImm}>Waiting for them to join…</Text>
            </View>
          )}
          <View style={styles.codeBox}>
            <View style={styles.codeRow}>
              <MaterialCommunityIcons name="content-copy" size={20} color={C.orange500} style={{ marginRight: 12 }} />
              <Text style={styles.codeValueImm}>{summary?.referralCode ?? "—"}</Text>
            </View>
          </View>
          <PressableScale
            onPress={handleShare}
            disabled={!summary?.referralCode}
            style={styles.sharePill}
          >
            <Text style={styles.sharePillText}>Invite my buddy</Text>
          </PressableScale>
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
        <Image source={{ uri: url }} style={styles.pAvatarImg} />
      ) : (
        <View style={styles.pAvatarFallback}>
          <Text style={styles.pAvatarLetter}>{initials}</Text>
        </View>
      );

    // Cooperative figures — server-computed, cumulative, never a contest.
    const bondFloor = team?.bondXpFloor ?? 0;
    const bondCeil = team?.bondXpCeiling ?? 1;
    const bondXpVal = team?.bondXp ?? 0;
    const bondRatio =
      bondCeil > bondFloor ? (bondXpVal - bondFloor) / (bondCeil - bondFloor) : 0;
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
        <Animated.View entering={enter(0)} style={styles.partnerCard}>
          <LinearGradient
            colors={[theme.colors.library.red[300], theme.colors.library.orange[400]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.partnerGradient}
          >
            {/* Decorative bubbles (matches Home's feature card) */}
            <View style={styles.bubbleTopRight} pointerEvents="none" />
            <View style={styles.bubbleBottomLeft} pointerEvents="none" />

            <View style={styles.overlappingAvatars}>
              <View style={[styles.avatarWrapper, { zIndex: 2 }]}>
                {renderAvatar(user?.profilePictureUrl, myInitials)}
              </View>
              <View style={[styles.avatarWrapper, { zIndex: 1, marginLeft: -20 }]}>
                {renderAvatar(buddy?.profilePictureUrl, buddyInitials)}
              </View>
            </View>
            <Text style={styles.partnerUnifiedName}>You & {buddyFirstName}</Text>
            {since ? (
              <View style={styles.partnerMeta}>
                <MaterialCommunityIcons
                  name="calendar-heart"
                  size={14}
                  color="rgba(255,255,255,0.9)"
                />
                <Text style={styles.partnerMetaText}>Practice partners since {since}</Text>
              </View>
            ) : null}
            <View style={styles.stagePillsRow}>
              <View style={styles.stagePill}>
                <Text style={styles.stagePillText} numberOfLines={1}>
                  You · {me.stage}
                </Text>
              </View>
              {buddyShares ? (
                <View style={styles.stagePill}>
                  <Text style={styles.stagePillText} numberOfLines={1}>
                    {buddyFirstName} · {them.stage}
                  </Text>
                </View>
              ) : null}
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Together — cooperative progress, bento layout */}
        <Animated.View entering={enter(1)}>
          <SectionHeading title="Together" />
          <View style={styles.bento}>
            {/* Bond Level — hero tile (shared-era combined XP via the level engine) */}
            <View style={styles.bondCard}>
              <View
                style={[StyleSheet.absoluteFillObject, { borderRadius: 24, overflow: "hidden" }]}
                pointerEvents="none"
              >
                <MaterialCommunityIcons
                  name={(team?.bondStageIcon ?? "account-heart") as any}
                  size={140}
                  color="#CBD5E1"
                  style={{ position: "absolute", right: -30, bottom: -30, opacity: 0.04, transform: [{ rotate: "-10deg" }] }}
                />
              </View>

              <View style={styles.tierRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tierName}>{team?.bondStageTitle ?? "Kindred"}</Text>
                  <Text style={styles.tierSub}>Bond Level {team?.bondLevel ?? 1}</Text>
                </View>
                <Text style={styles.bondXpBadge}>{bondXpVal.toLocaleString()} XP</Text>
              </View>
              <SharedGoalBar ratio={bondRatio} />
              <Text style={styles.goalSub}>
                {bondToNext.toLocaleString()} XP to Bond Level {(team?.bondLevel ?? 1) + 1}
                {team && !team.buddyShares
                  ? ` · ${buddyFirstName}'s XP joins once they share`
                  : ""}
              </Text>
              {momentumLine ? (
                <View style={styles.liveRow}>
                  <PulseDot />
                  <Text style={styles.liveText}>{momentumLine}</Text>
                </View>
              ) : null}
            </View>

            {/* Two stat tiles */}
            <View style={styles.statsRow}>
              <View style={styles.statTile}>
                <View
                  style={[StyleSheet.absoluteFillObject, { borderRadius: 20, overflow: "hidden" }]}
                  pointerEvents="none"
                >
                  <MaterialCommunityIcons
                    name="lightning-bolt"
                    size={86}
                    color="#CBD5E1"
                    style={{ position: "absolute", right: -25, bottom: -25, opacity: 0.04, transform: [{ rotate: "-10deg" }] }}
                  />
                </View>
                <AnimatedNumber
                  value={team?.combinedXpThisWeek ?? 0}
                  style={styles.statTileValue}
                />
                <Text style={styles.statTileLabel}>XP THIS WEEK</Text>
              </View>
              <View style={styles.statTile}>
                <View
                  style={[StyleSheet.absoluteFillObject, { borderRadius: 20, overflow: "hidden" }]}
                  pointerEvents="none"
                >
                  <MaterialCommunityIcons
                    name="calendar-heart"
                    size={80}
                    color="#CBD5E1"
                    style={{ position: "absolute", right: -20, bottom: -20, opacity: 0.04, transform: [{ rotate: "-10deg" }] }}
                  />
                </View>
                <AnimatedNumber value={daysTogether} style={styles.statTileValue} />
                <Text style={styles.statTileLabel}>DAYS TOGETHER</Text>
              </View>
            </View>

            {/* Weekly shared quest — vs your own pace, celebrated, never penalised */}
            <View style={styles.questCard}>
              <View
                style={[StyleSheet.absoluteFillObject, { borderRadius: 20, overflow: "hidden" }]}
                pointerEvents="none"
              >
                <MaterialCommunityIcons
                  name="target"
                  size={100}
                  color="#CBD5E1"
                  style={{ position: "absolute", right: -25, bottom: -25, opacity: 0.04, transform: [{ rotate: "-10deg" }] }}
                />
              </View>
              <View style={styles.goalHeader}>
                <Text style={styles.goalCaption}>THIS WEEK, TOGETHER</Text>
                <Text style={styles.goalGoal}>
                  {team?.weeklyCombinedDays ?? 0}/{team?.weeklyQuestTarget ?? 4} days
                </Text>
              </View>
              <View style={{ marginTop: 12 }}>
                <SharedGoalBar
                  ratio={
                    team && team.weeklyQuestTarget > 0
                      ? team.weeklyCombinedDays / team.weeklyQuestTarget
                      : 0
                  }
                />
              </View>
              {team && team.weeklyCombinedDays >= team.weeklyQuestTarget ? (
                <View style={styles.liveRow}>
                  <Text style={{ fontSize: 14 }}>🎉</Text>
                  <Text style={styles.liveText}>You hit this week's goal together!</Text>
                </View>
              ) : team?.bothActiveThisWeek ? (
                <View style={styles.liveRow}>
                  <MaterialCommunityIcons name="fire" size={16} color={C.orange500} />
                  <Text style={styles.liveText}>You've both shown up this week</Text>
                </View>
              ) : null}
            </View>
          </View>
        </Animated.View>

        {/* Share a moment — canned struggle/win check-in */}
        <Animated.View entering={enter(3)}>
          <SectionHeading title="Share a moment" />
          <PressableScale style={styles.momentCard} scaleTo={0.98} onPress={handleOpenMoment}>
            <View style={styles.momentIconCircle}>
              <MaterialCommunityIcons name="hand-heart-outline" size={22} color={C.orange500} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.momentCardTitle}>Tell {buddyFirstName} how it's going</Text>
              <Text style={styles.momentCardSub}>Share a win or a hard moment.</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color={C.faint} />
          </PressableScale>
        </Animated.View>

        {/* Manage — share toggle, resources, leave */}
        <Animated.View entering={enter(4)}>
          <PressableScale
            style={styles.toggleCard}
            scaleTo={0.98}
            onPress={() => handleConsent(!iShare)}
          >
            <View style={styles.toggleTextWrap}>
              <Text style={styles.toggleTitle}>Share my progress</Text>
              <Text style={styles.toggleSub}>
                Let {buddyFirstName} see your level, XP and activity.
              </Text>
            </View>
            <ToggleSwitch on={iShare} />
          </PressableScale>
          <PressableScale
            style={styles.resourcesLink}
            scaleTo={0.97}
            haptic={false}
            onPress={() => navigation.navigate("Resources")}
            accessibilityLabel="Help and resources"
          >
            <MaterialCommunityIcons name="lifebuoy" size={15} color={C.orange700} />
            <Text style={styles.resourcesLinkText}>Help & Resources</Text>
          </PressableScale>
          <PressableScale
            style={styles.leaveLink}
            scaleTo={0.96}
            haptic={false}
            onPress={handleLeave}
          >
            <Text style={styles.leaveLinkText}>Leave buddy</Text>
          </PressableScale>
        </Animated.View>
      </View>
    );
  };

  return (
    <ScreenView style={styles.screenView}>
      {/* Background gradient — matches Explore (peach → white) */}
      <View style={StyleSheet.absoluteFillObject}>
        <LinearGradient
          colors={["#FFF7ED", "#FFF", "#FFF"]}
          locations={[0, 0.4, 1]}
          style={{ flex: 1 }}
        />
      </View>

      {renderHeader()}

      <View style={styles.container}>
        {loading ? (
          <CommunitySkeleton topPad={HEADER_HEIGHT + insets.top + 20} />
        ) : error ? (
          <View style={styles.center}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={48}
              color={C.faint}
              style={{ marginBottom: 12 }}
            />
            <Text style={styles.errorText}>Couldn't load Community.</Text>
            <PressableScale onPress={load} style={styles.retryBtn}>
              <Text style={styles.retryText}>Retry</Text>
            </PressableScale>
          </View>
        ) : isPaired ? (
          <View style={{ flex: 1, paddingTop: HEADER_HEIGHT + insets.top + 12 }}>
            <View style={styles.segmentWrap}>
              <SegmentedTabs
                tabs={[
                  { key: "us", label: "Us" },
                  { key: "timeline", label: "Timeline", badge: unreadCount },
                ]}
                active={view}
                onChange={(k) => setView(k as "us" | "timeline")}
              />
            </View>
            <CustomScrollView
              contentContainerStyle={[styles.scrollView, { paddingTop: 12, paddingBottom: 130 }]}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={C.orange500}
                  colors={[C.orange500]}
                  progressViewOffset={8}
                />
              }
            >
              {view === "us" ? (
                renderPaired()
              ) : thread ? (
                <Timeline
                  key={`timeline-${feedRefreshKey}`}
                  threadId={thread.id}
                  buddyName={buddyFirstName}
                  onStartPractice={handleStartPractice}
                  onReachOut={setSupportSignal}
                />
              ) : null}
            </CustomScrollView>
          </View>
        ) : (
          <CustomScrollView
            contentContainerStyle={[
              styles.scrollView,
              { paddingTop: HEADER_HEIGHT + insets.top + 28, paddingBottom: 130 },
              { flexGrow: 1 },
            ]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={C.orange500}
                colors={[C.orange500]}
                progressViewOffset={HEADER_HEIGHT + insets.top}
              />
            }
          >
            {renderInvite()}
          </CustomScrollView>
        )}
      </View>

      <ShareMomentSheet
        visible={showMoment}
        onClose={() => setShowMoment(false)}
        threadId={thread?.id ?? ""}
        buddyName={buddyFirstName}
        onCreated={() => setFeedRefreshKey((k) => k + 1)}
      />

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


  // Loading skeleton
  skelBlock: { backgroundColor: theme.colors.library.gray[100] },
  skelBanner: { height: 196, marginHorizontal: 16, borderRadius: 24, marginBottom: 28 },
  skelLabel: { height: 16, width: 130, marginHorizontal: 16, borderRadius: 8, marginBottom: 14 },
  skelCard: { height: 184, marginHorizontal: 16, borderRadius: 24, marginBottom: 28 },
  skelToggle: { height: 72, marginHorizontal: 16, borderRadius: 24, marginBottom: 28 },
  skelLabelSm: { height: 16, width: 104, marginHorizontal: 16, borderRadius: 8, marginBottom: 14 },
  skelDock: { height: 76, marginHorizontal: 16, borderRadius: 24 },

  // Cheer burst (rising emoji on send)
  cheerCardWrap: { position: "relative" },
  cheerBurst: { position: "absolute", top: -6, left: 0, right: 0, alignItems: "center", zIndex: 5 },
  cheerBurstEmoji: { fontSize: 34 },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingHorizontal: 16,
    gap: 4,
  },
  title: {
    ...parseTextStyle(theme.typography.Heading2),
    color: theme.colors.text.title,
  },
  subtitle: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  errorText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    marginBottom: 20,
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 100,
    backgroundColor: C.orange500,
  },
  retryText: { color: "#FFFFFF", fontWeight: "700", fontSize: 16 },
  scrollView: { paddingHorizontal: 0 },
  segmentWrap: { paddingHorizontal: 16, marginBottom: 4 },

  // Invite Layout (cardless / editorial)
  invite: { alignItems: "center", paddingHorizontal: 28, paddingTop: 8 },
  heroBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
    backgroundColor: "#FFFFFF",
    ...parseShadowStyle(theme.shadow.elevation2),
  },
  inviteTitle: {
    ...parseTextStyle(theme.typography.Heading1),
    color: theme.colors.text.title,
    textAlign: "center",
    marginBottom: 12,
  },
  inviteSubtitle: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    textAlign: "center",
    lineHeight: 23,
    marginBottom: 28,
  },
  pendingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 24,
  },
  pendingText: { color: C.orange700, fontSize: 14, fontWeight: "700" },
  codeBlock: { alignItems: "center", marginBottom: 32 },
  codeLabel: {
    ...parseTextStyle(theme.typography.LabelSmall),
    letterSpacing: 2,
    color: C.orange600,
    marginBottom: 10,
    textAlign: "center",
  },
  codeValue: {
    fontSize: 40,
    fontWeight: "900",
    letterSpacing: 6,
    color: theme.colors.text.title,
    textAlign: "center",
  },
  codeUnderline: {
    marginTop: 14,
    width: 64,
    height: 3,
    borderRadius: 2,
    backgroundColor: C.warmBorder,
  },
  primaryBtnWrap: { width: "100%" },
  primaryBtn: {
    width: "100%",
    height: 56,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  helperText: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: C.faint,
    textAlign: "center",
    marginTop: 14,
  },

  // Paired — partnership layout
  pairedWrapper: {
    paddingTop: 4,
    paddingBottom: 24,
  },

  // Partnership banner (equal, together)
  partnerCard: {
    marginHorizontal: 16,
    marginBottom: 28,
    borderRadius: 24,
    ...parseShadowStyle(theme.shadow.elevation3),
  },
  partnerGradient: {
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: "center",
    overflow: "hidden",
    position: "relative",
  },
  bubbleTopRight: {
    position: "absolute",
    top: -70,
    right: -70,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  bubbleBottomLeft: {
    position: "absolute",
    bottom: -50,
    left: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255, 255, 255, 0.10)",
  },
  overlappingAvatars: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  avatarWrapper: {
    borderRadius: 36,
    borderWidth: 4,
    borderColor: "#FFFFFF",
  },
  pAvatarImg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.peachSurface,
  },
  pAvatarFallback: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.peachSurface,
    alignItems: "center",
    justifyContent: "center",
  },
  pAvatarLetter: { fontSize: 24, fontWeight: "800", color: C.orange600 },
  partnerUnifiedName: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FFFFFF",
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  partnerMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
  },
  partnerMetaText: { fontSize: 13, fontWeight: "700", color: "rgba(255,255,255,0.92)" },
  stagePillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
  },
  stagePill: {
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 5,
    maxWidth: 160,
  },
  stagePillText: { fontSize: 12, fontWeight: "800", color: "#FFFFFF" },
  partnerCheers: { fontSize: 13, color: "rgba(255,255,255,0.9)", marginTop: 14, textAlign: "center" },

  // Section header (label + hint)
  sectionHeadRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginBottom: 12,
  },
  sectionHeadTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },
  sectionHeadHint: { fontSize: 12, fontWeight: "600", color: C.textMuted },

  // Together — bento layout
  bento: { marginBottom: 16 },

  // Bond Level — hero tile
  bondCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 18,
    ...parseShadowStyle(theme.shadow.elevation2),
  },
  tierRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 14 },
  tierIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: C.peachSurface,
    alignItems: "center",
    justifyContent: "center",
  },
  tierName: { fontSize: 18, fontWeight: "900", color: theme.colors.text.title },
  tierSub: { fontSize: 13, color: C.textMuted, marginTop: 2, fontWeight: "600" },
  bondXpBadge: {
    fontSize: 12,
    fontWeight: "800",
    color: C.orange700,
    backgroundColor: C.peachSurface,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    overflow: "hidden",
  },
  goalSub: { fontSize: 12, color: C.textMuted, marginTop: 8, fontWeight: "600" },

  // Live freshness row (momentum)
  liveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: C.hairline,
  },
  liveDotWrap: { width: 8, height: 8, alignItems: "center", justifyContent: "center" },
  liveDotPulse: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.orange500,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.orange500 },
  liveText: { fontSize: 13, fontWeight: "700", color: C.orange700, flexShrink: 1 },

  // Two stat tiles
  statsRow: { flexDirection: "row", gap: 12, marginHorizontal: 16, marginBottom: 12 },
  statTile: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  statTileIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.peachSurface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  statTileValue: { fontSize: 26, fontWeight: "900", color: theme.colors.text.title },
  statTileLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: C.textMuted,
    marginTop: 4,
    letterSpacing: 0.5,
  },

  // Weekly shared quest tile
  questCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 16,
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  goalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  goalCaption: { fontSize: 11, fontWeight: "800", letterSpacing: 0.8, color: C.textMuted },
  goalGoal: { fontSize: 12, fontWeight: "700", color: C.textMuted },
  goalTrack: {
    height: 12,
    borderRadius: 6,
    backgroundColor: C.peachSurface,
    overflow: "hidden",
  },
  goalFill: { height: "100%", borderRadius: 6, overflow: "hidden" },


  // Non-ranked community pool strip
  poolStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    backgroundColor: C.peachSurface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  poolText: { fontSize: 12, color: C.orange700, fontWeight: "700", flexShrink: 1 },

  // Share my progress toggle
  toggleCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 16,
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  toggleTextWrap: { flex: 1, paddingRight: 16 },
  toggleTitle: { fontSize: 15, fontWeight: "800", color: theme.colors.text.title },
  toggleSub: { fontSize: 13, color: theme.colors.text.default, marginTop: 2, lineHeight: 18 },
  toggleTrack: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.trackOff,
    padding: 2,
    justifyContent: "center",
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    ...parseShadowStyle(theme.shadow.elevation1),
  },

  // Cheers
  cheerCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 28,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 16,
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  cheerPrompt: {
    fontSize: 13,
    fontWeight: "600",
    color: C.textMuted,
    marginBottom: 14,
    lineHeight: 18,
  },
  cheerGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  cheerChip: {
    width: "48%",
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.peachSurface,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  cheerChipDone: { backgroundColor: C.warmBorder, borderColor: C.orange500 },
  cheerChipInner: { flexDirection: "row", alignItems: "center", gap: 7 },
  cheerChipEmoji: { fontSize: 19 },
  cheerChipLabel: { fontSize: 13, fontWeight: "800", color: C.orange700, flexShrink: 1 },

  // Share a moment — entry card
  momentCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginHorizontal: 16,
    marginBottom: 28,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  momentIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.peachSurface,
    alignItems: "center",
    justifyContent: "center",
  },
  momentCardTitle: { fontSize: 15, fontWeight: "800", color: theme.colors.text.title },
  momentCardSub: { fontSize: 13, color: theme.colors.text.default, marginTop: 2, lineHeight: 18 },

  // Leave (quiet)
  leaveLink: {
    alignSelf: "center",
    marginTop: 8,
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  leaveLinkText: { fontSize: 14, fontWeight: "600", color: C.textMuted },
  resourcesLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
    paddingVertical: 8,
  },
  resourcesLinkText: { fontSize: 14, fontWeight: "700", color: C.orange700 },

  // Invite Referral Card (Premium White)
  inviteCardWrapper: {
    marginHorizontal: 24,
    flexGrow: 1,
  },
  inviteCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 32,
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: "center",
    ...parseShadowStyle(theme.shadow.elevation3),
    zIndex: 1,
  },
  watermarkLayer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 32,
    overflow: "hidden",
    zIndex: -1,
  },
  watermarkIcon: {
    position: "absolute",
    right: -50,
    bottom: -50,
    opacity: 0.04,
    transform: [{ rotate: "-15deg" }],
  },
  inviteTextContainer: {
    alignItems: "center",
    marginTop: 12,
  },
  bigHeadline: {
    ...parseTextStyle(theme.typography.Heading2),
    color: theme.colors.text.title,
    textAlign: "center",
    marginBottom: 8,
    fontWeight: "900",
  },
  inviteSubtitleText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 22,
    paddingHorizontal: 12,
  },
  bottomBlock: { alignItems: "center", width: "100%", gap: 16 },
  howItWorksSection: {
    paddingHorizontal: 4,
    paddingTop: 12,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    gap: 16,
  },
  stepIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: C.peachSurface,
    alignItems: "center",
    justifyContent: "center",
  },
  stepTextContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: theme.colors.text.title,
    marginBottom: 2,
  },
  stepDescription: {
    fontSize: 14,
    color: theme.colors.text.default,
    lineHeight: 20,
  },
  codeBox: {
    width: "100%",
    backgroundColor: C.peachSurface,
    borderWidth: 2,
    borderColor: C.warmBorder,
    borderStyle: "dashed",
    borderRadius: 16,
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
    color: theme.colors.text.title,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 1,
  },
  sharePill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    backgroundColor: C.orange500,
    paddingVertical: 16,
    borderRadius: 16,
    ...parseShadowStyle(theme.shadow.elevation2),
  },
  sharePillText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  pendingPillImm: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.peachSurface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
  },
  pendingTextImm: { color: C.orange700, fontSize: 13, fontWeight: "700" },
});
