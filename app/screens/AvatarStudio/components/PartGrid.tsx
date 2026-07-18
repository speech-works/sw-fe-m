import React from "react";
import { StyleSheet, View } from "react-native";
import { AvatarManifest, AvatarSlot, StageIndex } from "../../../types/avatar";
import {
  EARN_STAGE,
  PART_LABELS,
  STAGE_NAMES,
  isPartEarned,
} from "../../../assets/avatar/registry";
import { UserAvatar } from "../../../components/UserAvatar";
import PressableScale from "../../../components/PressableScale";
import {
  useTheme,
  spacing,
  radius,
  borderWidth,
  Text,
  Icon,
  icons,
} from "../../../design-system";

interface PartGridProps {
  slot: AvatarSlot;
  /** Part ids to offer, in display order. */
  ids: string[];
  draft: AvatarManifest;
  /** The user's stage — gates the earned journey gear. */
  stage: StageIndex;
  onSelect: (id: string | null) => void;
  /** Offer an empty-slot cell (headgear/eyewear/prop; hair too — bald is free). */
  allowNone?: boolean;
}

/**
 * The wardrobe picker for one slot. Each cell previews the CURRENT draft
 * wearing that option, so the user sees the actual outcome, not a catalog
 * thumbnail. Journey gear the user hasn't reached renders locked with its
 * earn hint — visible on purpose: the locked hat IS the level-up pitch.
 */
export const PartGrid: React.FC<PartGridProps> = ({
  slot,
  ids,
  draft,
  stage,
  onSelect,
  allowNone,
}) => {
  const { colors, elevation } = useTheme();
  const selectedId = draft.parts[slot];

  const cell = (id: string | null) => {
    const earned = id === null || isPartEarned(id, stage);
    const selected = selectedId === id;
    const label = id === null ? "None" : PART_LABELS[id] ?? id;
    const earnStage = id !== null ? EARN_STAGE[id] : undefined;

    const preview: AvatarManifest = {
      ...draft,
      parts: { ...draft.parts, [slot]: id },
    };

    return (
      <PressableScale
        key={id ?? "none"}
        onPress={earned ? () => onSelect(id) : undefined}
        accessibilityRole="radio"
        accessibilityState={{ selected, disabled: !earned }}
        accessibilityLabel={
          earned ? label : `${label}, locked. Reach ${STAGE_NAMES[earnStage ?? 0]} to earn it.`
        }
        style={[
          styles.cell,
          { backgroundColor: colors.surface.default },
          elevation.e1,
          selected && {
            borderColor: colors.action.primary,
            borderWidth: borderWidth.thick,
          },
        ]}
      >
        <View style={!earned ? styles.lockedPreview : undefined}>
          <UserAvatar manifest={preview} size={64} />
        </View>
        {!earned && (
          <View style={[styles.lockBadge, { backgroundColor: colors.surface.control }]}>
            <Icon name={icons.locked} size={12} color={colors.text.tertiary} />
          </View>
        )}
        <Text variant="caption" color={earned ? "secondary" : "tertiary"} numberOfLines={1}>
          {label}
        </Text>
        {!earned && earnStage !== undefined && (
          <Text variant="caption" color="tertiary" numberOfLines={1} style={styles.earnHint}>
            {STAGE_NAMES[earnStage]}
          </Text>
        )}
      </PressableScale>
    );
  };

  return (
    <View style={styles.grid}>
      {allowNone ? cell(null) : null}
      {ids.map((id) => cell(id))}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.md,
  },
  cell: {
    width: 96,
    alignItems: "center",
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.input,
    borderWidth: borderWidth.thick,
    borderColor: "transparent",
  },
  lockedPreview: {
    opacity: 0.4,
  },
  lockBadge: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    width: 20,
    height: 20,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  earnHint: {
    marginTop: -spacing.xxs,
  },
});
