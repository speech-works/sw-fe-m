import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  ZoomIn,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import CustomScrollView from "../../components/CustomScrollView";
import ScreenView from "../../components/ScreenView";
import Feed from "../../components/Feed";
import PressableScale from "../../components/PressableScale";
import { theme } from "../../Theme/tokens";
import { parseTextStyle, parseShadowStyle } from "../../util/functions/parseStyles";
import {
  BuddySummary,
  CheerType,
  getBuddyReport,
  getMyBuddy,
  leaveBuddy,
  sendCheer,
  setReportConsent,
} from "../../api/buddies";
import { getLevelStage, LevelStage } from "../../api/users";
import { useUserStore } from "../../stores/user";
import { shareBuddyInvite } from "../../util/functions/share";
import { BUDDY_CHEERS } from "../../constants/buddyCheers";
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

const fmtXp = (n?: number) => (typeof n === "number" ? n.toLocaleString() : "—");

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

const isWithinDays = (d?: string | Date | null, days = 7): boolean => {
  if (!d) return false;
  const t = new Date(d).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= days * 86400000;
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

const Community = () => {
  const insets = useSafeAreaInsets();

  const [summary, setSummary] = useState<BuddySummary | null>(null);
  const [report, setReport] = useState<BuddyReport | null>(null);
  const [myStage, setMyStage] = useState<LevelStage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sendingCheer, setSendingCheer] = useState<CheerType | null>(null);
  const [justCheered, setJustCheered] = useState<CheerType | null>(null);
  const user = useUserStore((s) => s.user);
  const reduceMotion = useReducedMotion();

  const load = useCallback(async () => {
    try {
      setError(false);
      const data = await getMyBuddy();
      setSummary(data);
      if (data.link?.status === "active") {
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
      } else {
        setMyStage(null);
        setReport(null);
      }
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      track(ANALYTICS_EVENTS.BUDDY_INVITE_VIEWED, { source: "community" });
      load();
    }, [load]),
  );

  const link = summary?.link ?? null;
  const isPaired = link?.status === "active";
  const isPending = link?.status === "pending";

  const handleShare = async () => {
    if (!summary?.referralCode) return;
    const shared = await shareBuddyInvite(summary.referralCode);
    if (shared) {
      track(ANALYTICS_EVENTS.BUDDY_INVITE_SHARED, { source: "community" });
    }
  };

  const handleCheer = async (type: CheerType) => {
    if (busy) return;
    try {
      setBusy(true);
      setSendingCheer(type);
      await sendCheer(type);
      track(ANALYTICS_EVENTS.BUDDY_CHEER_SENT, { type });
      setJustCheered(type);
      setTimeout(() => setJustCheered(null), 1400);
    } catch (e) {
      Alert.alert("Couldn't send", "Please try again.");
    } finally {
      setBusy(false);
      setSendingCheer(null);
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
          <MaterialCommunityIcons name="gift" size={260} color={C.orange500} style={styles.watermarkIcon} />
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

    const cheerEmojis = Array.from(
      new Set(
        (summary?.receivedCheers ?? [])
          .map((c) => BUDDY_CHEERS.find((b) => b.type === c.type)?.emoji)
          .filter(Boolean),
      ),
    ).join(" ");

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

    // Cooperative figures — all real, never a contest.
    const myXp = me.xp ?? 0;
    const buddyXp = buddyShares ? them.xp ?? 0 : 0;
    const combinedXp = myXp + buddyXp;
    const nextMilestone = Math.max(1000, Math.ceil((combinedXp + 1) / 1000) * 1000);
    const toGo = Math.max(0, nextMilestone - combinedXp);
    const daysTogether = daysBetween(link?.activatedAt ?? link?.createdAt);
    const cheersCount = summary?.receivedCheers?.length ?? 0;
    const bothActive =
      buddyShares && isWithinDays(user?.lastLogin, 7) && isWithinDays(report?.lastPracticeAt, 7);

    const enter = (i: number) =>
      reduceMotion ? FadeIn.duration(220) : FadeInDown.duration(280).delay(i * 60);

    return (
      <View style={styles.pairedWrapper}>
        {/* Partnership banner — overlapping avatars + stage pills */}
        <Animated.View entering={enter(0)} style={styles.partnerCard}>
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
              <MaterialCommunityIcons name="calendar-heart" size={14} color={C.orange600} />
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
          {cheerEmojis ? (
            <Text style={styles.partnerCheers}>
              {buddyFirstName} cheered you {cheerEmojis}
            </Text>
          ) : null}
        </Animated.View>

        {/* Together — cooperative progress (no head-to-head) */}
        <Animated.View entering={enter(1)}>
          <View style={styles.sectionHeadRow}>
            <Text style={styles.sectionHeadTitle}>Together</Text>
            <Text style={styles.sectionHeadHint}>Effort, not perfection</Text>
          </View>
          <View style={styles.progressCard}>
            <View style={styles.goalHeader}>
              <Text style={styles.goalCaption}>COMBINED XP</Text>
              <Text style={styles.goalGoal}>Goal {fmtXp(nextMilestone)}</Text>
            </View>
            <View style={styles.goalValueRow}>
              <AnimatedNumber value={combinedXp} style={styles.goalValue} />
              <Text style={styles.goalUnit}> XP together</Text>
            </View>
            <SharedGoalBar ratio={combinedXp / nextMilestone} />
            <Text style={styles.goalSub}>
              {fmtXp(toGo)} to your next milestone
              {!buddyShares ? ` · ${buddyFirstName}'s XP joins once they share` : ""}
            </Text>

            <View style={styles.tilesRow}>
              <View style={styles.tile}>
                <AnimatedNumber value={daysTogether} style={styles.tileValue} />
                <Text style={styles.tileLabel}>DAYS TOGETHER</Text>
              </View>
              <View style={styles.tileDivider} />
              <View style={styles.tile}>
                <AnimatedNumber value={cheersCount} style={styles.tileValue} />
                <Text style={styles.tileLabel}>CHEERS</Text>
              </View>
            </View>

            {bothActive ? (
              <View style={styles.bothActiveChip}>
                <Text style={styles.bothActiveEmoji}>🔥</Text>
                <Text style={styles.bothActiveText}>You've both shown up this week</Text>
              </View>
            ) : null}
          </View>
        </Animated.View>

        {/* Share my progress */}
        <Animated.View entering={enter(2)}>
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
        </Animated.View>

        {/* Send a cheer */}
        <Animated.View entering={enter(3)}>
          <Text style={styles.sectionLabel}>Send a cheer</Text>
          <View style={styles.cheerDock}>
            {BUDDY_CHEERS.map((c) => {
              const isSending = sendingCheer === c.type;
              const isDone = justCheered === c.type;
              return (
                <PressableScale
                  key={c.type}
                  style={styles.cheerDockItem}
                  scaleTo={0.88}
                  disabled={busy}
                  onPress={() => handleCheer(c.type)}
                  accessibilityLabel={c.label}
                >
                  {isSending ? (
                    <ActivityIndicator color={C.orange500} size="small" />
                  ) : isDone ? (
                    <Animated.View
                      entering={reduceMotion ? FadeIn.duration(150) : ZoomIn.springify().damping(11)}
                    >
                      <MaterialCommunityIcons name="check-bold" size={24} color={C.orange600} />
                    </Animated.View>
                  ) : (
                    <Text style={styles.cheerDockEmoji}>{c.emoji}</Text>
                  )}
                </PressableScale>
              );
            })}
          </View>
        </Animated.View>

        {/* Activity */}
        <Animated.View entering={enter(4)}>
          <Text style={[styles.sectionLabel, { marginTop: 8 }]}>Recent activity</Text>
          <Feed scope="buddy" />
        </Animated.View>

        {/* Leave */}
        <Animated.View entering={enter(5)}>
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
      <View style={StyleSheet.absoluteFillObject}>
        <LinearGradient
          colors={["#FFFCF9", "#FFF7ED"]}
          style={{ flex: 1 }}
        />
      </View>

      {renderHeader()}

      <View style={styles.container}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={C.orange500} size="large" />
          </View>
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
        ) : (
          <CustomScrollView
            contentContainerStyle={[
              styles.scrollView,
              { paddingTop: HEADER_HEIGHT + insets.top + (isPaired ? 20 : 28), paddingBottom: 130 },
              !isPaired && { flexGrow: 1 }
            ]}
          >
            {isPaired ? renderPaired() : renderInvite()}
          </CustomScrollView>
        )}
      </View>
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
    borderRadius: 100,
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
    marginHorizontal: 20,
    marginBottom: 28,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingVertical: 22,
    paddingHorizontal: 20,
    alignItems: "center",
    ...parseShadowStyle(theme.shadow.elevation3),
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
    color: theme.colors.text.title,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  partnerMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
  },
  partnerMetaText: { fontSize: 13, fontWeight: "700", color: C.orange700 },
  stagePillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
  },
  stagePill: {
    backgroundColor: C.peachSurface,
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 5,
    maxWidth: 160,
  },
  stagePillText: { fontSize: 12, fontWeight: "800", color: C.orange700 },
  partnerCheers: { fontSize: 13, color: C.textMuted, marginTop: 14, textAlign: "center" },

  // Section header (label + hint)
  sectionHeadRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginHorizontal: 24,
    marginBottom: 12,
  },
  sectionHeadTitle: { fontSize: 15, fontWeight: "800", color: theme.colors.text.title },
  sectionHeadHint: { fontSize: 12, fontWeight: "600", color: C.faint },

  // Together (cooperative) card
  progressCard: {
    marginHorizontal: 20,
    marginBottom: 28,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 18,
    ...parseShadowStyle(theme.shadow.elevation2),
  },
  goalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  goalCaption: { fontSize: 11, fontWeight: "800", letterSpacing: 0.8, color: C.faint },
  goalGoal: { fontSize: 12, fontWeight: "700", color: C.faint },
  goalValueRow: { flexDirection: "row", alignItems: "baseline", marginTop: 6, marginBottom: 12 },
  goalValue: {
    fontSize: 30,
    fontWeight: "900",
    color: theme.colors.text.title,
    letterSpacing: -0.5,
  },
  goalUnit: { fontSize: 14, fontWeight: "700", color: C.textMuted },
  goalTrack: {
    height: 12,
    borderRadius: 6,
    backgroundColor: C.peachSurface,
    overflow: "hidden",
  },
  goalFill: { height: "100%", borderRadius: 6, overflow: "hidden" },
  goalSub: { fontSize: 12, color: C.faint, marginTop: 8, fontWeight: "600" },
  tilesRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
    borderTopWidth: 1,
    borderTopColor: C.hairline,
    paddingTop: 16,
  },
  tile: { flex: 1, alignItems: "center" },
  tileValue: { fontSize: 22, fontWeight: "900", color: theme.colors.text.title },
  tileLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: C.faint,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  tileDivider: { width: 1, height: 32, backgroundColor: C.hairline },
  bothActiveChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 16,
    backgroundColor: C.peachSurface,
    borderRadius: 100,
    paddingVertical: 10,
  },
  bothActiveEmoji: { fontSize: 15 },
  bothActiveText: { fontSize: 13, fontWeight: "800", color: C.orange700 },

  // Share my progress toggle
  toggleCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 28,
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

  // Section labels + cheers
  sectionLabel: {
    marginLeft: 24,
    marginBottom: 12,
    fontSize: 15,
    fontWeight: "800",
    color: theme.colors.text.title,
  },
  cheerDock: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginBottom: 28,
    borderRadius: 100,
    paddingHorizontal: 20,
    paddingVertical: 14,
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  cheerDockItem: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.peachSurface,
    alignItems: "center",
    justifyContent: "center",
  },
  cheerDockEmoji: { fontSize: 26 },

  // Leave (quiet)
  leaveLink: {
    alignSelf: "center",
    marginTop: 8,
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  leaveLinkText: { fontSize: 14, fontWeight: "600", color: C.faint },

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
    opacity: 0.12,
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
    paddingVertical: 14,
    borderRadius: 100,
    shadowColor: C.orange500,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  sharePillText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.5,
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
