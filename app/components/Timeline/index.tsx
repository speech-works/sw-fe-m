import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

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
import SignalCard from "../SignalCard";

interface TimelineProps {
  threadId: string;
  buddyName?: string;
  onStartPractice?: () => void;
  onReachOut?: (signal: Signal) => void;
}

const Timeline = ({ threadId, buddyName, onStartPractice, onReachOut }: TimelineProps) => {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const myId = useUserStore((s) => s.user?.id);

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

  const loadMore = async () => {
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
  };

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
        <ActivityIndicator color="#FF6B00" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <MaterialCommunityIcons name="alert-circle-outline" size={36} color="#A1A4AA" />
        <Text style={styles.muted}>Couldn't load the timeline.</Text>
        <TouchableOpacity onPress={load} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (signals.length === 0) {
    const who = buddyName || "your buddy";
    return (
      <View style={styles.emptyWrap}>
        <View style={styles.emptyHero}>
          <View style={styles.emptyIconCircle}>
            <MaterialCommunityIcons name="hand-heart" size={28} color="#FF6B00" />
          </View>
          <Text style={styles.emptyTitle}>Your wins and moments live here</Text>
          <Text style={styles.muted}>
            Finish a practice and tap <Text style={styles.mutedStrong}>Share</Text>, or{" "}
            <Text style={styles.mutedStrong}>Share a moment</Text> to tell {who} how it's going — they'll
            see it here and can cheer you on.
          </Text>
          {onStartPractice ? (
            <TouchableOpacity onPress={onStartPractice} style={styles.emptyCta} activeOpacity={0.85}>
              <MaterialCommunityIcons name="play" size={16} color="#FFFFFF" />
              <Text style={styles.emptyCtaText}>Start a practice</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {signals.map((signal, index) => (
        <SignalCard
          key={signal.id}
          isFirst={index === 0}
          isLast={index === signals.length - 1}
          signal={signal}
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
      ))}

      {nextCursor ? (
        <TouchableOpacity onPress={loadMore} style={styles.loadMoreBtn} disabled={loadingMore} activeOpacity={0.7}>
          {loadingMore ? (
            <ActivityIndicator color="#803600" size="small" />
          ) : (
            <Text style={styles.loadMoreText}>Load more</Text>
          )}
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

export default Timeline;

const styles = StyleSheet.create({
  list: { paddingTop: 8, paddingHorizontal: 16 },
  center: { alignItems: "center", justifyContent: "center", paddingVertical: 48, paddingHorizontal: 30, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: "800", color: "#803600", marginTop: 4 },
  muted: { fontSize: 14, color: "#737780", textAlign: "center", lineHeight: 20 },
  mutedStrong: { fontWeight: "800", color: "#803600" },
  emptyWrap: { paddingHorizontal: 16, paddingTop: 4 },
  emptyHero: { alignItems: "center", paddingVertical: 20, paddingHorizontal: 12, gap: 8 },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFF0E5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
    backgroundColor: "#FF6B00",
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 100,
  },
  emptyCtaText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
  retryBtn: { marginTop: 12, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 100, backgroundColor: "#FF6B00" },
  retryText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
  loadMoreBtn: {
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 100,
    backgroundColor: "#FFF0E5",
    marginTop: 4,
    marginBottom: 16,
    minWidth: 120,
    alignItems: "center",
  },
  loadMoreText: { color: "#803600", fontWeight: "700", fontSize: 14 },
});
