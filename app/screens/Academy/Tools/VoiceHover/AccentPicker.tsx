import React, { useCallback, useState } from "react";
import { useNavigation } from "@react-navigation/native";
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
import FAIcon from "react-native-vector-icons/FontAwesome5";
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
  const navigation = useNavigation();

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
          activeOpacity={0.6}
          hitSlop={8}
          onPress={handleInstall}
        >
          <Text style={styles.addNaturalText}>Add a natural voice</Text>
        </TouchableOpacity>
      )}

      {preference?.accent && (
        <TouchableOpacity
          style={styles.continueBtn}
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.continueText}>Continue</Text>
        </TouchableOpacity>
      )}

      <IosVoiceGuideSheet
        visible={iosSheetVisible}
        onClose={() => setIosSheetVisible(false)}
        onOpenSettings={openIOSSettings}
      />
    </View>
  );
}

const BridgeSVG = ({ color }: { color: string }) => (
  <Svg width={48} height={72} viewBox="0 0 48 72">
    <Path
      d="M 0 8 Q 24 36, 48 8 L 48 64 Q 24 36, 0 64 Z"
      fill={color}
    />
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
    ? "rgba(255,255,255,0.7)"
    : hasNatural
      ? NATURAL_GREEN
      : "rgba(255,255,255,0.5)";

  const playIconColor = isSelected ? "#FFFFFF" : theme.colors.actionPrimary.default;

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
        <View style={styles.pillContent}>
          <Text style={[styles.name, { color: textColor }]} numberOfLines={1}>
            {group.label}
          </Text>
          <Text style={[styles.sub, { color: subColor }]} numberOfLines={1}>
            {subText}
          </Text>
        </View>
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
    height: 72,
    marginBottom: 4,
  },
  bridgeContainer: {
    position: "absolute",
    left: 52,
    width: 48,
    height: 72,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
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
    height: 72,
    borderRadius: 36,
    marginLeft: 8,
    paddingLeft: 24,
    paddingRight: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  pillContent: {
    flex: 1,
    justifyContent: "center",
    gap: 2,
  },
  name: {
    fontSize: 17,
    fontWeight: "700",
  },
  sub: {
    fontSize: 13,
    fontWeight: "500",
  },
  addNaturalText: {
    alignSelf: "center",
    paddingVertical: 6,
    fontSize: 14,
    fontWeight: "600",
    color: NATURAL_GREEN,
  },
  continueBtn: {
    marginTop: 4,
    height: 56,
    borderRadius: 28,
    backgroundColor: DARK_SELECTED,
    alignItems: "center",
    justifyContent: "center",
  },
  continueText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    backgroundColor: DARK_UNSELECTED,
    borderRadius: 36,
    padding: 32,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 8,
  },
  stepsBox: {
    gap: 16,
    backgroundColor: "rgba(0,0,0,0.2)",
    padding: 20,
    borderRadius: 24,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: DARK_SELECTED,
  },
  stepNumText: {
    fontSize: 13,
    color: TEXT_SELECTED,
    fontWeight: "800",
  },
  stepText: {
    fontSize: 15,
    color: "#FFFFFF",
    flexShrink: 1,
    lineHeight: 22,
    fontWeight: "500",
    paddingTop: 3,
  },
  modalPrimaryBtn: {
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: DARK_SELECTED,
    marginTop: 8,
  },
  modalPrimaryText: {
    fontSize: 17,
    fontWeight: "700",
    color: TEXT_SELECTED,
  },
  modalSecondaryBtn: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSecondaryText: {
    fontSize: 15,
    color: "rgba(255,255,255,0.5)",
    fontWeight: "600",
  },
});
