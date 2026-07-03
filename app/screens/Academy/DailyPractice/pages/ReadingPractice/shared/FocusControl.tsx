import { useNavigation } from "@react-navigation/native";
import React, { useState } from "react";

import PressableScale from "../../../../../../components/PressableScale";
import {
  Dialog,
  Icon,
  FLOATING_CONTROL_SIZE,
  floatingControlSurface,
  makeStyles,
  onColor,
  useTheme,
} from "../../../../../../design-system";

export interface FocusConfig {
  /** Hard mode on. */
  active: boolean;
  /** The user has at least one feared sound configured. */
  canUse: boolean;
  onToggle: (next: boolean) => void;
  accentColor?: string;
}

/**
 * Reading-practice "hard mode", reframed. Hard mode filters the set to words that
 * contain the user's feared sounds — one deliberate tap that engages focus and
 * re-fetches (the backend only knows a single `hardMode` boolean; per-sound picking
 * would swap the word on every tap). Rendered as a FAB in the reading control stack
 * (`FloatingControls`): a solid target button that fills with the accent when active,
 * so state is obvious and it never overlaps the reading text. No feared sounds set →
 * routes to Settings › Difficult Sounds.
 */
export function FocusControl({
  active,
  canUse,
  onToggle,
  accentColor,
}: FocusConfig) {
  const { colors } = useTheme();
  const styles = useStyles();
  const navigation = useNavigation<any>();
  const [gateVisible, setGateVisible] = useState(false);
  const accent = accentColor ?? colors.accent.info;
  const onAccent = onColor(accent, colors);

  const onPress = () => {
    if (!canUse) {
      setGateVisible(true);
      return;
    }
    onToggle(!active);
  };

  return (
    <>
      <PressableScale
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        accessibilityLabel={active ? "Focus on your sounds, on" : "Focus on your sounds"}
        style={[
          styles.fab,
          {
            // Active fills with the accent (state is obvious); inactive is a quiet
            // surface with an accent icon — matching the other floating controls.
            backgroundColor: active ? accent : colors.surface.elevated,
            shadowColor: colors.shadow,
          },
        ]}
      >
        <Icon name="target" size={22} color={active ? onAccent : accent} />
      </PressableScale>

      <Dialog
        visible={gateVisible}
        onClose={() => setGateVisible(false)}
        title="Add your sounds first"
        message="Choose the sounds you find difficult in Settings, then focus mode practises words that contain them."
        confirmLabel="Go to Settings"
        accentColor={accent}
        onAccentColor={onAccent}
        onConfirm={() => {
          setGateVisible(false);
          navigation.navigate("Root", {
            screen: "SETTINGS",
            params: { screen: "FearedSounds" },
          });
        }}
        cancelLabel="Not now"
      />
    </>
  );
}

const useStyles = makeStyles(() => ({
  fab: {
    ...floatingControlSurface,
    height: FLOATING_CONTROL_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
}));
