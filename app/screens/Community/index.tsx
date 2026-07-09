import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React, { useCallback, useEffect, useState, useRef } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import Toast from "react-native-toast-message";
// Exception: the bond-stage glyph is SERVER-DRIVEN as a MaterialCommunityIcons name,
// so it must render via MCI until the backend emits DS/Lucide names (see bondStageIcon).
import { MaterialCommunityIcons } from "@expo/vector-icons";

import CustomScrollView from "../../components/CustomScrollView";
import ScreenView from "../../components/ScreenView";
import Timeline, { TimelineHandle } from "../../components/Timeline";
import BuddySupportSheet from "../../components/BuddySupportSheet";
import PressableScale from "../../components/PressableScale";
import {
  SchemeStatusBar,
  useTheme,
  spacing,
  space,
  radius,
  borderWidth,
  fonts,
  typography,
  Text,
  TabDock,
  PageHeader,
  Icon,
  IconName,
  icons,
  AnimatedNumber,
  PulseDot,
  AnimatedModal,
  Skeleton,
  Toggle,
  FloatingControls,
  staggerEntering,
  bestForeground,
  zIndex,
  Page,
  ListItem,
  Surface,
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

const daysBetween = (d?: string | Date | null): number => {
  if (!d) return 0;
  const t = new Date(d).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / 86400000));
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

/** Shimmer skeleton that mirrors the paired layout while data loads (DS `Skeleton`). */
const CommunitySkeleton = ({ topPad }: { topPad: number }) => (
  <View style={{ paddingTop: topPad }}>
    <Skeleton style={styles.skelBanner} />
    <Skeleton style={styles.skelLabel} />
    <Skeleton style={styles.skelCard} />
    <Skeleton style={styles.skelToggle} />
    <Skeleton style={styles.skelLabelSm} />
    <Skeleton style={styles.skelDock} />
  </View>
);

interface WatermarkModalProps {
  visible: boolean;
  onClose: () => void;
  watermarkIcon: IconName;
  watermarkColor: string;
  tag: string;
  tagColor: string;
  title: string;
  message: string;
  ctaLabel: string;
  ctaColor: string;
  ctaTextColor: string;
}

/** Shared celebratory/alert card (welcome, invalid-code, …): an oversized corner
 *  watermark, a tag, title, message and one CTA — over the standard `AnimatedModal`. */
const WatermarkModal = ({
  visible,
  onClose,
  watermarkIcon,
  watermarkColor,
  tag,
  tagColor,
  title,
  message,
  ctaLabel,
  ctaColor,
  ctaTextColor,
}: WatermarkModalProps) => {
  const { colors } = useTheme();
  return (
    <AnimatedModal visible={visible} onClose={onClose} dismissOnBackdrop={false} maxWidth={380} contentStyle={wm.card}>
      <View style={wm.watermarkLayer} pointerEvents="none">
        <Icon name={watermarkIcon} size={220} color={watermarkColor} style={wm.watermarkIcon} />
      </View>
      <TouchableOpacity onPress={onClose} style={wm.closeBtn} activeOpacity={0.7}>
        <Icon name={icons.close} size={20} color={colors.text.tertiary} />
      </TouchableOpacity>
      <Text variant="caption" color={tagColor} style={wm.tag}>{tag}</Text>
      <Text variant="h2" style={wm.title}>{title}</Text>
      <Text variant="bodySm" color="secondary" style={wm.message}>{message}</Text>
      <TouchableOpacity style={[wm.cta, { backgroundColor: ctaColor }]} activeOpacity={0.85} onPress={onClose}>
        <Text variant="body" color={ctaTextColor} style={styles.bold}>{ctaLabel}</Text>
      </TouchableOpacity>
    </AnimatedModal>
  );
};


