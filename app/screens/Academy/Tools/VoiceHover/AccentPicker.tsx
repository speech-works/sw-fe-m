import React, { useCallback } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { useVoicePreference } from "../../../../hooks/useVoicePreference";
import {
  launchAndroidVoiceInstall,
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

export function AccentPicker() {
  const { groups, loading, preference, selectAccent, refresh } =
    useVoicePreference();

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
      // Intentionally stripped for simplicity as per design request focusing on list
    }
  }, [refresh]);

  if (loading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="small" color={DARK_SELECTED} />
      </View>
    );
  }

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
      <TouchableOpacity style={styles.continueBtn} activeOpacity={0.8}>
        <Text style={styles.continueText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
}

const BridgeSVG = ({ color }: { color: string }) => (
  <Svg width={48} height={64} viewBox="0 0 48 64">
    <Path
      d="M 0 7 Q 24 33, 48 7 L 48 57 Q 24 31, 0 57 Z"
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
  const bgColor = isSelected ? DARK_SELECTED : DARK_UNSELECTED;
  const textColor = isSelected ? TEXT_SELECTED : TEXT_UNSELECTED;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={styles.row}
    >
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
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  loadingBox: {
    paddingVertical: 32,
    alignItems: 'center',
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
    position: 'absolute',
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
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  name: {
    fontSize: 18,
    fontWeight: "600",
  },
  continueBtn: {
    marginTop: 16,
    height: 56,
    borderRadius: 28,
    backgroundColor: DARK_SELECTED,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  }
});
