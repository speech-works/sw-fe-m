import React, { useCallback, useState, useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useVoicePreference } from "../../../../hooks/useVoicePreference";
import {
  IOS_VOICE_DOWNLOAD_STEPS,
  launchAndroidVoiceInstall,
  openIOSSettings,
  speakWithProfile,
  stopSpeaking,
} from "../../../../util/voice";
import type { AccentGroup } from "../../../../util/voice/types";
import { PopCard } from "../../../../components/PopCard";
import { useTheme, spacing, ConnectedAvatarRow, Button, Spinner } from "../../../../design-system";

const PREVIEW_LINE = "This is how your reading guide will sound.";

// iOS guide sheet only — a green accent surface on PopCard. PopCard + this sheet
// are a separate (deferred) migration; these two literals stay scoped to it.
const GUIDE_GREEN = "#5BD98A";
const GUIDE_DARK = "#2A2A2A";

export function AccentPicker() {
  const { colors } = useTheme();
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

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      if (!iosSheetVisible) {
        return;
      }

      // Prevent default behavior of leaving the screen
      e.preventDefault();

      // Close the modal instead
      setIosSheetVisible(false);
    });

    return unsubscribe;
  }, [navigation, iosSheetVisible]);

  if (loading) {
    return (
      <View style={styles.loadingBox}>
        <Spinner size="small" />
      </View>
    );
  }

  // True when at least one accent only has a robotic (basic) voice installed,
  // i.e. the user could upgrade to a natural one.
  const anyBasicOnly = groups.some((g) => g.isAvailable && !g.hasNatural);

  return (
    <View style={styles.container}>
      <View style={styles.list}>
        {groups.map((group) => {
          const subText = !group.isAvailable
            ? "Not installed · tap to add"
            : group.hasNatural
              ? "Natural voice"
              : "Basic voice";
          // Natural voices get the green "non-robotic" cue (legible on the dark
          // row); selected rows render their own dark-on-orange subtitle.
          const subtitleColor =
            group.isAvailable && group.hasNatural
              ? colors.feedback.successText
              : colors.text.tertiary;
          return (
            <ConnectedAvatarRow
              key={group.locale}
              glyph={group.flag}
              title={group.label}
              subtitle={subText}
              subtitleColor={subtitleColor}
              selected={preference?.accent === group.locale}
              onPress={() =>
                group.isAvailable ? selectAndPreview(group) : handleInstall()
              }
            />
          );
        })}
      </View>

      {anyBasicOnly && (
        <TouchableOpacity
          activeOpacity={0.6}
          hitSlop={8}
          onPress={handleInstall}
        >
          <Text style={[styles.addNaturalText, { color: colors.feedback.successText }]}>
            Add a natural voice
          </Text>
        </TouchableOpacity>
      )}

      {preference?.accent && (
        <Button label="Continue" onPress={() => navigation.goBack()} />
      )}

      <IosVoiceGuideSheet
        visible={iosSheetVisible}
        onClose={() => setIosSheetVisible(false)}
        onOpenSettings={openIOSSettings}
      />
    </View>
  );
}

/** iOS-only guided walkthrough for downloading a natural voice (green sheet). */
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
    <PopCard visible={visible} onClose={onClose} color={GUIDE_GREEN}>
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
    </PopCard>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  loadingBox: {
    paddingVertical: spacing["3xl"],
    alignItems: "center",
  },
  list: {
    gap: spacing.lg,
  },
  addNaturalText: {
    alignSelf: "center",
    paddingVertical: 6,
    fontSize: 14,
    fontWeight: "600",
  },

  // --- iOS guide sheet (deferred migration; green accent surface) ---
  modalTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#121212",
    textAlign: "center",
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 16,
    color: "rgba(0,0,0,0.65)",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 16,
  },
  stepsBox: {
    gap: 20,
    backgroundColor: "rgba(0,0,0,0.15)",
    padding: 24,
    borderRadius: 36,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
  },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GUIDE_DARK,
  },
  stepNumText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  stepText: {
    fontSize: 16,
    color: "#121212",
    flexShrink: 1,
    lineHeight: 24,
    fontWeight: "600",
    paddingTop: 2,
  },
  modalPrimaryBtn: {
    height: 56,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GUIDE_DARK,
    marginTop: 16,
  },
  modalPrimaryText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalSecondaryBtn: {
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSecondaryText: {
    fontSize: 16,
    color: GUIDE_DARK,
    fontWeight: "700",
  },
});
