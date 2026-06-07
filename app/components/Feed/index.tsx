import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import {
  FeedScope,
  Post,
  deletePost,
  getFeed,
  reactToPost,
  unreactToPost,
} from "../../api/posts";
import { CheerType } from "../../api/buddies";
import { track } from "../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../util/analytics/analyticsEvents";
import PostCard from "../PostCard";

interface FeedProps {
  scope?: FeedScope;
  /** Buddy first-name for warm first-run empty-state copy. */
  buddyName?: string;
  /** Optional empty-state CTA (e.g. navigate to a practice). */
  onStartPractice?: () => void;
}

/**
 * Reverse-chronological feed of practice card-posts. v1 renders via map (a 1:1 buddy
 * feed is small, and this nests safely inside the Community screen's ScrollView).
 * Swap to a FlatList when community scale arrives. No aggregate like-counts.
 */
const Feed = ({ scope = "buddy", buddyName, onStartPractice }: FeedProps) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(false);
      const page = await getFeed(scope);
      setPosts(page.posts);
      setNextCursor(page.nextCursor);
      track(ANALYTICS_EVENTS.POST_FEED_VIEWED, { scope, count: page.posts.length });
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    try {
      setLoadingMore(true);
      const page = await getFeed(scope, nextCursor);
      setPosts((prev) => [...prev, ...page.posts]);
      setNextCursor(page.nextCursor);
    } catch (e) {
      // Keep what we have; surface a gentle retry via the same button.
    } finally {
      setLoadingMore(false);
    }
  };

  const handleReact = async (postId: string, type: CheerType) => {
    const prev = posts;
    setPosts((ps) => ps.map((p) => (p.id === postId ? { ...p, myReaction: type } : p)));
    try {
      const updated = await reactToPost(postId, type);
      setPosts((ps) => ps.map((p) => (p.id === postId ? updated : p)));
      track(ANALYTICS_EVENTS.POST_REACTION_SENT, { type });
    } catch (e) {
      setPosts(prev);
      Alert.alert("Couldn't send", "Please try again.");
    }
  };

  const handleUnreact = async (postId: string) => {
    const prev = posts;
    const removed = posts.find((p) => p.id === postId)?.myReaction;
    setPosts((ps) => ps.map((p) => (p.id === postId ? { ...p, myReaction: null } : p)));
    try {
      await unreactToPost(postId);
      if (removed) track(ANALYTICS_EVENTS.POST_REACTION_REMOVED, { type: removed });
    } catch (e) {
      setPosts(prev);
      Alert.alert("Couldn't update", "Please try again.");
    }
  };

  const handleDelete = (postId: string) => {
    Alert.alert("Delete post?", "This removes it from your buddy's feed.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const prev = posts;
          setPosts((ps) => ps.filter((p) => p.id !== postId));
          try {
            await deletePost(postId);
            track(ANALYTICS_EVENTS.POST_DELETED);
          } catch (e) {
            setPosts(prev);
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
        <Text style={styles.muted}>Couldn't load the feed.</Text>
        <TouchableOpacity onPress={load} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (posts.length === 0) {
    const who = buddyName || "your buddy";
    return (
      <View style={styles.emptyWrap}>
        <View style={styles.emptyHero}>
          <View style={styles.emptyIconCircle}>
            <MaterialCommunityIcons name="hand-heart" size={28} color="#FF6B00" />
          </View>
          <Text style={styles.emptyTitle}>Your shared wins live here</Text>
          <Text style={styles.muted}>
            Finish any practice and tap <Text style={styles.mutedStrong}>Share</Text> — {who}{" "}
            will see it here and can cheer you on.
          </Text>
          {onStartPractice ? (
            <TouchableOpacity
              onPress={onStartPractice}
              style={styles.emptyCta}
              activeOpacity={0.85}
            >
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
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          variant="feed"
          onReact={(type) => handleReact(post.id, type)}
          onUnreact={() => handleUnreact(post.id)}
          onDelete={() => handleDelete(post.id)}
        />
      ))}

      {nextCursor ? (
        <TouchableOpacity
          onPress={loadMore}
          style={styles.loadMoreBtn}
          disabled={loadingMore}
          activeOpacity={0.7}
        >
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

export default Feed;

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingTop: 8 },
  center: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 30,
    gap: 8,
  },
  emptyTitle: { fontSize: 17, fontWeight: "800", color: "#803600", marginTop: 4 },
  muted: { fontSize: 14, color: "#737780", textAlign: "center", lineHeight: 20 },
  mutedStrong: { fontWeight: "800", color: "#803600" },

  // First-run empty state
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
  retryBtn: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 100,
    backgroundColor: "#FF6B00",
  },
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
