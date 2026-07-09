import React, { useEffect } from "react";
import { TouchableOpacity, View } from "react-native";
import { makeStyles, Text, useTheme } from "../design-system";
import { ToolNudgeDirective } from "../api/tools/types";
import { track } from "../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../util/analytics/analyticsEvents";

interface ToolNudgeProps {
  directive: ToolNudgeDirective;
  /** Primary action — start the activity with the tool intentionally off. */
  onTryWithout: () => void;
  /** Secondary action — dismiss (records the server-side frequency cap). */
  onDismiss: () => void;
  style?: any;
}

/**
 * Dumb renderer for the server-authored fluency-aid over-reliance nudge.
 * Shown on the activity start screen. All copy/variant come from the backend
 * (config/toolGuardrails.ts); this component owns only layout + analytics.
 */
export const ToolNudge: React.FC<ToolNudgeProps> = ({
  directive,
  onTryWithout,
  onDismiss,
  style,
}) => {
  const styles = useStyles();
  const { colors } = useTheme();

  useEffect(() => {
    track(ANALYTICS_EVENTS.TOOL_NUDGE_SHOWN, {
      tool: directive.tool,
      variant: directive.variant,
    });
    // Fire once per mount (component only mounts when a nudge is due).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={[styles.card, style]}>
      <View style={styles.headerRow}>
        <Text style={styles.icon}>{directive.icon}</Text>
        <Text variant="title" color={colors.feedback.successText} style={styles.title}>
          {directive.title}
        </Text>
      </View>

      <Text variant="bodySm" color="secondary" style={styles.body}>
        {directive.body}
      </Text>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={onDismiss}
          activeOpacity={0.7}
        >
          <Text variant="bodySm" color={colors.feedback.successText}>
            {directive.secondaryAction.label}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={onTryWithout}
          activeOpacity={0.85}
        >
          <Text variant="bodySm" color={colors.accentOn.success}>
            {directive.primaryAction.label}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const useStyles = makeStyles((c, t) => ({
  card: {
    backgroundColor: c.accentTint.success, // calm/supportive
    borderRadius: t.radius.chip,
    borderWidth: 1,
    borderColor: c.accent.success,
    padding: 18,
    gap: t.spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  icon: {
    fontSize: 22,
  },
  title: {
    flex: 1,
  },
  body: {
    lineHeight: 20,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: t.spacing.md,
    marginTop: t.spacing.xxs,
  },
  secondaryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  primaryBtn: {
    backgroundColor: c.accent.success,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: t.radius.md,
  },
}));

export default ToolNudge;
