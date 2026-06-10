import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { theme } from "../../Theme/tokens";

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
  onReact?: (type: ReactionType) => void;
  onUnreact?: () => void;
  onDelete?: () => void;
  onReachOut?: () => void;
  onReplyPrompt?: (replyId: string) => void;
  replyPending?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const formatRelativeTime = (input: Date | string | number | null | undefined): string => {
  if (input == null) return "";
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
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

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
  isFirst = false,
  isLast = false,
}: SignalCardProps) => {
  const authorName = signal.authorIsMe ? "You" : signal.author?.name ?? "Your buddy";
  const initials = (signal.author?.name ?? "?").substring(0, 1).toUpperCase();
  const interactive = variant === "feed" && !signal.authorIsMe;

  const authorRow = (
    <View style={styles.authorRow}>
      {signal.author?.profilePictureUrl ? (
        <Image source={{ uri: signal.author.profilePictureUrl }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarFallback}>
          <Text style={styles.avatarLetter}>{initials}</Text>
        </View>
      )}
      <Text style={styles.authorName} numberOfLines={1}>
        {authorName}
      </Text>
    </View>
  );

  const renderReactionRow = () => {
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

  const renderContent = () => {
    if (isMoment(signal)) {
      const moment = getMoment(signal.momentId);
      let response: React.ReactNode = null;
      if (moment.sensitive) {
        if (interactive) {
          response = signal.iReachedOut ? (
            <View style={styles.reachedOutPill}>
              <MaterialCommunityIcons name="check-circle" size={16} color="#0DA500" />
              <Text style={styles.reachedOutText}>Reached out</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.reachOutBtn}
              activeOpacity={0.85}
              onPress={onReachOut}
              accessibilityLabel={`Reach out to ${authorName.split(" ")[0]}`}
            >
              <MaterialCommunityIcons name="hand-heart" size={16} color="#FFFFFF" />
              <Text style={styles.reachOutText}>Reach out to {authorName.split(" ")[0]}</Text>
            </TouchableOpacity>
          );
        }
      } else {
        response = renderReactionRow();
      }
      
      const themeColor = moment.gradient[0];
      return (
        <View style={[styles.card, { backgroundColor: themeColor + "1A" }]}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderTitleRow}>
              <Text style={styles.momentEmoji}>{moment.emoji}</Text>
              <Text style={[styles.cardTitle, { color: themeColor }]}>Shared a moment</Text>
            </View>
            <Text style={styles.time}>{formatRelativeTime(signal.createdAt)}</Text>
          </View>
          <Text style={styles.title}>{moment.text}</Text>
          <View style={styles.spacer} />
          {authorRow}
          {response ? (
            <>
              <View style={styles.divider} />
              {response}
            </>
          ) : null}
        </View>
      );
    }

    if (isBeat(signal)) {
      return (
        <View style={[styles.card, { backgroundColor: "#FFF7ED" }]}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderTitleRow}>
              <MaterialCommunityIcons name={(signal.payload.icon ?? "star-shooting") as any} size={16} color="#EA580C" />
              <Text style={[styles.cardTitle, { color: "#EA580C" }]}>{signal.payload.label}</Text>
            </View>
            <Text style={styles.time}>{formatRelativeTime(signal.createdAt)}</Text>
          </View>
          {signal.payload.body ? <Text style={styles.cardBody}>{signal.payload.body}</Text> : null}
        </View>
      );
    }

    if (isCard(signal)) {
      const meta = CARD_KIND_META[signal.cardKind] ?? CARD_KIND_META.affirmation;
      const isPrompt = signal.cardKind === "prompt";
      return (
        <View style={[styles.card, { backgroundColor: "#F8FAFC" }]}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderTitleRow}>
              <MaterialCommunityIcons name={meta.icon as any} size={16} color="#475569" />
              <Text style={[styles.cardTitle, { color: "#475569" }]}>{meta.label}</Text>
            </View>
            <Text style={styles.time}>{formatRelativeTime(signal.createdAt)}</Text>
          </View>
          {signal.payload.title ? <Text style={styles.title}>{signal.payload.title}</Text> : null}
          <Text style={styles.cardBody}>{signal.payload.body}</Text>

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

          {!isPrompt && signal.seenByBuddy ? (
            <View style={styles.seenRow}>
              <MaterialCommunityIcons name="eye-check-outline" size={14} color="#A1A4AA" />
              <Text style={styles.seenText}>Your buddy saw this</Text>
            </View>
          ) : null}
        </View>
      );
    }

    const template = getPostTemplate(signal.templateId);
    const emphasized = template.emphasizes;
    const orderedFields: PracticePayloadField[] = [
      ...emphasized,
      ...STAT_ORDER.filter((f) => !emphasized.includes(f)),
    ];
    const stats = orderedFields
      .map((f) => statForField(f, signal.payload))
      .filter((s): s is { icon: string; label: string } => s !== null);

    const themeColor = template.gradient[0];

    return (
      <View style={[styles.card, { backgroundColor: themeColor + "1A" }]}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardHeaderTitleRow}>
            <MaterialCommunityIcons name={template.icon as any} size={16} color={themeColor} />
            <Text style={[styles.cardTitle, { color: themeColor }]}>{template.label}</Text>
          </View>
          <Text style={styles.time}>{formatRelativeTime(signal.createdAt)}</Text>
        </View>

        <Text style={styles.title}>{signal.payload.activityName}</Text>
        {signal.caption ? <Text style={styles.caption}>{signal.caption}</Text> : null}
        
        <View style={styles.spacer} />
        {authorRow}

        {stats.length > 0 ? (
          <View style={styles.statRow}>
            {stats.map((s) => (
              <View key={s.label} style={[styles.statChip, { backgroundColor: themeColor + "20" }]}>
                <MaterialCommunityIcons name={s.icon as any} size={13} color={themeColor} />
                <Text style={[styles.statText, { color: themeColor }]}>{s.label}</Text>
              </View>
            ))}
          </View>
        ) : null}
        <View style={styles.divider} />
        {renderReactionRow()}
      </View>
    );
  };

  return (
    <View style={styles.timelineRow}>
      <View style={styles.axisCol}>
        <View style={[styles.axisLineTop, isFirst && { backgroundColor: "transparent" }]} />
        <View style={styles.axisDot} />
        <View style={[styles.axisLineBottom, isLast && { backgroundColor: "transparent" }]} />
      </View>
      <View style={styles.cardWrap}>
        {renderContent()}
      </View>
    </View>
  );
};

