import { useNavigation } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import PressableScale from "../../../../../components/PressableScale";
import {
  Text,
  Icon,
  useTheme,
  spacing,
  space,
  radius,
  fonts,
  mix,
} from "../../../../../design-system";
import type {
  HomePriorityCard,
  HomePriorityCardAction,
  NextCardPreview,
} from "../../../../../api/homeCards";
import { runIntent } from "./intents";
import { safeIcon } from "./safeIcon";
import { backPath, FACE_TOP } from "./folderPath";
import { resolveAccent } from "./accent";
import { Pages } from "./Pages";
import { PriorityCardModal } from "./PriorityCardModal";

/**
 * ============================================================================
 * THE HOME PRIORITY CARD
 * ----------------------------------------------------------------------------
 * Occupies the LEFT slot of the identity row, the one the Level card owns when
 * there is nothing to say. The avatar card beside it is never touched.
 *
 * ── THE BUDGET, WHICH IS THE WHOLE DESIGN CONSTRAINT ────────────────────────
 * The slot is `flex: 1` beside another card, inside a 16pt gutter with a 16pt
 * gap. On the narrowest supported phone that is 163.5pt wide, and after padding
 * about 131pt of CONTENT width. `minHeight` is 138.
 *
 * `minHeight` is a MINIMUM, not a height: whichever card in the row is tallest
 * sets the row, and that pushes the Programs card further down the page. So
 * growing past 138 costs fold space on the screen that sells. Nothing here may
 * grow the row.
 *
 * An earlier card in this exact slot shipped with an eyebrow, a two-line hero, a
 * labelled dot row AND a footer with a pill button, and truncated mid-word on
 * every phone narrower than a Pro Max. That is why the budget below is only:
 *
 *     label   one line, eyebrow
 *     line1   one line, hero, never wrapped
 *     line2   up to two lines, caption
 *
 * and why there is NO CTA BUTTON. The whole card is the tap target, so a button
 * inside it would say "pressable" a second time and cost the ~30pt that made
 * every earlier attempt cramped.
 *
 * ── THE TWO SHAPES ──────────────────────────────────────────────────────────
 *   nothing queued  -> the Level card renders instead (IdentityBlock decides)
 *   one card        -> a plain card, identical to its neighbour's chrome
 *   more queued     -> a FOLDER, with a miniature of the next one peeking out
 *
 * The folder is only drawn when there is genuinely something behind it. A folder
 * with nothing in it is a decoration that lies, and this slot is the one place
 * on Home where the user should be able to trust that a shape means something.
 *
 * ── HOW THE FOLDER IS ASSEMBLED, AND WHY IT IS NOT ALL SVG ──────────────────
 * The back panel is one SVG path because the tab needs a real curve. The front
 * face is a plain rounded View, because it is a plain rounded rectangle and a
 * View can carry the scheme-aware shadow that an SVG path cannot. The peek sits
 * between the two, which is the only place "in the folder" can mean anything.
 *
 * Three attempts before this one failed the same way: the tab was drawn as its
 * own view, in its own surface colour, with a cut corner, and it read as a
 * rendering glitch. A folder is ONE material at two depths. `surface.control`
 * behind `surface.elevated` is that step, and it steps the correct way in both
 * schemes on its own — deeper on paper, lighter on ink.
 * ============================================================================
 */

export interface PriorityCardProps {
  card: HomePriorityCard;
  /**
   * The cards queued behind this one. Their presence, not a count, is what turns
   * the card into a folder: the pages need something to draw.
   */
  queued?: NextCardPreview[];
  onAcknowledge: (reason: "tapped" | "skipped") => void;
}

/**
 * How far the folder sits INSIDE the 138pt box when it is holding pages.
 *
 * The pages need to rise higher than the tab, and the row's height is not
 * available: whichever card in the row is tallest sets it, and growing it pushes
 * the Programs card down the page. So the folder gets shorter instead. The row
 * never moves; the folder's own front face loses 12pt, which is why `line2` is
 * held to one line in this mode.
 */
const FOLDER_DROP = 12;

