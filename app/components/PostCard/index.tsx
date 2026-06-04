import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { Post, PostPayload, PostPayloadField } from "../../api/posts";
import { CheerType } from "../../api/buddies";
import { BUDDY_CHEERS } from "../../constants/buddyCheers";
import { getPostTemplate } from "../../constants/postTemplates";

type Variant = "feed" | "preview";

interface PostCardProps {
  post: Post;
  variant?: Variant;
  /** Tap a cheer (buddy's post, feed only). */
  onReact?: (type: CheerType) => void;
  /** Tap your existing cheer again to remove it. */
  onUnreact?: () => void;
  /** Delete your own post (feed only). */
  onDelete?: () => void;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const formatRelativeTime = (date: Date): string => {
  const ms = Date.now() - date.getTime();
  if (Number.isNaN(ms)) return "";
  const s = Math.floor(ms / 1000);
  if (s < 45) return "Just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return date.toLocaleDateString();
};

/** A renderable stat chip for a payload field, or null if the field has nothing to show. */
const statForField = (
  field: PostPayloadField,
  payload: PostPayload,
): { icon: string; label: string } | null => {
  switch (field) {
    case "durationSeconds":
      return payload.durationSeconds
        ? { icon: "clock-outline", label: `${Math.max(1, Math.round(payload.durationSeconds / 60))} min` }
        : null;
    case "timeOfDay":
      return payload.timeOfDay
        ? { icon: "weather-sunset", label: capitalize(payload.timeOfDay) }
        : null;
    case "showedUp":
      return payload.showedUp ? { icon: "check-circle-outline", label: "Showed up" } : null;
    case "streakDays":
      return payload.streakDays
        ? { icon: "fire", label: `${payload.streakDays}-day streak` }
        : null;
    case "xpEarned":
      return payload.xpEarned
        ? { icon: "star-four-points", label: `+${payload.xpEarned} XP` }
        : null;
    case "leveledUp":
      return payload.leveledUp ? { icon: "arrow-up-bold", label: "Leveled up" } : null;
    case "levelStageTitle":
      return payload.levelStageTitle
        ? { icon: "shield-outline", label: payload.levelStageTitle }
        : null;
    case "milestoneLabel":
      return payload.milestoneLabel
        ? { icon: "trophy-variant", label: payload.milestoneLabel }
        : null;
    case "growthDelta":
      return payload.growthDelta
        ? { icon: "arrow-up-bold-circle", label: `+${capitalize(payload.growthDelta.axis)}` }
        : null;
    case "activityName":
    default:
      return null; // activityName is the card title, not a chip
  }
};

const STAT_ORDER: PostPayloadField[] = [
  "milestoneLabel",
  "streakDays",
  "growthDelta",
  "xpEarned",
  "leveledUp",
  "levelStageTitle",
  "durationSeconds",
  "timeOfDay",
  "showedUp",
];

const PostCard = ({
  post,
  variant = "feed",
  onReact,
  onUnreact,
  onDelete,
}: PostCardProps) => {
  const template = getPostTemplate(post.templateId);
  const emphasized = template.emphasizes;

  // Emphasized fields first (in template order), then the rest in a stable order.
  const orderedFields: PostPayloadField[] = [
    ...emphasized,
    ...STAT_ORDER.filter((f) => !emphasized.includes(f)),
  ];
  const stats = orderedFields
    .map((f) => statForField(f, post.payload))
    .filter((s): s is { icon: string; label: string } => s !== null);

  const authorName = post.authorIsMe ? "You" : post.author?.name ?? "Your buddy";
  const initials = (post.author?.name ?? "?").substring(0, 1).toUpperCase();
  const interactive = variant === "feed" && !post.authorIsMe;

  const renderReactions = () => {
    // Buddy's post in the feed → tappable cheers.
    if (interactive) {
      return (
        <View style={styles.reactionRow}>
          {BUDDY_CHEERS.map((c) => {
            const selected = post.myReaction === c.type;
            return (
              <TouchableOpacity
                key={c.type}
                activeOpacity={0.7}
                onPress={() => (selected ? onUnreact?.() : onReact?.(c.type))}
                style={[styles.cheerChip, selected && styles.cheerChipSelected]}
              >
                <Text style={styles.cheerEmoji}>{c.emoji}</Text>
                <Text style={[styles.cheerLabel, selected && styles.cheerLabelSelected]}>
                  {c.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      );
    }
    // Preview → a muted hint of what the buddy will see.
    if (variant === "preview") {
      return (
        <View style={styles.reactionRow}>
          <Text style={styles.previewHint}>Your buddy can cheer this 👏</Text>
        </View>
      );
    }
    // Own post in the feed → read-only summary of cheers received.
    if (post.reactions.length > 0) {
      const emojis = Array.from(
        new Set(
          post.reactions
            .map((r) => BUDDY_CHEERS.find((c) => c.type === r.type)?.emoji)
            .filter(Boolean),
        ),
      ).join(" ");
      return (
        <View style={styles.reactionRow}>
          <Text style={styles.receivedText}>{emojis} from your buddy</Text>
        </View>
      );
    }
    return (
      <View style={styles.reactionRow}>
        <Text style={styles.receivedTextMuted}>No cheers yet</Text>
      </View>
    );
  };

  return (
    <View style={styles.card}>
      {/* Template gradient header */}
      <LinearGradient
        colors={template.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientHeader}
      >
        <MaterialCommunityIcons name={template.icon as any} size={18} color="#FFFFFF" />
        <Text style={styles.templateLabel}>{template.label}</Text>
        {variant === "feed" && post.authorIsMe && onDelete ? (
          <TouchableOpacity
            onPress={onDelete}
            style={styles.overflowBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="dots-horizontal" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <View style={styles.overflowSpacer} />
        )}
      </LinearGradient>

      <View style={styles.body}>
        {/* Author row */}
        <View style={styles.authorRow}>
          {post.author?.profilePictureUrl ? (
            <Image source={{ uri: post.author.profilePictureUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarLetter}>{initials}</Text>
            </View>
          )}
          <View style={styles.authorMeta}>
            <Text style={styles.authorName} numberOfLines={1}>
              {authorName}
            </Text>
            <Text style={styles.time}>{formatRelativeTime(post.createdAt)}</Text>
          </View>
        </View>

        {/* Title (the activity) */}
        <Text style={styles.title}>{post.payload.activityName}</Text>

        {/* Caption */}
        {post.caption ? <Text style={styles.caption}>{post.caption}</Text> : null}

        {/* Stat chips */}
        {stats.length > 0 ? (
          <View style={styles.statRow}>
            {stats.map((s) => (
              <View key={s.label} style={styles.statChip}>
                <MaterialCommunityIcons name={s.icon as any} size={13} color="#803600" />
                <Text style={styles.statText}>{s.label}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Reactions */}
        <View style={styles.divider} />
        {renderReactions()}
      </View>
    </View>
  );
};

export default PostCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#ECEDEE",
    marginBottom: 14,
  },
  gradientHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  templateLabel: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  overflowBtn: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  overflowSpacer: { width: 24, height: 24 },
  body: {
    padding: 16,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: "#FFDABF",
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: "#401B00",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  authorMeta: { flex: 1 },
  authorName: { fontSize: 15, fontWeight: "700", color: "#401B00" },
  time: { fontSize: 13, color: "#A1A4AA", marginTop: 1 },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#401B00",
    marginBottom: 6,
  },
  caption: {
    fontSize: 15,
    color: "#333740",
    lineHeight: 22,
    marginBottom: 12,
  },
  statRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFF0E5",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 100,
  },
  statText: { fontSize: 13, fontWeight: "700", color: "#803600" },
  divider: {
    height: 1,
    backgroundColor: "#ECEDEE",
    marginTop: 16,
    marginBottom: 12,
  },
  reactionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  cheerChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FFDABF",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 100,
  },
  cheerChipSelected: {
    backgroundColor: "#FFF0E5",
    borderColor: "#FF6B00",
  },
  cheerEmoji: { fontSize: 14 },
  cheerLabel: { fontSize: 12, fontWeight: "700", color: "#737780" },
  cheerLabelSelected: { color: "#BF5000" },
  previewHint: { fontSize: 13, color: "#A1A4AA", fontStyle: "italic" },
  receivedText: { fontSize: 13, color: "#803600", fontWeight: "600" },
  receivedTextMuted: { fontSize: 13, color: "#A1A4AA" },
});
