import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import React, { useCallback, useEffect, useState, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
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
  attachInviteCode,
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
const screenWidth = Dimensions.get("window").width;

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
const SharedGoalBar = ({ ratio, colors }: { ratio: number; colors?: readonly [string, string, ...string[]] }) => {
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
          colors={colors ?? [theme.colors.library.orange[400], C.orange500]}
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
  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: v.value * 18 }] }));
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
const PulseDot = ({ color = C.orange500 }: { color?: string }) => {
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
      {!reduceMotion ? <Animated.View style={[styles.liveDotPulse, ring, { backgroundColor: color }]} /> : null}
      <View style={[styles.liveDot, { backgroundColor: color }]} />
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
  const [thread, setThread] = useState<Thread | null>(null);
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);
  const [view, setView] = useState<"us" | "timeline">("us");
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
  const [dynamicHeaderHeight, setDynamicHeaderHeight] = useState(HEADER_HEIGHT + 60);

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

  const renderHeader = () => {
    return (
      <BlurView
        intensity={80}
        tint="light"
        onLayout={(e) => setDynamicHeaderHeight(e.nativeEvent.layout.height)}
        style={[styles.header, { paddingTop: insets.top + 20, paddingBottom: 16 }]}
      >
        <Text style={styles.title}>Community</Text>
        <Text style={styles.subtitle}>
          {isPaired
            ? `You & ${buddyFirstName} — keep it up together.`
            : "Practice sticks when someone's in it with you."}
        </Text>
        {isPaired && (
          <View style={{ marginTop: 16 }}>
            <SegmentedTabs
              tabs={[
                { key: "us", label: "Us", icon: "account-multiple-outline" },
                { key: "timeline", label: "Timeline", badge: unreadCount, icon: "history" },
              ]}
              active={view}
              onChange={(k) => setView(k as "us" | "timeline")}
            />
          </View>
        )}
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

          <View style={styles.dividerBox}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.inputBox}>
            <TextInput
              style={styles.codeInput}
              placeholder="Enter invite code"
              placeholderTextColor="#94A3B8"
              value={buddyCode}
              onChangeText={setBuddyCode}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={10}
            />
            <PressableScale
              onPress={handleSubmitCode}
              disabled={submittingCode || !buddyCode.trim()}
              style={[styles.submitCodeBtn, (!buddyCode.trim() || submittingCode) && { opacity: 0.5 }]}
            >
              {submittingCode ? <ActivityIndicator color="#FFF" size="small" /> : <MaterialCommunityIcons name="arrow-right-thick" size={20} color="#FFF" />}
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
                  {me.stage}
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
            {/* Bond Level — hero tile */}
            <LinearGradient
              colors={["#FFD8B5", "#FFAB76"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.bondCard}
            >
              <View style={styles.tierRow}>
                <View style={[styles.statIconCircle, { marginBottom: 0 }]}>
                  <MaterialCommunityIcons
                    name={(team?.bondStageIcon ?? "account-heart") as any}
                    size={20}
                    color="#FFFFFF"
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.tierName}>{team?.bondStageTitle ?? "Kindred"}</Text>
                  <Text style={styles.tierSub}>Bond Level {team?.bondLevel ?? 1}</Text>
                </View>
                <Text style={styles.bondXpBadge}>{bondXpVal.toLocaleString()} XP</Text>
              </View>
              <Text style={styles.goalSub}>
                {bondToNext.toLocaleString()} XP to Bond Level {(team?.bondLevel ?? 1) + 1}
                {team && !team.buddyShares
                  ? ` · ${buddyFirstName}'s XP joins once they share`
                  : ""}
              </Text>
              {momentumLine ? (
                <View style={styles.liveRow}>
                  <PulseDot color="#1E293B" />
                  <Text style={styles.liveText}>{momentumLine}</Text>
                </View>
              ) : null}
            </LinearGradient>

            {/* Two stat tiles */}
            <View style={styles.statsRow}>
              <LinearGradient
                colors={["#EBCBF5", "#D8A7F0"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statTile}
              >
                <View style={styles.statIconCircle}>
                  <MaterialCommunityIcons name="lightning-bolt" size={20} color="#FFFFFF" />
                </View>
                <AnimatedNumber
                  value={team?.combinedXpThisWeek ?? 0}
                  style={styles.statTileValue}
                />
                <Text style={styles.statTileLabel}>XP THIS WEEK</Text>
              </LinearGradient>
              <LinearGradient
                colors={["#Cbf0f0", "#98E6E6"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statTile}
              >
                <View style={styles.statIconCircle}>
                  <MaterialCommunityIcons name="calendar-heart" size={20} color="#FFFFFF" />
                </View>
                <AnimatedNumber value={daysTogether} style={styles.statTileValue} />
                <Text style={styles.statTileLabel}>DAYS TOGETHER</Text>
              </LinearGradient>
            </View>

            {/* Weekly shared quest — vs your own pace, celebrated, never penalised */}
            <LinearGradient
              colors={["#FFC8C8", "#FF9E9E"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.questCard}
            >
              <View style={styles.goalHeader}>
                <Text style={styles.goalCaption}>THIS WEEK, TOGETHER</Text>
                <Text style={styles.goalGoal}>
                  {team?.weeklyCombinedDays ?? 0}/{team?.weeklyQuestTarget ?? 4} days
                </Text>
              </View>
              {team && team.weeklyCombinedDays >= team.weeklyQuestTarget ? (
                <View style={styles.liveRow}>
                  <Text style={{ fontSize: 14 }}>🎉</Text>
                  <Text style={styles.liveText}>You hit this week's goal together!</Text>
                </View>
              ) : team?.bothActiveThisWeek ? (
                <View style={styles.liveRow}>
                  <MaterialCommunityIcons name="fire" size={16} color={C.orange500} />
                  <Text style={styles.liveText}>You hit this week's goal together!</Text>
                </View>
              ) : null}
            </LinearGradient>
          </View>
        </Animated.View>

        {/* Actions & Settings — unified bento box */}
        <Animated.View entering={enter(3)}>
          <SectionHeading title="Manage" />
          <View style={styles.actionGroup}>
            {/* Share Progress */}
            <PressableScale style={styles.actionRow} scaleTo={0.98} onPress={() => handleConsent(!iShare)}>
              <View style={[styles.actionIconSquare, { backgroundColor: C.peachSurface }]}>
                <MaterialCommunityIcons name="chart-box" size={24} color={C.orange500} />
              </View>
              <View style={styles.actionTextWrap}>
                <Text style={styles.actionTitle}>Share my progress</Text>
                <Text style={styles.actionSub}>Let {buddyFirstName} see your XP and level.</Text>
              </View>
              <ToggleSwitch on={iShare} />
            </PressableScale>

            <View style={styles.actionDivider} />

            {/* Help & Resources */}
            <PressableScale style={styles.actionRow} scaleTo={0.98} onPress={() => navigation.navigate("Resources")}>
              <View style={[styles.actionIconSquare, { backgroundColor: C.peachSurface }]}>
                <MaterialCommunityIcons name="lifebuoy" size={24} color={C.orange500} />
              </View>
              <View style={styles.actionTextWrap}>
                <Text style={styles.actionTitle}>Help & Resources</Text>
                <Text style={styles.actionSub}>Learn more about community.</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#CBD5E1" />
            </PressableScale>

            <View style={styles.actionDivider} />

            {/* Leave Buddy */}
            <PressableScale style={styles.actionRow} scaleTo={0.98} onPress={handleLeave}>
              <View style={[styles.actionIconSquare, { backgroundColor: "#FEF2F2" }]}>
                <MaterialCommunityIcons name="exit-run" size={24} color="#EF4444" />
              </View>
              <View style={styles.actionTextWrap}>
                <Text style={[styles.actionTitle, { color: "#EF4444" }]}>Leave buddy</Text>
                <Text style={styles.actionSub}>End this partnership.</Text>
              </View>
            </PressableScale>
          </View>
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
                  contentContainerStyle={[styles.scrollView, { paddingTop: dynamicHeaderHeight + 12, paddingBottom: 130, flexGrow: 1 }]}
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
                  {renderPaired()}
                </CustomScrollView>
              </View>
              <View style={{ width: screenWidth }}>
                <CustomScrollView
                  contentContainerStyle={[styles.scrollView, { paddingTop: dynamicHeaderHeight + 12, paddingBottom: 130, flexGrow: 1 }]}
                  onEndReached={() => timelineRef.current?.loadMore()}
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
                  style={styles.stickyFab}
                  activeOpacity={0.85}
                  onPress={handleOpenMoment}
                >
                  <MaterialCommunityIcons name="plus" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        ) : (
          <CustomScrollView
            contentContainerStyle={[
              styles.scrollView,
              { paddingTop: dynamicHeaderHeight + 28, paddingBottom: 130 },
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

      {/* ── Buddy Welcome Modal ── */}
      <Modal visible={showWelcome} transparent animationType="fade" onRequestClose={() => setShowWelcome(false)}>
        <View style={wm.overlay}>
          <Animated.View entering={FadeInDown.springify().damping(18).stiffness(140)} style={wm.card}>
            {/* Watermark */}
            <View style={wm.watermarkLayer} pointerEvents="none">
              <MaterialCommunityIcons name="handshake" size={220} color={C.orange500} style={wm.watermarkIcon} />
            </View>

            {/* Close */}
            <TouchableOpacity onPress={() => setShowWelcome(false)} style={wm.closeBtn} activeOpacity={0.7}>
              <MaterialCommunityIcons name="close" size={20} color={C.faint} />
            </TouchableOpacity>

            {/* Tag */}
            <Text style={wm.tag}>BUDDY CONNECTED</Text>

            {/* Title */}
            <Text style={wm.title}>You're now paired!</Text>

            {/* Message */}
            <Text style={wm.message}>
              Share your journey, support each other, and grow together.
            </Text>

            {/* CTA */}
            <TouchableOpacity style={wm.cta} activeOpacity={0.85} onPress={() => setShowWelcome(false)}>
              <Text style={wm.ctaText}>Let's Go!</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {/* ── Invalid Code Error Modal ── */}
      <Modal visible={showError} transparent animationType="fade" onRequestClose={() => setShowError(false)}>
        <View style={wm.overlay}>
          <Animated.View entering={FadeInDown.springify().damping(18).stiffness(140)} style={wm.card}>
            {/* Watermark */}
            <View style={wm.watermarkLayer} pointerEvents="none">
              <MaterialCommunityIcons name="alert-circle" size={220} color="#EF4444" style={wm.watermarkIcon} />
            </View>

            {/* Close */}
            <TouchableOpacity onPress={() => setShowError(false)} style={wm.closeBtn} activeOpacity={0.7}>
              <MaterialCommunityIcons name="close" size={20} color={C.faint} />
            </TouchableOpacity>

            {/* Tag */}
            <Text style={[wm.tag, wm.tagError]}>INVALID CODE</Text>

            {/* Title */}
            <Text style={wm.title}>Couldn't Connect</Text>

            {/* Message */}
            <Text style={wm.message}>
              {errorMessage}
            </Text>

            {/* CTA */}
            <TouchableOpacity style={[wm.cta, wm.ctaError]} activeOpacity={0.85} onPress={() => setShowError(false)}>
              <Text style={wm.ctaText}>Try Again</Text>
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
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  tierRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  statIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1E293B",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  tierName: { fontSize: 18, fontWeight: "900", color: "#1E293B" },
  tierSub: { fontSize: 13, color: "#475569", marginTop: 2, fontWeight: "600" },
  bondXpBadge: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1E293B",
    backgroundColor: "rgba(0,0,0,0.06)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    overflow: "hidden",
  },
  goalSub: { fontSize: 12, color: "#475569", marginTop: 8, fontWeight: "600" },

  // Live freshness row (momentum)
  liveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
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
  liveText: { fontSize: 13, fontWeight: "700", color: "#1E293B", flexShrink: 1 },

  // Two stat tiles
  statsRow: { flexDirection: "row", gap: 12, marginHorizontal: 16, marginBottom: 12 },
  statTile: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  statTileValue: { fontSize: 26, fontWeight: "900", color: "#1E293B" },
  statTileLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#475569",
    marginTop: 4,
    letterSpacing: 0.5,
  },

  // Weekly shared quest tile
  questCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  goalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  goalCaption: { fontSize: 11, fontWeight: "800", letterSpacing: 0.8, color: "#475569" },
  goalGoal: { fontSize: 12, fontWeight: "700", color: "#475569" },
  goalTrack: {
    height: 12,
    borderRadius: 6,
    backgroundColor: "rgba(0,0,0,0.06)",
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

  // Unified Action Group
  actionGroup: {
    marginHorizontal: 16,
    marginBottom: 28,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    ...parseShadowStyle(theme.shadow.elevation1),
    overflow: "hidden",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 14,
  },
  actionDivider: {
    height: 1,
    backgroundColor: C.hairline,
    marginLeft: 16 + 52 + 14, // align with text (paddingLeft + iconSquare + gap)
  },
  actionIconSquare: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTextWrap: { flex: 1, paddingRight: 8 },
  actionTitle: { fontSize: 15, fontWeight: "800", color: theme.colors.text.title },
  actionSub: { fontSize: 13, color: theme.colors.text.default, marginTop: 2, lineHeight: 18 },
  toggleTrack: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: C.trackOff,
    padding: 2,
    justifyContent: "center",
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
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

  // Removed old separate cards

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
  stickyFab: {
    position: "absolute",
    bottom: 110,
    right: 24,
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: C.title,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },

  dividerBox: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#F1F5F9",
  },
  dividerText: {
    marginHorizontal: 14,
    fontSize: 13,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 1,
  },
  inputBox: {
    flexDirection: "row",
    width: "100%",
    height: 58,
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    paddingHorizontal: 6,
    alignItems: "center",
  },
  codeInput: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: "800",
    color: theme.colors.text.title,
    letterSpacing: 1,
  },
  submitCodeBtn: {
    height: 46,
    width: 46,
    backgroundColor: C.orange500,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

});

const wm = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 32,
    paddingHorizontal: 32,
    paddingTop: 48,
    paddingBottom: 32,
    width: "100%",
    maxWidth: 380,
    alignItems: "center",
    ...parseShadowStyle(theme.shadow.elevation4),
  },
  closeBtn: {
    position: "absolute",
    top: 20,
    right: 20,
    zIndex: 10,
  },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    ...parseShadowStyle(theme.shadow.elevation2),
    shadowColor: C.orange500,
    shadowOpacity: 0.35,
  },
  watermarkLayer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 32,
    overflow: "hidden",
    zIndex: 0,
  },
  watermarkIcon: {
    position: "absolute",
    right: -40,
    bottom: -40,
    opacity: 0.045,
    transform: [{ rotate: "-15deg" }],
  },
  tag: {
    fontSize: 11,
    fontWeight: "800",
    color: C.orange500,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 8,
    zIndex: 1,
  },
  title: {
    ...parseTextStyle(theme.typography.Heading3),
    fontSize: 24,
    fontWeight: "700",
    color: C.title,
    textAlign: "center",
    marginBottom: 12,
    zIndex: 1,
  },
  message: {
    ...parseTextStyle(theme.typography.Body),
    fontSize: 15,
    color: C.textMuted,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
    zIndex: 1,
  },
  cta: {
    width: "100%",
    height: 54,
    borderRadius: 18,
    backgroundColor: C.orange500,
    alignItems: "center",
    justifyContent: "center",
    ...parseShadowStyle(theme.shadow.elevation1),
    shadowColor: C.orange500,
    shadowOpacity: 0.3,
    zIndex: 1,
  },
  ctaText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  tagError: {
    color: "#EF4444",
  },
  ctaError: {
    backgroundColor: "#EF4444",
    shadowColor: "#EF4444",
  },
});
