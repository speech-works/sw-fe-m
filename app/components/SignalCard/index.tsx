import React, { useRef, useState } from "react";
import { Image, StyleSheet, TouchableOpacity, View } from "react-native";
import * as Haptics from "expo-haptics";

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
import { getReaction } from "../../constants/reactions";
import { useTheme, spacing, radius, fonts, borderWidth, Text, Icon, icons, type IconName } from "../../design-system";
import type { SemanticColors } from "../../design-system/semantic/roles";

import ReactionPicker from "../ReactionPicker";
import { AnimatedReaction } from "../AnimatedReactions";

/** Per-signal colour identity, resolved from theme tokens.
 *  `vibrant` cards take a full accent fill (system prompts, milestones);
 *  everything else is a plain elevated surface. */
type SignalTone = { accent: string; on: string; vibrant: boolean };

const signalTone = (colors: SemanticColors, signal?: Signal): SignalTone => {
  const orange = { accent: colors.action.primary, on: colors.action.onPrimary, vibrant: false };
  if (!signal) return orange;

  // Completing a whole JOURNEY is a milestone — golden treatment.
  if (isPractice(signal) && signal.payload.journeyCompleted) {
    return { accent: colors.accent.warning, on: colors.accentOn.warning, vibrant: true };
  }
  if (isBeat(signal)) {
    const isSupport = signal.beatKind === "support_note" || signal.beatKind === "support_lifeline";
    // Milestones (non-support beats) get the golden treatment; support stays plain.
    if (!isSupport) return { accent: colors.accent.warning, on: colors.accentOn.warning, vibrant: true };
    return orange;
  }
  if (isCard(signal)) {
    switch (signal.cardKind) {
      case "prompt": return { accent: colors.accent.purple, on: colors.accentOn.purple, vibrant: true };
      case "affirmation": return { accent: colors.action.primary, on: colors.action.onPrimary, vibrant: true };
      case "tip": return { accent: colors.accent.info, on: colors.accentOn.info, vibrant: true };
      case "challenge": return { accent: colors.accent.danger, on: colors.accentOn.danger, vibrant: true };
      default: return orange;
    }
  }
  // Moments + practice shares are plain cards with an orange identity.
  return orange;
};

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
): { icon: IconName; label: string } | null => {
  switch (field) {
    case "durationSeconds":
      return payload.durationSeconds
        ? { icon: icons.duration, label: `${Math.max(1, Math.round(payload.durationSeconds / 60))} min` }
        : null;
    case "timeOfDay":
      return payload.timeOfDay ? { icon: icons.timeOfDay, label: capitalize(payload.timeOfDay) } : null;
    case "showedUp":
      return payload.showedUp ? { icon: icons.success, label: "Showed up" } : null;
    case "streakDays":
      return payload.streakDays ? { icon: icons.streak, label: `${payload.streakDays}-day streak` } : null;
    case "xpEarned":
      return payload.xpEarned ? { icon: icons.xp, label: `+${payload.xpEarned} XP` } : null;
    case "leveledUp":
      return payload.leveledUp ? { icon: icons.levelUp, label: "Leveled up" } : null;
    case "levelStageTitle":
      return payload.levelStageTitle ? { icon: icons.rank, label: payload.levelStageTitle } : null;
    case "milestoneLabel":
      return payload.milestoneLabel ? { icon: icons.milestone, label: payload.milestoneLabel } : null;
    case "growthDelta":
      return payload.growthDelta
        ? { icon: icons.growth, label: `+${capitalize(payload.growthDelta.axis)}` }
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

const CARD_KIND_META: Record<string, { label: string; icon: IconName }> = {
  prompt: { label: "A question for you both", icon: icons.prompt },
  affirmation: { label: "A reminder", icon: icons.affirmation },
  tip: { label: "Tip", icon: icons.tip },
  challenge: { label: "Shared challenge", icon: icons.challenge },
};

const SignalCard = ({
  signal,
  variant = "feed",
  onReact,
  onUnreact,
  onReachOut,
  onReplyPrompt,
  replyPending,
  buddyName,
  isFirst = false,
  isLast = false,
}: SignalCardProps) => {
  const { colors } = useTheme();
  const authorName = signal.authorIsMe ? "You" : signal.author?.name ?? "Your buddy";
  const initials = (signal.author?.name ?? "?").substring(0, 1).toUpperCase();
  const interactive = variant === "feed" && !signal.authorIsMe;
  const relativeTime = formatRelativeTime(signal.createdAt);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerY, setPickerY] = useState(0);
  const cardRef = useRef<View>(null);

  const openPicker = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    cardRef.current?.measure((_x, _y, _w, _h, _pageX, pageY) => {
      setPickerY(pageY);
      setPickerVisible(true);
    });
  };

  const tone = signalTone(colors, signal);
  const cardBg = tone.vibrant ? tone.accent : colors.surface.elevated;
  // Text colours: dark on-accent for vibrant fills, standard roles otherwise.
  const onPrimary = tone.vibrant ? tone.on : colors.text.primary;
  const onSecondary = tone.vibrant ? tone.on : colors.text.secondary;
  const onTertiary = tone.vibrant ? tone.on : colors.text.tertiary;
  // Inset chips/badges: dark chips on vibrant cards, control surface on plain.
  const insetBg = tone.vibrant ? colors.surface.default : colors.surface.control;
  const insetText = tone.vibrant ? colors.text.primary : colors.text.secondary;

  let statusText = "Update";
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
    title = moment.text;
    subtitle = signal.authorIsMe ? "You shared a moment" : `${authorName} shared a moment`;

    if (moment.sensitive) {
      if (interactive) {
        dynamicContent = signal.iReachedOut ? (
          <View style={styles.seenRow}>
            <Icon name={icons.success} size={14} color={tone.accent} />
            <Text variant="caption" color={tone.accent} style={styles.bold}>You reached out</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.reachOutBtn, { backgroundColor: tone.accent }]}
            activeOpacity={0.85}
            onPress={onReachOut}
          >
            <Icon name={icons.care} size={16} color={tone.on} />
            <Text variant="bodySm" color={tone.on} style={styles.bold}>Reach out to {authorName.split(" ")[0]}</Text>
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
    } else {
      statusText = "Milestone";
    }
    title = signal.payload.label ?? (isSupport ? "Support" : "Beat");
    const body = signal.payload.body ?? "";
    subtitle = body || (signal.authorIsMe ? (isSupport ? "Reached out" : "Reached a milestone") : `${authorName} ${isSupport ? "reached out" : "reached a milestone"}`);
  } else if (isCard(signal)) {
    const meta = CARD_KIND_META[signal.cardKind] ?? CARD_KIND_META.affirmation;
    statusText = meta.label;
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
                style={[
                  styles.replyChip,
                  { backgroundColor: insetBg, borderColor: colors.border.default },
                  mine && { backgroundColor: colors.action.primary, borderColor: colors.action.primary },
                  replyPending && styles.replyChipDisabled,
                ]}
              >
                <Text variant="caption" color={mine ? colors.action.onPrimary : insetText} style={styles.bold}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      );
    } else if (!isPrompt && signal.seenByBuddy) {
      dynamicContent = (
        <View style={styles.seenRow}>
          <Icon name={icons.seen} size={14} color={onTertiary} />
          <Text variant="caption" color={onTertiary}>{buddyName ?? "Your buddy"} saw this</Text>
        </View>
      );
    }
  } else {
    canReact = true;
    const template = getPostTemplate(signal.templateId);
    const p = signal.payload;
    statusText = "Practice";
    title = p.activityName ?? "Practice Session";
    captionText = signal.caption ?? "";
    const actLabel = template.label;
    subtitle = signal.authorIsMe ? `Practiced • ${actLabel}` : `${authorName} practiced • ${actLabel}`;

    // 1. Journey Context (Stacked layout to prevent truncation)
    const jp = p.journeyProgress;
    if (p.journeyTitle || p.moduleTitle || jp) {
      journeyRibbon = (
        <View style={[styles.journeyBox, { backgroundColor: insetBg, borderColor: colors.border.default }]}>
          {p.journeyTitle || jp ? (
            <View style={styles.journeyTopRow}>
              <View style={[styles.journeyIconDot, { backgroundColor: colors.action.primaryTint }]}>
                <Icon name={icons.journey} size={14} color={colors.action.primary} />
              </View>
              {p.journeyTitle ? (
                <Text variant="caption" color={tone.vibrant ? colors.action.primary : "secondary"} style={[styles.flex1, styles.journeyEyebrow]}>
                  {p.journeyTitle}
                </Text>
              ) : (
                <View style={styles.flex1} />
              )}
              {jp ? (
                <View style={[styles.journeyProgressBadge, { backgroundColor: colors.action.primary }]}>
                  <Text variant="caption" color={colors.action.onPrimary} style={styles.bold}>
                    {jp.moduleIndex} of {jp.moduleTotal}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
          {p.moduleTitle ? (
            <Text variant="bodySm" color={tone.vibrant ? "primary" : "secondary"}>
              {p.moduleTitle}
            </Text>
          ) : null}
        </View>
      );
    }

    // Completion milestones override the header/subtitle. journeyCompleted also recolors
    // the card (golden) via signalTone; journeyTitle may be toggled off, so fall back.
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

    // 2. Stats Chips (Wrap layout, no carousel)
    const emphasized = template.emphasizes || [];
    const orderedFields: PracticePayloadField[] = [
      ...emphasized,
      ...STAT_ORDER.filter((f) => !emphasized.includes(f)),
    ];
    const stats = orderedFields
      .map((f) => statForField(f, signal.payload))
      .filter((s): s is { icon: IconName; label: string } => s !== null);

    if (stats.length > 0) {
      dynamicContent = (
        <View style={styles.statColumn}>
          {stats.map((s) => (
            <View key={s.label} style={[styles.statRowItem, { backgroundColor: insetBg, borderColor: colors.border.default }]}>
              <View style={styles.statIconBox}>
                <Icon name={s.icon} size={14} color={insetText} />
              </View>
              <Text variant="caption" color={insetText} style={styles.bold}>{s.label}</Text>
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
          style={[styles.reactionBadgeFloating, { backgroundColor: colors.surface.elevated, borderColor: colors.border.default, shadowColor: colors.shadow }]}
        >
          <AnimatedReaction type={selectedReaction.type} selected={true} size={28} />
          <Text variant="caption" color="secondary" style={[styles.bold, styles.reactionBadgeName]}>You</Text>
        </TouchableOpacity>
      );
    }

    if (!interactive && buddyReactionTypes.length > 0) {
      const bName = buddyName ? buddyName.split(" ")[0] : "Buddy";
      return (
        <View style={[styles.reactionBadgeFloating, { backgroundColor: colors.surface.elevated, borderColor: colors.border.default, shadowColor: colors.shadow }]}>
          <View style={styles.reactionRow}>
            {buddyReactionTypes.map((type) => (
              <AnimatedReaction key={type} type={type} selected={true} size={28} />
            ))}
          </View>
          <Text variant="caption" color="secondary" style={[styles.bold, styles.reactionBadgeName]}>{bName}</Text>
        </View>
      );
    }

    if (interactive && !selectedReaction) {
      return (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={openPicker}
          style={[styles.reactionCueFloating, { backgroundColor: colors.surface.control, borderColor: colors.border.default }]}
        >
          <Icon name={icons.heart} size={13} color={colors.text.tertiary} />
        </TouchableOpacity>
      );
    }

    return null;
  };

  const cardBody = (
    <View
      ref={cardRef}
      collapsable={false}
      style={[
        styles.mainBodyShadow,
        { backgroundColor: cardBg },
        !tone.vibrant && { borderWidth: borderWidth.thin, borderColor: colors.border.default },
      ]}
    >
      <View style={styles.mainBody}>
        {/* Simple header row */}
        <View style={styles.headerRow}>
          <Text variant="caption" color={onSecondary} style={[styles.statusLabel, styles.bold]} numberOfLines={1}>{statusText}</Text>
          <Text variant="caption" color={onTertiary} style={styles.bold}>{relativeTime}</Text>
        </View>

        {/* Content */}
        <View style={styles.bodyContentRow}>
          <View style={styles.textContent}>
            {title ? <Text variant="h3" color={onPrimary} style={styles.title}>{title}</Text> : null}
            {subtitle ? <Text variant="bodySm" color={onSecondary} style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
        </View>

        {journeyRibbon ? <View style={styles.journeyRibbonWrap}>{journeyRibbon}</View> : null}

        {bodyText ? <Text variant="body" color={onPrimary} style={styles.bodyParagraph}>{bodyText}</Text> : null}
        {captionText ? <Text variant="bodySm" color={onSecondary} style={styles.caption}>{captionText}</Text> : null}

        {dynamicContent ? (
          <View style={styles.dynamicWrap}>{dynamicContent}</View>
        ) : null}
      </View>

      {/* Mobile-native floating reaction badge */}
      {renderReactionBadge()}
    </View>
  );

  return (
    <View style={styles.row}>
      {/* Timeline axis — avatar of who posted */}
      <View style={styles.axisCol}>
        <View style={[styles.axisLineTop, { backgroundColor: colors.border.strong }, isFirst && styles.hidden]} />
        <View style={styles.timelineAvatarWrap}>
          {signal.author?.profilePictureUrl ? (
            <Image source={{ uri: signal.author.profilePictureUrl }} style={[styles.timelineAvatar, { borderColor: tone.accent }]} />
          ) : (
            <View style={[styles.timelineAvatarFallback, { backgroundColor: tone.accent }]}>
              <Text variant="caption" color={tone.on} style={styles.bold}>{initials}</Text>
            </View>
          )}
        </View>
        <View style={[styles.axisLineBottom, { backgroundColor: colors.border.strong }, isLast && styles.hidden]} />
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
    // NB: the inter-card gap lives on `cardCol` (not here) so the axis column
    // stretches THROUGH it — that's what keeps the timeline line continuous
    // between avatars instead of breaking into a stub per card.
  },
  bold: { fontFamily: fonts.bold },
  flex1: { flex: 1 },
  hidden: { opacity: 0 },
  reactionRow: { flexDirection: "row", gap: 4 },
  axisCol: {
    width: 32,
    alignItems: "center",
    marginRight: 18,
    flexShrink: 0,
  },
  axisLineTop: {
    width: 2,
    height: spacing.md,
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
  },
  timelineAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: borderWidth.thick,
  },
  timelineAvatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  cardCol: {
    flex: 1,
    minWidth: 0,
    // Inter-card spacing lives here (not on `row`) so the axis column grows to
    // include it and the timeline line bridges the gap to the next avatar.
    marginBottom: spacing.xl,
  },

  // Header
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  statusLabel: {
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },

  // Main Card Body
  mainBodyShadow: {
    borderRadius: radius.card,
  },
  mainBody: {
    borderRadius: radius.card,
    padding: spacing.lg,
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
    marginBottom: 4,
  },
  subtitle: {},
  bodyParagraph: {
    marginTop: spacing.md,
  },
  caption: {
    marginTop: spacing.sm,
    fontStyle: "italic",
  },
  dynamicWrap: { marginTop: spacing.md },

  // Reaction Badge (Mobile Native)
  reactionBadgeFloating: {
    position: "absolute",
    bottom: -14,
    right: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: borderWidth.thin,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
    gap: 4,
  },
  reactionBadgeName: {
    marginLeft: 4,
  },
  reactionCueFloating: {
    position: "absolute",
    bottom: -10,
    right: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: borderWidth.thin,
  },

  // Journey (pack/module) context chip
  journeyRibbonWrap: { marginTop: spacing.md },
  journeyBox: {
    borderRadius: radius.input,
    borderWidth: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: 14,
    gap: spacing.sm,
  },
  journeyTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  journeyIconDot: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  journeyEyebrow: {
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  journeyProgressBadge: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },

  // Dynamic content styles
  statColumn: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: spacing.sm },
  statRowItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    borderWidth: borderWidth.thin,
  },
  statIconBox: { alignItems: "center", justifyContent: "center" },
  replyRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  replyChip: {
    borderWidth: borderWidth.thin,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  replyChipDisabled: { opacity: 0.5 },
  seenRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  reachOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: radius.full,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
});
