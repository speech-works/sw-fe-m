import React from "react";
import { StyleSheet, View } from "react-native";
import PressableScale from "../../../../../components/PressableScale";
import {
  Sheet,
  Button,
  Text,
  useTheme,
  spacing,
} from "../../../../../design-system";
import type {
  HomePriorityCard,
  HomePriorityCardAction,
} from "../../../../../api/homeCards";
import { resolveAccent } from "./accent";

/**
 * ============================================================================
 * THE CHOOSER — the app's bottom sheet, not a new one
 * ----------------------------------------------------------------------------
 * Only ever reached from a card that offers TWO OR THREE choices. A card with a
 * single destination navigates straight there: putting a panel in front of it
 * would be one tap of ceremony in exchange for nothing.
 *
 * ── WHY THIS IS NOW THE DS `Sheet` ──────────────────────────────────────────
 * It used to be a hand-rolled native `Modal` with its own scrim, its own
 * grabber, its own translate and its own padding. It worked, and it was wrong:
 * side by side with Library's "Choose Mode", the metronome settings and the DAF
 * consent sheet, it was visibly a different component. Left-aligned where they
 * centre, a 36x4 grabber at 35% opacity where the system draws 40x5 in a colour
 * chosen against the surface, square-ish 16pt buttons where the app uses pills,
 * and a secondary action wearing a chevron that none of the others have.
 *
 * None of those are opinions. `Sheet` and `Button` already encode the answers,
 * so the rebuild deletes ~180 lines and inherits the rest:
 *
 *   grabber      sized and CONTRASTED against whatever surface it lands on
 *   bottom pad   real `useSafeAreaInsets`, replacing a guessed `spacing["3xl"]`
 *   modal safety `useNativeModalStore`, so two native Modals cannot stack
 *   motion       tokenised durations, reduced-motion aware, exit faster
 *   dismissal    backdrop tap and Android back, both for free
 *
 * ── THE ONE REAL BUG THIS CLOSES ────────────────────────────────────────────
 * Choosing an action used to flip `visible` false and navigate in the same tick.
 * A native Modal is still on screen through its exit, so the destination could
 * mount UNDERNEATH it and the sheet would linger over the new screen. `Sheet`
 * has `onDismissed` precisely for this, and the navigation now waits for it.
 *
 * ── WHAT IS DELIBERATELY NOT INHERITED ──────────────────────────────────────
 * The eyebrow. No other sheet has one, and it is here because the console's
 * accent has to be visible on both halves of the same object: the card carries
 * `card.label` in `accent.text`, and so does the sheet it opens. Take it away
 * and a lime card opens a sheet with no lime in it until you read the button.
 * ============================================================================
 */

export interface PriorityCardModalProps {
  visible: boolean;
  card: HomePriorityCard;
  onChoose: (action: HomePriorityCardAction) => void;
  /** A deliberate refusal. Retires the card for good. */
  onSkip: () => void;
  onClose: () => void;
  /** Runs once the sheet is fully gone. Navigate from HERE, never from `onChoose`. */
  onDismissed?: () => void;
}

export const PriorityCardModal: React.FC<PriorityCardModalProps> = ({
  visible,
  card,
  onChoose,
  onSkip,
  onClose,
  onDismissed,
}) => {
  const { colors } = useTheme();
  const accent = resolveAccent(card.accent, colors);
  const [primary, ...secondary] = card.actions;

  return (
    <Sheet visible={visible} onClose={onClose} onDismissed={onDismissed}>
      <View style={styles.content}>
        <Text variant="eyebrow" color={accent.text} center numberOfLines={1}>
          {card.label}
        </Text>

        <Text variant="h2" color="primary" center style={styles.title}>
          {card.modalTitle ?? card.line1}
        </Text>

        {card.modalBody ? (
          <Text variant="body" color="secondary" center style={styles.body}>
            {card.modalBody}
          </Text>
        ) : null}

        <View style={styles.actions}>
          {/* The ONE filled object on this surface, and the only place the
              console's accent becomes a fill rather than a text cut. */}
          <Button
            label={primary.label}
            onPress={() => onChoose(primary)}
            accentColor={accent.fill}
            onAccentColor={accent.ink}
          />
          {secondary.map((action) => (
            <Button
              key={action.id}
              label={action.label}
              variant="secondary"
              onPress={() => onChoose(action)}
            />
          ))}
        </View>

        {/* The ONLY dismissal that retires the card. There is deliberately no
            equivalent on the card itself: two considered taps to refuse a
            message means no stray tap can throw one away. Tapping the backdrop
            closes the sheet and leaves the card exactly where it was. */}
        <PressableScale
          onPress={onSkip}
          accessibilityRole="button"
          accessibilityLabel="Do not show this again"
          style={styles.skip}
        >
          <Text variant="caption" color="tertiary">
            Do not show this again
          </Text>
        </PressableScale>
      </View>
    </Sheet>
  );
};

export default PriorityCardModal;

/**
 * Spacing copied from Library's "Choose Mode" rather than re-derived, so the two
 * sheets are the same object at the same rhythm. See `copy-existing-ui-pattern`:
 * the app's existing instance beats a fresh reading of the tokens.
 */
const styles = StyleSheet.create({
  content: {
    alignItems: "center",
    paddingTop: spacing.sm,
  },
  title: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  body: {
    lineHeight: 24,
  },
  actions: {
    width: "100%",
    gap: spacing.md,
    // On the body, not off it: `modalBody` is optional here where Library's
    // subtitle is mandatory, and hanging the gap on a node that may not render
    // would collapse the title straight onto the first button.
    marginTop: spacing["2xl"],
  },
  skip: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
});
