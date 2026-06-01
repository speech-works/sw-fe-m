import React, { useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { theme } from "../Theme/tokens";
import { parseTextStyle } from "../util/functions/parseStyles";
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
        <Text style={styles.title}>{directive.title}</Text>
      </View>

      <Text style={styles.body}>{directive.body}</Text>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={onDismiss}
          activeOpacity={0.7}
        >
          <Text style={styles.secondaryText}>
            {directive.secondaryAction.label}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={onTryWithout}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryText}>
            {directive.primaryAction.label}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ECFDF5", // emerald-50, calm/supportive
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#A7F3D0", // emerald-200
    padding: 18,
    gap: 12,
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
    ...parseTextStyle(theme.typography.Heading4),
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#065F46", // emerald-800
  },
  body: {
    ...parseTextStyle(theme.typography.BodySmall),
    fontSize: 14,
    lineHeight: 20,
    color: "#047857", // emerald-700
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 2,
  },
  secondaryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#047857",
  },
  primaryBtn: {
    backgroundColor: "#059669", // emerald-600
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
  },
  primaryText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});

export default ToolNudge;
