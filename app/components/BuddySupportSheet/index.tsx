import { useNavigation } from "@react-navigation/native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  View,
} from "react-native";
import PressableScale from "../PressableScale";
import { useTheme, spacing, radius, borderWidth, fonts, Sheet, Text, Icon, icons, type IconName } from "../../design-system";
import { Signal, SupportNoteId, sendSupport } from "../../api/threads";
import { SUPPORT_NOTES } from "../../constants/supportNotes";
import { handleLinkPress } from "../../util/functions/externalLinks";
import { track } from "../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../util/analytics/analyticsEvents";

interface BuddySupportSheetProps {
  visible: boolean;
  /** The buddy's sensitive moment signal being responded to (null when closed). */
  signal: Signal | null;
  onClose: () => void;
  /** Called after a note/lifeline is successfully sent (so the parent can refresh the timeline). */
  onSupported?: () => void;
}

/** A small do/don't line in the crisis-support guide. */
const GuideLine = ({ icon, text }: { icon: IconName; text: string }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.guideLine}>
      <Icon name={icon} size={16} color={colors.action.primary} style={styles.guideLineIcon} />
      <Text variant="bodySm" color="secondary" style={styles.flex1}>{text}</Text>
    </View>
  );
};

/**
 * "Reach out" — how a buddy responds to a friend's *sensitive* (crisis-flagged) moment.
 * Replaces the thin one-tap empathy chip with an actual response: a warm canned note (which
 * pushes the struggling person), a 988 hand-off, and a compact "how to support a friend in
 * crisis" guide + a lifeline for the responder. Canned only — nothing to moderate.
 */