const Community = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors, elevation } = useTheme();

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
  const [copied, setCopied] = useState(false);
  const user = useUserStore((s) => s.user);
  const unreadCount = useInboxStore((s) => s.unreadCount);
  const reduceMotion = useReducedMotion();
  // Scroll-cue anchor: the content offset past which the in-page Us/Timeline
  // switcher has scrolled off the top (hands the switcher to the bottom dock).
  const [cueAnchor, setCueAnchor] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(0);
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

  // Fixed header — rendered once as an absolute overlay so it never moves
  // during horizontal swipes between tabs (mirrors the Library TechniquePage pattern).
  const renderFixedHeader = () => (
    <View
      style={[
        styles.fixedHeader,
        { backgroundColor: colors.background.canvas },
      ]}
      onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
    >
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
              { key: "us", label: "Us", icon: icons.community },
              { key: "timeline", label: "Timeline", icon: icons.timeline, badge: unreadCount },
            ]}
            activeKey={view}
            onSelect={(k) => setView(k as "us" | "timeline")}
          />
        </View>
      )}
    </View>
  );

  // Placeholder inserted at the top of each page's scroll so content starts
  // below the fixed header.
  const headerPlaceholder = <View style={{ height: headerHeight }} />;

  const handleCopyCode = async () => {
    if (!summary?.referralCode) return;
    await Clipboard.setStringAsync(summary.referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderInvite = () => (
    <View style={{ marginTop: space.groupGap, gap: space.groupGap, paddingBottom: 100 }}>
      <View style={styles.howItWorksSection}>
        <View style={styles.stepItem}>
          <View style={[styles.stepIconBox, { backgroundColor: colors.action.primaryTint }]}>
            <Icon name={icons.share} size={24} color={colors.text.accent} />
          </View>
          <View style={styles.stepTextContent}>
            <Text variant="title">Share your code</Text>
            <Text variant="bodySm" color="secondary">Send your invite code to a friend.</Text>
          </View>
        </View>

        <View style={styles.stepItem}>
          <View style={[styles.stepIconBox, { backgroundColor: colors.action.primaryTint }]}>
            <Icon name={icons.addPerson} size={24} color={colors.text.accent} />
          </View>
          <View style={styles.stepTextContent}>
            <Text variant="title">They sign up</Text>
            <Text variant="bodySm" color="secondary">They enter it when they create their account.</Text>
          </View>
        </View>

        <View style={[styles.stepItem, { marginBottom: 0 }]}>
          <View style={[styles.stepIconBox, { backgroundColor: colors.action.primaryTint }]}>
            <Icon name={icons.launch} size={24} color={colors.text.accent} />
          </View>
          <View style={styles.stepTextContent}>
            <Text variant="title">Grow together</Text>
            <Text variant="bodySm" color="secondary">Keep each other going — share wins and cheer each other on.</Text>
          </View>
        </View>
      </View>

      <Surface level="elevated" style={styles.inviteCard}>
        {/* Watermark Layer */}
        <View style={styles.watermarkLayer} pointerEvents="none">
          <Icon name={icons.gift} size={260} color={colors.action.primary} style={styles.watermarkIcon} />
        </View>

        <View style={styles.inviteTextContainer}>
          <Text variant="h2">Don't practice alone</Text>
          <Text variant="bodySm" color="secondary" style={styles.inviteSubtitleText}>
            You'll both show up more often when someone's counting on you.
          </Text>
        </View>

        {/* Fixed spacer for consistent breathing room */}
        <View style={{ height: spacing["2xl"] }} />

        <View style={styles.bottomBlock}>
          {isPending && (
            <View style={[styles.pendingPillImm, { backgroundColor: colors.action.primaryTint }]}>
              <Icon name={icons.soon} size={14} color={colors.text.accent} />
              <Text variant="caption" color="accent" style={styles.bold}>Waiting for them to join…</Text>
            </View>
          )}
          <PressableScale
            onPress={handleCopyCode}
            style={[styles.codeBox, { backgroundColor: colors.surface.control, borderColor: colors.border.strong }]}
          >
            <View style={styles.codeRow}>
              <Icon 
                name={copied ? icons.success : icons.copy} 
                size={20} 
                color={copied ? colors.feedback.successText : colors.text.accent} 
                style={{ marginRight: space.iconText }} 
              />
              <Text variant="h2" style={styles.codeValueImm}>{summary?.referralCode ?? "—"}</Text>
            </View>
          </PressableScale>
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
                <Icon name={icons.forward} size={20} color={colors.action.onPrimary} />
              )}
            </PressableScale>
          </View>
        </View>
      </Surface>
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
          <Text variant="h3" color="accent">{initials}</Text>
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

    const enter = (i: number) => staggerEntering(i, reduceMotion);

    return (
      <View style={styles.pairedWrapper}>
        {/* Partnership banner — overlapping avatars + stage pills */}
        <Animated.View entering={enter(0)} style={[styles.partnerCard, elevation.e2]}>
          <View style={[styles.partnerInner, { backgroundColor: colors.action.primary }]}>
            <View style={styles.overlappingAvatars}>
              <View style={[styles.avatarWrapper, { zIndex: 2, borderColor: colors.action.primary }]}>
                {renderAvatar(user?.profilePictureUrl, myInitials)}
              </View>
              <View style={[styles.avatarWrapper, { zIndex: 1, marginLeft: -spacing.xl, borderColor: colors.action.primary }]}>
                {renderAvatar(buddy?.profilePictureUrl, buddyInitials)}
              </View>
            </View>
            <Text variant="h2" color={colors.action.onPrimary}>You & {buddyFirstName}</Text>
            {since ? (
              <View style={styles.partnerMeta}>
                <Icon name={icons.daysTogether} size={14} color={colors.action.onPrimary} />
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
                  {/* Server-driven MCI glyph — behavior-frozen passthrough (see import note). */}
                  <MaterialCommunityIcons
                    name={(team?.bondStageIcon as any) ?? "account-heart"}
                    size={20}
                    // The disc is `surface.default` (near-white on paper, dark on
                    // ink). The bright accent base is invisible on the light disc
                    // (~1.5:1) but correct on the dark one; pick per scheme so the
                    // hue-carrying ink is legible in both — dark accentOn cut on
                    // light, bright accent on dark.
                    color={bestForeground(colors.surface.default, [
                      colors.accent.warning,
                      colors.accentOn.warning,
                    ])}
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
                  <Icon
                    name={icons.energy}
                    size={20}
                    color={bestForeground(colors.surface.default, [
                      colors.accent.purple,
                      colors.accentOn.purple,
                    ])}
                  />
                </View>
                <AnimatedNumber value={team?.combinedXpThisWeek ?? 0} color={colors.accentOn.purple} />
                <Text variant="caption" color={colors.accentOn.purple} style={[styles.statTileLabel]}>XP THIS WEEK</Text>
              </View>
              <View style={[styles.statTile, { backgroundColor: colors.accent.info }]}>
                <View style={[styles.statIconCircle, { backgroundColor: colors.surface.default }]}>
                  <Icon
                    name={icons.daysTogether}
                    size={20}
                    color={bestForeground(colors.surface.default, [
                      colors.accent.info,
                      colors.accentOn.info,
                    ])}
                  />
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
                  <Icon name={icons.celebrate} size={16} color={colors.accentOn.danger} />
                  <Text variant="caption" color={colors.accentOn.danger} style={styles.liveText}>You hit this week's goal together!</Text>
                </View>
              ) : team?.bothActiveThisWeek ? (
                <View style={[styles.liveRow, { borderTopColor: colors.accentOn.danger }]}>
                  <Icon name={icons.streak} size={16} color={colors.accentOn.danger} />
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
                <Icon name={icons.stats} size={24} color={colors.text.primary} />
              </View>
              <View style={styles.actionTextWrap}>
                <Text variant="title">Share my progress</Text>
                <Text variant="bodySm" color="secondary">Let {buddyFirstName} see your XP and level.</Text>
              </View>
              <Toggle value={iShare} />
            </PressableScale>

            <View style={[styles.actionDivider, { backgroundColor: colors.border.default }]} />

            {/* Help & Resources */}
            <PressableScale style={styles.actionRow} scaleTo={0.98} onPress={() => navigation.navigate("Resources")}>
              <View style={[styles.actionIconSquare, { backgroundColor: colors.surface.control }]}>
                <Icon name={icons.support} size={24} color={colors.text.primary} />
              </View>
              <View style={styles.actionTextWrap}>
                <Text variant="title">Help & Resources</Text>
                <Text variant="bodySm" color="secondary">Learn more about community.</Text>
              </View>
              <Icon name={icons.chevronRight} size={24} color={colors.text.tertiary} />
            </PressableScale>

            <View style={[styles.actionDivider, { backgroundColor: colors.border.default }]} />

            {/* Leave Buddy */}
            <PressableScale style={styles.actionRow} scaleTo={0.98} onPress={handleLeave}>
              <View style={[styles.actionIconSquare, { backgroundColor: colors.accentTint.danger }]}>
                <Icon name={icons.leave} size={24} color={colors.feedback.dangerText} />
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

  if (!isPaired && !loading && !error) {
    return (
      <>
        <Page title="Community" description="Practice sticks when someone's in it with you." tabBarSafe>
          {renderInvite()}
        </Page>
        {/* ── Buddy Welcome Modal ── */}
        <WatermarkModal
          visible={showWelcome}
          onClose={() => setShowWelcome(false)}
          watermarkIcon={icons.pairing}
          watermarkColor={colors.action.primary}
          tag="BUDDY CONNECTED"
          tagColor={colors.action.primary}
          title="You're now paired!"
          message="Share your journey, support each other, and grow together."
          ctaLabel="Let's Go!"
          ctaColor={colors.action.primary}
          ctaTextColor={colors.action.onPrimary}
        />

        {/* ── Invalid Code Error Modal ── */}
        <WatermarkModal
          visible={showError}
          onClose={() => setShowError(false)}
          watermarkIcon={icons.warning}
          watermarkColor={colors.feedback.danger}
          tag="INVALID CODE"
          tagColor={colors.feedback.dangerText}
          title="Couldn't Connect"
          message={errorMessage}
          ctaLabel="Try Again"
          ctaColor={colors.feedback.danger}
          ctaTextColor={colors.accentOn.danger}
        />
      </>
    );
  }

  return (
    <ScreenView style={[styles.screenView, { backgroundColor: colors.background.canvas }]}>
      <SchemeStatusBar />
      {/* Dark canvas behind everything */}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.background.canvas }]} />

      <View style={styles.container}>
        {loading ? (
          <CommunitySkeleton topPad={insets.top + 20} />
        ) : error ? (
          <View style={styles.center}>
            <Icon
              name={icons.warning}
              size={48}
              color={colors.text.tertiary}
              style={{ marginBottom: spacing.md }}
            />
            <Text variant="body" color="secondary" style={{ marginBottom: spacing.xl }}>Couldn't load Community.</Text>
            <PressableScale onPress={load} style={[styles.retryBtn, { backgroundColor: colors.action.primary }]}>
              <Text variant="body" color={colors.action.onPrimary} style={styles.bold}>Retry</Text>
            </PressableScale>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            {/* Horizontal pager of two INDEPENDENT vertical scrolls. */}
            <ScrollView
              ref={scrollViewRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={{ flex: 1 }}
              onMomentumScrollEnd={(e) => {
                const offsetX = e.nativeEvent.contentOffset.x;
                const pageIndex = Math.round(offsetX / screenWidth);
                setView(pageIndex === 0 ? "us" : "timeline");
              }}
            >
              {/* Us page */}
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
                  {headerPlaceholder}
                  {renderPaired()}
                </CustomScrollView>
              </View>

              {/* Timeline page */}
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
                  {headerPlaceholder}
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
              </View>
            </ScrollView>

            {/* Screen-level sticky compose control — shown only on the Timeline tab */}
            {view === "timeline" && (
              <FloatingControls
                items={[
                  {
                    icon: icons.add,
                    onPress: handleOpenMoment,
                    accessibilityLabel: "Share a moment",
                  },
                ]}
              />
            )}
          </View>
        )}
      </View>

      {/* Fixed header — sits above the pager so it never moves during swipes */}
      {renderFixedHeader()}

      {/* Opaque status-bar cap — content scrolls under the clock cleanly. */}
      {insets.top > 0 ? (
        <View
          style={[styles.statusCap, { height: insets.top, backgroundColor: colors.background.canvas }]}
          pointerEvents="none"
        />
      ) : null}

      {/* ── Buddy Welcome Modal ── */}
      <WatermarkModal
        visible={showWelcome}
        onClose={() => setShowWelcome(false)}
        watermarkIcon={icons.pairing}
        watermarkColor={colors.action.primary}
        tag="BUDDY CONNECTED"
        tagColor={colors.action.primary}
        title="You're now paired!"
        message="Share your journey, support each other, and grow together."
        ctaLabel="Let's Go!"
        ctaColor={colors.action.primary}
        ctaTextColor={colors.action.onPrimary}
      />

      {/* ── Invalid Code Error Modal ── */}
      <WatermarkModal
        visible={showError}
        onClose={() => setShowError(false)}
        watermarkIcon={icons.warning}
        watermarkColor={colors.feedback.danger}
        tag="INVALID CODE"
        tagColor={colors.feedback.dangerText}
        title="Couldn't Connect"
        message={errorMessage}
        ctaLabel="Try Again"
        ctaColor={colors.feedback.danger}
        ctaTextColor={colors.accentOn.danger}
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
  bold: { fontFamily: fonts.bold },

  // Loading skeleton
  skelBanner: { height: 196, marginHorizontal: space.screenX, borderRadius: radius.card, marginBottom: space.titleGap },
  skelLabel: { height: 16, width: 130, marginHorizontal: space.screenX, borderRadius: radius.sm, marginBottom: 14 },
  skelCard: { height: 184, marginHorizontal: space.screenX, borderRadius: radius.card, marginBottom: space.titleGap },
  skelToggle: { height: 72, marginHorizontal: space.screenX, borderRadius: radius.card, marginBottom: space.titleGap },
  skelLabelSm: { height: 16, width: 104, marginHorizontal: space.screenX, borderRadius: radius.sm, marginBottom: 14 },
  skelDock: { height: 76, marginHorizontal: space.screenX, borderRadius: radius.card },

  // Header
  statusCap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  fixedHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: zIndex.sticky,
  },
  headerTabs: { paddingHorizontal: space.screenX, marginTop: space.titleGap, paddingBottom: space.inlineGap, alignSelf: "flex-start" },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.screenX,
  },
  retryBtn: {
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.md,
    borderRadius: radius.full,
  },
  scrollView: { paddingHorizontal: 0 },

  // Paired — partnership layout
  pairedWrapper: {
    paddingTop: spacing.xl,
    paddingBottom: spacing["2xl"],
  },

  // Partnership banner (equal, together)
  partnerCard: {
    marginHorizontal: space.screenX,
    marginBottom: space.titleGap,
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
    borderRadius: radius.full,
    borderWidth: 4,
  },
  pAvatarImg: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
  },
  pAvatarFallback: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
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
    marginHorizontal: space.screenX,
    marginBottom: spacing.md,
  },

  // Together — bento layout
  bento: { marginBottom: spacing.lg },

  // Bond Level — hero tile
  bondCard: {
    marginHorizontal: space.screenX,
    marginBottom: spacing.md,
    borderRadius: radius.card,
    paddingHorizontal: spacing.xl,
    paddingVertical: 18,
  },
  tierRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.lg },
  statIconCircle: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
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
    borderTopWidth: borderWidth.thin,
  },
  liveText: { flexShrink: 1 },

  // Two stat tiles
  statsRow: { flexDirection: "row", gap: spacing.md, marginHorizontal: space.screenX, marginBottom: spacing.md },
  statTile: {
    flex: 1,
    borderRadius: radius.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  statTileLabel: {
    marginTop: spacing.xs,
    letterSpacing: 0.5,
  },

  // Weekly shared quest tile
  questCard: {
    marginHorizontal: space.screenX,
    marginBottom: spacing.md,
    borderRadius: radius.card,
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
    marginHorizontal: space.screenX,
    marginBottom: space.titleGap,
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
    height: borderWidth.thin,
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

  // Invite Referral Card
  // Invite Referral Card
  inviteCard: {
    width: "100%",
    borderRadius: radius.sheet,
    paddingTop: spacing["3xl"],
    paddingBottom: spacing["2xl"],
    paddingHorizontal: spacing["2xl"],
    marginTop: spacing.xl,
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
    // Free floating, no extra container padding needed.
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xl,
    gap: spacing.lg,
  },
  stepIconBox: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  stepTextContent: {
    flex: 1,
    gap: spacing.xxs,
  },
  codeBox: {
    width: "100%",
    height: 58,
    borderWidth: borderWidth.thick,
    borderStyle: "dashed",
    borderRadius: radius.pill,
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
    height: 58,
    borderRadius: radius.pill,
  },
  pendingPillImm: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  dividerBox: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginVertical: spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: borderWidth.thin,
  },
  dividerText: {
    marginHorizontal: 14,
    letterSpacing: 1,
  },
  inputBox: {
    flexDirection: "row",
    width: "100%",
    height: 58,
    borderRadius: radius.pill,
    borderWidth: borderWidth.thin,
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
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
});

const wm = StyleSheet.create({
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
