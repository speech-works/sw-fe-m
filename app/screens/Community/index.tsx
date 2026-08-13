import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React, { useCallback, useEffect, useState, useRef } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  Dialog,
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
  Sheet,
  SectionHeader,
  ListItem,
  Button,
  useNavBarInset,
  size,
  duration,
  easing,
} from "../../design-system";
import {
  BuddySummary,
  BuddyTeam,
  getBuddyReport,
  getBuddyTeam,
  getMyBuddy,
  leaveBuddy,
  setReportConsent,
  getBuddyRequests,
  acceptBuddyRequest,
  declineBuddyRequest,
  type BuddyRequest,
  attachInviteCode,
} from "../../api/buddies";
import { Signal, Thread, getThread } from "../../api/threads";
import { getLevelStage, LevelStage } from "../../api/users";
import { useUserStore } from "../../stores/user";
import { UserAvatar } from "../../components/UserAvatar";
import { normalizeManifest, type AvatarManifest } from "../../types/avatar";
import { useInboxStore } from "../../stores/inbox";
import { useCommunityDock } from "../../stores/communityDock";
import { shareBuddyInvite } from "../../util/functions/share";
import { ROUTE_NAMES } from "../../constants/routes";
import { track } from "../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../util/analytics/analyticsEvents";
import { blockUser, type ReportReason } from "../../api/moderation";
import ReportSheet from "../../components/ReportSheet";
import CommunityRoom from "../../components/CommunityRoom";
import { apiErrorMessage } from "../../util/functions/apiError";
import { resetBuddyLocalState } from "../../util/functions/buddyReset";
import { showErrorBottomSheet, showSuccessBottomSheet } from "../../util/functions/bottomSheet";

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
      <TouchableOpacity
        onPress={onClose}
        style={wm.closeBtn}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Close"
      >
        <Icon name={icons.close} size={size.icon} color={colors.text.tertiary} />
      </TouchableOpacity>
      <Text variant="eyebrow" color={tagColor} style={wm.tag}>{tag}</Text>
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
  const navBarInset = useNavBarInset();
  const navigation = useNavigation<any>();
  const { colors, elevation, scheme } = useTheme();

  const [summary, setSummary] = useState<BuddySummary | null>(null);
  const [report, setReport] = useState<BuddyReport | null>(null);
  const [team, setTeam] = useState<BuddyTeam | null>(null);
  const [myStage, setMyStage] = useState<LevelStage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // `busy` drives the UI (rows dim while a block/leave is in flight). The ref
  // is what actually prevents a double submit: two presses in the same frame
  // both read the same stale state value, so state alone cannot guard this.
  const [busy, setBusy] = useState(false);
  const actionInFlight = useRef(false);
  const [leaveVisible, setLeaveVisible] = useState(false);
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
  const codeInputRef = useRef<TextInput>(null);
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
        // Paired: any leftover request is moot, and the badge must not linger.
        setRequests([]);
        useInboxStore.getState().setPendingRequestCount(0);
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
        // Covers the case where the server ended the pairing without us doing
        // it — they left, or they blocked us. Same cleanup as our own actions,
        // including the unread badge, which used to survive.
        resetBuddyLocalState();
        // Only meaningful while unpaired — you cannot accept a request you have
        // no free slot for, and the server refuses it anyway.
        try {
          const reqs = await getBuddyRequests();
          setRequests(reqs);
          useInboxStore
            .getState()
            .setPendingRequestCount(
              reqs.filter((r) => r.direction === "incoming").length,
            );
        } catch {
          setRequests([]);
        }
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
  const [requests, setRequests] = useState<BuddyRequest[]>([]);
  const [requestBusyId, setRequestBusyId] = useState<string | null>(null);
  const [pendingDecline, setPendingDecline] = useState<BuddyRequest | null>(null);
  const [blockConfirmVisible, setBlockConfirmVisible] = useState(false);
  const [blockReasonVisible, setBlockReasonVisible] = useState(false);
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
      const result = await attachInviteCode(buddyCode.trim().toUpperCase());
      // Clearing the field is the only reset now that there is no open/closed
      // state to fall back to; the field itself never goes away.
      setBuddyCode("");
      codeInputRef.current?.blur();
      track(ANALYTICS_EVENTS.BUDDY_CODE_ENTERED, { outcome: result.status });
      await load();
      // Say which of the two things happened. A brand-new account the code was
      // plainly sent to is paired on the spot; everyone else has ASKED, and
      // the owner still has to say yes. Claiming a pairing here for the second
      // case would be a straight lie the next screen immediately contradicts.
      if (result.status === "paired") {
        setShowWelcome(true);
      } else {
        showSuccessBottomSheet(
          "Request sent",
          "They'll get a notification. You'll be paired as soon as they say yes.",
        );
      }
    } catch (e: any) {
      // `data.message` was always undefined — the API serialises as
      // `{ error }` — so this silently showed the generic fallback every time
      // and never the specific reason.
      setErrorMessage(
        apiErrorMessage(e, "Please check the code and try again."),
      );
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
      showErrorBottomSheet("Couldn't update", "Please try again.");
    }
  };

  /**
   * Accept a request — this is what actually forms the pairing.
   *
   * Everything is re-validated server-side, because a request can sit for days
   * and either side may have paired with someone else or blocked the other in
   * the meantime. So the error here is real information, not boilerplate: show
   * what the server said.
   */
  const acceptRequest = async (requestId: string) => {
    if (requestBusyId) return;
    setRequestBusyId(requestId);
    try {
      await acceptBuddyRequest(requestId);
      track(ANALYTICS_EVENTS.BUDDY_REQUEST_ACCEPTED);
      await load();
      setShowWelcome(true);
    } catch (e) {
      showErrorBottomSheet(
        "Couldn't pair",
        apiErrorMessage(e, "Please try again."),
      );
      // Refresh either way: the most likely failure IS that the request is no
      // longer valid, and leaving it on screen invites a second futile tap.
      await load();
    } finally {
      setRequestBusyId(null);
    }
  };

  const confirmDecline = async (alsoBlock: boolean) => {
    const req = pendingDecline;
    setPendingDecline(null);
    if (!req || requestBusyId) return;
    setRequestBusyId(req.id);
    try {
      if (alsoBlock) {
        // Block first: it cancels the pending row on the server as part of the
        // block, so declining afterwards would 404 on a request that is gone.
        await blockUser(req.profile.id);
        track(ANALYTICS_EVENTS.BUDDY_BLOCKED, { source: "request" });
      } else {
        await declineBuddyRequest(req.id);
        track(ANALYTICS_EVENTS.BUDDY_REQUEST_DECLINED);
      }
      await load();
    } catch (e) {
      showErrorBottomSheet("Couldn't do that", apiErrorMessage(e, "Please try again."));
    } finally {
      setRequestBusyId(null);
    }
  };

  const handleLeave = () => setLeaveVisible(true);

  /**
   * Block is a SEPARATE action from Leave, deliberately.
   *
   * Merging them would make every amicable break-up accuse a friend of abuse.
   * Most unpairings are "we drifted" or "I'm taking a break", and forcing those
   * through a block corrupts the report data — if 95% of blocks are benign you
   * can no longer triage the 5% that aren't, which is exactly what Guideline
   * 1.2's "timely responses" depends on.
   */
  const handleBlock = () => setBlockConfirmVisible(true);

  const confirmBlock = () => {
    // Confirm first (this IS destructive and irreversible from the UI), then
    // ask why. The reason rides along as the report.
    //
    // Closing the Dialog and opening the sheet in the SAME TICK is safe, but
    // only because ReportSheet is `exclusive`: a Dialog is an AnimatedModal and
    // stays mounted through its ~200ms exit, so the sheet waits for the native
    // modal registry to clear before presenting. Without that, two live native
    // Modals overlap and freeze touch input on iOS — which is exactly why this
    // whole flow used to do nothing at all. Do not "fix" this into a setTimeout
    // and do not drop `exclusive` from ReportSheet.
    setBlockConfirmVisible(false);
    setBlockReasonVisible(true);
  };

  const submitBlock = async (reason: ReportReason) => {
    if (actionInFlight.current) return;

    const buddyId = link?.buddy?.id;
    if (!buddyId) {
      // Used to be a silent `return`, which looked identical to the modal bug:
      // you tap a reason and nothing whatsoever happens.
      setBlockReasonVisible(false);
      showErrorBottomSheet(
        "Couldn't block",
        "We couldn't tell who to block. Pull to refresh and try again.",
      );
      return;
    }

    actionInFlight.current = true;
    setBusy(true);
    try {
      await blockUser(buddyId, reason);
      track(ANALYTICS_EVENTS.BUDDY_BLOCKED, { reason, source: "community" });
      // Close only once the request is done — the sheet staying up with its
      // rows dimmed IS the in-flight feedback. Closing first left the user
      // looking at an unchanged screen for the length of the round-trip.
      setBlockReasonVisible(false);
      resetBuddyLocalState();
      // load() returns summary.link as null, which flips the screen back to the
      // invite state and clears the timeline.
      await load();
      showSuccessBottomSheet(
        "Blocked",
        "You've been unpaired, and you won't be matched again. We'll review your report.",
      );
    } catch (e) {
      setBlockReasonVisible(false);
      showErrorBottomSheet("Couldn't block", apiErrorMessage(e, "Please try again."));
    } finally {
      actionInFlight.current = false;
      setBusy(false);
    }
  };

  const confirmLeave = async () => {
    if (actionInFlight.current) return;
    setLeaveVisible(false);
    actionInFlight.current = true;
    try {
      setBusy(true);
      await leaveBuddy();
      track(ANALYTICS_EVENTS.BUDDY_LEFT, { by: "me" });
      resetBuddyLocalState();
      await load();
    } catch (e) {
      showErrorBottomSheet("Couldn't leave", apiErrorMessage(e, "Please try again."));
    } finally {
      actionInFlight.current = false;
      setBusy(false);
    }
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
            ? `You & ${buddyFirstName}. Keep it up together.`
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

  /**
   * Incoming requests, above everything else.
   *
   * A person waiting on an answer outranks the evergreen "how it works"
   * explainer. Rendered only when there is something to answer, so the screen
   * is byte-identical to before for everyone else.
   */
  const renderRequests = () => {
    const incoming = requests.filter((r) => r.direction === "incoming");
    if (incoming.length === 0) return null;
    return (
      <View style={styles.requestsSection}>
        <SectionHeader icon={icons.addPerson} title="Requests" />
        <View style={[styles.requestGroup, { backgroundColor: colors.surface.default }]}>
          {incoming.map((req, i, arr) => (
            <View
              key={req.id}
              style={[
                styles.requestRow,
                i < arr.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: colors.border.default,
                },
              ]}
            >
              <View style={[styles.requestAvatar, { borderColor: colors.border.default }]}>
                <UserAvatar manifest={req.profile.avatarManifest} size={40} />
              </View>
              <View style={styles.requestTextWrap}>
                <Text variant="title" numberOfLines={1}>
                  {req.profile.name?.split(" ")[0] || "Someone"}
                </Text>
                <Text variant="bodySm" color="secondary">wants to practice together</Text>
              </View>
              <View style={styles.requestActions}>
                <Button
                  label="Accept"
                  size="sm"
                  fullWidth={false}
                  disabled={requestBusyId === req.id}
                  onPress={() => acceptRequest(req.id)}
                />
                <PressableScale
                  onPress={() => setPendingDecline(req)}
                  disabled={requestBusyId === req.id}
                  hitSlop={8}
                >
                  <Text variant="bodySm" color="secondary">Decline</Text>
                </PressableScale>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  /**
   * The unpaired screen's copy and actions — everything that sits OVER the room.
   *
   * NO BUTTON. There used to be a filled "Find someone" CTA here, and it did
   * exactly what pressing the empty seat did. Redundancy is not automatically a
   * bug, but SILENT redundancy is: nothing on the screen connected the two, so
   * they read as unrelated doors that happened to open into the same room. The
   * screen now has one route per intention — the seat (which is what the
   * headline points at, and now carries a plus and a label) for "find me
   * someone", and the field below for "I already have a code".
   *
   * ONE SLOT, ONE OCCUPANT. That CTA also forced a crossfade: the code field
   * lived in the same 54pt box and the two swapped on a shared driver. With the
   * button gone the field simply stays, which removes the swap, the open/close
   * state, and the Cancel affordance that only existed to undo it. Fewer moving
   * parts for strictly more capability.
   *
   * NO CARD. There is nothing to contain — the scrim already separates this
   * from the art, and a filled surface here would just be a second, weaker
   * background sitting on the real one.
   *
   * The type carries the screen. `h1` is 28pt, which is a heading; this is a
   * poster line, so the size and tracking are overridden locally rather than
   * added to the scale — nothing else in the app wants a 34pt display cut.
   */
  const canJoin = buddyCode.trim().length >= 4;
  const joinIn = useSharedValue(0);

  useEffect(() => {
    joinIn.value = reduceMotion
      ? Number(canJoin)
      : withTiming(Number(canJoin), { duration: duration.fast, easing: easing.out });
  }, [canJoin, reduceMotion, joinIn]);

  // Never from scale(0): a control that grows out of nothing reads as a pop.
  const joinStyle = useAnimatedStyle(() => ({
    opacity: joinIn.value,
    transform: [{ scale: 0.92 + 0.08 * joinIn.value }],
  }));

  const renderStage = () => {
    // The halo has to invert with the canvas the room dissolves into. In light
    // mode the scrim resolves to cream, and a black halo behind dark ink reads
    // as a smudge rather than as separation.
    const halo = {
      textShadowColor: scheme === "dark" ? "rgba(0, 0, 0, 0.85)" : "rgba(255, 255, 255, 0.9)",
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 12,
    } as const;

    return (
      <View style={styles.stage}>
        {/* NO KICKER. It said "COMMUNITY" in 12pt accent, and it sat at the top
            of the stage where the scrim is still thin — so it landed on a lit
            avatar and was the one illegible thing on the screen. Rather than
            fight for contrast: the dock below already says Community, in an
            orange pill, and you tapped that pill to get here. The label was
            never carrying anything the page didn't already say. */}
        <Text variant="poster" style={halo}>
          There&apos;s a space{" "}
          <Text variant="poster" style={{ color: colors.text.accent }}>
            next to you.
          </Text>
        </Text>

        <Text variant="bodySm" color="secondary" style={[styles.stageSub, halo]}>
          Practice sticks when someone&apos;s in it with you.
        </Text>

        {isPending && (
          <View style={[styles.pendingPillImm, { backgroundColor: colors.action.primaryTint, alignSelf: "flex-start" }]}>
            <Icon name={icons.soon} size={size.iconInline} color={colors.text.accent} />
            <Text variant="caption" color="accent" style={styles.bold}>Waiting for them to join…</Text>
          </View>
        )}

        {/* THE CODE FIELD, always here.
            It used to hide behind a "Got a code? Enter it" link because a
            permanently-open input made the screen look like a form waiting to
            be filled. That reasoning belonged to a screen whose primary action
            was a filled button sitting directly above it — two filled orange
            controls sixty points apart, only one of them ever relevant. With
            the button gone the field is the only control in this block, so
            there is nothing for it to compete with and no reason to make
            someone open it first. The open/close state, its crossfade and the
            Cancel affordance that existed only to undo it all go with it.

            It stays LABELLED as a code field rather than becoming a general
            search box. There is no name search to back that promise — the
            discover endpoint takes a cursor, not a query — and a field that
            invites you to type a name and then cannot find one is worse than no
            field at all. Discovery is the seat's job, and the seat now says so.

            Join still appears on the fourth character rather than sitting there
            disabled: a control that cannot do anything yet is noise, and its
            arrival is the confirmation that what you typed is long enough. */}
        <View style={styles.primarySlot}>
          <View style={[styles.inputBox, { backgroundColor: colors.input.bg, borderColor: colors.input.border }]}>
            <TextInput
              ref={codeInputRef}
              style={[styles.codeInput, { color: colors.text.primary }]}
              placeholder="Their code"
              placeholderTextColor={colors.input.placeholder}
              value={buddyCode}
              onChangeText={setBuddyCode}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={10}
              onSubmitEditing={handleSubmitCode}
              returnKeyType="go"
              editable={!submittingCode}
              accessibilityLabel="Their invite code"
            />
            {/* ABSOLUTE, not in the row. As a flex sibling, Join appearing on
                the fourth character stole width from the TextInput and shoved
                the text and caret left mid-keystroke — a jolt at the exact
                moment you are watching what you type. Out of flow, it changes
                nothing; `codeInput` reserves the space with paddingRight. */}
            <Animated.View style={[styles.joinWrap, joinStyle]} pointerEvents={canJoin ? "auto" : "none"}>
              {submittingCode ? (
                <ActivityIndicator color={colors.action.primary} size="small" style={styles.codeSpinner} />
              ) : (
                <PressableScale
                  onPress={handleSubmitCode}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Join with this code"
                  style={[styles.joinBtn, { backgroundColor: colors.action.primary }]}
                >
                  <Text variant="bodySm" color={colors.action.onPrimary} style={styles.bold}>
                    Join
                  </Text>
                </PressableScale>
              )}
            </Animated.View>
          </View>
        </View>

        {/* The one line left under the field.
            Share, not copy: the OS share sheet offers copy as one of its
            options, so a separate copy affordance was a second control for a
            subset of one action.

            "Got a code? Enter it" used to sit beside it and is gone — the field
            directly above IS that path now, so the link pointed at something
            already on screen. With one occupant instead of two, this no longer
            needs a fixed-height slot to hold the layout still. */}
        <View style={styles.underRow}>
          <PressableScale
            onPress={handleShare}
            disabled={!summary?.referralCode}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Share your invite code"
            style={styles.underItem}
          >
            <Text variant="caption" color="tertiary">or share yours · </Text>
            <Text variant="caption" color="accent" style={styles.codeInline}>
              {summary?.referralCode ?? "\u2026"}
            </Text>
          </PressableScale>
        </View>
      </View>
    );
  };

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
      // "—" told the reader nothing. No lastLogin means this is a new account,
      // so say that.
      active: relativeAgo(user?.lastLogin) ?? "New here",
    };
    const them = {
      stage: stageTitleForLevel(myStage, report?.level),
      level: report?.level ?? 1,
      xp: report?.totalXp,
      // No lastPracticeAt means the buddy hasn't practiced yet, which is a real
      // state worth naming rather than blanking.
      active: relativeAgo(report?.lastPracticeAt) ?? "Not yet",
    };

    // Both sides render the OWNED avatar, never the OAuth photo — a buddy sees
    // the face you chose (Phase E). A missing manifest means "never
    // customized", and normalizeManifest turns that into the default
    // character, so `known: false` (we have no profile row at all) is the only
    // case left for initials.
    const renderAvatar = (
      manifest: AvatarManifest | null | undefined,
      initials: string | undefined,
      label: string,
      known = true,
    ) =>
      known ? (
        <View style={[styles.pAvatarImg, styles.pAvatarClip, { backgroundColor: normalizeManifest(manifest).colors.bg }]}>
          <UserAvatar manifest={manifest} size={85} accessibilityLabel={label} />
        </View>
      ) : (
        <View style={[styles.pAvatarFallback, { backgroundColor: colors.surface.control }]}>
          <Text variant="h3" color="accent">{initials}</Text>
        </View>
      );

    // Cooperative figures — server-computed, cumulative, never a contest.
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
                {renderAvatar(user?.avatarManifest, myInitials, "Your avatar")}
              </View>
              <View style={[styles.avatarWrapper, { zIndex: 1, marginLeft: -spacing.xl, borderColor: colors.action.primary }]}>
                {renderAvatar(
                  buddy?.avatarManifest,
                  buddyInitials,
                  `${buddyFirstName}'s avatar`,
                  !!buddy,
                )}
              </View>
            </View>
            <Text variant="h2" color={colors.action.onPrimary}>You & {buddyFirstName}</Text>
            {since ? (
              <View style={styles.partnerMeta}>
                <Icon name={icons.daysTogether} size={size.iconInline} color={colors.action.onPrimary} />
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
                  <Text variant="bodySm" color={colors.accentOn.warning}>Chapter {team?.bondLevel ?? 1} together</Text>
                </View>
              </View>
              <Text variant="caption" color={colors.accentOn.warning}>
                Growing toward chapter {(team?.bondLevel ?? 1) + 1}
                {team && !team.buddyShares
                  ? ` · grows faster when ${buddyFirstName} shares too`
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
                    size={size.icon}
                    color={bestForeground(colors.surface.default, [
                      colors.accent.purple,
                      colors.accentOn.purple,
                    ])}
                  />
                </View>
                <AnimatedNumber value={team?.combinedXpThisWeek ?? 0} color={colors.accentOn.purple} />
                <Text variant="eyebrow" color={colors.accentOn.purple} style={[styles.statTileLabel]}>GROWTH THIS WEEK</Text>
              </View>
              <View style={[styles.statTile, { backgroundColor: colors.accent.info }]}>
                <View style={[styles.statIconCircle, { backgroundColor: colors.surface.default }]}>
                  <Icon
                    name={icons.daysTogether}
                    size={size.icon}
                    color={bestForeground(colors.surface.default, [
                      colors.accent.info,
                      colors.accentOn.info,
                    ])}
                  />
                </View>
                <AnimatedNumber value={daysTogether} color={colors.accentOn.info} />
                <Text variant="eyebrow" color={colors.accentOn.info} style={[styles.statTileLabel]}>DAYS TOGETHER</Text>
              </View>
            </View>

            {/* Weekly shared quest — vs your own pace, celebrated, never penalised */}
            <View style={[styles.questCard, { backgroundColor: colors.accent.danger }]}>
              <View style={styles.goalHeader}>
                <Text variant="eyebrow" color={colors.accentOn.danger} style={[styles.goalCaption]}>THIS WEEK, TOGETHER</Text>
                <Text variant="caption" color={colors.accentOn.danger} style={styles.bold}>
                  {team?.weeklyCombinedDays ?? 0}/{team?.weeklyQuestTarget ?? 4} days
                </Text>
              </View>
              {team && team.weeklyCombinedDays >= team.weeklyQuestTarget ? (
                <View style={[styles.liveRow, { borderTopColor: colors.accentOn.danger }]}>
                  <Icon name={icons.celebrate} size={size.iconSm} color={colors.accentOn.danger} />
                  <Text variant="caption" color={colors.accentOn.danger} style={styles.liveText}>You hit this week's goal together!</Text>
                </View>
              ) : team?.bothActiveThisWeek ? (
                <View style={[styles.liveRow, { borderTopColor: colors.accentOn.danger }]}>
                  <Icon name={icons.streak} size={size.iconSm} color={colors.accentOn.danger} />
                  <Text variant="caption" color={colors.accentOn.danger} style={styles.liveText}>You both showed up this week!</Text>
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
                <Icon name={icons.stats} size={size.tabIcon} color={colors.text.primary} />
              </View>
              <View style={styles.actionTextWrap}>
                <Text variant="title">Share my progress</Text>
                <Text variant="bodySm" color="secondary">Let {buddyFirstName} see your progress.</Text>
              </View>
              <Toggle value={iShare} />
            </PressableScale>

            <View style={[styles.actionDivider, { backgroundColor: colors.border.default }]} />

            {/* Help & Resources */}
            <PressableScale style={styles.actionRow} scaleTo={0.98} onPress={() => navigation.navigate("Resources")}>
              <View style={[styles.actionIconSquare, { backgroundColor: colors.surface.control }]}>
                <Icon name={icons.support} size={size.tabIcon} color={colors.text.primary} />
              </View>
              <View style={styles.actionTextWrap}>
                <Text variant="title">Help & Resources</Text>
                <Text variant="bodySm" color="secondary">Learn more about community.</Text>
              </View>
              <Icon name={icons.chevronRight} size={size.tabIcon} color={colors.text.tertiary} />
            </PressableScale>

            <View style={[styles.actionDivider, { backgroundColor: colors.border.default }]} />

            {/* Leave Buddy */}
            <PressableScale style={styles.actionRow} scaleTo={0.98} onPress={handleLeave}>
              <View style={[styles.actionIconSquare, { backgroundColor: colors.accentTint.danger }]}>
                <Icon name={icons.leave} size={size.tabIcon} color={colors.feedback.dangerText} />
              </View>
              <View style={styles.actionTextWrap}>
                <Text variant="title" color={colors.feedback.dangerText}>Leave buddy</Text>
                <Text variant="bodySm" color="secondary">End this partnership.</Text>
              </View>
            </PressableScale>

            <View style={[styles.actionDivider, { backgroundColor: colors.border.default }]} />

            {/* Block & report (App Store 1.2). Sits BELOW Leave and looks
                heavier, because leaving a buddy is normal and blameless while
                this one is an accusation. Two rows, not one — see handleBlock. */}
            <PressableScale style={styles.actionRow} scaleTo={0.98} onPress={handleBlock}>
              <View style={[styles.actionIconSquare, { backgroundColor: colors.accentTint.danger }]}>
                <Icon name={icons.report} size={size.tabIcon} color={colors.feedback.dangerText} />
              </View>
              <View style={styles.actionTextWrap}>
                <Text variant="title" color={colors.feedback.dangerText}>Block &amp; report {buddyFirstName}</Text>
                <Text variant="bodySm" color="secondary">Unpair now, and tell us what happened.</Text>
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
        {/* NOT `Page`. Page caps the status bar with an opaque strip and paints
            its body on solid canvas — either one would draw a hard line across
            the top of a full-bleed room. What Page gives this screen (canvas,
            status bar, dock clearance) is three lines here, so the scaffold is
            hand-rolled rather than fought. */}
        <ScreenView>
          <SchemeStatusBar />
          <CommunityRoom
            manifest={user?.avatarManifest}
            onSeatPress={() => navigation.navigate("Discover")}
          />
          <View
            style={[
              styles.stageRoot,
              {
                paddingTop: insets.top + space.inlineGap,
                // Clears the floating dock, which the room deliberately runs
                // underneath — the art has no floor, the content does.
                paddingBottom: size.tabBarSafe + navBarInset,
              },
            ]}
            pointerEvents="box-none"
          >
            {renderRequests()}
            <View style={styles.stageSpacer} pointerEvents="none" />
            {renderStage()}
          </View>
        </ScreenView>
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
                  contentContainerStyle={[styles.scrollView, { paddingBottom: size.tabBarSafe + navBarInset, flexGrow: 1 }]}
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
                  contentContainerStyle={[styles.scrollView, { paddingBottom: size.tabBarSafe + navBarInset, flexGrow: 1 }]}
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

      <Dialog
        visible={leaveVisible}
        onClose={() => setLeaveVisible(false)}
        title="Leave buddy?"
        message="You'll stop sharing progress with each other, and your slot frees up to invite someone else."
        cancelLabel="Cancel"
        confirmLabel="Leave"
        destructive
        onConfirm={confirmLeave}
      />

      {/* A Sheet, not a Dialog: there are THREE outcomes here (decline, decline
          and block, change my mind) and a Dialog gives two buttons plus a
          backdrop tap — which would have made "dismiss" ambiguous with an
          actual choice. Declining offers blocking in the same breath because
          "no" and "don't contact me again" are often one intent, and a request
          from a stranger is exactly where that matters. */}
      <Sheet
        visible={pendingDecline !== null}
        onClose={() => setPendingDecline(null)}
        title={`Decline ${pendingDecline?.profile.name?.split(" ")[0] ?? "this request"}?`}
      >
        <View style={styles.declineSheetBody}>
          <Text variant="bodySm" color="secondary" style={styles.declineIntro}>
            They won't be told either way, and they won't be able to ask again.
          </Text>
          <View style={[styles.requestGroup, { backgroundColor: colors.surface.default }]}>
            <ListItem label="Decline" divider onPress={() => confirmDecline(false)} />
            <ListItem
              label="Decline and block"
              sublabel="They also won't be able to pair with you later"
              onPress={() => confirmDecline(true)}
            />
          </View>
        </View>
      </Sheet>

      <Dialog
        visible={blockConfirmVisible}
        onClose={() => setBlockConfirmVisible(false)}
        title={`Block ${buddyFirstName}?`}
        message="You'll be unpaired right away. They won't see your progress, and you two won't be matched again."
        cancelLabel="Cancel"
        confirmLabel="Block"
        destructive
        onConfirm={confirmBlock}
      />

      <ReportSheet
        visible={blockReasonVisible}
        // Left dismissable while busy on purpose: the ref guard already stops a
        // second POST, so a backdrop tap costs nothing and a stuck request
        // shouldn't trap the user behind an undismissable sheet.
        onClose={() => setBlockReasonVisible(false)}
        target="user"
        personName={buddyFirstName}
        submitting={busy}
        onSubmit={submitBlock}
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
  pAvatarClip: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
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

  // ── The unpaired stage, laid over the room ────────────────────────────────
  // Owns the gutters and the safe areas that `Page` would normally apply. The
  // room underneath is absolutely positioned and unaffected by any of it.
  stageRoot: { flex: 1, paddingHorizontal: space.screenX },
  // Pushes the copy to the bottom without a fixed height, so a long headline or
  // a large text size grows upward into the art instead of clipping.
  stageSpacer: { flex: 1 },
  stage: { gap: spacing.sm },
  stageSub: { marginTop: spacing.xxs, maxWidth: 280 },
  // The share line, at caption size. It serves the minority who already know
  // someone; ranking it as a button is what made earlier versions read as a menu.
  underRow: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  underItem: { flexDirection: "row", alignItems: "center" },
  codeInline: { letterSpacing: 1, fontFamily: fonts.semibold },
  codeSpinner: { marginRight: spacing.md },
  // The field's row. Fixed at 54 so a long headline growing upward is the only
  // thing that ever moves in this block.
  primarySlot: { height: 54, marginTop: spacing.sm },
  // Sits INSIDE the field's right edge, so the row height never changes as it
  // appears and the layout doesn't jump on the fourth character.
  // Out of flow, pinned to the field's right edge.
  joinWrap: { position: "absolute", right: 0, top: 0, bottom: 0, justifyContent: "center" },
  joinBtn: {
    height: 36,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.xs,
  },

  // Incoming buddy requests, above everything else.
  requestsSection: { gap: spacing.md },
  requestGroup: { borderRadius: radius.card, overflow: "hidden" },
  requestRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.iconText,
    padding: space.cardPad,
  },
  requestAvatar: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    borderWidth: borderWidth.hairline,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  requestTextWrap: { flex: 1, gap: 2 },
  requestActions: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  declineSheetBody: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  declineIntro: { marginBottom: spacing.md },

  pendingPillImm: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  inputBox: {
    flexDirection: "row",
    width: "100%",
    // Fills `primarySlot` exactly. It used to match a 54pt CTA it swapped with;
    // the CTA is gone, but the height stays — a full-width pill is what reads as
    // a control on a scrim rather than as a box drawn on artwork.
    height: 54,
    borderRadius: radius.pill,
    borderWidth: borderWidth.thin,
    paddingHorizontal: 6,
    alignItems: "center",
  },
  codeInput: {
    flex: 1,
    height: "100%",
    paddingLeft: 14,
    // Clears the absolutely-positioned Join so a full-length code never runs
    // underneath it.
    paddingRight: 96,
    // NO `...typography.body` HERE, deliberately — and no `lineHeight` at all.
    //
    // Spreading the variant brought `lineHeight: 24` with it, and a lineHeight
    // on a single-line TextInput is applied to the VALUE but not to the
    // placeholder. The result was a control whose text jumped a couple of
    // points the instant you typed the first character: placeholder sitting at
    // the box's centre, entered text sitting at the centre of a 24pt line box
    // inside it. Two different baselines for what has to read as one field.
    //
    // So the font is set by hand from the same token (identical size, no line
    // box) and the row does the centring: `inputBox` is a fixed 54 with
    // `alignItems: "center"`, which centres placeholder and value by the same
    // rule. `paddingVertical: 0` + `includeFontPadding: false` remove Android's
    // implicit input padding and font padding, which are the same bug wearing a
    // different hat — without them the two platforms centre differently.
    fontSize: typography.body.fontSize,
    fontFamily: fonts.bold,
    letterSpacing: 1,
    paddingVertical: 0,
    includeFontPadding: false,
    textAlignVertical: "center",
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
    borderRadius: radius.input,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
});
