import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import FAIcon from "react-native-vector-icons/FontAwesome5";
import { theme } from "../../../../Theme/tokens";
import { parseTextStyle } from "../../../../util/functions/parseStyles";
import { useVoicePreference } from "../../../../hooks/useVoicePreference";
import {
  IOS_VOICE_DOWNLOAD_STEPS,
  launchAndroidVoiceInstall,
  openIOSSettings,
  speakWithProfile,
  stopSpeaking,
} from "../../../../util/voice";
import type { AccentGroup } from "../../../../util/voice/types";

const PREVIEW_LINE = "This is how your reading guide will sound.";

const BRAND = theme.colors.actionPrimary.default;
const INK = "#0F172A";
const SUBTLE = "#64748B";
const HAIRLINE = "#E8EBEF";
const GREEN = "#0F9F6E";
const SELECTED_FILL = "#FFF6EF";
const SELECTED_AVATAR = "#FFE7D3";

/**
 * The single, reusable accent picker for the Voice Hover tool. Used inline in
 * the in-tool config sheet AND as the body of the Settings → Reading voice
 * screen. Selecting a row saves the accent app-wide immediately and plays a
 * short sample in that accent (no separate play button).
 *
 * Honours per-device availability: each row shows a quality tier (Natural /
 * Basic) and, when only a robotic voice is installed, a single "Add natural
 * voice" path is offered (Android one-tap; iOS guided sheet) — the working
 * selection is never blocked.
 */
export function AccentPicker() {
  const { groups, loading, preference, selectAccent, refresh } =
    useVoicePreference();
  const [iosSheetVisible, setIosSheetVisible] = useState(false);

  const selectAndPreview = useCallback(
    (group: AccentGroup) => {
      selectAccent(group.locale);
      if (group.bestVoice) {
        stopSpeaking();
        speakWithProfile(PREVIEW_LINE, {
          voice: group.bestVoice,
          language: group.locale,
          rate: 1.0,
        });
      }
    },
    [selectAccent],
  );

  const handleInstall = useCallback(async () => {
    if (Platform.OS === "android") {
      const launched = await launchAndroidVoiceInstall();
      if (launched) setTimeout(refresh, 500);
    } else {
      setIosSheetVisible(true);
    }
  }, [refresh]);

  if (loading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="small" color={BRAND} />
        <Text style={styles.loadingText}>Finding voices on your device…</Text>
      </View>
    );
  }

  const anyBasicOnly = groups.some((g) => g.isAvailable && !g.hasNatural);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.eyebrow}>Guide voice accent</Text>
        <TouchableOpacity onPress={refresh} hitSlop={8} style={styles.refreshBtn}>
          <FAIcon name="sync" size={11} color={SUBTLE} />
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.list}>
        {groups.map((group) => (
          <AccentRow
            key={group.locale}
            group={group}
            isSelected={preference?.accent === group.locale}
            onPress={() =>
              group.isAvailable ? selectAndPreview(group) : handleInstall()
            }
          />
        ))}
      </View>

      {anyBasicOnly && (
        <TouchableOpacity style={styles.addNaturalBtn} onPress={handleInstall}>
          <FAIcon name="magic" size={12} color={GREEN} />
          <Text style={styles.addNaturalText}>Add natural voices</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.footnote}>
        Voices come from your device. Natural voices sound human; basic ones are
        more robotic. Tap an accent to hear it.
      </Text>

      <IosVoiceGuideSheet
        visible={iosSheetVisible}
        onClose={() => setIosSheetVisible(false)}
        onOpenSettings={openIOSSettings}
      />
    </View>
  );
}

function AccentRow({
  group,
  isSelected,
  onPress,
}: {
  group: AccentGroup;
  isSelected: boolean;
  onPress: () => void;
}) {
  const { isAvailable, hasNatural } = group;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.row, isSelected && styles.rowSelected]}
    >
      <View style={[styles.avatar, isSelected && styles.avatarSelected]}>
        <Text style={styles.flag}>{group.flag}</Text>
      </View>

      <View style={styles.center}>
        <Text style={styles.name} numberOfLines={1}>
          {group.label}
        </Text>
        {isAvailable ? (
          <Text style={hasNatural ? styles.subNatural : styles.subBasic}>
            {hasNatural ? "Natural voice" : "Basic voice"}
          </Text>
        ) : (
          <Text style={styles.subMuted}>Not installed · tap to add</Text>
        )}
      </View>

      {isAvailable ? (
        <View style={[styles.radio, isSelected && styles.radioOn]}>
          {isSelected && <FAIcon name="check" size={11} color="#FFF" />}
        </View>
      ) : (
        <FAIcon name="download" size={14} color={BRAND} />
      )}
    </TouchableOpacity>
  );
}

/** iOS-only guided walkthrough for downloading a natural voice. */
function IosVoiceGuideSheet({
  visible,
  onClose,
  onOpenSettings,
}: {
  visible: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Add a natural voice</Text>
          <Text style={styles.modalSubtitle}>
            iOS downloads voices in Settings. It only takes a minute:
          </Text>

          <View style={styles.stepsBox}>
            {IOS_VOICE_DOWNLOAD_STEPS.map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumText}>{i + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.modalPrimaryBtn} onPress={onOpenSettings}>
            <Text style={styles.modalPrimaryText}>Open Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.modalSecondaryBtn} onPress={onClose}>
            <Text style={styles.modalSecondaryText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  loadingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 16,
  },
  loadingText: {
    fontSize: 14,
    color: SUBTLE,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    color: SUBTLE,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#F4F6F8",
  },
  refreshText: {
    fontSize: 12,
    fontWeight: "700",
    color: SUBTLE,
  },
  list: {
    gap: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: HAIRLINE,
  },
  rowSelected: {
    backgroundColor: SELECTED_FILL,
    borderColor: BRAND,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4F6F8",
  },
  avatarSelected: {
    backgroundColor: SELECTED_AVATAR,
  },
  flag: {
    fontSize: 24,
  },
  center: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    color: INK,
  },
  subNatural: {
    fontSize: 12.5,
    fontWeight: "600",
    color: GREEN,
  },
  subBasic: {
    fontSize: 12.5,
    color: SUBTLE,
  },
  subMuted: {
    fontSize: 12.5,
    color: SUBTLE,
    opacity: 0.85,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
  },
  radioOn: {
    backgroundColor: BRAND,
    borderColor: BRAND,
  },
  addNaturalBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.18)",
  },
  addNaturalText: {
    fontSize: 14,
    fontWeight: "700",
    color: GREEN,
  },
  footnote: {
    fontSize: 12,
    lineHeight: 17,
    color: SUBTLE,
    opacity: 0.85,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 22,
    gap: 14,
  },
  modalTitle: {
    ...parseTextStyle(theme.typography.Heading4),
    color: INK,
  },
  modalSubtitle: {
    fontSize: 14,
    color: SUBTLE,
  },
  stepsBox: {
    gap: 12,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BRAND,
  },
  stepNumText: {
    fontSize: 12,
    color: "#FFF",
    fontWeight: "700",
  },
  stepText: {
    fontSize: 14,
    color: INK,
    flexShrink: 1,
  },
  modalPrimaryBtn: {
    minHeight: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BRAND,
    marginTop: 4,
  },
  modalPrimaryText: {
    ...parseTextStyle(theme.typography.Button),
    color: "#FFF",
    fontWeight: "600",
  },
  modalSecondaryBtn: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSecondaryText: {
    fontSize: 14,
    color: SUBTLE,
    fontWeight: "600",
  },
});
