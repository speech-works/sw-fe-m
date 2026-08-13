import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { AvatarManifest, AvatarSlot } from "../../../types/avatar";
import {
  PART_LABELS,
  isPartUnlocked,
  partUnlockLevel,
} from "../../../assets/avatar/registry";
import { UserAvatar } from "../../../components/UserAvatar";
import PressableScale from "../../../components/PressableScale";
import {
  size,
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
  /** Part ids to offer. Sorted here: unlocked first, then by level. */
  ids: string[];
  draft: AvatarManifest;
  /** The user's level. One number gates the whole catalog. */
  level: number;
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
  level,
  onSelect,
  allowNone,
}) => {
  const { colors, elevation } = useTheme();
  const selectedId = draft.parts[slot];

  /**
   * One preview manifest per cell, built once.
   *
   * Every cell renders a full `UserAvatar` SVG, and `UserAvatar` is memoised —
   * but the manifest used to be rebuilt inside the render loop, so its identity
   * changed every pass and the memo never once hit. The whole grid redrew on
   * any parent re-render.
   *
   * That was survivable when a preview was a head and a hat. It is not now:
   * this screen offers a hundred parts, and a backdrop preview alone is ~50
   * tiled motifs. `ids` arrives as an inline literal from the screen, so it is
   * a new array every render — hence keying on its contents rather than its
   * identity, which would defeat the memo just as thoroughly.
   */
  /**
   * Wearable first, then the locked ones in the order they unlock.
   *
   * The catalog order is authoring order, which puts a level-45 crown next to a
   * free beanie. Sorting by reachability makes the tab open on what you can use
   * and turns the tail into a visible ladder — the locked row IS the pitch, so
   * it stays on screen rather than being hidden.
   */
  const ordered = useMemo(
    () =>
      [...ids].sort((a, b) => {
        const la = partUnlockLevel(a);
        const lb = partUnlockLevel(b);
        const ua = la <= level ? 0 : 1;
        const ub = lb <= level ? 0 : 1;
        if (ua !== ub) return ua - ub;
        // Within a group keep authoring order for unlocked parts, and ascending
        // level for locked ones.
        return ua === 0 ? ids.indexOf(a) - ids.indexOf(b) : la - lb;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ids.join(","), level],
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
    const earned = id === null || isPartUnlocked(id, level);
    const selected = selectedId === id;
    const label = id === null ? "None" : PART_LABELS[id] ?? id;
    const needs = id !== null && !earned ? partUnlockLevel(id) : undefined;

    const preview = previews.get(id) as AvatarManifest;

    return (
      <PressableScale
        key={id ?? "none"}
        onPress={earned ? () => onSelect(id) : undefined}
        // A locked cell used to keep its haptic and press-spring because only
        // the handler was dropped — it felt broken rather than locked.
        disabled={!earned}
        accessibilityRole="radio"
        accessibilityState={{ selected, disabled: !earned }}
        accessibilityLabel={
          earned ? label : `${label}, locked. Reach level ${needs} to unlock.`
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
            <Icon name={icons.locked} size={size.iconXs} color={colors.text.tertiary} />
          </View>
        )}
        {/* Two lines, not one. A 96pt cell minus its padding leaves ~64pt for
            text, which "Wavy bands" already overflows and "Graduation cap"
            would bury — and a part whose name is cut in half is a part the user
            cannot identify. Wrapping costs a few points of row height; the row
            stretches to its tallest cell, so the grid stays even. */}
        <Text
          variant="caption"
          color={earned ? "secondary" : "tertiary"}
          numberOfLines={2}
          center
        >
          {label}
        </Text>
        {!earned && needs !== undefined && (
          <Text variant="caption" color="tertiary" numberOfLines={1} style={styles.earnHint}>
            {`Level ${needs}`}
          </Text>
        )}
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
    // and fits. 80pt takes the whole catalog with margin, and the 64pt preview
    // still clears the gutters.
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
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
