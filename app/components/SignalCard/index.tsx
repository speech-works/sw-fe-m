import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import {
  PracticePayload,
  PracticePayloadField,
  ReactionType,
  Signal,
  isBeat,
  isCard,
  isMoment,
} from "../../api/threads/types";
import { REACTIONS, getReaction } from "../../constants/reactions";
import { getMoment } from "../../constants/momentMessages";
import { getPostTemplate } from "../../constants/postTemplates";

type Variant = "feed" | "preview";

interface SignalCardProps {
  signal: Signal;
  variant?: Variant;
  /** React to a buddy's signal (feed only). */
  onReact?: (type: ReactionType) => void;
  /** Tap your existing reaction again to remove it. */
  onUnreact?: () => void;
  /** Delete your own signal (feed only). */
  onDelete?: () => void;
  /** Open the crisis-support flow for a buddy's *sensitive* moment (feed only). */
  onReachOut?: () => void;
  /** One-tap canned answer to a prompt card. */
  onReplyPrompt?: (replyId: string) => void;
  /** Disable the prompt reply pills while a reply request is in flight. */
  replyPending?: boolean;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const formatRelativeTime = (input: Date | string | number | null | undefined): string => {
  if (input == null) return "";
  // API dates may arrive as ISO strings (e.g. if not date-revived) — coerce safely.
  const date = input instanceof Date ? input : new Date(input);
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

/** A renderable stat chip for a practice payload field, or null. */
const statForField = (
  field: PracticePayloadField,
  payload: PracticePayload,
): { icon: string; label: string } | null => {
  switch (field) {
    case "durationSeconds":
      return payload.durationSeconds
        ? { icon: "clock-outline", label: `${Math.max(1, Math.round(payload.durationSeconds / 60))} min` }
        : null;
    case "timeOfDay":
      return payload.timeOfDay ? { icon: "weather-sunset", label: capitalize(payload.timeOfDay) } : null;
    case "showedUp":
      return payload.showedUp ? { icon: "check-circle-outline", label: "Showed up" } : null;
    case "streakDays":
      return payload.streakDays ? { icon: "fire", label: `${payload.streakDays}-day streak` } : null;
    case "xpEarned":
      return payload.xpEarned ? { icon: "star-four-points", label: `+${payload.xpEarned} XP` } : null;
    case "leveledUp":
      return payload.leveledUp ? { icon: "arrow-up-bold", label: "Leveled up" } : null;
    case "levelStageTitle":
      return payload.levelStageTitle ? { icon: "shield-outline", label: payload.levelStageTitle } : null;
    case "milestoneLabel":
      return payload.milestoneLabel ? { icon: "trophy-variant", label: payload.milestoneLabel } : null;
    case "growthDelta":
      return payload.growthDelta
        ? { icon: "arrow-up-bold-circle", label: `+${capitalize(payload.growthDelta.axis)}` }
        : null;
    case "activityName":
    default:
      return null;
  }
};

const STAT_ORDER: PracticePayloadField[] = [
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

const CARD_KIND_META: Record<string, { label: string; icon: string }> = {
  prompt: { label: "A question for you both", icon: "chat-question-outline" },
  affirmation: { label: "A reminder", icon: "white-balance-sunny" },
  tip: { label: "Tip", icon: "lightbulb-on-outline" },
  challenge: { label: "Shared challenge", icon: "target" },
};

const SignalCard = ({
  signal,
  variant = "feed",
  onReact,
  onUnreact,
  onDelete,
  onReachOut,
  onReplyPrompt,
  replyPending,
}: SignalCardProps) => {
  const authorName = signal.authorIsMe ? "You" : signal.author?.name ?? "Your buddy";
  const initials = (signal.author?.name ?? "?").substring(0, 1).toUpperCase();
  const interactive = variant === "feed" && !signal.authorIsMe;

  const headerRight =
    variant === "feed" && signal.authorIsMe && onDelete ? (
      <TouchableOpacity onPress={onDelete} style={styles.overflowBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <MaterialCommunityIcons name="dots-horizontal" size={20} color="#FFFFFF" />
      </TouchableOpacity>
    ) : (
      <View style={styles.overflowSpacer} />
    );

  const authorRow = (
    <View style={styles.authorRow}>
      {signal.author?.profilePictureUrl ? (
        <Image source={{ uri: signal.author.profilePictureUrl }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarFallback}>
          <Text style={styles.avatarLetter}>{initials}</Text>
        </View>
      )}
      <View style={styles.authorMeta}>
        <Text style={styles.authorName} numberOfLines={1}>
          {authorName}
        </Text>
        <Text style={styles.time}>{formatRelativeTime(signal.createdAt)}</Text>
      </View>
    </View>
  );

  // The reaction row — ONLY for member-authored content (practice + non-sensitive moment).
  const renderReactionRow = () => {
    // Buddy's signal → the fixed Speechworks reactions.
    if (interactive) {
      return (
        <View style={styles.reactionRow}>
          {REACTIONS.map((r) => {
            const selected = signal.myReaction === r.type;
            return (
              <TouchableOpacity
                key={r.type}
                activeOpacity={0.7}
                onPress={() => (selected ? onUnreact?.() : onReact?.(r.type))}
                style={[styles.reactionChip, selected && styles.reactionChipSelected]}
              >
                <Text style={styles.reactionEmoji}>{r.emoji}</Text>
                <Text style={[styles.reactionLabel, selected && styles.reactionLabelSelected]}>{r.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      );
    }
    if (variant === "preview") {
      return (
        <View style={styles.reactionRow}>
          <Text style={styles.previewHint}>Your buddy can react to this 🦁</Text>
        </View>
      );
    }
    // Own / non-interactive → read-only summary of reactions received.
    if (signal.reactions.length > 0) {
      const emojis = Array.from(
        new Set(signal.reactions.map((r) => getReaction(r.type)?.emoji).filter(Boolean)),
      ).join(" ");
      return (
        <View style={styles.reactionRow}>
          <Text style={styles.receivedText}>{emojis} from your buddy</Text>
        </View>
      );
    }
    return (
      <View style={styles.reactionRow}>
        <Text style={styles.receivedTextMuted}>No reactions yet</Text>
      </View>
    );
  };

  // ── MOMENT — mood-toned header + the canned line. No title/stats. ──
  if (isMoment(signal)) {
    const moment = getMoment(signal.momentId);
    // Sensitive → "Reach out" / "✓ Reached out" (responder only; nothing on the author's own card).
    // Non-sensitive → the fixed reactions.
    let response: React.ReactNode = null;
    if (moment.sensitive) {
      if (interactive) {
        response = signal.iReachedOut ? (
          <View style={styles.reachedOutPill}>
            <MaterialCommunityIcons name="check-circle" size={18} color="#0DA500" />
            <Text style={styles.reachedOutText}>Reached out</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.reachOutBtn}
            activeOpacity={0.85}
            onPress={onReachOut}
            accessibilityLabel={`Reach out to ${authorName.split(" ")[0]}`}
          >
            <MaterialCommunityIcons name="hand-heart" size={18} color="#FFFFFF" />
            <Text style={styles.reachOutText}>Reach out to {authorName.split(" ")[0]}</Text>
          </TouchableOpacity>
        );
      }
    } else {
      response = renderReactionRow();
    }
    return (
      <View style={styles.card}>
        <LinearGradient colors={moment.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientHeader}>
          <Text style={styles.momentEmoji}>{moment.emoji}</Text>
          <Text style={styles.templateLabel}>Shared a moment</Text>
          {headerRight}
        </LinearGradient>
        <View style={styles.body}>
          {authorRow}
          <Text style={styles.momentText}>{moment.text}</Text>
          {response ? (
            <>
              <View style={styles.divider} />
              {response}
            </>
          ) : null}
        </View>
      </View>
    );
  }

  // ── BEAT — compact cooperative/support beat (system). No reactions (no member receives them). ──
  if (isBeat(signal)) {
    return (
      <View style={styles.card}>
        <View style={styles.body}>
          <View style={styles.beatRow}>
            <View style={styles.beatIcon}>
              <MaterialCommunityIcons name={(signal.payload.icon ?? "star-shooting") as any} size={22} color="#BF5000" />
            </View>
            <Text style={styles.beatLabel}>{signal.payload.label}</Text>
          </View>
          {signal.payload.body ? <Text style={styles.beatBody}>{signal.payload.body}</Text> : null}
        </View>
      </View>
    );
  }

  // ── CARD — curated content (prompt / affirmation / tip / challenge). No reactions. ──
  if (isCard(signal)) {
    const meta = CARD_KIND_META[signal.cardKind] ?? CARD_KIND_META.affirmation;
    const isPrompt = signal.cardKind === "prompt";
    return (
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <MaterialCommunityIcons name={meta.icon as any} size={15} color="#803600" />
          <Text style={styles.cardKindLabel}>{meta.label}</Text>
        </View>
        <View style={styles.body}>
          {signal.payload.title ? <Text style={styles.cardTitle}>{signal.payload.title}</Text> : null}
          <Text style={styles.cardBody}>{signal.payload.body}</Text>

          {/* Prompt → one-tap canned replies (both members see who answered). */}
          {isPrompt && signal.replyOptions?.length ? (
            <View style={styles.replyRow}>
              {signal.replyOptions.map((opt) => {
                const mine = signal.replies?.some((rep) => rep.replyId === opt.id);
                return (
                  <TouchableOpacity
                    key={opt.id}
                    activeOpacity={0.7}
                    disabled={replyPending}
                    onPress={() => onReplyPrompt?.(opt.id)}
                    style={[styles.replyChip, mine && styles.replyChipSelected, replyPending && styles.replyChipDisabled]}
                  >
                    <Text style={[styles.replyLabel, mine && styles.replyLabelSelected]}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}

          {/* Tip / affirmation / challenge → a gentle "buddy saw this" once they've opened the timeline. */}
          {!isPrompt && signal.seenByBuddy ? (
            <View style={styles.seenRow}>
              <MaterialCommunityIcons name="eye-check-outline" size={14} color="#A1A4AA" />
              <Text style={styles.seenText}>Your buddy saw this</Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  }

  // ── PRACTICE — template header + activity title + safe stat chips. ──
  const template = getPostTemplate(signal.templateId);
  const emphasized = template.emphasizes;
  const orderedFields: PracticePayloadField[] = [
    ...emphasized,
    ...STAT_ORDER.filter((f) => !emphasized.includes(f)),
  ];
  const stats = orderedFields
    .map((f) => statForField(f, signal.payload))
    .filter((s): s is { icon: string; label: string } => s !== null);

  return (
    <View style={styles.card}>
      <LinearGradient colors={template.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientHeader}>
        <MaterialCommunityIcons name={template.icon as any} size={18} color="#FFFFFF" />
        <Text style={styles.templateLabel}>{template.label}</Text>
        {headerRight}
      </LinearGradient>

      <View style={styles.body}>
        {authorRow}
        <Text style={styles.title}>{signal.payload.activityName}</Text>
        {signal.caption ? <Text style={styles.caption}>{signal.caption}</Text> : null}
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
        <View style={styles.divider} />
        {renderReactionRow()}
      </View>
    </View>
  );
};

export default SignalCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#ECEDEE",
    marginBottom: 14,
  },
  gradientHeader: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  templateLabel: { flex: 1, color: "#FFFFFF", fontSize: 13, fontWeight: "800", letterSpacing: 0.5 },
  momentEmoji: { fontSize: 18 },
  momentText: { fontSize: 18, fontWeight: "700", color: "#401B00", lineHeight: 26 },
  overflowBtn: { width: 24, height: 24, alignItems: "center", justifyContent: "center" },
  overflowSpacer: { width: 24, height: 24 },
  body: { padding: 16 },
  authorRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12, backgroundColor: "#FFDABF" },
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
  title: { fontSize: 18, fontWeight: "800", color: "#401B00", marginBottom: 6 },
  caption: { fontSize: 15, color: "#333740", lineHeight: 22, marginBottom: 12 },
  statRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
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

  // Beat
  beatRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  beatIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFF0E5",
    alignItems: "center",
    justifyContent: "center",
  },
  beatLabel: { flex: 1, fontSize: 16, fontWeight: "800", color: "#401B00", lineHeight: 22 },
  beatBody: { fontSize: 15, color: "#333740", lineHeight: 22, marginTop: 12 },

  // Curated card
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  cardKindLabel: { fontSize: 12, fontWeight: "800", letterSpacing: 0.4, color: "#803600", textTransform: "uppercase" },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#401B00", marginBottom: 6 },
  cardBody: { fontSize: 16, color: "#333740", lineHeight: 24 },
  replyRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  replyChip: {
    backgroundColor: "#FFF0E5",
    borderWidth: 1.5,
    borderColor: "transparent",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 100,
  },
  replyChipSelected: { backgroundColor: "#FFFFFF", borderColor: "#FF6B00" },
  replyChipDisabled: { opacity: 0.5 },
  replyLabel: { fontSize: 13, fontWeight: "700", color: "#803600" },
  replyLabelSelected: { color: "#BF5000" },
  seenRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 14 },
  seenText: { fontSize: 12, fontWeight: "600", color: "#A1A4AA" },

  divider: { height: 1, backgroundColor: "#ECEDEE", marginTop: 16, marginBottom: 12 },
  reactionRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  reactionChip: {
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
  reactionChipSelected: { backgroundColor: "#FFF0E5", borderColor: "#FF6B00" },
  reactionEmoji: { fontSize: 14 },
  reactionLabel: { fontSize: 12, fontWeight: "700", color: "#737780" },
  reactionLabelSelected: { color: "#BF5000" },
  reachOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FF6B00",
    borderRadius: 100,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  reachOutText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800", letterSpacing: 0.3 },
  reachedOutPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "#E7F6E5",
    borderRadius: 100,
    paddingVertical: 11,
    paddingHorizontal: 18,
  },
  reachedOutText: { color: "#0C6304", fontSize: 14, fontWeight: "800", letterSpacing: 0.3 },
  previewHint: { fontSize: 13, color: "#A1A4AA", fontStyle: "italic" },
  receivedText: { flexShrink: 1, fontSize: 13, color: "#803600", fontWeight: "600" },
  receivedTextMuted: { flexShrink: 1, fontSize: 13, color: "#A1A4AA" },
});
