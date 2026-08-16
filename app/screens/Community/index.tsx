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
  FadeIn,
  FadeOut,
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
import Discover from "../Discover";
import PeopleHeader from "./PeopleHeader";
import ScreenView from "../../components/ScreenView";
import Timeline, { TimelineHandle } from "../../components/Timeline";
import BuddySupportSheet from "../../components/BuddySupportSheet";
import PressableScale from "../../components/PressableScale";
import {
  SchemeStatusBar,
  Button,
  Dialog,
  EmptyState,
  Sheet,
  Snackbar,
  useTheme,
  accentEdge,
  primaryEdge,
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
  IconButton,
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
import { monthYear, relativeAgo } from "../../util/functions/time";
import BuddyRequestList from "../../components/BuddyRequests";
import RequestSheet from "../../components/BuddyRequests/RequestSheet";
import { ROUTE_NAMES } from "../../constants/routes";
import { track } from "../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../util/analytics/analyticsEvents";
import { blockUser, type ReportReason } from "../../api/moderation";
import ReportSheet from "../../components/ReportSheet";
import CommunityRoom from "../../components/CommunityRoom";
import { apiErrorMessage, isNotFound } from "../../util/functions/apiError";
import { resetBuddyLocalState } from "../../util/functions/buddyReset";
import { showErrorBottomSheet, showSuccessBottomSheet } from "../../util/functions/bottomSheet";

const screenWidth = Dimensions.get("window").width;

/**
 * How long a decline waits before it is sent.
 *
 * This is the confirm step, expressed as time rather than as a second dialog.
 * Long enough to catch the wrong-row tap you notice the instant the row leaves
 * the screen; short enough that nobody sits waiting on the bar. Material puts
 * a snackbar's own life at 4-10s and this sits at the short end of that,
 * because the bar disappearing IS the commit and a longer wait would leave the
 * list disagreeing with the server for no benefit.
 */
const UNDO_GRACE_MS = 5000;

/** Buddy's shared progress (from GET /buddies/report; null when they don't share). */
interface BuddyReport {
  name?: string;
  level?: number;
  totalXp?: number;
  lastPracticeAt?: string | Date | null;
}

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
  const openPeople = useCommunityDock((s) => s.openPeople);
  const setPeople = useCommunityDock((s) => s.setPeople);
  const enterDock = useCommunityDock((s) => s.enter);
  const leaveDock = useCommunityDock((s) => s.leave);
  // The requests list is a mode of THIS screen; the dock is what opens and
  // closes it (see CustomTabBar), and this screen just renders what it says.
  const people = useCommunityDock((s) => s.people);
  const closePeople = useCommunityDock((s) => s.closePeople);
  const scrollViewRef = useRef<ScrollView>(null);
  const timelineRef = useRef<TimelineHandle>(null);
  const [supportSignal, setSupportSignal] = useState<Signal | null>(null);
  const [buddyCode, setBuddyCode] = useState("");
  const codeInputRef = useRef<TextInput>(null);
  const [submittingCode, setSubmittingCode] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  /**
   * A rejected code, said INSIDE the sheet you typed it in.
   *
   * It used to be a full-screen `WatermarkModal`: you mistyped one character,
   * got a takeover, dismissed it, and were returned to a screen where you had
   * to find the code entry again and retype the whole thing. A wrong code is
   * not an event, it is a correction, and a correction belongs next to the
   * field with the value still in it.
   */
  const [codeError, setCodeError] = useState<string | null>(null);
  /**
   * Deferred until the code sheet has actually gone.
   *
   * Two live native modals at once freezes touch app-wide on iOS, and this file
   * already carries scars from it. Success opens either the welcome takeover or
   * a bottom sheet, so neither may fire while the sheet that triggered it is
   * still on screen.
   */
  const afterCodeSheet = useRef<(() => void) | null>(null);
  /**
   * Is the code sheet still ON SCREEN? Not the same question as `codeSheet`.
   *
   * `codeSheet` is the request to be open; this is true from the moment it
   * opens until `onDismissed` fires, which includes the whole exit animation.
   *
   * IT EXISTS BECAUSE THE QUEUE COULD BE DROPPED. Queueing the outcome and
   * then calling `setCodeSheet(false)` only works if the sheet is still there
   * to close. Close it yourself while the request is in flight and the order
   * inverts: `onDismissed` runs first and finds an empty queue, then the reply
   * arrives, fills the queue, and closes a sheet that is already closed. React
   * bails out on the unchanged state, no second dismissal happens, and the
   * queued outcome never runs. You get paired and the app says nothing.
   *
   * A ref rather than state, because the async continuation captured its
   * render's `codeSheet` and would still read `true`.
   */
  const codeSheetLive = useRef(false);
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
        // ── PAIRED: the requests are HELD, not discarded. ──
        //
        // They used to be thrown away here, which was tidy and wrong in two
        // ways. The server never declined them, so "gone from the screen" and
        // "gone" were different facts; and if this pairing ends next week the
        // queue is the first thing that matters, so destroying the client's
        // copy of it destroys the only thing that would have helped.
        //
        // The BADGE still goes to zero, and that half was always right: a count
        // you are not allowed to act on is nagging, not information. So the
        // list survives (see the On hold section) and the dock goes quiet.
        try {
          setRequests(await getBuddyRequests());
        } catch {
          setRequests([]);
        }
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
        // Unpaired, so the count is live again — including any request that was
        // on hold through a pairing that has since ended.
        try {
          setRequests(await getBuddyRequests());
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
  /**
   * A decline that has happened on screen but not yet on the server.
   *
   * THE GRACE WINDOW IS THE CONFIRM. Declining used to open a second sheet
   * asking "are you sure", which is a modal over a modal (the iOS touch-freeze
   * trap this file already carries scars from) and a question most people
   * answer without reading. Instead the row goes immediately and the request is
   * held here for {@link UNDO_GRACE_MS}; only when that expires does the POST
   * happen. Undo is therefore free and instant, because nothing has been sent.
   *
   * It is deliberately ONE at a time. The design system's Snackbar has no queue
   * manager yet, and two undo bars stacked would be a worse problem than the
   * one this replaces — so starting a second decline commits the first.
   */
  const [undoDecline, setUndoDecline] = useState<BuddyRequest | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Mirrors `undoDecline` for the unmount handler, which would otherwise close
   *  over the value as it was on the render that registered it. */
  const undoDeclineRef = useRef<BuddyRequest | null>(null);
  undoDeclineRef.current = undoDecline;
  /** Requests already sent to the server, so neither the timer nor the unmount
   *  handler can decline the same one twice. */
  const committed = useRef<Set<string>>(new Set());
  /**
   * Ids hidden from the list while their decline is in its grace window.
   *
   * Needed because `load()` runs on focus and would happily put a declined row
   * straight back on screen — the server still has it as pending, and correctly
   * so, since we have not told it anything yet.
   */
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  /** Someone who asked and is about to be blocked, pending confirmation. */
  const [blockRequester, setBlockRequester] = useState<BuddyRequest | null>(null);
  /**
   * The invite-code field, in a sheet rather than on the stage.
   *
   * It used to expand in place, and the stage is bottom-anchored (`stageSpacer`
   * is `flex: 1`), so opening it added 70pt to a column that can only grow
   * upward: the poster headline walked up into the crowd art and landed on your
   * own avatar. That is not a spacing value to tune, it is what a bottom-pinned
   * column does when you put a disclosure in it.
   *
   * A sheet removes the expanding element entirely, so the page has nothing
   * left to get wrong, and it is what every other input in this app already
   * does. It also gets keyboard handling for free, which an input pinned above
   * a floating dock never had.
   */
  const [codeSheet, setCodeSheet] = useState(false);
  /** The person whose detail sheet is open, or null. */
  const [openRequest, setOpenRequest] = useState<BuddyRequest | null>(null);
  const [holdOpen, setHoldOpen] = useState(false);
  /**
   * Work parked until the detail sheet has FULLY unmounted.
   *
   * The sheet is a native Modal, and so are the pairing modal and the decline
   * sheet it can lead to. Two live native Modals freeze touch across the whole
   * app on iOS, so nothing may open until this one is gone — see `onDismissed`.
   */
  const afterSheetDismissed = useRef<(() => void) | null>(null);
  /** How many others were still waiting at the moment a pairing was formed —
   *  captured before the reload, which is what empties the incoming list. */
  const [heldAtPairing, setHeldAtPairing] = useState(0);
  const incomingRequests = requests.filter(
    (r) => r.direction === "incoming" && !hiddenIds.includes(r.id),
  );

  /**
   * What the pairing modal says, and what it deliberately does not ask.
   *
   * An earlier draft offered a choice here: "let the others know I'm taken" or
   * "keep them waiting". Both were dropped once the sender's own screen started
   * telling them the truth by itself (`recipientPaired`). A notification would
   * have been a second copy of a fact they can already see, sent to up to
   * twenty people at once, on a tap taken in the middle of a celebration.
   *
   * So this states what happened and stops. Managing the queue is available
   * afterwards, one person at a time, on the screen where they are listed.
   */
  const pairedMessage =
    heldAtPairing > 0
      ? `Share your journey, support each other, and grow together. ${
          heldAtPairing === 1 ? "One other person is" : `${heldAtPairing} other people are`
        } still waiting; they can see you're paired, and they'll expire on their own.`
      : "Share your journey, support each other, and grow together.";
  const [blockConfirmVisible, setBlockConfirmVisible] = useState(false);
  const [blockReasonVisible, setBlockReasonVisible] = useState(false);
  const isPaired = link?.status === "active";
  /**
   * How many people are waiting, as the STAGE understands it.
   *
   * Zero while paired, for the same reason the dock badge is: those requests
   * are held and cannot be accepted, so a count would advertise something you
   * are not allowed to act on. Same source as the badge, so the seat, the
   * sentence and the dock can never disagree.
   */
  const waitingCount = isPaired ? 0 : incomingRequests.length;

  /**
   * The dock badge, DERIVED — never hand-adjusted.
   *
   * It used to be written from five places: two in `load()`, and one each in
   * decline, undo and the decline-failed path. Every one of those was correct
   * on its own and the set of them drifted the moment any single caller ran
   * without the others, which is exactly what happened here — the badge said
   * two while the list showed three, because a decline decremented it and no
   * reload came along to put it right.
   *
   * Now there is one writer and it reads the list, so the badge cannot say
   * anything the screen does not. Zero while paired, because a count you are
   * not allowed to act on is nagging rather than information.
   */
  useEffect(() => {
    useInboxStore
      .getState()
      .setPendingRequestCount(isPaired ? 0 : incomingRequests.length);
  }, [isPaired, incomingRequests.length]);
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
      setBuddyCode("");
      setCodeError(null);
      codeInputRef.current?.blur();
      track(ANALYTICS_EVENTS.BUDDY_CODE_ENTERED, { outcome: result.status });
      await load();
      // Say which of the two things happened. A brand-new account the code was
      // plainly sent to is paired on the spot; everyone else has ASKED, and
      // the owner still has to say yes. Claiming a pairing here for the second
      // case would be a straight lie the next screen immediately contradicts.
      //
      const announce = () => {
        if (result.status === "paired") {
          setShowWelcome(true);
        } else {
          showSuccessBottomSheet(
            "Request sent",
            "They'll get a notification. You'll be paired as soon as they say yes.",
          );
        }
      };

      if (codeSheetLive.current) {
        // The sheet is still on screen, so this must wait for it to go. That
        // covers the mid-animation case too: `onDismissed` has not fired yet,
        // and when it does it will find this.
        afterCodeSheet.current = announce;
        setCodeSheet(false);
      } else {
        // The user already closed it and the dismissal is complete. There is
        // nothing left to stack against, and nothing left to wait for either:
        // queueing here would wait for a dismissal that will never come again.
        announce();
      }
    } catch (e: any) {
      // `data.message` was always undefined — the API serialises as
      // `{ error }` — so this silently showed the generic fallback every time
      // and never the specific reason.
      //
      // The sheet STAYS OPEN and keeps what you typed. See `codeError`.
      setCodeError(apiErrorMessage(e, "Please check the code and try again."));
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
    // Counted BEFORE the reload: `load()` is what turns the rest into held
    // requests, and the welcome modal needs to say how many there were.
    setHeldAtPairing(Math.max(0, incomingRequests.length - 1));
    try {
      await acceptBuddyRequest(requestId);
      track(ANALYTICS_EVENTS.BUDDY_REQUEST_ACCEPTED);
      await load();
      // The page is behind us now; leaving it open would leave the dock
      // showing tabs for a view the pairing has replaced.
      closePeople();
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

  /**
   * Send a held decline for real. Safe to call twice; the second is a no-op.
   *
   * Deliberately quiet on success — the row left the screen the moment they
   * pressed Decline, and telling them again now that a timer has elapsed would
   * be reporting on our own bookkeeping rather than on anything they did.
   */
  const commitDecline = useCallback(async (req: BuddyRequest) => {
    // EXACTLY ONCE. Two things can reach here for the same request — the timer
    // and the unmount handler — and on unmount the `setUndoDecline` below is a
    // no-op, so state cannot be the guard. Without this the second caller
    // POSTs a decline for a request the first one already declined, and the
    // server rightly answers 404.
    if (committed.current.has(req.id)) return;
    committed.current.add(req.id);

    if (undoTimer.current) {
      clearTimeout(undoTimer.current);
      undoTimer.current = null;
    }
    setUndoDecline((cur) => (cur?.id === req.id ? null : cur));
    try {
      await declineBuddyRequest(req.id);
      track(ANALYTICS_EVENTS.BUDDY_REQUEST_DECLINED);
    } catch (e) {
      // A 404 means the request is already gone — declined on another device,
      // expired past its TTL, or withdrawn by the sender. The person wanted it
      // gone and it is gone, so this is the outcome they asked for, not a
      // failure to report. Anything else genuinely failed.
      if (!isNotFound(e)) {
        // Still live, so the row was telling a lie. Put it back and say so
        // rather than leaving them believing they answered somebody.
        committed.current.delete(req.id);
        showErrorBottomSheet("Couldn't decline", apiErrorMessage(e, "Please try again."));
        setHiddenIds((prev) => prev.filter((id) => id !== req.id));
        return;
      }
    }
    // Committed. DROP IT FROM THE LIST, not just from `hiddenIds` — clearing
    // the hide while the request was still sitting in `requests` put the row
    // straight back on screen the moment the grace window closed, and it stayed
    // there until the next `load()`. Removing both is what makes the decline
    // final on screen as well as on the server.
    setRequests((prev) => prev.filter((r) => r.id !== req.id));
    setHiddenIds((prev) => prev.filter((id) => id !== req.id));
  }, []);

  /**
   * Decline, on screen, immediately — and give them a few seconds to take it
   * back before anything is sent.
   */
  const declineWithUndo = (req: BuddyRequest) => {
    // One bar at a time: whatever was already waiting goes now.
    if (undoDecline && undoDecline.id !== req.id) void commitDecline(undoDecline);

    setHiddenIds((prev) => (prev.includes(req.id) ? prev : [...prev, req.id]));
    setUndoDecline(req);

    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => void commitDecline(req), UNDO_GRACE_MS);
  };

  const undoLastDecline = () => {
    const req = undoDecline;
    if (!req) return;
    if (undoTimer.current) {
      clearTimeout(undoTimer.current);
      undoTimer.current = null;
    }
    setUndoDecline(null);
    setHiddenIds((prev) => prev.filter((id) => id !== req.id));
  };

  /**
   * Leaving the screen commits, it does not cancel.
   *
   * Pressing Decline and walking away is still declining. Dropping it on
   * unmount would silently undo a decision they made, and they would come back
   * to somebody they thought they had answered.
   */
  useEffect(
    () => () => {
      if (undoTimer.current) {
        clearTimeout(undoTimer.current);
        undoTimer.current = null;
      }
      if (undoDeclineRef.current) void commitDecline(undoDeclineRef.current);
    },
    [commitDecline],
  );

  const blockFromRequest = async (req: BuddyRequest) => {
    if (requestBusyId) return;
    setRequestBusyId(req.id);
    try {
      // Block first: it cancels the pending row on the server as part of the
      // block, so declining afterwards would 404 on a request that is gone.
      await blockUser(req.profile.id);
      track(ANALYTICS_EVENTS.BUDDY_BLOCKED, { source: "request" });
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
        title="Buddy"
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
            // Named for the same reason as the People switcher one screen away,
            // and so the two look like one control rather than two.
            labelAll
            accessibilityLabel="Buddy page tabs"
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
   * The requests list, as a MODE OF THIS SCREEN rather than a pushed route.
   *
   * It has to live inside the Community tab, because the dock is what opens it
   * and a pushed screen hides the dock (`getTabBarVisibility`). That is not a
   * workaround: the dock morphing into [back][Requests] IS the navigation here,
   * so the list has to be somewhere the dock still exists.
   *
   * There is deliberately no inline copy of this list on the room screen any
   * more. The room is a picture you are standing in, and the old section put an
   * opaque plate over the top third of it; the dock pill now reads "Waiting · 3"
   * in the accent colour at the bottom of the same screen, which is both more
   * visible and free of composition cost.
   */
  /**
   * The scroll cue for the PEOPLE page.
   *
   * A second anchor, not a second mechanism: same edge-triggered crossing, same
   * 48pt of hysteresis, same screen-reader opt-out as the Us/Timeline cue above.
   * They can never both be live, because this view replaces the paired one —
   * exactly one anchor is mounted at a time.
   */
  const [peopleCue, setPeopleCue] = useState(0);
  /** Measured once, and reserved at the top of BOTH halves — see below. */
  const [peopleHeaderHeight, setPeopleHeaderHeight] = useState(0);
  const lastPeopleY = useRef(0);
  /**
   * How far the header has been scrolled away.
   *
   * The header is a fixed overlay so a horizontal swipe cannot drag it
   * sideways, and it is DRIVEN by the scroll offset so a vertical scroll still
   * carries it off the top exactly as an in-flow header would. Both halves of
   * that matter: without the overlay the whole page slid on a swipe, and
   * without the travel the switcher would sit in the header and in the dock at
   * the same time, which is two controls for one job.
   */
  const peopleHeaderY = useSharedValue(0);
  /** Each half's own offset, so the header can meet the one you land on. */
  const peoplePageY = useRef([0, 0]);
  const handlePeopleScroll = useCallback(
    (page: number, y: number) => {
      peoplePageY.current[page] = y;
      // Only the half you are looking at moves the header. The other one can
      // still be emitting the tail of a fling.
      const active = useCommunityDock.getState().people === "discover" ? 1 : 0;
      if (page !== active) return;
      peopleHeaderY.value = y;
      const prev = lastPeopleY.current;
      lastPeopleY.current = y;
      if (!peopleCue || screenReaderRef.current) return;
      const mode = useCommunityDock.getState().mode;
      if (mode === "nav" && prev <= peopleCue && y > peopleCue) setDockMode("tabs");
      else if (mode === "tabs" && prev >= peopleCue - 48 && y < peopleCue - 48) {
        setDockMode("nav");
      }
    },
    [peopleCue, peopleHeaderY, setDockMode],
  );

  /**
   * Landing on the other half.
   *
   * Its list is at its own offset, which is usually not the one the header is
   * currently sitting at — swipe away from a scrolled list to one at the top
   * and the header would be off-screen above a page that starts at the top.
   * So it travels to meet the new half. Visible motion by design: the switcher
   * coming back is what tells you this list starts from the beginning.
   */
  const settlePeopleHeader = useCallback(
    (page: number) => {
      const y = peoplePageY.current[page] ?? 0;
      lastPeopleY.current = y;
      peopleHeaderY.value = reduceMotion
        ? y
        : withTiming(y, { duration: duration.base, easing: easing.inOut });
      // The cue is edge-triggered on scrolling, and this is not a scroll — so
      // the mode is set outright from where the new half happens to be.
      if (peopleCue && !screenReaderRef.current) {
        setDockMode(y > peopleCue ? "tabs" : "nav");
      }
    },
    [peopleCue, peopleHeaderY, reduceMotion, setDockMode],
  );

  const peopleHeaderStyle = useAnimatedStyle(() => ({
    // Clamped at its own height: past that it is fully off screen anyway, and
    // an unclamped value would keep it away for a whole fling's worth of
    // scrolling back up.
    transform: [
      {
        translateY: -Math.min(Math.max(peopleHeaderY.value, 0), peopleHeaderHeight),
      },
    ],
  }));

  const peoplePagerRef = useRef<ScrollView>(null);
  // The dock and the in-page switcher both write `people`; the pager has to
  // follow, or tapping a segment would leave the page it is showing behind.
  useEffect(() => {
    if (people === null) return;
    peoplePagerRef.current?.scrollTo({
      x: people === "discover" ? screenWidth : 0,
      animated: true,
    });
  }, [people]);

  /**
   * ONE HEADER, FIXED ABOVE THE PAGER — the same arrangement as
   * `renderFixedHeader` on the paired screen, down to the placeholder.
   *
   * Each half used to draw its own copy inside its own scroll view, so a swipe
   * carried the back arrow, the title and the switcher across with the list.
   * The chrome that says which page you are on is not part of what the page is
   * showing, and it should not move when the content does.
   *
   * It owns the status-bar inset now, because it is the thing at the top of the
   * screen; the halves reserve its measured height and start at zero.
   */
  const renderPeopleFixedHeader = () => (
    <Animated.View
      style={[
        styles.fixedHeader,
        {
          backgroundColor: colors.background.canvas,
          paddingTop: insets.top + space.inlineGap,
          paddingHorizontal: space.screenX,
        },
        peopleHeaderStyle,
      ]}
      onLayout={(e) => setPeopleHeaderHeight(e.nativeEvent.layout.height)}
    >
      <PeopleHeader
        tab={people ?? "waiting"}
        waitingCount={incomingRequests.length}
        onTab={setPeople}
        onBack={closePeople}
        onCueLayout={setPeopleCue}
      />
    </Animated.View>
  );

  const peopleHeaderPlaceholder = <View style={{ height: peopleHeaderHeight }} />;

  /**
   * ONE PAGE, TWO HALVES.
   *
   * Requests and discovery were two screens with two entry points, and they are
   * the same list of the same kind of person — the rows are literally identical
   * and both open the same sheet. So they are two segments of one page, and the
   * dock switches between them once the in-page control scrolls away.
   *
   * Each half owns its own scroll view rather than sharing one: switching
   * segments starts at the top instead of inheriting the other list's offset,
   * and the two lists have nothing to do with each other's length.
   */
  const renderPeopleView = () => (
    <ScreenView style={[styles.screenView, { backgroundColor: colors.background.canvas }]}>
      <SchemeStatusBar />
      {/**
       * A HORIZONTAL PAGER OF TWO INDEPENDENT VERTICAL SCROLLS, which is the
       * same construction the paired Us/Timeline pages use. Swiping is how
       * people expect two adjacent lists to relate, and without it the dock and
       * the header switcher were the only way across.
       *
       * THE PAGER CARRIES THE LISTS AND NOTHING ELSE. The header sits above it
       * as a fixed overlay, so a swipe moves the people and leaves the page
       * where it is; each half opens with a placeholder of the header's
       * measured height and its content passes behind it.
       */}
      <ScrollView
        ref={peoplePagerRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={{ flex: 1 }}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
          setPeople(i === 0 ? "waiting" : "discover");
          settlePeopleHeader(i);
        }}
      >
        <View style={{ width: screenWidth }}>
          <CustomScrollView onScrollY={(y: number) => handlePeopleScroll(0, y)}>
            <View
              style={[
                styles.requestsBody,
                { paddingBottom: size.tabBarSafe + navBarInset },
              ]}
            >
              {/* The header's reserved height. It replaced a `minHeight` of a
                  whole screen plus the cue anchor, which existed only to make a
                  five-row list scroll far enough to push the header off the
                  top — and paid for it with a screen of empty canvas under
                  every short list. Nothing has to leave the screen now. */}
              {peopleHeaderPlaceholder}
              {/* NO MEDALLION on the empty state below. It carried a check,
                  which says "done" — and nothing was done here. Nobody has
                  asked yet, so the tick was congratulating the user on an empty
                  list. There is no glyph that means "this is fine and also
                  nothing has happened", so it says it in words instead. */}
              {incomingRequests.length === 0 ? (
                <EmptyState
                  icon={null}
                  title="Nobody waiting"
                  message="When someone asks to practise with you, they'll be here."
                />
              ) : (
                <BuddyRequestList requests={incomingRequests} onOpen={setOpenRequest} />
              )}
            </View>
          </CustomScrollView>
        </View>

        <View style={{ width: screenWidth }}>
          <Discover
            embedded
            header={peopleHeaderPlaceholder}
            onScrollY={(y: number) => handlePeopleScroll(1, y)}
          />
        </View>
      </ScrollView>

      {renderPeopleFixedHeader()}

      {/* Opaque cap, LAST so it paints over the header as well as the list.
          The header travels, so both of them pass through this band on the way
          out and both would otherwise run through the system clock. */}
      <View
        pointerEvents="none"
        style={[
          styles.statusCap,
          { height: insets.top, backgroundColor: colors.background.canvas },
        ]}
      />
    </ScreenView>
  );

  /**
   * Blocking somebody who ASKED. Separate from the buddy block: different
   * person, different consequence, and no pairing to undo. Confirmed rather
   * than undoable — a block is not something to leave on a five-second timer.
   *
   * A FUNCTION CALLED FROM BOTH RETURNS. This screen returns early when the
   * requests view is open, and the first version of this dialog lived only in
   * the main return — so the overflow closed the sheet and then nothing
   * happened, because the thing it opens was not mounted on that path.
   */
  const renderBlockRequesterDialog = () => (
    <Dialog
      // `exclusive`: this opens FROM the detail sheet, and two live native
      // Modals freeze touch across the app on iOS. Without it the sheet closed
      // and this simply never appeared — the overflow looked like a button that
      // did nothing. The old decline sheet carried the same flag for the same
      // reason; moving the action did not move the constraint.
      exclusive
      visible={blockRequester !== null}
      onClose={() => setBlockRequester(null)}
      title={`Block ${blockRequester?.profile.name?.split(" ")[0] ?? "them"}?`}
      message="They won't be able to ask again, or be paired with you later. Their request goes away."
      cancelLabel="Cancel"
      confirmLabel="Block"
      destructive
      onConfirm={() => {
        const req = blockRequester;
        setBlockRequester(null);
        if (req) void blockFromRequest(req);
      }}
    />
  );

  const renderUndoBar = () => {
    if (!undoDecline) return null;
    const who = undoDecline.profile.name?.split(" ")[0] ?? "Request";
    return (
      <Animated.View
        pointerEvents="box-none"
        entering={reduceMotion ? undefined : FadeIn.duration(duration.fast)}
        exiting={reduceMotion ? undefined : FadeOut.duration(duration.fast)}
        style={[
          styles.undoBar,
          { bottom: size.tabBarSafe + navBarInset + space.rowGap },
        ]}
      >
        <Snackbar message={`${who} declined`} actionLabel="Undo" onAction={undoLastDecline} />
      </Animated.View>
    );
  };

  /**
   * The person behind a request.
   *
   * Every action closes the sheet first and runs from `onDismissed`, because
   * each one leads to another native Modal (the pairing modal, the decline
   * sheet, the report sheet) and stacking two of those is the app-wide touch
   * freeze this codebase has already been bitten by once.
   */
  const renderRequestSheet = () => (
    <RequestSheet
      request={openRequest}
      busy={requestBusyId !== null}
      // Accept is impossible while you are paired, and the sheet is now the
      // only thing that can say so.
      onHold={isPaired}
      onClose={() => setOpenRequest(null)}
      onAccept={(req) => {
        setOpenRequest(null);
        afterSheetDismissed.current = () => void acceptRequest(req.id);
      }}
      // Straight through: there is no confirm sheet any more, so nothing has
      // to wait for this one to unmount. The row goes, the bar appears, and
      // the POST is held for UNDO_GRACE_MS.
      onDecline={(req) => {
        setOpenRequest(null);
        declineWithUndo(req);
      }}
      // From a pending request, blocking and refusing are the same act, so
      // this is a block rather than a second moderation surface. It waits for
      // the sheet to unmount because a Dialog is a native Modal too.
      onReport={(req) => {
        setOpenRequest(null);
        afterSheetDismissed.current = () => setBlockRequester(req);
      }}
      onDismissed={() => {
        const run = afterSheetDismissed.current;
        afterSheetDismissed.current = null;
        run?.();
      }}
    />
  );

  /**
   * The people still waiting while you are paired.
   *
   * Collapsed, and below everything about the pairing itself: they are findable
   * rather than shouted about. Open it and every row is still there with a
   * working Decline, because holding someone is not the same as deciding for
   * you — it just cannot be an Accept while the one slot is taken.
   */
  const renderOnHold = () => {
    if (incomingRequests.length === 0) return null;
    return (
      <View style={styles.holdSection}>
        <PressableScale
          scaleTo={0.99}
          onPress={() => setHoldOpen((v) => !v)}
          accessibilityRole="button"
          accessibilityState={{ expanded: holdOpen }}
          accessibilityLabel={`On hold, ${incomingRequests.length} requests`}
          style={[
            styles.holdHead,
            { backgroundColor: colors.surface.default, borderColor: colors.border.default },
          ]}
        >
          <Icon name={icons.soon} size={size.iconInline} color={colors.text.tertiary} />
          <Text variant="title" style={styles.holdTitle}>
            On hold
          </Text>
          <Text variant="bodySm" color="tertiary">
            {incomingRequests.length}
          </Text>
          <Icon
            name={holdOpen ? icons.chevronUp : icons.chevronDown}
            size={size.iconSm}
            color={colors.text.tertiary}
          />
        </PressableScale>

        {holdOpen ? (
          <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(duration.base)}>
            <BuddyRequestList requests={incomingRequests} onOpen={setOpenRequest} />
            <Text variant="caption" color="tertiary" style={styles.holdNote}>
              You can have one buddy at a time, so these are waiting. They can
              see you are paired, and they expire on their own.
            </Text>
          </Animated.View>
        ) : null}
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
            fight for contrast: the dock below already says Buddy, in an
            orange pill, and you tapped that pill to get here. The label was
            never carrying anything the page didn't already say. */}
        {/* THE HEADLINE, centred with the picture above it.
            Centred because it is now a caption to the pair rather than a title
            competing with them: the eye lands on the two tiles, then falls
            straight down the same axis. Left-aligned copy under a centred
            picture was the mixed axis that made the old stage feel unarranged.
            The halo stays — it is what keeps the type legible where the scrim
            is still thin. */}
        <Text variant="poster" style={[styles.stageTitle, halo]}>
          There&apos;s a space{" "}
          <Text variant="poster" style={{ color: colors.text.accent }}>
            next to you.
          </Text>
        </Text>

        {/* ONE LINE, and it changes with the situation. When people are
            waiting, saying so is more useful than a general truth about
            practice — and it is the sentence that explains the number on the
            seat above. */}
        <Text variant="bodySm" color="secondary" style={[styles.stageSub, halo]}>
          {waitingCount > 0
            ? waitingCount === 1
              ? "One person has asked."
              : `${waitingCount} people have asked.`
            : "Practice sticks when someone's in it with you."}
        </Text>

        {isPending && (
          <View style={[styles.pendingPillImm, { backgroundColor: colors.action.primaryTint }]}>
            <Icon name={icons.soon} size={size.iconInline} color={colors.text.accent} />
            <Text variant="caption" color="accent" style={styles.bold}>
              Waiting for them to join…
            </Text>
          </View>
        )}

        {/* THE ONE FILLED CONTROL ON THE SCREEN, and what it does depends on
            whether anybody is waiting. Answering people who already asked
            outranks going to look for more of them, and when nobody has asked
            the same button is simply the way in to discovery.

            This is also what let the seat's own label go: two labels for one
            destination was a redundancy the seat only carried because there
            was no button here. */}
        {/* ONE LABEL, because there is now one destination. It used to read
            "See who's waiting" or "Find someone" depending on state — two names
            for what is now two halves of the same page. The button opens the
            half that matters: the queue when somebody is waiting, discovery
            when nobody is. */}
        <Button
          label="See people"
          onPress={() => openPeople(waitingCount > 0 ? "waiting" : "discover")}
          style={styles.stageCta}
        />

        {/* ONE quiet route, and it names the destination rather than the
            widget. It used to flip to "Hide code box" once open, which is a
            control describing its own mechanism: nothing else in this app talks
            about boxes, and "Hide" tells you what the button does to itself
            rather than what it does for you. There is nothing to hide now. */}
        <View style={styles.linkRow}>
          <PressableScale
            onPress={() => {
              setCodeError(null);
              codeSheetLive.current = true;
              setCodeSheet(true);
            }}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Join with an invite code"
          >
            <Text variant="caption" color="accent" style={styles.bold}>
              Have a code?
            </Text>
          </PressableScale>
        </View>

        {/* The share line. Share, not copy: the OS share sheet offers copy as
            one of its options, so a separate copy affordance was a second
            control for a subset of one action. */}
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

  /**
   * Joining with somebody's code. One field, one job, its own surface.
   *
   * `exclusive`, because success opens a takeover or a bottom sheet and iOS
   * freezes touch app-wide when two native modals are live at once. The outcome
   * is queued on `afterCodeSheet` and fired from `onDismissed`, so there is
   * never a moment where both exist.
   */
  const renderCodeSheet = () => (
    <Sheet
      visible={codeSheet}
      onClose={() => setCodeSheet(false)}
      onDismissed={() => {
        // The sheet is now GONE, not merely closing. Everything after this
        // point is free to open a modal of its own.
        codeSheetLive.current = false;
        const run = afterCodeSheet.current;
        afterCodeSheet.current = null;
        run?.();
      }}
      exclusive
      title="Join with a code"
      right={
        <IconButton
          name={icons.close}
          onPress={() => setCodeSheet(false)}
          accessibilityLabel="Close"
        />
      }
    >
      <View style={styles.codeSheetBody}>
        <View style={[styles.inputBox, { backgroundColor: colors.input.bg, borderColor: codeError ? colors.feedback.danger : colors.input.border }]}>
          <TextInput
            ref={codeInputRef}
            style={[styles.codeInput, { color: colors.text.primary }]}
            placeholder="Their code"
            placeholderTextColor={colors.input.placeholder}
            value={buddyCode}
            // Typing is the correction, so the rejection goes the moment you
            // start making it rather than sitting there contradicted.
            onChangeText={(t) => {
              setBuddyCode(t);
              if (codeError) setCodeError(null);
            }}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={10}
            onSubmitEditing={handleSubmitCode}
            returnKeyType="go"
            editable={!submittingCode}
            autoFocus
            accessibilityLabel="Their invite code"
          />
          {/* ABSOLUTE, not in the row. As a flex sibling, Join appearing on
              the fourth character stole width from the TextInput and shoved
              the text and caret left mid-keystroke — a jolt at the exact
              moment you are watching what you type. */}
          <Animated.View style={[styles.joinWrap, joinStyle]} pointerEvents={canJoin ? "auto" : "none"}>
            {submittingCode ? (
              <ActivityIndicator color={colors.action.primary} size="small" style={styles.codeSpinner} />
            ) : (
              <PressableScale
                onPress={handleSubmitCode}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Join with this code"
                style={[styles.joinBtn, { backgroundColor: colors.action.primary }, primaryEdge(colors)]}
              >
                <Text variant="bodySm" color={colors.action.onPrimary} style={styles.bold}>
                  Join
                </Text>
              </PressableScale>
            )}
          </Animated.View>
        </View>

        {/* The reason, or the instruction. Never both, and never nothing: this
            slot always says the most useful thing it can. */}
        {/* `feedback.dangerText`, not the token name: `Text`'s `color` takes a
            key of `colors.text` OR a literal colour, and "dangerText" is
            neither. It is a key of `feedback`, so it passed through as a
            meaningless string and the rejection rendered in the default ink. */}
        <Text
          variant="bodySm"
          color={codeError ? colors.feedback.dangerText : "tertiary"}
          style={styles.codeHint}
        >
          {codeError ?? "Ask them to share theirs from their Buddy page."}
        </Text>
      </View>
    </Sheet>
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
          <View style={[styles.partnerInner, { backgroundColor: colors.action.primary }, primaryEdge(colors)]}>
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
            <View style={[styles.bondCard, { backgroundColor: colors.accent.warning }, accentEdge(colors, "warning")]}>
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
              <View style={[styles.statTile, { backgroundColor: colors.accent.purple }, accentEdge(colors, "purple")]}>
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
              <View style={[styles.statTile, { backgroundColor: colors.accent.info }, accentEdge(colors, "info")]}>
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
            <View style={[styles.questCard, { backgroundColor: colors.accent.danger }, accentEdge(colors, "danger")]}>
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

            {/* Stuttering support — the same screen Settings links to, so it
                carries the same name and the same promise. The old sublabel
                ("Learn more about community") described a screen that doesn't
                exist: this one is organizations and crisis helplines. */}
            <PressableScale style={styles.actionRow} scaleTo={0.98} onPress={() => navigation.navigate("Resources")}>
              <View style={[styles.actionIconSquare, { backgroundColor: colors.surface.control }]}>
                <Icon name={icons.support} size={size.tabIcon} color={colors.text.primary} />
              </View>
              <View style={styles.actionTextWrap}>
                <Text variant="title">Stuttering support</Text>
                <Text variant="bodySm" color="secondary">Organizations and crisis helplines.</Text>
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

          {/* Below the pairing and below its controls, because these people are
              not part of it. Present, findable, and silent. */}
          {renderOnHold()}
        </Animated.View>
      </View>
    );
  };

  /**
   * REQUESTS MODE COMES FIRST, before the paired/unpaired split.
   *
   * It is the same list either way — held rows when paired, answerable rows
   * when not — and putting it above the split is what stops a pairing that
   * lands while the list is open from swapping the screen out from under the
   * dock. `loading` and `error` still win, since a list is nothing without its
   * contents.
   */
  if (people !== null && !loading && !error) {
    return (
      <>
        {renderPeopleView()}
        {renderRequestSheet()}
        {renderBlockRequesterDialog()}
        {renderUndoBar()}
      </>
    );
  }

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
            // NO PRESS. The seat and the button below opened the same place,
            // which is the duplicate click. The button is the control; the seat
            // is the picture, and it now says so by not responding.
            // The number goes on the seat, because the seat is the thing this
            // many people have asked for.
            seatCount={waitingCount}
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
            {/* No requests section here any more. It used to sit at the top of
                this stage as an opaque card over the crowd, which is the one
                thing this screen cannot afford — the room runs edge to edge and
                a plate in the top third punches a hole in it. The dock below
                carries the count instead ("Waiting · 3", in the accent), and
                tapping it opens the list. Same information, no hole. */}
            <View style={styles.stageSpacer} pointerEvents="none" />
            {renderStage()}
          </View>
        </ScreenView>

        {renderCodeSheet()}
        {/* ── Buddy Welcome Modal ── */}
        <WatermarkModal
          visible={showWelcome}
          onClose={() => setShowWelcome(false)}
          watermarkIcon={icons.pairing}
          watermarkColor={colors.action.primary}
          tag="BUDDY CONNECTED"
          tagColor={colors.action.primary}
          title="You're now paired!"
          message={pairedMessage}
          ctaLabel="Let's Go!"
          ctaColor={colors.action.primary}
          ctaTextColor={colors.action.onPrimary}
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
            <Text variant="body" color="secondary" style={{ marginBottom: spacing.xl }}>Couldn't load this page.</Text>
            <PressableScale onPress={load} style={[styles.retryBtn, { backgroundColor: colors.action.primary }, primaryEdge(colors)]}>
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
        message={pairedMessage}
        ctaLabel="Let's Go!"
        ctaColor={colors.action.primary}
        ctaTextColor={colors.action.onPrimary}
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

      {renderUndoBar()}
      {renderRequestSheet()}
      {renderBlockRequesterDialog()}

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
  // Sits ABOVE the dock, never over it: the bar's whole job is to offer the
  // way back, and putting it behind navigation would hide the one control that
  // matters. Absolute so it floats over the list rather than displacing it.
  undoBar: { position: "absolute", left: space.screenX, right: space.screenX },
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
  // CENTRED, and the whole column with it. The picture above is centred, so
  // anything left-aligned under it reads as a second, unrelated block.
  stage: { alignItems: "center", gap: spacing.sm },
  stageTitle: { textAlign: "center" },
  // `maxWidth` keeps the line near the 35-60 character band a centred line
  // needs to stay scannable; centred text wider than that is hard to track back.
  stageSub: { marginTop: spacing.xxs, maxWidth: 280, textAlign: "center" },
  // A section's worth of air above the one filled control, so it reads as the
  // answer to the sentence rather than as part of it.
  stageCta: { marginTop: space.rowGap, alignSelf: "stretch" },
  // GAP, not `space-between`. Two links flung to opposite edges of a centred
  // column look like two unrelated controls; at 8pt with a dot between them
  // they read as one pair. (The mock had exactly this bug: the two labels
  // collided into "Find someoneUse a code".)
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  linkDot: { width: 3, height: 3, borderRadius: 999, backgroundColor: "#5C574F" },
  // The share line, at caption size. It serves the minority who already know
  // someone; ranking it as a button is what made earlier versions read as a menu.
  underRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xs,
  },
  underItem: { flexDirection: "row", alignItems: "center" },
  codeInline: { letterSpacing: 1, fontFamily: fonts.semibold },
  codeSpinner: { marginRight: spacing.md },
  // The field's row. Fixed at 54 so a long headline growing upward is the only
  // thing that ever moves in this block.
  // The sheet's body: one field and one line under it.
  codeSheetBody: { gap: space.rowGap },
  codeHint: { textAlign: "center" },
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
  requestGroup: { borderRadius: radius.card, overflow: "hidden" },
  // ── The requests view ─────────────────────────────────────────────────────
  requestsBody: { paddingHorizontal: space.screenX, gap: space.sectionGap },
  requestsTitle: { marginTop: space.titleGap, gap: space.titleSub },
  // ── On hold, on the paired screen ─────────────────────────────────────────
  holdSection: { marginTop: space.sectionGap, gap: space.rowGap },
  holdHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.iconText,
    paddingHorizontal: space.cardPad,
    paddingVertical: space.rowGap,
    borderRadius: radius.card,
    borderWidth: borderWidth.hairline,
  },
  holdTitle: { flex: 1 },
  holdNote: { marginTop: space.rowGap },
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
