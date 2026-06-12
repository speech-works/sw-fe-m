import React, { useRef, useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";

import { theme } from "../../Theme/tokens";

import {
  ReactionType,
  Signal,
  isBeat,
  isCard,
  isMoment,
  isPractice,
  PracticePayload,
  PracticePayloadField,
} from "../../api/threads/types";
import { getMoment } from "../../constants/momentMessages";
import { getPostTemplate } from "../../constants/postTemplates";
import { REACTIONS, getReaction } from "../../constants/reactions";

import ReactionPicker from "../ReactionPicker";
import { AnimatedReaction } from "../AnimatedReactions";

export const getSignalIconBg = (signal?: Signal) => {
  if (!signal) return "#E2E8F0";
  if (isMoment(signal)) return "#803600";
  if (isBeat(signal)) {
    const isSupport = signal.beatKind === "support_note" || signal.beatKind === "support_lifeline";
    return isSupport ? "#EA580C" : "#D97706";
  }
  if (isCard(signal)) return "#4A2511";
  return "#FF6B00";
};

export const getSignalGradient = (signal?: Signal): readonly [string, string, ...string[]] => {
  if (!signal) return ["#FFFFFF", "#FFFFFF"];

  // Completing a whole JOURNEY is a milestone — give the practice card the golden treatment.
  // (Computed here, up front, so isColored/text colors derive correctly.)
  if (isPractice(signal) && signal.payload.journeyCompleted) {
    return ["#FFE082", "#FFCD4B"];
  }

  // Milestones (beats that are not support) get a golden gradient
  if (isBeat(signal)) {
    const isSupport = signal.beatKind === "support_note" || signal.beatKind === "support_lifeline";
    if (!isSupport) return ["#FFE082", "#FFCD4B"];
  }
  
  // System cards get vibrant gradients
  if (isCard(signal)) {
    switch (signal.cardKind) {
      case "prompt": return ["#EBCBF5", "#D8A7F0"]; // Lilac
      case "affirmation": return ["#FFD8B5", "#FFAB76"]; // Peach
      case "tip": return ["#Cbf0f0", "#98E6E6"]; // Cyan
      case "challenge": return ["#FFC8C8", "#FF9E9E"]; // Rose
      default: return ["#E2E8F0", "#CBD5E1"]; // Generic light blue/gray
    }
  }

  // User-generated cards (moments, beats/practice) are purely white
  return ["#FFFFFF", "#FFFFFF"]; 
};

export const getSignalCardBg = (_signal?: Signal) => "#FFFFFF";

type Variant = "feed" | "preview";

interface SignalCardProps {
  signal: Signal;
  prevSignal?: Signal;
  nextSignal?: Signal;
  variant?: Variant;
  onReact?: (type: ReactionType) => void;
  onUnreact?: () => void;
  onDelete?: () => void;
  onReachOut?: () => void;
  onReplyPrompt?: (replyId: string) => void;
  replyPending?: boolean;
  buddyName?: string;
  isFirst?: boolean;
  isLast?: boolean;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

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

const CARD_KIND_META: Record<string, { label: string; icon: string }> = {
  prompt: { label: "A question for you both", icon: "chat-question-outline" },
  affirmation: { label: "A reminder", icon: "white-balance-sunny" },
  tip: { label: "Tip", icon: "lightbulb-on-outline" },
  challenge: { label: "Shared challenge", icon: "target" },
};

const TIMELINE_BG = "#FFFFFF";

const SignalCard = ({
  signal,
  variant = "feed",
  onReact,
  onUnreact,
  onDelete,
  onReachOut,
  onReplyPrompt,
  replyPending,
  buddyName,
  isFirst = false,
  isLast = false,
  prevSignal,
  nextSignal,
}: SignalCardProps) => {
  const authorName = signal.authorIsMe ? "You" : signal.author?.name ?? "Your buddy";
  const initials = (signal.author?.name ?? "?").substring(0, 1).toUpperCase();
  const interactive = variant === "feed" && !signal.authorIsMe;
  const relativeTime = formatRelativeTime(signal.createdAt);
  
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerY, setPickerY] = useState(0);
  const cardRef = useRef<View>(null);

  const openPicker = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    cardRef.current?.measure((x, y, w, h, pageX, pageY) => {
      setPickerY(pageY);
      setPickerVisible(true);
    });
  };

  let cardGradient = getSignalGradient(signal);
  const isColored = cardGradient[0] !== "#FFFFFF";
  const primaryText = isColored ? { color: "rgba(0,0,0,0.9)" } : null;
  const secondaryText = isColored ? { color: "rgba(0,0,0,0.7)" } : null;
  const tertiaryText = isColored ? { color: "rgba(0,0,0,0.5)" } : null;

  let cardBg = getSignalCardBg(signal);
  let iconBg = getSignalIconBg(signal);
  let statusText = "Update";
  let mainIcon = "star-shooting";
  let watermarkIcon = "star-shooting"; // fixed per card TYPE for consistency
  let title = "";
  let subtitle = "";
  let bodyText = "";
  let captionText = "";
  let dynamicContent: React.ReactNode = null;
  let journeyRibbon: React.ReactNode = null; // practice-only: pack/module context line
  let canReact = false; // only practice + non-sensitive moment

  if (isMoment(signal)) {
    statusText = "Moment";
    const moment = getMoment(signal.momentId);
    mainIcon = "hand-heart";
    watermarkIcon = "hand-heart";
    title = moment.text;
    subtitle = signal.authorIsMe ? "You shared a moment" : `${authorName} shared a moment`;
    
    if (moment.sensitive) {
      if (interactive) {
        dynamicContent = signal.iReachedOut ? (
          <View style={styles.seenRow}>
            <MaterialCommunityIcons name="check-circle" size={14} color={iconBg} />
            <Text style={[styles.seenText, { color: iconBg }]}>You reached out</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.reachOutBtn, { backgroundColor: iconBg }]}
            activeOpacity={0.85}
            onPress={onReachOut}
          >
            <MaterialCommunityIcons name="hand-heart" size={16} color="#FFFFFF" />
            <Text style={styles.reachOutText}>Reach out to {authorName.split(" ")[0]}</Text>
          </TouchableOpacity>
        );
      }
    } else {
      canReact = true;
    }
  } else if (isBeat(signal)) {
    const isSupport = signal.beatKind === "support_note" || signal.beatKind === "support_lifeline";
    if (isSupport) {
      statusText = "Support";
      mainIcon = signal.payload.icon ?? "hand-heart";
      watermarkIcon = "heart-multiple";
    } else {
      statusText = "Milestone";
      mainIcon = signal.payload.icon ?? "trophy";
      watermarkIcon = "trophy";
    }
    title = signal.payload.label ?? (isSupport ? "Support" : "Beat");
    const body = signal.payload.body ?? "";
    subtitle = body || (signal.authorIsMe ? (isSupport ? "Reached out" : "Reached a milestone") : `${authorName} ${isSupport ? "reached out" : "reached a milestone"}`);
  } else if (isCard(signal)) {
    const meta = CARD_KIND_META[signal.cardKind] ?? CARD_KIND_META.affirmation;
    statusText = meta.label;
    mainIcon = meta.icon;
    watermarkIcon = meta.icon; // consistent per card kind
    if (signal.payload.title && signal.payload.title !== meta.label) {
      title = signal.payload.title;
    }
    bodyText = signal.payload.body ?? "";
    
    const isPrompt = signal.cardKind === "prompt";
    if (isPrompt && signal.replyOptions?.length) {
      dynamicContent = (
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
      );
    } else if (!isPrompt && signal.seenByBuddy) {
      dynamicContent = (
        <View style={styles.seenRow}>
          <MaterialCommunityIcons name="eye-check-outline" size={14} color={isColored ? "rgba(0,0,0,0.5)" : "#A1A4AA"} />
          <Text style={[styles.seenText, tertiaryText]}>{buddyName ?? "Your buddy"} saw this</Text>
        </View>
      );
    }
  } else {
    canReact = true;
    const template = getPostTemplate(signal.templateId);
    const p = signal.payload;
    statusText = "Practice";
    mainIcon = template.icon;
    watermarkIcon = "dumbbell"; // always dumbbell for practice
    title = p.activityName ?? "Practice Session";
    captionText = signal.caption ?? "";
    const actLabel = template.label;
    subtitle = signal.authorIsMe ? `Practiced • ${actLabel}` : `${authorName} practiced • ${actLabel}`;

    // Journey (pack/module) context ribbon — names + progress, rendered above the
    // effort stats (kept out of STAT_ORDER so it never double-renders).
    const journeyBits: string[] = [];
    if (p.journeyTitle) journeyBits.push(p.journeyTitle);
    if (p.moduleTitle) journeyBits.push(p.moduleTitle);
    if (p.journeyProgress) {
      journeyBits.push(`${p.journeyProgress.moduleIndex} of ${p.journeyProgress.moduleTotal}`);
    }
    if (journeyBits.length > 0) {
      journeyRibbon = (
        <View style={styles.journeyRibbon}>
          <MaterialCommunityIcons name="map-marker-path" size={13} color="#803600" />
          <Text style={styles.journeyRibbonText} numberOfLines={1}>
            {journeyBits.join("  ·  ")}
          </Text>
        </View>
      );
    }

    // Completion milestones override the header/subtitle. journeyCompleted also recolors
    // the card (golden) via getSignalGradient; journeyTitle may be toggled off, so fall back.
    if (p.journeyCompleted) {
      statusText = "Journey milestone";
      subtitle = signal.authorIsMe
        ? `Completed the ${p.journeyTitle ?? "journey"} 🎉`
        : `${authorName} completed the ${p.journeyTitle ?? "journey"} 🎉`;
    } else if (p.moduleCompleted) {
      statusText = "Journey milestone";
      const where = p.journeyTitle ? ` in ${p.journeyTitle}` : "";
      subtitle = signal.authorIsMe
        ? `Finished a module${where}`
        : `${authorName} finished a module${where}`;
    }

    const emphasized = template.emphasizes || [];
    const orderedFields: PracticePayloadField[] = [
      ...emphasized,
      ...STAT_ORDER.filter((f) => !emphasized.includes(f)),
    ];
    const stats = orderedFields
      .map((f) => statForField(f, signal.payload))
      .filter((s): s is { icon: string; label: string } => s !== null);

    if (stats.length > 0) {
      const chipColor = "#803600";
      dynamicContent = (
        <View style={styles.statColumn}>
          {stats.map((s) => (
            <View key={s.label} style={styles.statRowItem}>
              <View style={[styles.statIconBox, { backgroundColor: chipColor + "15" }]}>
                <MaterialCommunityIcons name={s.icon as any} size={14} color={chipColor} />
              </View>
              <Text style={[styles.statListText, { color: chipColor }]} numberOfLines={2}>{s.label}</Text>
            </View>
          ))}
        </View>
      );
    }
  }

  // --- Reaction display ---
  const myReaction = signal.myReaction;
  const selectedReaction = myReaction ? getReaction(myReaction) : null;
  const buddyReactionTypes = Array.from(
    new Set(signal.reactions.map((r) => r.type)),
  );

  const renderReactionBadge = () => {
    if (!canReact) return null;

    if (interactive && selectedReaction) {
      return (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onUnreact?.()}
          style={styles.reactionBadgeFloating}
        >
          <AnimatedReaction type={selectedReaction.type} selected={true} size={28} />
          <Text style={styles.reactionBadgeName}>You</Text>
        </TouchableOpacity>
      );
    }

    if (!interactive && buddyReactionTypes.length > 0) {
      const bName = buddyName ? buddyName.split(" ")[0] : "Buddy";
      return (
        <View style={styles.reactionBadgeFloating}>
          <View style={{ flexDirection: "row", gap: 4 }}>
            {buddyReactionTypes.map((type) => (
              <AnimatedReaction key={type} type={type} selected={true} size={28} />
            ))}
          </View>
          <Text style={styles.reactionBadgeName}>{bName}</Text>
        </View>
      );
    }

    if (interactive && !selectedReaction) {
      return (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={openPicker}
          style={styles.reactionCueFloating}
        >
          <MaterialCommunityIcons name="heart-outline" size={13} color="#94A3B8" />
        </TouchableOpacity>
      );
    }

    return null;
  };

  const cardBody = (
    <View ref={cardRef} collapsable={false} style={[styles.mainBodyShadow, { backgroundColor: cardGradient[0] }]}>
      <LinearGradient 
        colors={cardGradient as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.mainBody}
      >
        {/* Simple header row */}
        <View style={styles.headerRow}>
          <Text style={[styles.statusLabel, primaryText]} numberOfLines={1}>{statusText}</Text>
          <Text style={[styles.timeText, secondaryText]}>{relativeTime}</Text>
        </View>

        {/* Content */}
        <View style={styles.bodyContentRow}>
          <View style={styles.textContent}>
            {title ? <Text style={[styles.title, primaryText]}>{title}</Text> : null}
            {subtitle ? <Text style={[styles.subtitle, secondaryText]}>{subtitle}</Text> : null}
          </View>
        </View>

        {journeyRibbon ? <View style={styles.journeyRibbonWrap}>{journeyRibbon}</View> : null}

        {bodyText ? <Text style={[styles.bodyParagraph, primaryText]}>{bodyText}</Text> : null}
        {captionText ? <Text style={[styles.caption, secondaryText]}>{captionText}</Text> : null}

        {dynamicContent ? (
          <View style={{ marginTop: 12 }}>{dynamicContent}</View>
        ) : null}
      </LinearGradient>
      
      {/* Mobile-native floating reaction badge */}
      {renderReactionBadge()}
    </View>
  );

  const prevColor = getSignalIconBg(prevSignal);
  const nextColor = getSignalIconBg(nextSignal);

  return (
    <View style={styles.row}>
      {/* Timeline axis — avatar of who posted */}
      <View style={styles.axisCol}>
        <LinearGradient 
          colors={[prevColor + "40", iconBg + "40"]} 
          style={[styles.axisLineTop, isFirst && { opacity: 0 }]} 
        />
        <View style={[styles.timelineAvatarWrap, { shadowColor: iconBg }]}>
          {signal.author?.profilePictureUrl ? (
            <Image source={{ uri: signal.author.profilePictureUrl }} style={[styles.timelineAvatar, { borderColor: iconBg + "40" }]} />
          ) : (
            <View style={[styles.timelineAvatarFallback, { backgroundColor: iconBg }]}>
              <Text style={styles.avatarLetter}>{initials}</Text>
            </View>
          )}
        </View>
        <LinearGradient 
          colors={[iconBg + "40", nextColor + "40"]} 
          style={[styles.axisLineBottom, isLast && { opacity: 0 }]} 
        />
      </View>

      {/* Card */}
      <View style={styles.cardCol}>
        {canReact && interactive ? (
          <TouchableOpacity
            activeOpacity={0.95}
            delayLongPress={400}
            onLongPress={openPicker}
          >
            {cardBody}
          </TouchableOpacity>
        ) : (
          cardBody
        )}

        <ReactionPicker
          visible={pickerVisible}
          anchorY={pickerY}
          onSelect={(type) => onReact?.(type)}
          onDismiss={() => setPickerVisible(false)}
        />
      </View>
    </View>
  );
};

