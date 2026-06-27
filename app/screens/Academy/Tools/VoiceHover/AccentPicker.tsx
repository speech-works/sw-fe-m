import React, { useCallback, useState, useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import { Platform, StyleSheet, TouchableOpacity, View } from "react-native";
import { useVoicePreference } from "../../../../hooks/useVoicePreference";
import {
  IOS_VOICE_DOWNLOAD_STEPS,
  launchAndroidVoiceInstall,
  openIOSSettings,
  speakWithProfile,
  stopSpeaking,
} from "../../../../util/voice";
import type { AccentGroup } from "../../../../util/voice/types";
import {
  useTheme,
  spacing,
  radius,
  size,
  ConnectedAvatarRow,
  Button,
  Sheet,
  Text,
  Spinner,
} from "../../../../design-system";

const PREVIEW_LINE = "This is how your reading guide will sound.";

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
          style={styles.addNatural}
        >
          <Text variant="bodySm" color={colors.feedback.successText}>
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
  const { colors } = useTheme();
  return (
    <Sheet visible={visible} onClose={onClose} color={colors.accent.success}>
      <Text variant="h2" center color={colors.accentOn.success} style={styles.modalTitle}>
        Add a natural voice
      </Text>
      <Text
        variant="body"
        center
        color={colors.accentOn.success}
        style={styles.modalSubtitle}
      >
        iOS downloads natural voices in Settings. It only takes a minute:
      </Text>

      <View style={[styles.stepsBox, { backgroundColor: colors.surface.elevated }]}>
        {IOS_VOICE_DOWNLOAD_STEPS.map((step, i) => (
          <View key={i} style={styles.stepRow}>
            <View style={[styles.stepNum, { backgroundColor: colors.surface.control }]}>
              <Text variant="caption" color={colors.text.primary}>
                {i + 1}
              </Text>
            </View>
            <Text variant="body" color={colors.text.primary} style={styles.stepText}>
              {step}
            </Text>
          </View>
        ))}
      </View>

      <Button
        label="Open Settings"
        variant="secondary"
        onPress={onOpenSettings}
        style={styles.modalPrimaryBtn}
      />
      <TouchableOpacity style={styles.modalSecondaryBtn} onPress={onClose}>
        <Text variant="body" color={colors.accentOn.success}>
          Done
        </Text>
      </TouchableOpacity>
    </Sheet>
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
  addNatural: {
    alignSelf: "center",
    paddingVertical: spacing.xs,
  },

  // --- iOS guide sheet (green accent surface) ---
  modalTitle: {
    marginBottom: spacing.sm,
  },
  modalSubtitle: {
    marginBottom: spacing.lg,
  },
  stepsBox: {
    gap: spacing.xl,
    padding: spacing["2xl"],
    borderRadius: radius.card,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.lg,
  },
  stepNum: {
    width: size.iconLg,
    height: size.iconLg,
    borderRadius: size.iconLg / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: {
    flexShrink: 1,
    paddingTop: 2,
  },
  modalPrimaryBtn: {
    marginTop: spacing.lg,
  },
  modalSecondaryBtn: {
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
  },
});
