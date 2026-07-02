import { useNavigation } from "@react-navigation/native";
import React, { useState } from "react";
import { View } from "react-native";

import PressableScale from "../../../../../../components/PressableScale";
import {
  Dialog,
  Text,
  makeStyles,
  radius,
  spacing,
  useTheme,
} from "../../../../../../design-system";

export interface FocusConfig {
  /** Hard mode on. */
  active: boolean;
  /** The user has at least one feared sound configured. */
  canUse: boolean;
  onToggle: (next: boolean) => void;
}

/**
 * Reading-practice "hard mode", reframed. Hard mode filters the set to words that
 * contain the user's feared sounds — one deliberate, LABELLED tap that engages focus
 * and re-fetches (the backend only knows a single `hardMode` boolean; per-sound picking
 * would swap the word on every tap). Rendered as a SOLID pill inside the fixed control
 * deck above the dock, so it's thumb-reachable, never translucent, and never overlaps or
 * shifts the reading text. No feared sounds set → routes to Settings › Difficult Sounds.
 */
export function FocusControl({ active, canUse, onToggle }: FocusConfig) {
  const { colors } = useTheme();
  const styles = useStyles();
  const navigation = useNavigation<any>();
  const [gateVisible, setGateVisible] = useState(false);

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
        style={[
          styles.pill,
          {
            // Always a SOLID surface (never the translucent tint) so text can't bleed
            // through; the accent lives in the border + dot + label.
            backgroundColor: colors.surface.elevated,
            borderColor: active ? colors.accent.info : colors.border.strong,
          },
        ]}
      >
        <View
          style={[
            styles.dot,
            { backgroundColor: active ? colors.accent.info : colors.text.tertiary },
          ]}
        />
        {/* Constant label (never "Focus"→"Focusing") so the pill can't change width and
            shift on toggle; state shows via the blue dot/border, the wash, and the eyebrow
            "FOCUS · YOUR SOUNDS". Short so focus + page-nav + Next fit one deck row. */}
        <Text
          variant="label"
          color={active ? colors.accent.info : "secondary"}
          numberOfLines={1}
        >
          Focus
        </Text>
      </PressableScale>

      <Dialog
        visible={gateVisible}
        onClose={() => setGateVisible(false)}
        title="Add your sounds first"
        message="Choose the sounds you find difficult in Settings, then focus mode practises words that contain them."
        confirmLabel="Go to Settings"
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
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    height: 40,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
}));