const PriorityCard: React.FC<PriorityCardProps> = ({
  card,
  queued,
  onAcknowledge,
}) => {
  const navigation = useNavigation<any>();
  const { colors, elevation, scheme } = useTheme();
  const isDark = scheme === "dark";

  /**
   * ── THE FOLDER'S TWO MATERIALS ────────────────────────────────────────────
   * The first version used `surface.control` behind `surface.elevated`, which is
   * the right IDEA (one material at two depths) and, on the dark scheme, not
   * enough of it. Those two land about 1.2:1 apart, and at that distance the
   * front face and the back panel read as one smudged shape rather than as two
   * planes. The neutral ink ramp simply has no more room at that end.
   *
   * So the back panel is mixed twice, and the order is the point.
   *
   * FIRST toward `surface.contrast`, which is the near-white panel on ink and
   * the near-black one on paper. That is a pure DEPTH step and it is correctly
   * signed in both schemes on its own: it lifts the back panel on ink, where
   * further back means lighter, and recesses it on paper, where it means darker.
   *
   * THEN a small wash of the primary, for WARMTH. A single heavy wash of the
   * primary was tried first and read as chocolate rather than as manila: at the
   * amount needed to separate, the chroma arrives long before the lightness
   * does. Lightness does the separating; the warmth only says "folder".
   */
  const backPanel = mix(
    mix(colors.surface.control, colors.surface.contrast, isDark ? 0.17 : 0.06),
    colors.action.primary,
    0.06,
  );

  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const iconName = safeIcon(card.icon);
  /**
   * The card's own accent, resolved from the console's key.
   *
   * The eyebrow, the icon housing and the glyph ALL take it, so the card and the
   * sheet it opens are the same object. They used to be hardcoded to the brand
   * orange, which meant a lime card opened a lime sheet from an orange card and
   * the identity appeared only after the tap.
   *
   * NOT the folder's back panel, which keeps its brand-warmed manila. That is
   * the container, not the message: making it shift per card would mean the
   * folder itself changes material depending on what happens to be inside it.
   */
  const accent = resolveAccent(card.accent, colors);
  // 0 or 1 choices means there is nothing to choose. Navigate straight there.
  const hasChoices = card.actions.length >= 2;

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) =>
      prev && prev.w === width && prev.h === height ? prev : { w: width, h: height },
    );
  }, []);

  const go = useCallback(
    (intent: string, params?: HomePriorityCardAction["intentParams"]) => {
      void runIntent(intent, navigation, params);
    },
    [navigation],
  );

  const onPress = useCallback(() => {
    // Report first, navigate second. The ack is fire and forget and never
    // blocks, so ordering only decides which one wins a race, and losing the
    // ack costs one extra impression while losing the navigation costs the tap.
    onAcknowledge("tapped");

    if (!hasChoices) {
      go(card.intent, card.intentParams);
      return;
    }
    // No measuring. The sheet rises from the bottom of the screen rather than
    // out of this card, so it needs nothing about where the card happens to be.
    setModalOpen(true);
  }, [card.intent, card.intentParams, go, hasChoices, onAcknowledge]);

  /**
   * Choosing CLOSES the sheet and remembers where to go. It does not navigate.
   *
   * The sheet is a native Modal and is still on screen throughout its exit, so
   * navigating in the same tick mounts the destination underneath it and leaves
   * the sheet lingering over the new screen. `Sheet` fires `onDismissed` once it
   * has fully gone, and that is the only safe moment to move.
   */
  const [pending, setPending] = useState<HomePriorityCardAction | null>(null);

  const onChoose = useCallback((action: HomePriorityCardAction) => {
    setPending(action);
    setModalOpen(false);
  }, []);

  const onDismissed = useCallback(() => {
    if (!pending) return;
    setPending(null);
    go(pending.intent, pending.intentParams);
  }, [go, pending]);

  const onSkip = useCallback(() => {
    setModalOpen(false);
    onAcknowledge("skipped");
  }, [onAcknowledge]);

  const label = [card.label, card.line1, card.line2].filter(Boolean).join(". ");

  /**
   * `subLines` is 2 on the plain card and 1 in the folder. The folder gives up
   * 12pt of face to the pages, and the body needs 81 of the 90 that leaves, so a
   * second caption line would push the hero off the bottom.
   */
  const body = (subLines: 1 | 2) => (
    <>
      <View style={styles.top}>
        {iconName ? (
          <View
            style={[
              styles.iconChip,
              { backgroundColor: accent.tint },
            ]}
          >
            <Icon name={iconName} size={16} color={accent.text} />
          </View>
        ) : null}
        <Text
          variant="eyebrow"
          color={accent.text}
          numberOfLines={1}
          style={styles.flexible}
        >
          {card.label}
        </Text>
      </View>

      <View>
        {/* `title` (16px), NOT `h3` (18px), and that is a measured choice rather
            than a stylistic one. At 18px extrabold, "Read one line" is already
            ~130pt wide and truncated to "Read one li…" on an iPhone SE, which is
            the narrowest phone we support. 16px buys roughly two more characters
            and clears it.

            Still `numberOfLines={1}`: this row must never wrap, because wrapping
            grows the card, the card sets the row height, and the row pushes the
            Programs card down the page. Truncation is visible and fixable in the
            console; a moved fold is neither. */}
        <Text variant="title" color="primary" numberOfLines={1} style={styles.hero}>
          {card.line1}
        </Text>
        {card.line2 ? (
          <Text variant="caption" color="tertiary" numberOfLines={subLines}>
            {card.line2}
          </Text>
        ) : null}
      </View>
    </>
  );

  return (
    <View
      onLayout={onLayout}
      // NOT hidden while the panel is open, and that was tried. Fading the card
      // out during the grow reads slightly better, and it buys that at the price
      // of a failure mode where the card can vanish from Home entirely: the slot
      // is then blank, because `priorityCard` is still set so the Level card
      // does not take over either. Any path that loses the close (a remount, a
      // navigation that unmounts the panel, a state reset) leaves an empty hole
      // where the most important thing on the screen should be. The scrim covers
      // the card within about a third of the move anyway.
      style={styles.wrap}
    >
      <PressableScale
        onPress={onPress}
        style={styles.fill}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={
          queued?.length
            ? `${queued.length} more update${queued.length > 1 ? "s" : ""} waiting after this one.`
            : undefined
        }
      >
        {queued?.length && size ? (
          <>
            {/* The back panel: the whole silhouette, tab included. Stroked as
                well as filled, because on paper the fill step alone carries the
                shape and the app draws every other card edge explicitly. */}
            <Svg
              width={size.w}
              height={size.h - FOLDER_DROP}
              style={[StyleSheet.absoluteFill, { top: FOLDER_DROP }]}
              pointerEvents="none"
            >
              <Path
                d={backPath(size.w, size.h - FOLDER_DROP)}
                fill={backPanel}
                stroke={colors.border.default}
                strokeWidth={StyleSheet.hairlineWidth}
              />
            </Svg>

            {/* THE ORDER OF THESE FOUR IS THE WHOLE ILLUSION: back panel, then
                the pages, then the front face over their bottoms, then the copy.
                Wrap any two of them together and the pages land on the wrong
                side of the face, so they hang out of the pocket instead of
                sitting in it. */}
            <Pages queued={queued} />

            {/* The front face. A View, not a path, so it can cast the
                scheme-aware shadow that makes the peek read as BEHIND it.

                The TOP edge is brighter than the other three on ink, and that is
                the whole trick of dark interfaces: an object on a dark ground is
                read by the light along its leading edge, not by its fill. It is
                one hairline and it does more for the separation than any amount
                of moving the two greys apart. On paper it is a no-op, because a
                lit edge on a near-white card has nothing to be lighter than, and
                paper separates by shadow instead. */}
            <View
              pointerEvents="none"
              style={[
                styles.face,
                {
                  top: FACE_TOP + FOLDER_DROP,
                  backgroundColor: colors.surface.elevated,
                  borderColor: colors.border.default,
                  borderTopColor: isDark
                    ? colors.border.strong
                    : colors.border.default,
                },
                elevation.e2,
              ]}
            />

            <View style={styles.folderBody}>{body(1)}</View>
          </>
        ) : (
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.surface.elevated,
                borderColor: colors.border.default,
              },
              elevation.e2,
            ]}
          >
            <View style={styles.inner}>{body(2)}</View>
          </View>
        )}
      </PressableScale>

      {hasChoices ? (
        <PriorityCardModal
          visible={modalOpen}
          card={card}
          onChoose={onChoose}
          onSkip={onSkip}
          onClose={() => setModalOpen(false)}
          onDismissed={onDismissed}
        />
      ) : null}
    </View>
  );
};

export default PriorityCard;

const styles = StyleSheet.create({
  // Carries the flex and the measurement. No overflow of its own, deliberately:
  // the peek sticks out past the front face and must not be clipped.
  wrap: {
    flex: 1,
    minWidth: 0,
    minHeight: 138,
  },
  fill: { flex: 1 },

  // ── the plain shape ──────────────────────────────────────────────────────
  // Copied from IdentityBlock's own `card` style so the two halves of the row
  // stay identical.
  card: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  inner: {
    flex: 1,
    justifyContent: "space-between",
  },

  // ── the folder shape ─────────────────────────────────────────────────────
  face: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    // Tighter at the top than at the bottom: the top corners are interior to the
    // silhouette, the bottom two ARE the silhouette and must match `backPath`.
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: radius.card,
    borderBottomRightRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
  },
  // Bottom-anchored, because the top of a folder is not the card's to use.
  folderBody: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 5,
  },

  // ── shared content ───────────────────────────────────────────────────────
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  iconChip: {
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  flexible: { flexShrink: 1 },
  hero: {
    fontFamily: fonts.extrabold,
    letterSpacing: -0.3,
    marginBottom: space.titleSub,
  },
});