export default SignalCard;

const styles = StyleSheet.create({
  timelineRow: { flexDirection: "row", marginBottom: 16 },
  axisCol: { width: 24, alignItems: "center", marginRight: 12, position: "relative" },
  axisLineTop: { width: 2, height: 26, backgroundColor: "#E2E8F0" },
  axisLineBottom: { flex: 1, width: 2, backgroundColor: "#E2E8F0" },
  axisDot: {
    position: "absolute",
    top: 20,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
    borderColor: "#3B82F6",
    backgroundColor: "#FFFFFF",
    zIndex: 2,
  },
  cardWrap: { flex: 1 },
  card: {
    borderRadius: 20,
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  cardHeaderTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.3,
    flexShrink: 1,
  },
  time: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94A3B8",
    flexShrink: 0,
    marginLeft: 8,
  },
  momentEmoji: { fontSize: 16 },
  title: { fontSize: 16, fontWeight: "800", color: "#1E293B", marginBottom: 4 },
  cardBody: { fontSize: 15, color: "#334155", lineHeight: 22 },
  caption: { fontSize: 14, color: "#475569", lineHeight: 20, marginBottom: 8 },
  momentText: { fontSize: 16, fontWeight: "600", color: "#1E293B", lineHeight: 24 },
  spacer: { height: 4 },
  authorRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  avatar: { width: 24, height: 24, borderRadius: 12, marginRight: 8, backgroundColor: "#FFDABF" },
  avatarFallback: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
    backgroundColor: "#401B00",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: { color: "#FFFFFF", fontSize: 10, fontWeight: "700" },
  authorName: { fontSize: 14, fontWeight: "600", color: "#475569", flexShrink: 1 },
  statRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 100,
  },
  statText: { fontSize: 12, fontWeight: "700" },
  replyRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  replyChip: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 100,
  },
  replyChipSelected: { borderColor: "#3B82F6", backgroundColor: "#EFF6FF" },
  replyChipDisabled: { opacity: 0.5 },
  replyLabel: { fontSize: 12, fontWeight: "700", color: "#475569" },
  replyLabelSelected: { color: "#1D4ED8" },
  seenRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12 },
  seenText: { fontSize: 12, fontWeight: "600", color: "#94A3B8" },
  divider: { height: 1, backgroundColor: "rgba(0,0,0,0.05)", marginVertical: 12 },
  reactionRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
  reactionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  reactionChipSelected: { backgroundColor: "#FFF7ED", borderColor: "#FF6B00" },
  reactionEmoji: { fontSize: 12 },
  reactionLabel: { fontSize: 11, fontWeight: "700", color: "#64748B" },
  reactionLabelSelected: { color: "#EA580C" },
  reachOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FF6B00",
    borderRadius: 100,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  reachOutText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800", letterSpacing: 0.3 },
  reachedOutPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#DCFCE7",
    borderRadius: 100,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  reachedOutText: { color: "#166534", fontSize: 13, fontWeight: "800", letterSpacing: 0.3 },
  previewHint: { fontSize: 12, color: "#94A3B8", fontStyle: "italic" },
  receivedText: { flexShrink: 1, fontSize: 12, color: "#475569", fontWeight: "600" },
  receivedTextMuted: { flexShrink: 1, fontSize: 12, color: "#94A3B8" },
});
