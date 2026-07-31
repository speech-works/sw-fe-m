import React from "react";
import { Linking, View } from "react-native";

import PressableScale from "../../../components/PressableScale";
import {
  useTheme,
  radius,
  space,
  size,
  borderWidth,
  Text,
  Icon,
  icons,
  ListItem,
} from "../../../design-system";
import { useNotificationPermissionStore } from "../../../stores/notificationPermission";

// Same three constants ListItem builds its rows from, so this sits on exactly
// the same two vertical lines as every row beneath it.
const CHIP = size.avatarChip; // 48
const PAD_H = space.cardPad; // 16
const GAP = space.iconText; // 12

/**
 * The row above everything else in Settings when the OS has notifications
 * switched off for the app.
 *
 * WHY IT LOOKS LIKE ITS NEIGHBOURS. The first version tinted the whole row and
 * coloured the chip, title, subtitle, chevron and dismiss link. Six emphasised
 * things is zero emphasised things — and a 12% wash over the dark card read as
 * mud rather than as a highlight. Emphasis only works by contrast, so the row
 * now keeps the list's own surface, geometry and type colours, and spends its
 * accent in ONE place: the icon chip, with the title following it. The eye
 * enters at the top-left, finds the one coloured object in a column of neutral
 * ones, and moves on.
 *
 * WHY RED. The dot on the Settings tab is what sends people here, and it is the
 * dock's badge red. Arriving to find a different colour would read as a
 * different subject; one accent carries the whole path. It does mean this row
 * shares red with Log Out and Delete Account further down the screen — the
 * restraint above is what keeps those from reading as the same class of thing.
 *
 * Two states: urgent (this) and, once dismissed, an ordinary ListItem. The
 * difference between them is legible precisely because this one is restrained.
 */
export const NotificationPermissionRow: React.FC<{
  urgent: boolean;
  divider: boolean;
}> = ({ urgent, divider }) => {
  const { colors } = useTheme();
  const snooze = useNotificationPermissionStore((s) => s.snooze);

  const TITLE = "Turn on notifications";
  const SUBTITLE = "You won't get practice reminders until you do";

  // Both states lead to the same place: once the OS has been told no, it cannot
  // be re-asked, so system settings is the only route back.
  const openSettings = () => {
    void Linking.openSettings();
  };

  if (!urgent) {
    return (
      <ListItem
        leftIcon={icons.reminder}
        label={TITLE}
        sublabel={SUBTITLE}
        showChevron
        divider={divider}
        onPress={openSettings}
      />
    );
  }

  return (
    <View style={{ backgroundColor: colors.surface.default }}>
      <PressableScale
        onPress={openSettings}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: GAP,
          minHeight: size.row,
          paddingHorizontal: PAD_H,
          paddingTop: space.cardPad,
          paddingBottom: space.inlineGap,
        }}
        accessibilityLabel={`${TITLE}. ${SUBTITLE}`}
        accessibilityHint="Opens your device settings"
      >
        {/* The one accent object. Identical geometry to a neutral sibling chip —
            same box, same border weight, same glyph size — so it reads as the
            same component wearing a different colour, not as a foreign badge. */}
        <View
          style={{
            width: CHIP,
            height: CHIP,
            borderRadius: radius.md,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.accentTint.danger,
            borderWidth: borderWidth.hairline,
            borderColor: colors.accent.danger,
          }}
        >
          <Icon name={icons.reminder} size={22} color={colors.feedback.dangerText} />
        </View>

        <View style={{ flex: 1 }}>
          <Text variant="title" color={colors.feedback.dangerText}>
            {TITLE}
          </Text>
          {/* Secondary, exactly like every other sublabel. Amber here was what
              flattened the hierarchy — the subtitle is context, not alarm. */}
          <Text variant="bodySm" color="secondary" style={{ marginTop: space.titleSub }}>
            {SUBTITLE}
          </Text>
        </View>

        <Icon name="chevron-right" size={20} color={colors.text.tertiary} />
      </PressableScale>

      {/* Aligned to the text column, and deliberately quiet: this is the lesser
          of the two actions. Underlined amber made it read as a broken link. */}
      <PressableScale
        onPress={snooze}
        style={{
          alignSelf: "flex-start",
          marginLeft: PAD_H + CHIP + GAP,
          // Padded to a ≥44pt target without pushing the row taller than it
          // needs to be — the text itself is only ~18pt.
          paddingTop: space.rowGap,
          paddingBottom: space.cardPad,
          paddingRight: PAD_H,
        }}
        accessibilityLabel="Not now"
        accessibilityHint="Keeps this setting here but stops highlighting it"
      >
        <Text variant="bodySm" color="tertiary">
          Not now
        </Text>
      </PressableScale>

      {divider ? (
        <View
          style={{
            position: "absolute",
            left: PAD_H + CHIP + GAP,
            right: PAD_H,
            bottom: 0,
            height: borderWidth.hairline,
            backgroundColor: colors.border.hairline,
          }}
        />
      ) : null}
    </View>
  );
};

export default NotificationPermissionRow;
