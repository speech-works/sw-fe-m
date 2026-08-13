import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React, { forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";

import {
  ReactionType,
  Signal,
  deleteSignal,
  getTimeline,
  markThreadRead,
  reactToSignal,
  replyToPrompt,
  unreactToSignal,
} from "../../api/threads";
import { useInboxStore } from "../../stores/inbox";
import { useUserStore } from "../../stores/user";
import { track } from "../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../util/analytics/analyticsEvents";
import { size, useTheme, primaryEdge, spacing, space, radius, fonts, Text, Icon, icons, fadeStaggerEntering, Dialog } from "../../design-system";
import SignalCard from "../SignalCard";
import { showErrorBottomSheet, showSuccessBottomSheet } from "../../util/functions/bottomSheet";
import { blockUser, reportContent, type ReportReason } from "../../api/moderation";
import { apiErrorMessage } from "../../util/functions/apiError";
import { resetBuddyLocalState } from "../../util/functions/buddyReset";
import { CRISIS_REPORT_REASON } from "../../constants/reportReasons";
import ReportSheet from "../ReportSheet";

interface TimelineProps {
  threadId: string;
  buddyName?: string;
  onStartPractice?: () => void;
  onReachOut?: (signal: Signal) => void;
}

/** Imperative API so the enclosing scroll view can drive infinite-scroll pagination. */
export interface TimelineHandle {
  loadMore: () => void;
}

const Timeline = forwardRef<TimelineHandle, TimelineProps>(function Timeline(
  { threadId, buddyName, onStartPractice, onReachOut },
  ref,
) {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [pendingBlock, setPendingBlock] = useState<{ userId: string; name: string } | null>(null);
  const [blocking, setBlocking] = useState(false);
  /**
   * Work to run once the ReportSheet has FULLY animated out.
   *
   * Two things need this: opening the block confirm (a second native Modal —
   * stacking them freezes touch input on iOS) and navigating to Resources for
   * the crisis reason (a native Modal still on screen ends up floating over the
   * screen you just pushed). One ref serves both.
   */
  const afterSheetDismissed = useRef<(() => void) | null>(null);
  const blockInFlight = useRef(false);
  const myId = useUserStore((s) => s.user?.id);
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const reduced = useReducedMotion();

  const load = useCallback(async () => {
    try {
      setError(false);
      const page = await getTimeline(threadId);
      setSignals(page.signals);
      setNextCursor(page.nextCursor);
      track(ANALYTICS_EVENTS.POST_FEED_VIEWED, { scope: "buddy", count: page.signals.length });
      useInboxStore.getState().clearUnread();
      void markThreadRead(threadId).catch(() => {});
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [threadId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    try {
      setLoadingMore(true);
      const page = await getTimeline(threadId, nextCursor);
      setSignals((prev) => [...prev, ...page.signals]);
      setNextCursor(page.nextCursor);
    } catch (e) {
    } finally {
      setLoadingMore(false);
    }
  }, [threadId, nextCursor, loadingMore]);

  useImperativeHandle(ref, () => ({ loadMore }), [loadMore]);

  const handleReact = async (signalId: string, type: ReactionType) => {
    const prev = signals;
    setSignals((ss) => ss.map((s) => (s.id === signalId ? { ...s, myReaction: type } : s)));
    try {
      const updated = await reactToSignal(signalId, type);
      setSignals((ss) => ss.map((s) => (s.id === signalId ? updated : s)));
      track(ANALYTICS_EVENTS.POST_REACTION_SENT, { type });
    } catch (e) {
      setSignals(prev);
      showErrorBottomSheet("Couldn't send", "Please try again.");
    }
  };

  const handleUnreact = async (signalId: string) => {
    const prev = signals;
    const removed = signals.find((s) => s.id === signalId)?.myReaction;
    setSignals((ss) => ss.map((s) => (s.id === signalId ? { ...s, myReaction: null } : s)));
    try {
      await unreactToSignal(signalId);
      if (removed) track(ANALYTICS_EVENTS.POST_REACTION_REMOVED, { type: removed });
    } catch (e) {
      setSignals(prev);
      showErrorBottomSheet("Couldn't update", "Please try again.");
    }
  };

  const handleReplyPrompt = async (signalId: string, replyId: string) => {
    if (replyingId) return;
    const prev = signals;
    setSignals((ss) =>
      ss.map((s) => {
        if (s.id !== signalId || s.type !== "card") return s;
        const others = (s.replies ?? []).filter((r) => r.fromUserId !== myId);
        return myId ? { ...s, replies: [...others, { fromUserId: myId, replyId }] } : s;
      }),
    );
    setReplyingId(signalId);
    try {
      const updated = await replyToPrompt(signalId, replyId);
      setSignals((ss) => ss.map((s) => (s.id === signalId ? updated : s)));
    } catch (e) {
      setSignals(prev);
      showErrorBottomSheet("Couldn't send", "Please try again.");
    } finally {
      setReplyingId(null);
    }
  };

  const handleDelete = (signalId: string) => setPendingDeleteId(signalId);
  const openReport = (signalId: string) => setReportingId(signalId);

  const confirmDelete = async () => {
    const signalId = pendingDeleteId;
    setPendingDeleteId(null);
    if (!signalId) return;

    const prev = signals;
    setSignals((ss) => ss.filter((s) => s.id !== signalId));
    try {
      await deleteSignal(signalId);
      track(ANALYTICS_EVENTS.POST_DELETED);
    } catch (e) {
      setSignals(prev);
      showErrorBottomSheet("Couldn't delete", "Please try again.");
    }
  };

  const handleReport = async (reason: ReportReason) => {
    const signalId = reportingId;
    setReportingId(null);
    if (!signalId) return;

    // Optimistic, and NOT rolled back on failure — deliberately unlike
    // confirmDelete above. If the request fails the right outcome is still
    // "you don't have to look at it"; putting an abusive card back on screen
    // because a POST 500'd is the worst available failure mode.
    setSignals((ss) => ss.filter((s) => s.id !== signalId));

    if (reason === CRISIS_REPORT_REASON) {
      // Reporting a friend's distress as "content" and getting "thanks, we'll
      // review it" is the wrong response. Send them to the real resources —
      // but only once the sheet is gone. The sheet is a native Modal, and
      // navigating while it is still animating out leaves it hanging over the
      // screen we just pushed.
      afterSheetDismissed.current = () => navigation.navigate("Resources" as never);
    }

    try {
      await reportContent({ targetType: "signal", signalId, reason });
      track(ANALYTICS_EVENTS.CONTENT_REPORT_SENT, { target: "signal", reason });
      if (reason !== CRISIS_REPORT_REASON) {
        showSuccessBottomSheet(
          "Report sent",
          "Our team will review this within 24 hours. You can block and unpair from the Community tab.",
        );
      }
    } catch {
      showErrorBottomSheet(
        "Report didn't send",
        "We've hidden it on this device. Please try again, or contact support.",
      );
    }
  };

  /**
   * Block from a post.
   *
   * Queued behind the sheet's dismissal rather than opening straight away —
   * see `afterSheetDismissed`. Reporting is about one post; this is about the
   * person, so it still gets its own confirm, exactly as the Community tab does
   * for the same irreversible action.
   */
  const askBlockFromPost = () => {
    const signal = signals.find((s) => s.id === reportingId);
    const author = signal?.author;
    setReportingId(null);
    if (!author?.id) return;
    afterSheetDismissed.current = () =>
      setPendingBlock({ userId: author.id, name: author.name?.split(" ")[0] || "them" });
  };

  const confirmBlockFromPost = async () => {
    const target = pendingBlock;
    setPendingBlock(null);
    if (!target || blockInFlight.current) return;
    blockInFlight.current = true;
    setBlocking(true);
    try {
      // No reason, and no companion report. "I don't want to accuse them, I
      // just want out" is a legitimate and common intent — forcing every block
      // through an accusation is what corrupts the report data the review queue
      // depends on. Guideline 1.2 asks for a way to block AND a way to report,
      // separately.
      await blockUser(target.userId);
      track(ANALYTICS_EVENTS.BUDDY_BLOCKED, { source: "post" });
      resetBuddyLocalState();
      showSuccessBottomSheet(
        "Blocked",
        "You've been unpaired, and you won't be matched again.",
      );
    } catch (e) {
      showErrorBottomSheet("Couldn't block", apiErrorMessage(e, "Please try again."));
    } finally {
      blockInFlight.current = false;
      setBlocking(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.action.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Icon name={icons.warning} size={36} color={colors.text.tertiary} />
        <Text variant="bodySm" color="secondary" style={styles.muted}>Couldn't load the timeline.</Text>
        <TouchableOpacity onPress={load} style={[styles.retryBtn, { backgroundColor: colors.action.primary }, primaryEdge(colors)]}>
          <Text variant="body" color={colors.action.onPrimary} style={styles.bold}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (signals.length === 0) {
    const who = buddyName || "your buddy";
    return (
      <View style={styles.emptyWrap}>
        <View style={styles.emptyHero}>
          <View style={[styles.emptyIconCircle, { backgroundColor: colors.action.primaryTint }]}>
            <Icon name={icons.care} size={size.iconLg} color={colors.text.accent} />
          </View>
          <Text variant="h3" style={styles.emptyTitle}>Your wins and moments live here</Text>
          <Text variant="bodySm" color="secondary" style={styles.muted}>
            Finish a practice and tap <Text variant="bodySm" color="primary" style={styles.bold}>Share</Text>, or{" "}
            <Text variant="bodySm" color="primary" style={styles.bold}>Share a moment</Text> to tell {who} how it's going. They'll
            see it here and can cheer you on.
          </Text>
          {onStartPractice ? (
            <TouchableOpacity onPress={onStartPractice} style={[styles.emptyCta, { backgroundColor: colors.action.primary }]} activeOpacity={0.85}>
              <Icon name={icons.play} size={size.iconSm} color={colors.action.onPrimary} />
              <Text variant="body" color={colors.action.onPrimary} style={styles.bold}>Start a practice</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {signals.map((signal, index) => (
        // Opacity-only stagger: the thread "draws in" top-to-bottom without any
        // transform, so the continuous rail never shifts. Fires once per card mount.
        <Animated.View key={signal.id} entering={fadeStaggerEntering(index, reduced)}>
          <SignalCard
            isFirst={index === 0}
            isLast={index === signals.length - 1}
            signal={signal}
            prevSignal={index > 0 ? signals[index - 1] : undefined}
            nextSignal={index < signals.length - 1 ? signals[index + 1] : undefined}
            variant="feed"
            buddyName={buddyName}
            onReact={(type) => handleReact(signal.id, type)}
            onUnreact={() => handleUnreact(signal.id)}
            onDelete={() => handleDelete(signal.id)}
            onReport={() => openReport(signal.id)}
            onReplyPrompt={(replyId) => handleReplyPrompt(signal.id, replyId)}
            replyPending={replyingId === signal.id}
            onReachOut={() => {
              track(ANALYTICS_EVENTS.BUDDY_SUPPORT_OPENED, { postId: signal.id });
              onReachOut?.(signal);
            }}
          />
        </Animated.View>
      ))}

      {loadingMore ? (
        <View style={styles.loadMoreFooter}>
          <ActivityIndicator color={colors.action.primary} size="small" />
        </View>
      ) : nextCursor ? (
        // Fallback for the rare case the first page doesn't fill the viewport
        // (so onEndReached never fires): a low-emphasis tap target to fetch more.
        <TouchableOpacity onPress={loadMore} style={styles.loadMoreFooter} activeOpacity={0.7}>
          <Text variant="bodySm" color="accent" style={styles.bold}>Load more</Text>
        </TouchableOpacity>
      ) : null}

      <Dialog
        visible={pendingDeleteId !== null}
        onClose={() => setPendingDeleteId(null)}
        title="Delete post?"
        message="This removes it from your buddy's timeline."
        cancelLabel="Cancel"
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
      />

      <ReportSheet
        visible={reportingId !== null}
        onClose={() => setReportingId(null)}
        target="signal"
        personName={buddyName}
        submitting={blocking}
        onSubmit={handleReport}
        // Only offered on someone else's post — you can't block yourself, and
        // system beats/cards have no real author to block.
        onBlock={
          signals.find((s) => s.id === reportingId)?.author?.id && !signals.find((s) => s.id === reportingId)?.authorIsMe
            ? askBlockFromPost
            : undefined
        }
        blockLabel={`Block ${buddyName?.split(" ")[0] || "them"}`}
        onDismissed={() => {
          const run = afterSheetDismissed.current;
          afterSheetDismissed.current = null;
          run?.();
        }}
      />

      <Dialog
        // `exclusive` as well as being opened from onDismissed: the sheet is
        // provably gone by then, but this costs nothing and means a future
        // caller that opens it some other way still can't stack two modals.
        exclusive
        visible={pendingBlock !== null}
        onClose={() => setPendingBlock(null)}
        title={`Block ${pendingBlock?.name ?? "them"}?`}
        message="You'll be unpaired right away. They won't see your progress, and you two won't be matched again."
        cancelLabel="Cancel"
        confirmLabel="Block"
        destructive
        onConfirm={confirmBlockFromPost}
      />
    </View>
  );
});

export default Timeline;

const styles = StyleSheet.create({
  list: { paddingTop: spacing.sm, paddingHorizontal: space.screenX },
  center: { alignItems: "center", justifyContent: "center", paddingVertical: spacing["5xl"], paddingHorizontal: 30, gap: spacing.sm },
  bold: { fontFamily: fonts.bold },
  emptyTitle: { marginTop: spacing.xs },
  muted: { textAlign: "center" },
  emptyWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs },
  emptyHero: { alignItems: "center", paddingVertical: spacing.xl, paddingHorizontal: spacing.md, gap: spacing.sm },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  emptyCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
  },
  retryBtn: { marginTop: spacing.md, paddingHorizontal: spacing["2xl"], paddingVertical: spacing.md, borderRadius: radius.full },
  loadMoreFooter: {
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.lg,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
});
