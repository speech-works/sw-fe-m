import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { AvatarManifest, AvatarSlot } from "../../../types/avatar";
import { PART_LABELS } from "../../../assets/avatar/registry";
import { UserAvatar } from "../../../components/UserAvatar";
import PressableScale from "../../../components/PressableScale";
import {
  useTheme,
  spacing,
  radius,
  borderWidth,
  Text,
} from "../../../design-system";

interface PartGridProps {
  slot: AvatarSlot;
  /** Part ids to offer, in the kit's order. */
  ids: string[];
  draft: AvatarManifest;
  onSelect: (id: string | null) => void;
  /** Offer an empty-slot cell (hair, beard, headgear, eyewear). */
  allowNone?: boolean;
}

/**
 * The wardrobe picker for one slot. Each cell previews the CURRENT draft
 * wearing that option, so the user sees the actual outcome, not a catalog
 * thumbnail. Every part is free to wear.
 */
export const PartGrid: React.FC<PartGridProps> = ({
  slot,
  ids,
  draft,
  onSelect,
  allowNone,
}) => {
  const { colors, elevation } = useTheme();
  const selectedId = draft.parts[slot];

  /**
   * One preview manifest per cell, built once. Every cell draws a still
   * `UserAvatar`, which is memoised; rebuilding the manifests in the render
   * loop would change their identity every pass and the memo would never hit.
   * `ids` is keyed on its contents, not its identity, for the same reason.
   */
  const ordered = useMemo(
    () => [...ids],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ids.join(",")],
  );

  const previews = useMemo(() => {
    const map = new Map<string | null, AvatarManifest>();
    const all: (string | null)[] = allowNone ? [null, ...ordered] : [...ordered];
    all.forEach((id) => {
      map.set(id, { ...draft, parts: { ...draft.parts, [slot]: id } });
    });
    return map;
  }, [draft, slot, allowNone, ordered]);

  const cell = (id: string | null) => {
    const selected = selectedId === id;
    const label = id === null ? "None" : PART_LABELS[id] ?? id;
    const preview = previews.get(id) as AvatarManifest;

    return (
      <PressableScale
        key={id ?? "none"}
        onPress={() => onSelect(id)}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        accessibilityLabel={label}
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
        <UserAvatar manifest={preview} size={72} />
        {/* Two lines, not one. A 96pt cell minus its padding leaves ~80pt for
            text; a part whose name is cut in half is a part the user cannot
            identify (partLabels.test.ts keeps the names short). */}
        <Text variant="caption" color="secondary" numberOfLines={2} center>
          {label}
        </Text>
      </PressableScale>
    );
  };

  return (
    <View style={styles.grid}>
      {allowNone ? cell(null) : null}
      {ordered.map((id) => cell(id))}
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
    // Narrower side gutters than top/bottom, to buy the LABEL room. The old
    // even padding left ~64pt for text, which broke "Headphones" mid-word —
    // and character budgets cannot predict that, since "Deerstalker" is longer
    // and fits. 80pt takes the whole catalog with margin, and the 72pt preview
    // still clears the gutters.
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.input,
    borderWidth: borderWidth.thick,
    borderColor: "transparent",
  },
});
