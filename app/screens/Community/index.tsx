import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import CustomScrollView from "../../components/CustomScrollView";
import ScreenView from "../../components/ScreenView";
import Feed from "../../components/Feed";
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

const Community = () => {
  const insets = useSafeAreaInsets();

  const [summary, setSummary] = useState<BuddySummary | null>(null);
  const [report, setReport] = useState<BuddyReport | null>(null);
  const [myStage, setMyStage] = useState<LevelStage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sendingCheer, setSendingCheer] = useState<CheerType | null>(null);
  const user = useUserStore((s) => s.user);

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
      Alert.alert("Sent!", "Your buddy will see your cheer.");
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
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleShare}
            disabled={!summary?.referralCode}
            style={styles.sharePill}
          >
            <Text style={styles.sharePillText}>Invite my buddy</Text>
          </TouchableOpacity>
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

    const renderProgressComparison = () => {
      const myMaxXp = Math.max(me.xp || 1, them.xp || 1, 100);
      const myBarWidth = `${((me.xp || 0) / myMaxXp) * 100}%` as import("react-native").DimensionValue;
      const themBarWidth = `${((them.xp || 0) / myMaxXp) * 100}%` as import("react-native").DimensionValue;

      return (
        <View style={styles.progressComparisonWrapper}>
          {/* Level Comparison */}
          <View style={styles.compRow}>
            <View style={styles.compSideLeft}>
              <Text style={styles.compVal}>{me.level}</Text>
              <Text style={styles.compLabel}>Your Level</Text>
            </View>
            <View style={styles.compDivider} />
            <View style={styles.compSideRight}>
              <Text style={styles.compVal}>{!buddyShares ? "?" : them.level}</Text>
              <Text style={styles.compLabel}>{buddyFirstName}'s Level</Text>
            </View>
          </View>
          
          <View style={styles.compBlockDivider} />
          
          {/* XP Comparison Bars */}
          <View style={styles.compRowVertical}>
            <Text style={styles.compSectionTitle}>XP Comparison</Text>
            <View style={styles.barRow}>
              <Text style={styles.barLabel}>You</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: myBarWidth, backgroundColor: C.orange500 }]} />
              </View>
              <Text style={styles.barValue}>{fmtXp(me.xp)}</Text>
            </View>
            <View style={styles.barRow}>
              <Text style={styles.barLabel}>{buddyFirstName}</Text>
              <View style={styles.barTrack}>
                {!buddyShares ? (
                   <View style={styles.lockedBarWrap}>
                     <MaterialCommunityIcons name="lock-outline" size={14} color={C.faint} />
                     <Text style={styles.lockedBarText}>Hidden</Text>
                   </View>
                ) : (
                   <View style={[styles.barFill, { width: themBarWidth, backgroundColor: C.orange600 }]} />
                )}
              </View>
              <Text style={styles.barValue}>{!buddyShares ? "—" : fmtXp(them.xp)}</Text>
            </View>
          </View>

          <View style={styles.compBlockDivider} />

          {/* Activity Comparison */}
          <View style={styles.compRowVerticalCenter}>
            <Text style={styles.compSectionTitle}>Last Active</Text>
            <View style={styles.activityRow}>
              <Text style={styles.activityText}>You: <Text style={{ fontWeight: '800' }}>{me.active}</Text></Text>
              <Text style={styles.activityText}> • </Text>
              <Text style={styles.activityText}>{buddyFirstName}: <Text style={{ fontWeight: '800' }}>{!buddyShares ? "Hidden" : them.active}</Text></Text>
            </View>
          </View>
        </View>
      );
    };

    return (
      <View style={styles.pairedWrapper}>
        {/* Partnership banner — overlapping avatars */}
        <View style={styles.partnerCard}>
          <View style={styles.overlappingAvatars}>
            <View style={[styles.avatarWrapper, { zIndex: 2 }]}>
              {renderAvatar(user?.profilePictureUrl, myInitials)}
            </View>
            <View style={[styles.avatarWrapper, { zIndex: 1, marginLeft: -20 }]}>
              {renderAvatar(buddy?.profilePictureUrl, buddyInitials)}
            </View>
          </View>
          <Text style={styles.partnerUnifiedName}>
            You & {buddyFirstName}
          </Text>
          {since ? (
            <View style={styles.partnerMeta}>
              <MaterialCommunityIcons name="calendar-heart" size={14} color={C.orange600} />
              <Text style={styles.partnerMetaText}>Practice partners since {since}</Text>
            </View>
          ) : null}
          {cheerEmojis ? (
            <Text style={styles.partnerCheers}>
              {buddyFirstName} cheered you {cheerEmojis}
            </Text>
          ) : null}
        </View>

        {/* Progress — Side-by-side Comparison */}
        <View style={styles.sectionHeadRow}>
          <Text style={styles.sectionHeadTitle}>Progress</Text>
          <Text style={styles.sectionHeadHint}>Effort, not perfection</Text>
        </View>
        <View style={styles.progressCard}>
          {renderProgressComparison()}
        </View>

        {/* Share my progress */}
        <TouchableOpacity
          style={styles.toggleCard}
          activeOpacity={0.7}
          onPress={() => handleConsent(!iShare)}
        >
          <View style={styles.toggleTextWrap}>
            <Text style={styles.toggleTitle}>Share my progress</Text>
            <Text style={styles.toggleSub}>
              Let {buddyFirstName} see your level, XP and activity.
            </Text>
          </View>
          <View style={[styles.toggleTrack, iShare && styles.toggleTrackOn]}>
            <View style={[styles.toggleThumb, iShare && styles.toggleThumbOn]} />
          </View>
        </TouchableOpacity>

        {/* Send a cheer */}
        <Text style={styles.sectionLabel}>Send a cheer</Text>
        <View style={styles.cheerDock}>
          {BUDDY_CHEERS.map((c) => {
            const isSending = sendingCheer === c.type;
            return (
              <TouchableOpacity
                key={c.type}
                style={[styles.cheerDockItem, isSending && { opacity: 0.5 }]}
                activeOpacity={0.7}
                disabled={busy}
                onPress={() => handleCheer(c.type)}
              >
                {isSending ? (
                  <ActivityIndicator color={C.orange500} size="small" />
                ) : (
                  <Text style={styles.cheerDockEmoji}>{c.emoji}</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Activity */}
        <Text style={[styles.sectionLabel, { marginTop: 8 }]}>Recent activity</Text>
        <Feed scope="buddy" />

        {/* Leave */}
        <View style={styles.leaveContainer}>
          <TouchableOpacity style={styles.leaveBtn} activeOpacity={0.7} onPress={handleLeave}>
            <MaterialCommunityIcons name="exit-run" size={18} color={theme.colors.library.red[500]} />
            <Text style={styles.leaveBtnText}>End Partnership</Text>
          </TouchableOpacity>
        </View>
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
            <TouchableOpacity onPress={load} style={styles.retryBtn}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
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
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
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
    backgroundColor: "rgba(255, 255, 255, 0.98)",
    borderRadius: 24,
    paddingVertical: 22,
    paddingHorizontal: 20,
    alignItems: "center",
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 10,
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
    borderColor: "rgba(255, 255, 255, 0.98)", 
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
    marginTop: 18,
  },
  partnerMetaText: { fontSize: 13, fontWeight: "700", color: C.orange700 },
  partnerCheers: { fontSize: 13, color: C.textMuted, marginTop: 8, textAlign: "center" },

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

  // Progress card (two calm profiles)
  progressCard: {
    marginHorizontal: 20,
    marginBottom: 28,
    backgroundColor: "rgba(255, 255, 255, 0.98)",
    borderRadius: 24,
    paddingHorizontal: 20,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 10,
  },
  progressComparisonWrapper: { width: "100%", paddingVertical: 8 },
  compRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginVertical: 12 },
  compSideLeft: { flex: 1, alignItems: "center" },
  compSideRight: { flex: 1, alignItems: "center" },
  compDivider: { width: 1, height: 40, backgroundColor: C.hairline },
  compVal: { fontSize: 32, fontWeight: "900", color: theme.colors.text.title },
  compLabel: { fontSize: 11, fontWeight: "700", color: C.faint, marginTop: 4, letterSpacing: 0.5, textTransform: "uppercase" },
  compBlockDivider: { height: 1, backgroundColor: C.hairline, marginVertical: 12 },
  compRowVertical: { paddingVertical: 4, gap: 12 },
  compRowVerticalCenter: { paddingVertical: 4, alignItems: "center" },
  compSectionTitle: { fontSize: 11, fontWeight: "800", color: C.faint, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 },
  barRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  barLabel: { width: 55, fontSize: 13, fontWeight: "800", color: theme.colors.text.title },
  barTrack: { flex: 1, height: 12, backgroundColor: C.peachSurface, borderRadius: 6, overflow: "hidden", flexDirection: "row", alignItems: "center" },
  barFill: { height: "100%", borderRadius: 6 },
  lockedBarWrap: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 },
  lockedBarText: { fontSize: 10, fontWeight: "700", color: C.faint },
  barValue: { width: 55, fontSize: 13, fontWeight: "800", color: theme.colors.text.title, textAlign: "right" },
  activityRow: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  activityText: { fontSize: 13, color: theme.colors.text.default },

  // Share my progress toggle
  toggleCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 28,
    backgroundColor: "rgba(255, 255, 255, 0.98)",
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 16,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 10,
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
  toggleTrackOn: { backgroundColor: C.orange500 },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleThumbOn: { transform: [{ translateX: 20 }] },

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
    backgroundColor: "rgba(255, 255, 255, 0.98)",
    marginHorizontal: 20,
    marginBottom: 28,
    borderRadius: 100,
    paddingHorizontal: 20,
    paddingVertical: 14,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
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

  // Leave
  leaveContainer: { marginHorizontal: 20, marginTop: 16, marginBottom: 24 },
  leaveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 20,
    backgroundColor: "rgba(239, 68, 68, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.15)",
    gap: 8,
  },
  leaveBtnText: {
    color: theme.colors.library.red[600],
    fontSize: 14,
    fontWeight: "800",
  },

  // Invite Referral Card (Premium White)
  inviteCardWrapper: {
    marginHorizontal: 24,
    flexGrow: 1,
  },
  inviteCard: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.98)",
    borderRadius: 32,
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: "center",
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 10,
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