export default SignalCard;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    marginBottom: 20,
  },
  axisCol: {
    width: 32,
    alignItems: "center",
    marginRight: 18,
    flexShrink: 0,
  },
  axisLineTop: {
    width: 2,
    height: 12,
    borderRadius: 2,
  },
  axisLineBottom: {
    flex: 1,
    width: 2,
    borderRadius: 2,
  },
  timelineAvatarWrap: {
    marginVertical: 4,
    zIndex: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  timelineAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
  },
  timelineAvatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  
  cardCol: {
    flex: 1,
    minWidth: 0, 
  },
  
  // Header
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1E293B",
    letterSpacing: 0.5,
  },
  timeText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
  },

  // Main Card Body
  mainBodyShadow: {
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  mainBody: {
    borderRadius: 20,
    padding: 16,
    overflow: "hidden",
  },
  bodyContentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  textContent: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
    lineHeight: 20,
  },
  bodyParagraph: {
    fontSize: 15,
    color: "#334155",
    lineHeight: 22,
    marginTop: 12,
  },
  caption: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 20,
    marginTop: 8,
    fontStyle: "italic",
  },

  // Reaction Badge (Mobile Native)
  reactionBadgeFloating: {
    position: "absolute",
    bottom: -14,
    right: 16,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
    gap: 4,
  },
  reactionBadgeEmoji: {
    fontSize: 13,
  },
  reactionBadgeName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#475569",
    marginLeft: 4,
  },
  reactionCueFloating: {
    position: "absolute",
    bottom: -10,
    right: 16,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },

  // Journey (pack/module) context ribbon
  journeyRibbonWrap: { marginTop: 10 },
  journeyRibbon: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    maxWidth: "100%",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 100,
    backgroundColor: "rgba(128,54,0,0.08)",
  },
  journeyRibbonText: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "700",
    color: "#803600",
    letterSpacing: 0.2,
  },

  // Dynamic content styles
  statColumn: { gap: 8, marginTop: 4 },
  statRowItem: { flexDirection: "row", alignItems: "center", gap: 10 },
  statIconBox: { width: 26, height: 26, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  statListText: { fontSize: 13, fontWeight: "600", flex: 1 },
  replyRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
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
  seenRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  seenText: { fontSize: 12, fontWeight: "600", color: "#94A3B8" },
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
});
