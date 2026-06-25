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
import Svg, { Path } from "react-native-svg";
import { useVoicePreference } from "../../../../hooks/useVoicePreference";
import {
  IOS_VOICE_DOWNLOAD_STEPS,
  launchAndroidVoiceInstall,
  openIOSSettings,
  speakWithProfile,
  stopSpeaking,
} from "../../../../util/voice";
import type { AccentGroup } from "../../../../util/voice/types";
import { theme } from "../../../../Theme/tokens";

const PREVIEW_LINE = "This is how your reading guide will sound.";

const DARK_UNSELECTED = "#2A2A2A";
const DARK_SELECTED = theme.colors.actionPrimary.default;
const TEXT_SELECTED = "#FFFFFF"; // Changed to white as it usually looks better on orange
const TEXT_UNSELECTED = "#FFFFFF";
const NATURAL_GREEN = "#5BD98A";
const MUTED = "#9CA3AF";

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
      // Re-enumerate on return so a freshly installed voice shows up.
      if (launched) setTimeout(refresh, 500);
    } else {
      // iOS can't download voices programmatically — show the guided steps.
      setIosSheetVisible(true);
    }
  }, [refresh]);

  if (loading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="small" color={DARK_SELECTED} />
      </View>
    );
  }

  // True when at least one accent only has a robotic (basic) voice installed,
  // i.e. the user could upgrade to a natural one.
  const anyBasicOnly = groups.some((g) => g.isAvailable && !g.hasNatural);

  return (
    <View style={styles.container}>
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
        <TouchableOpacity
          style={styles.addNaturalBtn}
          activeOpacity={0.8}
          onPress={handleInstall}
        >
          <Text style={styles.addNaturalSpark}>✨</Text>
          <Text style={styles.addNaturalText}>Add a natural voice</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.continueBtn} activeOpacity={0.8}>
        <Text style={styles.continueText}>Continue</Text>
      </TouchableOpacity>

      <IosVoiceGuideSheet
        visible={iosSheetVisible}
        onClose={() => setIosSheetVisible(false)}
        onOpenSettings={openIOSSettings}
      />
    </View>
  );
}

const BridgeSVG = ({ color }: { color: string }) => (
  <Svg width={48} height={64} viewBox="0 0 48 64">
    <Path d="M 0 7 Q 24 33, 48 7 L 48 57 Q 24 31, 0 57 Z" fill={color} />
  </Svg>
);

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
  const bgColor = isSelected ? DARK_SELECTED : DARK_UNSELECTED;
  const textColor = isSelected ? TEXT_SELECTED : TEXT_UNSELECTED;

  // Quality / availability signal — the "non-robotic" cue.
  const subText = !isAvailable
    ? "Not installed · tap to add"
    : hasNatural
      ? "Natural voice"
      : "Basic voice";
  const subColor = isSelected
    ? "rgba(255,255,255,0.9)"
    : hasNatural
      ? NATURAL_GREEN
      : MUTED;

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.row}>
      <View style={[styles.bridgeContainer, { zIndex: 1 }]}>
        <BridgeSVG color={bgColor} />
      </View>

      <View style={[styles.avatar, { backgroundColor: bgColor, zIndex: 2 }]}>
        <View style={styles.avatarInner}>
          <Text style={styles.flag}>{group.flag}</Text>
        </View>
      </View>

      <View style={[styles.pill, { backgroundColor: bgColor, zIndex: 2 }]}>
        <Text style={[styles.name, { color: textColor }]} numberOfLines={1}>
          {group.label}
        </Text>
        <Text style={[styles.sub, { color: subColor }]} numberOfLines={1}>
          {subText}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

/** iOS-only guided walkthrough for downloading a natural voice (dark themed). */
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
            iOS downloads natural voices in Settings. It only takes a minute:
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

          <TouchableOpacity
            style={styles.modalPrimaryBtn}
            onPress={onOpenSettings}
          >
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
    gap: 16,
  },
  loadingBox: {
    paddingVertical: 32,
    alignItems: "center",
  },
  list: {
    gap: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    height: 64,
  },
  bridgeContainer: {
    position: "absolute",
    left: 44,
    width: 48,
    height: 64,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  flag: {
    fontSize: 32,
    lineHeight: 38,
  },
  pill: {
    flex: 1,
    height: 64,
    borderRadius: 32,
    marginLeft: 8,
    paddingHorizontal: 24,
    justifyContent: "center",
    gap: 2,
  },
  name: {
    fontSize: 18,
    fontWeight: "600",
  },
  sub: {
    fontSize: 12.5,
    fontWeight: "600",
  },
  addNaturalBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#1E2A24",
    borderWidth: 1,
    borderColor: "rgba(91, 217, 138, 0.35)",
  },
  addNaturalSpark: {
    fontSize: 14,
  },
  addNaturalText: {
    fontSize: 15,
    fontWeight: "700",
    color: NATURAL_GREEN,
  },
  continueBtn: {
    marginTop: 16,
    height: 56,
    borderRadius: 28,
    backgroundColor: DARK_SELECTED,
    alignItems: "center",
    justifyContent: "center",
  },
  continueText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000000",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#1C1C1E",
    borderRadius: 24,
    padding: 22,
    gap: 14,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalSubtitle: {
    fontSize: 14,
    color: MUTED,
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
    backgroundColor: DARK_SELECTED,
  },
  stepNumText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  stepText: {
    fontSize: 14,
    color: "#E5E7EB",
    flexShrink: 1,
  },
  modalPrimaryBtn: {
    minHeight: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: DARK_SELECTED,
    marginTop: 4,
  },
  modalPrimaryText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000000",
  },
  modalSecondaryBtn: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSecondaryText: {
    fontSize: 14,
    color: MUTED,
    fontWeight: "600",
  },
});
