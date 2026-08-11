import React from "react";
import { View } from "react-native";
import {
  Sheet,
  Text,
  Button,
  makeStyles,
  useTheme,
  spacing,
  radius,
  borderWidth,
  fonts,
} from "../../design-system";
import PressableScale from "../PressableScale";
import {
  REPORT_REASONS,
  CRISIS_REPORT_REASON,
} from "../../constants/reportReasons";
import type { ReportReason } from "../../api/moderation";

interface ReportSheetProps {
  visible: boolean;
  onClose: () => void;
  /** What is being reported — changes only the title and the reassurance line. */
  target: "signal" | "user";
  /** First name of the person involved, for the copy. */
  personName?: string;
  /** Called with the chosen reason. Tapping a reason submits; there is no second step. */
  onSubmit: (reason: ReportReason) => void;
  /**
   * Fires once the sheet has FULLY animated out and unmounted. Chain anything
   * that opens another native modal (or navigates) off this, never off the tap.
   */
  onDismissed?: () => void;
  /** A submit is in flight — every row goes inert so one tap can't become two. */
  submitting?: boolean;
  /**
   * Optional "block this person" action, rendered apart from the reasons. Given
   * a handler, the caller is responsible for its own confirm step — see the
   * Timeline usage, which waits for `onDismissed` before opening one.
   */
  onBlock?: () => void;
  blockLabel?: string;
}

/**
 * The report sheet.
 *
 * BUILT TO MATCH `BuddySupportSheet`, the nearest sibling — same feature area,
 * same kind of decision. Every piece of its vocabulary is reused deliberately:
 * the title lives INSIDE the body as an `h2` with a `bodySm` subtitle (the
 * `Sheet` `title` prop floats on the backdrop, detached from the card, which is
 * what made this sheet look like it came from another app); groups are labelled
 * with uppercase `caption tertiary`; and every choice is a `surface.control`
 * card with a thin border, a leading icon and a bold `bodySm` label.
 *
 * Two earlier attempts got this wrong in instructive ways. `ListItem` is the
 * SETTINGS row — 72pt tall with a `title`-weight label — so six of them made a
 * preferences screen. Replacing them with one divided surface fixed the height
 * but still matched nothing else in the app.
 *
 * ONE TAP SUBMITS, deliberately. The reason list *is* the confirmation: you
 * cannot mis-tap into filing a report without also choosing why. A DS `Dialog`
 * confirm is the right pattern for destructive actions someone might regret;
 * reporting is neither destructive nor irreversible from our side, and every
 * extra step between "this is abusive" and "it's gone" is a step where someone
 * distressed gives up.
 *
 * The `self_harm` reason is handled by the CALLER, not here — see the note on
 * CRISIS_REPORT_REASON. This component only reports which reason was chosen.
 */
export const ReportSheet: React.FC<ReportSheetProps> = ({
  visible,
  onClose,
  target,
  personName,
  onSubmit,
  onDismissed,
  submitting,
  onBlock,
  blockLabel,
}) => {
  const styles = useStyles();
  const { colors } = useTheme();
  const who = personName?.trim() || "them";

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      onDismissed={onDismissed}
      // ALWAYS exclusive, because this sheet is always a handoff target.
      //
      // Community opens it the instant it closes the "Block X?" confirm Dialog.
      // A Dialog is an AnimatedModal, which stays mounted through its ~200ms
      // exit — so without this the two native <Modal>s overlapped and froze
      // touch input on iOS, which meant the reason list never became usable and
      // blockUser() was never called. The block button simply did nothing.
      //
      // `exclusive` defers presentation until the modal registry clears, so the
      // same-tick close/open in the caller is safe. Where nothing else is open
      // (Timeline's report tap) hasOpenModalExcept is false and this presents
      // immediately — identical behaviour to before.
      exclusive
    >
      <View style={styles.container}>
        <Text variant="h2">
          {target === "signal" ? "Report this post" : `Report ${who}`}
        </Text>
        <Text variant="bodySm" color="secondary" style={styles.subtitle}>
          Only our team sees this. {personName ? `${who} won't` : "They won't"} be
          told.
        </Text>

        {REPORT_REASONS.map((reason) => (
          <PressableScale
            key={reason.id}
            style={[
              styles.reasonCard,
              { backgroundColor: colors.surface.control, borderColor: "transparent" },
              submitting && styles.dimmed,
            ]}
            scaleTo={0.98}
            disabled={submitting}
            // Guarded INSIDE the handler, not by `disabled` alone. `disabled`
            // stops a touch reaching Pressable, but it is a render-time gate:
            // a second tap arriving before `submitting` has propagated still
            // gets through, which is how one tap becomes two POSTs.
            onPress={() => {
              if (submitting) return;
              onSubmit(reason.id);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Report for ${reason.label}`}
          >
            <Text variant="bodySm" style={[styles.flex1, styles.bold]}>
              {reason.label}
            </Text>
          </PressableScale>
        ))}

        {/* Blocking is not a seventh reason, it is a different act — reporting
            is about the content, this is about the person. So it gets its own
            labelled group.

            IT IS A ROW, NOT A CENTRED PILL. The previous attempt centred a pale
            `dangerText` label on a 12%-alpha danger tint, which reads exactly
            like a disabled button: low-contrast text, no icon, floating in a
            muddy field. Danger lives in the BORDER and the icon here — the same
            device `BuddySupportSheet` uses to mark its state — over the same
            `surface.control` every other row sits on, where #FF9296 clears AA
            comfortably instead of dissolving into the fill. */}
        {onBlock ? (
          /* THE DS `Button`, not a hand-rolled row.
             `variant="danger"` is deliberately NOT used: it renders an OUTLINE
             (transparent fill, pink label, red rim), which is the treatment
             that read as disabled here. The app's action buttons are solid
             pills — "Find someone", "Ask to pair", "Got it", "Try Again" — so
             the consistent destructive button is that same pill in the danger
             hue, which is exactly what `accentColor`/`onAccentColor` exist for.
             Dark ink on a bright fill, per the DS contrast rule. */
          <Button
            label={blockLabel ?? `Block ${who}`}
            accentColor={colors.feedback.danger}
            onAccentColor={colors.accentOn.danger}
            disabled={submitting}
            style={styles.blockButton}
            onPress={() => {
              if (submitting) return;
              onBlock();
            }}
          />
        ) : null}
      </View>
    </Sheet>
  );
};

const useStyles = makeStyles(() => ({
  container: { paddingTop: spacing.sm, paddingBottom: spacing.sm },
  bold: { fontFamily: fonts.bold },
  flex1: { flex: 1 },
  subtitle: { marginTop: spacing.sm, marginBottom: spacing.md },

  reasonCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radius.input,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: borderWidth.thin,
  },

  // Separated by space, not by a label. A solid red pill after a gap is
  // already unmistakably a different kind of thing from the neutral cards
  // above it; a heading saying so was words doing what the design does.
  blockButton: { marginTop: spacing.lg },

  dimmed: { opacity: 0.45 },
}));

export { CRISIS_REPORT_REASON };
export default ReportSheet;
