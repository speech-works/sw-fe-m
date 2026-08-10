import React from "react";
import { View } from "react-native";
import {
  Sheet,
  ListItem,
  Text,
  makeStyles,
  spacing,
} from "../../design-system";
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
      title={target === "signal" ? "Report this post" : `Report ${who}`}
    >
      <View style={styles.body}>
        <Text variant="bodySm" color="secondary" style={styles.intro}>
          Only our team sees this. {personName ? `${who} won't` : "They won't"} be
          told.
        </Text>

        {REPORT_REASONS.map((reason, i) => (
          <ListItem
            key={reason.id}
            label={reason.label}
            divider={i < REPORT_REASONS.length - 1}
            disabled={submitting}
            onPress={() => onSubmit(reason.id)}
          />
        ))}

        {/* Blocking is not a seventh reason — it's a different act, so it sits
            in its own group with a gap above it. Reporting is about the
            content; this is about the person. */}
        {onBlock ? (
          <View style={styles.blockGroup}>
            <ListItem
              label={blockLabel ?? `Block ${who}`}
              disabled={submitting}
              onPress={onBlock}
            />
          </View>
        ) : null}
      </View>
    </Sheet>
  );
};

const useStyles = makeStyles(() => ({
  body: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  intro: {
    marginBottom: spacing.md,
  },
  blockGroup: {
    marginTop: spacing.lg,
  },
}));

export { CRISIS_REPORT_REASON };
export default ReportSheet;
