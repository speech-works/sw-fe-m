import { useNavigation } from "@react-navigation/native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import BottomSheetModal from "../BottomSheetModal";
import PressableScale from "../PressableScale";
import { theme } from "../../Theme/tokens";
import { parseShadowStyle, parseTextStyle } from "../../util/functions/parseStyles";
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

const C = {
  orange500: theme.colors.library.orange[500],
  orange600: theme.colors.library.orange[600],
  orange700: theme.colors.library.orange[700],
  green: theme.colors.library.green[500],
  title: theme.colors.text.title,
  textMuted: theme.colors.text.default,
  peachSurface: theme.colors.library.orange[100],
  warmBorder: theme.colors.library.orange[200],
  hairline: theme.colors.library.gray[100],
  faint: theme.colors.library.gray[300],
};

/** A small do/don't line in the crisis-support guide. */
const GuideLine = ({ icon, text }: { icon: string; text: string }) => (
  <View style={styles.guideLine}>
    <MaterialCommunityIcons name={icon as any} size={16} color={C.orange600} style={{ marginTop: 1 }} />
    <Text style={styles.guideText}>{text}</Text>
  </View>
);

/**
 * "Reach out" — how a buddy responds to a friend's *sensitive* (crisis-flagged) moment.
 * Replaces the thin one-tap empathy chip with an actual response: a warm canned note (which
 * pushes the struggling person), a 988 hand-off, and a compact "how to support a friend in
 * crisis" guide + a lifeline for the responder. Canned only — nothing to moderate.
 */
const BuddySupportSheet = ({ visible, signal, onClose, onSupported }: BuddySupportSheetProps) => {
  const navigation = useNavigation<any>();
  const { height: windowHeight } = useWindowDimensions();

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
    <BottomSheetModal
      visible={visible}
      onClose={handleClose}
      fitContent
      maxHeight="90%"
      showHandle
      showCloseButton
      hasBottomSafePadding
    >
      <View style={styles.container}>
        <Text style={styles.title}>Reach out to {name}</Text>
        <Text style={styles.subtitle}>
          {name} shared that they're going through something heavy. Showing up matters far more than
          finding the perfect words.
        </Text>

        <ScrollView
          style={{ maxHeight: windowHeight * 0.56 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Warm canned notes — each one pushes the struggling person */}
          <Text style={styles.groupLabel}>Let them know you're here</Text>
          {SUPPORT_NOTES.map((n) => {
            const isSent = sentNotes.includes(n.id);
            const isSending = sendingNote === n.id;
            return (
              <PressableScale
                key={n.id}
                style={[styles.noteCard, isSent && styles.noteCardSent]}
                scaleTo={0.98}
                disabled={isSent || busy}
                onPress={() => sendNote(n.id)}
                accessibilityLabel={`Send: ${n.text}`}
              >
                <Text style={styles.noteEmoji}>{n.emoji}</Text>
                <Text style={[styles.noteText, isSent && styles.noteTextSent]}>{n.text}</Text>
                {isSending ? (
                  <ActivityIndicator size="small" color={C.orange500} />
                ) : isSent ? (
                  <MaterialCommunityIcons name="check-circle" size={22} color={C.green} />
                ) : (
                  <MaterialCommunityIcons name="send" size={18} color={C.orange500} />
                )}
              </PressableScale>
            );
          })}

          {/* Hand off the lifeline to them */}
          <Text style={[styles.groupLabel, { marginTop: 18 }]}>Bridge them to help</Text>
          <PressableScale
            style={[styles.lifelineBtn, lifelineSent && styles.lifelineBtnSent]}
            scaleTo={0.98}
            disabled={lifelineSent || busy}
            onPress={sendLifeline}
          >
            <MaterialCommunityIcons
              name={lifelineSent ? "check-circle" : "lifebuoy"}
              size={20}
              color={lifelineSent ? C.green : C.orange600}
            />
            <Text style={[styles.lifelineText, lifelineSent && { color: C.green }]}>
              {sendingLifeline
                ? "Sharing…"
                : lifelineSent
                  ? `Lifeline shared with ${name}`
                  : `Share the 988 lifeline with ${name}`}
            </Text>
          </PressableScale>

          {/* How to support a friend in crisis (collapsible) */}
          <PressableScale style={styles.guideHeader} haptic={false} scaleTo={0.99} onPress={toggleGuide}>
            <MaterialCommunityIcons name="hand-heart-outline" size={16} color={C.orange700} />
            <Text style={styles.guideHeaderText}>How to support a friend in crisis</Text>
            <MaterialCommunityIcons
              name={guideOpen ? "chevron-up" : "chevron-down"}
              size={20}
              color={C.faint}
            />
          </PressableScale>
          {guideOpen ? (
            <View style={styles.guideBody}>
              <GuideLine icon="ear-hearing" text="Listen — you don't have to fix it. Just stay with them." />
              <GuideLine icon="heart-outline" text="Take it seriously. Don't minimise or rush to reassure." />
              <GuideLine icon="medical-bag" text="Gently encourage talking to a professional, together if it helps." />
              <GuideLine icon="alert-outline" text={`If ${name} may be in immediate danger, call your local emergency number.`} />
              <PressableScale style={styles.selfHelpRow} haptic={false} scaleTo={0.98} onPress={self988}>
                <MaterialCommunityIcons name="phone-in-talk" size={15} color={C.orange700} />
                <Text style={styles.selfHelpText}>This is heavy for you too — 988 is there for you</Text>
              </PressableScale>
            </View>
          ) : null}
        </ScrollView>

        {anySent ? (
          <View style={styles.sentBanner}>
            <MaterialCommunityIcons name="check-circle" size={16} color={C.green} />
            <Text style={styles.sentBannerText}>{name} will know you're here. 💛</Text>
          </View>
        ) : null}

        <View style={styles.footerRow}>
          <PressableScale haptic={false} scaleTo={0.98} onPress={openResources}>
            <Text style={styles.footerLink}>More resources</Text>
          </PressableScale>
          <PressableScale style={styles.doneBtn} scaleTo={0.97} onPress={handleClose}>
            <Text style={styles.doneText}>Done</Text>
          </PressableScale>
        </View>
      </View>
    </BottomSheetModal>
  );
};

