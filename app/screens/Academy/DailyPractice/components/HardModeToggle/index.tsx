import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { useNavigation } from "@react-navigation/native";
import PressableScale from "../../../../../components/PressableScale";
import {
  useTheme,
  radius,
  spacing,
  borderWidth,
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
}

const HardModeToggle: React.FC<HardModeToggleProps> = ({
  value,
  onValueChange,
  style,
  canUseHardMode = true,
}) => {
  const { colors } = useTheme();
  const [showGate, setShowGate] = React.useState(false);
  const navigation = useNavigation<any>();

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
            backgroundColor: value ? colors.action.primaryTint : colors.surface.default,
            borderColor: value ? colors.border.selected : colors.border.default,
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
              color={value ? colors.action.primary : colors.text.tertiary}
            />
            <Text variant="title" color={value ? colors.action.primary : colors.text.primary}>
              Hard Mode
            </Text>
          </View>
          <Text variant="bodySm" color="secondary">
            Intensify your practice by focusing exclusively on your feared sounds.
          </Text>
        </View>
        {/* Display-only switch — the whole card owns the tap (handlePress). */}
        <Toggle value={value} />
      </PressableScale>

      <Dialog
        visible={showGate}
        onClose={() => setShowGate(false)}
        title="Action required"
        message="Add feared sounds in Settings to use Hard Mode."
        confirmLabel="Go to Settings"
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
