import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { useNavigation } from "@react-navigation/native";
import PressableScale from "../../../../../components/PressableScale";
import {
  useTheme,
  radius,
  spacing,
  borderWidth,
  SemanticColors,
  Text,
  Icon,
  icons,
  Toggle,
  Dialog,
} from "../../../../../design-system";

interface HardModeToggleProps {
  value: boolean;
  onValueChange: (val: boolean) => void;
  style?: ViewStyle;
  canUseHardMode?: boolean;
  accent?: keyof SemanticColors["accent"];
}

const HardModeToggle: React.FC<HardModeToggleProps> = ({
  value,
  onValueChange,
  style,
  canUseHardMode = true,
  accent,
}) => {
  const { colors } = useTheme();
  const [showGate, setShowGate] = React.useState(false);
  const navigation = useNavigation<any>();
  const accentColor = accent ? colors.accent[accent] : colors.action.primary;
  const onAccentColor = accent ? colors.accentOn[accent] : colors.action.onPrimary;
  const accentTint = accent ? colors.accentTint[accent] : colors.action.primaryTint;

  const handlePress = () => {
    if (!value && !canUseHardMode) {
      setShowGate(true);
      return;
    }
    onValueChange(!value);
  };

  return (
    <>
      <PressableScale
        scaleTo={0.98}
        onPress={handlePress}
        style={[
          styles.card,
          {
            backgroundColor: value ? accentTint : colors.surface.default,
            borderColor: value ? accentColor : colors.border.default,
          },
          style,
        ]}
      >
        <View style={styles.textBody}>
          <View style={styles.titleRow}>
            {/* Flame = intensity; lights up orange when Hard Mode is on. */}
            <Icon
              name={icons.streak}
              size={16}
              color={value ? accentColor : colors.text.tertiary}
            />
            <Text variant="title" color={value ? accentColor : colors.text.primary}>
              Hard Mode
            </Text>
          </View>
          <Text variant="bodySm" color="secondary">
            Intensify your practice by focusing exclusively on your feared sounds.
          </Text>
        </View>
        {/* Display-only switch — the whole card owns the tap (handlePress). */}
        <Toggle value={value} activeColor={accentColor} />
      </PressableScale>

      <Dialog
        visible={showGate}
        onClose={() => setShowGate(false)}
        title="Action required"
        message="Add feared sounds in Settings to use Hard Mode."
        confirmLabel="Go to Settings"
        accentColor={accentColor}
        onAccentColor={onAccentColor}
        onConfirm={() => {
          setShowGate(false);
          navigation.navigate("Root", {
            screen: "SETTINGS",
            params: { screen: "FearedSounds" },
          });
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.lg,
    padding: spacing.xl,
    borderRadius: radius.card,
    borderWidth: borderWidth.thin,
  },
  textBody: {
    flex: 1,
    gap: spacing.xs,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
});

export default HardModeToggle;
