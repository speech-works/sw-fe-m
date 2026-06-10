import { useNavigation } from "@react-navigation/native";
import React, { useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import BottomSheetModal from "../BottomSheetModal";
import PromptBottomSheet from "../PromptBottomSheet";
import PressableScale from "../PressableScale";
import { theme } from "../../Theme/tokens";
import { parseShadowStyle, parseTextStyle } from "../../util/functions/parseStyles";
import { createMomentSignal, MomentId, MomentValence, Signal } from "../../api/threads";
import { getMoment, momentsByValence } from "../../constants/momentMessages";
import { handleLinkPress } from "../../util/functions/externalLinks";
import { track } from "../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../util/analytics/analyticsEvents";

interface ShareMomentSheetProps {
  visible: boolean;
  onClose: () => void;
  /** The buddy thread this moment is shared into. */
  threadId: string;
  /** Buddy's name for warm, addressed copy. */
  buddyName?: string;
  /** Called with the new signal after a successful share (e.g. to refresh the timeline). */
  onCreated?: (signal: Signal) => void;
}

const C = {
  orange500: theme.colors.library.orange[500],
  orange600: theme.colors.library.orange[600],
  orange700: theme.colors.library.orange[700],
  title: theme.colors.text.title,
  textMuted: theme.colors.text.default,
  peachSurface: theme.colors.library.orange[100],
  warmBorder: theme.colors.library.orange[200],
  faint: theme.colors.library.gray[300],
};

/**
 * "Share a moment" — a buddy-to-buddy check-in built entirely from canned statements (no
 * free text, nothing to moderate), a sibling to the "Send a cheer" dock. The chosen statement
 * is posted to the buddy feed as a `moment` post the buddy can react to. Heavy ("sensitive")
 * options surface a gentle crisis-helpline suggestion on share — it offers help, never blocks.
 */
const ShareMomentSheet = ({ visible, onClose, threadId, buddyName, onCreated }: ShareMomentSheetProps) => {
  const navigation = useNavigation<any>();
  const buddyFirstName = (buddyName ?? "your buddy").split(" ")[0];

  const [selected, setSelected] = useState<MomentId | null>(null);
  const [posting, setPosting] = useState(false);
  const [crisisVisible, setCrisisVisible] = useState(false);
  const [acknowledgedCrisis, setAcknowledgedCrisis] = useState(false);

  const reset = () => {
    setSelected(null);
    setPosting(false);
    setCrisisVisible(false);
    setAcknowledgedCrisis(false);
  };

  const handleSelect = (id: MomentId) => {
    setSelected(id);
    track(ANALYTICS_EVENTS.MOMENT_SELECTED, { momentId: id, valence: getMoment(id).valence });
  };

  const doShare = async (momentId: MomentId) => {
    if (posting) return;
    const m = getMoment(momentId);
    try {
      setPosting(true);
      const signal = await createMomentSignal(threadId, { momentId });
      track(ANALYTICS_EVENTS.MOMENT_SHARED, {
        momentId,
        valence: m.valence,
        sensitive: !!m.sensitive,
      });
      onCreated?.(signal);
      reset();
      onClose();
    } catch (e) {
      Alert.alert("Couldn't share", "Please try again.");
    } finally {
      setPosting(false);
    }
  };

  const handleShare = () => {
    if (!selected || posting) return;
    const m = getMoment(selected);
    // Heavy disclosure → surface help first (once), but never block the share.
    if (m.sensitive && !acknowledgedCrisis) {
      setAcknowledgedCrisis(true);
      setCrisisVisible(true);
      track(ANALYTICS_EVENTS.MOMENT_CRISIS_PROMPT_SHOWN, { momentId: selected });
      return;
    }
    void doShare(selected);
  };

  // Dismiss without posting (backdrop / close button).
  const handleDismiss = () => {
    track(ANALYTICS_EVENTS.MOMENT_CANCELLED, { hadSelection: !!selected });
    reset();
    onClose();
  };

  const call988 = () => {
    track(ANALYTICS_EVENTS.MOMENT_CRISIS_RESOURCE_TAPPED, { resource: "988" });
    handleLinkPress("tel:988");
  };

  const openResources = () => {
    track(ANALYTICS_EVENTS.MOMENT_CRISIS_RESOURCE_TAPPED, { resource: "resources" });
    onClose();
    navigation.navigate("Resources");
  };

  const renderGroup = (label: string, valence: MomentValence) => (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>{label}</Text>
      {momentsByValence(valence).map((m) => {
        const isSel = selected === m.id;
        return (
          <PressableScale
            key={m.id}
            style={[styles.chip, isSel && styles.chipSelected]}
            scaleTo={0.97}
            onPress={() => handleSelect(m.id)}
            accessibilityLabel={`Share: ${m.text}`}
          >
            <View style={[styles.emojiWrap, isSel && styles.emojiWrapSelected]}>
              <Text style={styles.chipEmoji}>{m.emoji}</Text>
            </View>
            <Text style={[styles.chipText, isSel && styles.chipTextSelected]}>{m.text}</Text>
            {isSel ? (
              <MaterialCommunityIcons name="check-circle" size={24} color={C.orange500} />
            ) : null}
          </PressableScale>
        );
      })}
    </View>
  );

  return (
    <>
      <BottomSheetModal
        visible={visible}
        onClose={handleDismiss}
        maxHeight="82%"
        showHandle
        showCloseButton
        hasBottomSafePadding
      >
        <View style={styles.container}>
          <Text style={styles.title}>Share a moment</Text>
          <Text style={styles.subtitle}>
            Let {buddyFirstName} know how it's really going — the hard ones count too.
          </Text>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {renderGroup("Wins", "win")}
            {renderGroup("Struggles", "struggle")}
          </ScrollView>

          {/* Always-available crisis affordance */}
          <View style={styles.footer}>
            <PressableScale
              style={styles.footerRow}
              haptic={false}
              scaleTo={0.98}
              onPress={call988}
              accessibilityLabel="In crisis, call or text 988"
            >
              <MaterialCommunityIcons name="lifebuoy" size={15} color={C.orange700} />
              <Text style={styles.footerText}>In crisis? Call or text 988</Text>
            </PressableScale>
            <PressableScale haptic={false} scaleTo={0.98} onPress={openResources}>
              <Text style={styles.footerLink}>More resources</Text>
            </PressableScale>
          </View>

          <PressableScale
            style={[styles.shareBtn, (!selected || posting) && styles.shareBtnDisabled]}
            scaleTo={0.97}
            disabled={!selected || posting}
            onPress={handleShare}
          >
            {posting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.shareBtnText}>Share with {buddyFirstName}</Text>
            )}
          </PressableScale>
        </View>
      </BottomSheetModal>

      <PromptBottomSheet
        visible={crisisVisible}
        onClose={() => setCrisisVisible(false)}
        icon="lifebuoy"
        title="You don't have to go through this alone"
        message="If you're in crisis, help is available right now — free and confidential."
        primaryButton={{ label: "Call or text 988", onPress: call988 }}
        secondaryButton={{ label: "Share anyway", onPress: () => selected && doShare(selected) }}
      />
    </>
  );
};

export default ShareMomentSheet;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 28,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
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
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 8 },

  group: { marginTop: 16 },
  groupLabel: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: theme.colors.library.gray[400],
    textTransform: "uppercase",
    marginBottom: 12,
    marginLeft: 4,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: theme.colors.library.gray[100],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  chipSelected: { borderColor: C.orange500, backgroundColor: "#FFFBF7" },
  emojiWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.library.gray[100],
    alignItems: "center",
    justifyContent: "center",
  },
  emojiWrapSelected: {
    backgroundColor: "#FFFFFF",
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  chipEmoji: { fontSize: 20 },
  chipText: { flex: 1, fontSize: 15, fontWeight: "600", color: C.title, lineHeight: 20 },
  chipTextSelected: { fontWeight: "800", color: C.orange700 },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: theme.colors.library.gray[100],
  },
  footerRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  footerText: { fontSize: 13, fontWeight: "700", color: C.orange700 },
  footerLink: { fontSize: 13, fontWeight: "700", color: C.faint },

  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.orange500,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 8,
    ...parseShadowStyle(theme.shadow.elevation2),
  },
  shareBtnDisabled: { opacity: 0.4, shadowOpacity: 0 },
  shareBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800", letterSpacing: 0.3 },
});