const BuddySupportSheet = ({ visible, signal, onClose, onSupported }: BuddySupportSheetProps) => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  const name = (signal?.author?.name ?? "your buddy").split(" ")[0];
  const signalId = signal?.id;

  const [sentNotes, setSentNotes] = useState<SupportNoteId[]>([]);
  const [sendingNote, setSendingNote] = useState<SupportNoteId | null>(null);
  const [lifelineSent, setLifelineSent] = useState(false);
  const [sendingLifeline, setSendingLifeline] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  // One send at a time — disables every note + the lifeline while any request is in flight.
  const busy = !!sendingNote || sendingLifeline;

  const reset = () => {
    setSentNotes([]);
    setSendingNote(null);
    setLifelineSent(false);
    setSendingLifeline(false);
    setGuideOpen(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const sendNote = async (noteId: SupportNoteId) => {
    if (!signalId || busy || sentNotes.includes(noteId)) return;
    try {
      setSendingNote(noteId);
      await sendSupport({ signalId, kind: "note", noteId });
      track(ANALYTICS_EVENTS.BUDDY_SUPPORT_NOTE_SENT, { noteId });
      setSentNotes((prev) => [...prev, noteId]);
      onSupported?.();
    } catch (e) {
      Alert.alert("Couldn't send", "Please try again.");
    } finally {
      setSendingNote(null);
    }
  };

  const sendLifeline = async () => {
    if (!signalId || busy || lifelineSent) return;
    try {
      setSendingLifeline(true);
      await sendSupport({ signalId, kind: "lifeline" });
      track(ANALYTICS_EVENTS.BUDDY_SUPPORT_LIFELINE_SENT);
      setLifelineSent(true);
      onSupported?.();
    } catch (e) {
      Alert.alert("Couldn't send", "Please try again.");
    } finally {
      setSendingLifeline(false);
    }
  };

  const toggleGuide = () => {
    setGuideOpen((open) => {
      if (!open) track(ANALYTICS_EVENTS.BUDDY_SUPPORT_GUIDE_VIEWED);
      return !open;
    });
  };

  const self988 = () => {
    track(ANALYTICS_EVENTS.BUDDY_SUPPORT_SELF_RESOURCE_TAPPED, { resource: "988" });
    handleLinkPress("tel:988");
  };

  const openResources = () => {
    track(ANALYTICS_EVENTS.BUDDY_SUPPORT_SELF_RESOURCE_TAPPED, { resource: "resources" });
    handleClose();
    navigation.navigate("Resources");
  };

  const anySent = sentNotes.length > 0 || lifelineSent;

  return (
    <Sheet visible={visible} onClose={handleClose}>
      <View style={styles.container}>
        <Text variant="h2">Reach out to {name}</Text>
        <Text variant="bodySm" color="secondary" style={styles.subtitle}>
          {name} shared that they're going through something heavy. Showing up matters far more than
          finding the perfect words.
        </Text>

        {/* Warm canned notes — each one pushes the struggling person */}
        <Text variant="caption" color="tertiary" style={styles.groupLabel}>Let them know you're here</Text>
        {SUPPORT_NOTES.map((n) => {
          const isSent = sentNotes.includes(n.id);
          const isSending = sendingNote === n.id;
          return (
            <PressableScale
              key={n.id}
              style={[
                styles.noteCard,
                { backgroundColor: colors.surface.control, borderColor: "transparent" },
                isSent && { backgroundColor: colors.surface.default, borderColor: colors.accent.success },
              ]}
              scaleTo={0.98}
              disabled={isSent || busy}
              onPress={() => sendNote(n.id)}
              accessibilityLabel={`Send: ${n.text}`}
            >
              <Text variant="bodySm" color={isSent ? "secondary" : "primary"} style={[styles.flex1, styles.bold]}>{n.text}</Text>
              {isSending ? (
                <ActivityIndicator size="small" color={colors.action.primary} />
              ) : isSent ? (
                <Icon name={icons.success} size={22} color={colors.accent.success} />
              ) : (
                <Icon name={icons.send} size={18} color={colors.action.primary} />
              )}
            </PressableScale>
          );
        })}

        {/* Hand off the lifeline to them */}
        <Text variant="caption" color="tertiary" style={[styles.groupLabel, styles.groupLabelSpaced]}>Bridge them to help</Text>
        <PressableScale
          style={[
            styles.lifelineBtn,
            { backgroundColor: colors.surface.control, borderColor: colors.border.default },
            lifelineSent && { backgroundColor: colors.surface.default, borderColor: colors.accent.success },
          ]}
          scaleTo={0.98}
          disabled={lifelineSent || busy}
          onPress={sendLifeline}
        >
          <Icon
            name={lifelineSent ? icons.success : icons.support}
            size={20}
            color={lifelineSent ? colors.accent.success : colors.action.primary}
          />
          <Text variant="bodySm" color={lifelineSent ? colors.feedback.successText : "primary"} style={[styles.flex1, styles.bold]}>
            {sendingLifeline
              ? "Sharing…"
              : lifelineSent
                ? `Lifeline shared with ${name}`
                : `Share the 988 lifeline with ${name}`}
          </Text>
        </PressableScale>

        {/* How to support a friend in crisis (collapsible) */}
        <PressableScale style={styles.guideHeader} haptic={false} scaleTo={0.99} onPress={toggleGuide}>
          <Icon name={icons.care} size={16} color={colors.action.primary} />
          <Text variant="bodySm" color={colors.action.primary} style={[styles.flex1, styles.bold]}>How to support a friend in crisis</Text>
          <Icon
            name={guideOpen ? icons.chevronUp : icons.chevronDown}
            size={20}
            color={colors.text.tertiary}
          />
        </PressableScale>
        {guideOpen ? (
          <View style={styles.guideBody}>
            <GuideLine icon={icons.listen} text="Listen — you don't have to fix it. Just stay with them." />
            <GuideLine icon={icons.heart} text="Take it seriously. Don't minimise or rush to reassure." />
            <GuideLine icon={icons.professionalHelp} text="Gently encourage talking to a professional, together if it helps." />
            <GuideLine icon={icons.danger} text={`If ${name} may be in immediate danger, call your local emergency number.`} />
            <PressableScale style={[styles.selfHelpRow, { backgroundColor: colors.surface.control }]} haptic={false} scaleTo={0.98} onPress={self988}>
              <Icon name={icons.call} size={15} color={colors.action.primary} />
              <Text variant="caption" color={colors.action.primary} style={[styles.flex1, styles.bold]}>This is heavy for you too — 988 is there for you</Text>
            </PressableScale>
          </View>
        ) : null}

        {anySent ? (
          <View style={styles.sentBanner}>
            <Icon name={icons.success} size={16} color={colors.accent.success} />
            <Text variant="bodySm" color="primary" style={styles.bold}>{name} will know you're here.</Text>
          </View>
        ) : null}

        <View style={[styles.footerRow, { borderTopColor: colors.border.default }]}>
          <PressableScale haptic={false} scaleTo={0.98} onPress={openResources}>
            <Text variant="caption" color="tertiary" style={styles.bold}>More resources</Text>
          </PressableScale>
          <PressableScale style={[styles.doneBtn, { backgroundColor: colors.action.primary }]} scaleTo={0.97} onPress={handleClose}>
            <Text variant="bodySm" color={colors.action.onPrimary} style={styles.bold}>Done</Text>
          </PressableScale>
        </View>
      </View>
    </Sheet>
  );
};

export default BuddySupportSheet;

const styles = StyleSheet.create({
  container: { paddingTop: spacing.sm, paddingBottom: spacing.sm },
  bold: { fontFamily: fonts.bold },
  flex1: { flex: 1 },
  subtitle: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },

  groupLabel: {
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },
  groupLabelSpaced: { marginTop: spacing.xl },

  noteCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radius.input,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: borderWidth.thin,
  },

  lifelineBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.input,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderWidth: borderWidth.thin,
  },

  guideHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    marginTop: spacing.sm,
  },
  guideBody: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  guideLine: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
  guideLineIcon: { marginTop: 1 },
  selfHelpRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
  },

  sentBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },

  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: borderWidth.thin,
  },
  doneBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: 28,
    borderRadius: radius.full,
  },
});
