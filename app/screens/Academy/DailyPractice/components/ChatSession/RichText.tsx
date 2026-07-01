import React from "react";
import { View } from "react-native";
import { Text, makeStyles, radius, spacing } from "../../../../../design-system";

interface RichTextProps {
  text: string;
  /** Raw colour for the un-highlighted words (e.g. colors.text.primary). */
  color: string;
  /** Row alignment — messages flow from the start, option cards centre. */
  align?: "start" | "center";
}

/**
 * Renders chat/option text where `(parentheses)` and `[brackets]` become solid,
 * rounded highlight chips (the app's chip vibe). Plain text is split into
 * per-word <Text> items so the flex row wraps naturally around the chips —
 * unhighlighted words share the line and there are no orphaned highlighted
 * spaces. `()` = primary technique, `[]` = the alternative. Chip fills are solid
 * accent colours that never match a container background, so a highlight can
 * never disappear.
 */
export const RichText: React.FC<RichTextProps> = ({ text, color, align = "start" }) => {
  const styles = useStyles();
  const regex = /(\[.*?\]|\(.*?\))/g;
  const segments = text.split(regex);

  const nodes = segments.flatMap((segment, i) => {
    if (!segment) return [];

    const isBracket = segment.startsWith("[") && segment.endsWith("]");
    const isParen = segment.startsWith("(") && segment.endsWith(")");

    if (isBracket || isParen) {
      let content = segment.slice(1, -1);
      if (content.endsWith(".")) content = content.slice(0, -1);
      return [
        <View
          key={`hl-${i}`}
          style={isBracket ? styles.hlSecondary : styles.hlPrimary}
        >
          <Text
            variant="body"
            style={isBracket ? styles.hlSecondaryText : styles.hlPrimaryText}
          >
            {content}
          </Text>
        </View>,
      ];
    }

    return segment.split(" ").flatMap((word, wIndex, arr) => {
      if (!word) return [];
      return [
        <Text key={`t-${i}-${wIndex}`} variant="body" style={{ color }}>
          {word}
          {wIndex < arr.length - 1 ? " " : ""}
        </Text>,
      ];
    });
  });

  return (
    <View style={[styles.row, align === "center" && styles.rowCenter]}>
      {nodes}
    </View>
  );
};

const useStyles = makeStyles((c) => ({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
  },
  rowCenter: {
    justifyContent: "center",
  },
  // Solid, rounded highlight chips. Fills are solid accent colours that never
  // match a container background, so a highlight can never disappear;
  // marginVertical keeps wrapped lines readable when a chip is inline.
  hlPrimary: {
    backgroundColor: c.action.primary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
    marginHorizontal: spacing.xxs,
    marginVertical: 1,
  },
  hlPrimaryText: {
    fontWeight: "700",
    color: c.action.onPrimary,
    includeFontPadding: false,
  },
  hlSecondary: {
    backgroundColor: c.accent.purple,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
    marginHorizontal: spacing.xxs,
    marginVertical: 1,
  },
  hlSecondaryText: {
    fontWeight: "700",
    color: c.accentOn.purple,
    includeFontPadding: false,
  },
}));