export default BuddySupportSheet;

const styles = StyleSheet.create({
  container: { paddingTop: 28, paddingHorizontal: 20, paddingBottom: 8 },
  title: {
    ...parseTextStyle(theme.typography.Heading3),
    color: C.title,
    fontWeight: "800",
    fontSize: 20,
  },
  subtitle: {
    ...parseTextStyle(theme.typography.Body),
    color: C.textMuted,
    marginTop: 6,
    marginBottom: 12,
    lineHeight: 21,
  },
  scrollContent: { paddingBottom: 8 },

  groupLabel: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
    color: C.textMuted,
    textTransform: "uppercase",
    marginBottom: 10,
  },

  noteCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.peachSurface,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  noteCardSent: { backgroundColor: "#FFFFFF", borderColor: C.green },
  noteEmoji: { fontSize: 20 },
  noteText: { flex: 1, fontSize: 15, fontWeight: "700", color: C.orange700 },
  noteTextSent: { color: C.title },

  lifelineBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: C.peachSurface,
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: C.warmBorder,
  },
  lifelineBtnSent: { backgroundColor: "#FFFFFF", borderColor: C.green },
  lifelineText: { flex: 1, fontSize: 15, fontWeight: "800", color: C.orange700 },

  guideHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
    marginTop: 6,
  },
  guideHeaderText: { flex: 1, fontSize: 14, fontWeight: "800", color: C.orange700 },
  guideBody: {
    gap: 12,
    paddingBottom: 6,
  },
  guideLine: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  guideText: { flex: 1, fontSize: 14, color: C.textMuted, lineHeight: 20 },
  selfHelpRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.peachSurface,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 4,
  },
  selfHelpText: { flex: 1, fontSize: 13, fontWeight: "700", color: C.orange700 },

  sentBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    marginTop: 8,
  },
  sentBannerText: { fontSize: 14, fontWeight: "700", color: C.title },

  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.hairline,
  },
  footerLink: { fontSize: 13, fontWeight: "700", color: C.faint },
  doneBtn: {
    backgroundColor: C.orange500,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 100,
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  doneText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
});
