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
}) => {
  const styles = useStyles();
  const who = personName?.trim() || "them";

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
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
            onPress={() => onSubmit(reason.id)}
          />
        ))}
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
}));

export { CRISIS_REPORT_REASON };
export default ReportSheet;
