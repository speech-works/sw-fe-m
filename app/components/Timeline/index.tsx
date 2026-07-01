import { useFocusEffect } from "@react-navigation/native";
import React, { forwardRef, useCallback, useImperativeHandle, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, TouchableOpacity, View } from "react-native";
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
import { useTheme, spacing, space, radius, fonts, Text, Icon, icons, fadeStaggerEntering } from "../../design-system";
import SignalCard from "../SignalCard";

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
  const myId = useUserStore((s) => s.user?.id);
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
      Alert.alert("Couldn't send", "Please try again.");
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
      Alert.alert("Couldn't update", "Please try again.");
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
      Alert.alert("Couldn't send", "Please try again.");
    } finally {
      setReplyingId(null);
    }
  };

  const handleDelete = (signalId: string) => {
    Alert.alert("Delete post?", "This removes it from your buddy's timeline.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const prev = signals;
          setSignals((ss) => ss.filter((s) => s.id !== signalId));
          try {
            await deleteSignal(signalId);
            track(ANALYTICS_EVENTS.POST_DELETED);
          } catch (e) {
            setSignals(prev);
            Alert.alert("Couldn't delete", "Please try again.");
          }
        },
      },
    ]);
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
        <TouchableOpacity onPress={load} style={[styles.retryBtn, { backgroundColor: colors.action.primary }]}>
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
            <Icon name={icons.care} size={28} color={colors.action.primary} />
          </View>
          <Text variant="h3" style={styles.emptyTitle}>Your wins and moments live here</Text>
          <Text variant="bodySm" color="secondary" style={styles.muted}>
            Finish a practice and tap <Text variant="bodySm" color="primary" style={styles.bold}>Share</Text>, or{" "}
            <Text variant="bodySm" color="primary" style={styles.bold}>Share a moment</Text> to tell {who} how it's going — they'll
            see it here and can cheer you on.
          </Text>
          {onStartPractice ? (
            <TouchableOpacity onPress={onStartPractice} style={[styles.emptyCta, { backgroundColor: colors.action.primary }]} activeOpacity={0.85}>
              <Icon name={icons.play} size={16} color={colors.action.onPrimary} />
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
          <Text variant="bodySm" color={colors.action.primary} style={styles.bold}>Load more</Text>
        </TouchableOpacity>
      ) : null}
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
    borderRadius: 28,
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
