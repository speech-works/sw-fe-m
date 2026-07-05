import React from "react";
import { Text, View, Linking } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { makeStyles, useTheme } from "../../design-system";

export const SimpleMarkdown = ({
  content,
  textColor,
  variant,
}: {
  content: string;
  textColor?: string;
  variant?: "instruction" | "default";
}) => {
  const styles = useStyles();
  const { colors } = useTheme();

  if (!content) return null;

  // Normalize line endings and split
  const lines = content.replace(/\r\n/g, "\n").split("\n");

  const textStyle = textColor ? { color: textColor } : {};
  const linkColor = colors.text.link;

  return (
    <View style={styles.container}>
      {lines.map((line, index) => {
        const trimmedLine = line.trim();

        // Headers
        if (trimmedLine.startsWith("#### ")) {
          return (
            <Text key={index} style={[styles.h4, textStyle]}>
              {trimmedLine.replace("#### ", "")}
            </Text>
          );
        }
        if (trimmedLine.startsWith("### ")) {
          return (
            <Text
              key={index}
              style={[styles.h3, index === 0 && { marginTop: 0 }, textStyle]}
            >
              {trimmedLine.replace("### ", "")}
            </Text>
          );
        }
        if (trimmedLine.startsWith("## ")) {
          return (
            <Text key={index} style={[styles.h2, textStyle]}>
              {trimmedLine.replace("## ", "")}
            </Text>
          );
        }
        if (trimmedLine.startsWith("# ")) {
          return (
            <Text key={index} style={[styles.h1, textStyle]}>
              {trimmedLine.replace("# ", "")}
            </Text>
          );
        }

        // Blockquotes
        if (trimmedLine.startsWith("> ")) {
          return (
            <View key={index} style={styles.blockquote}>
              <Text style={[styles.blockquoteText, textStyle]}>
                {parseLinksAndBold(trimmedLine.replace("> ", ""), linkColor, textColor)}
              </Text>
            </View>
          );
        }

        // Checkboxes (- [ ] or - [x])
        const checkboxMatch = trimmedLine.match(/^- \[([ xX])\] (.*)/);
        if (checkboxMatch) {
          const isChecked = checkboxMatch[1].toLowerCase() === "x";
          return (
            <View key={index} style={styles.listItem}>
              <MaterialCommunityIcons
                name={isChecked ? "checkbox-marked" : "checkbox-blank-outline"}
                size={18}
                color={
                  isChecked
                    ? colors.feedback.success
                    : textColor || colors.text.secondary
                }
                style={styles.checkboxIcon}
              />
              <Text
                style={[
                  variant === "instruction" ? styles.bodyLarge : styles.body,
                  isChecked && styles.completedText,
                  textStyle,
                ]}
              >
                {parseLinksAndBold(checkboxMatch[2], linkColor, textColor)}
              </Text>
            </View>
          );
        }

        // List items
        if (trimmedLine.startsWith("- ") || trimmedLine.startsWith("* ")) {
          const content = trimmedLine.replace(/^[-*] /, "");
          return (
            <View key={index} style={styles.listItem}>
              <Text style={[styles.bullet, textStyle]}>•</Text>
              <Text
                style={[
                  variant === "instruction" ? styles.bodyLarge : styles.body,
                  textStyle,
                ]}
              >
                {parseLinksAndBold(content, linkColor, textColor)}
              </Text>
            </View>
          );
        }

        // Ordered list (basic support for "1. ")
        const orderedMatch = trimmedLine.match(/^(\d+)\.\s(.*)/);
        if (orderedMatch) {
          return (
            <View key={index} style={styles.listItem}>
              <Text style={[styles.bullet, textStyle]}>{orderedMatch[1]}.</Text>
              <Text
                style={[
                  variant === "instruction" ? styles.bodyLarge : styles.body,
                  textStyle,
                ]}
              >
                {parseLinksAndBold(orderedMatch[2], linkColor, textColor)}
              </Text>
            </View>
          );
        }

        // Regular Text (with bold support)
        if (trimmedLine === "") {
          return <View key={index} style={{ height: 12 }} />;
        }

        return (
          <Text
            key={index}
            style={[
              variant === "instruction" ? styles.bodyLarge : styles.body,
              textStyle,
            ]}
          >
            {parseLinksAndBold(line, linkColor, textColor)}
          </Text>
        );
      })}
    </View>
  );
};

// Helper: **Bold** and [link](url) parsing
const parseLinksAndBold = (
  text: string,
  linkColor: string,
  textColor?: string,
) => {
  const parts = text.split(/(\*\*.*?\*\*|\[.*?\]\(.*?\))/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <Text key={i} style={[{ fontWeight: "700" }, textColor ? { color: textColor } : {}]}>
          {part.slice(2, -2)}
        </Text>
      );
    }
    const linkMatch = part.match(/\[(.*?)\]\((.*?)\)/);
    if (linkMatch) {
      return (
        <Text
          key={i}
          style={{
            color: linkColor,
            textDecorationLine: "underline",
          }}
          onPress={() => Linking.openURL(linkMatch[2])}
        >
          {linkMatch[1]}
        </Text>
      );
    }
    return <Text key={i} style={textColor ? { color: textColor } : {}}>{part}</Text>;
  });
};


const useStyles = makeStyles((c, t) => ({
  container: {
    width: "100%",
  },
  h1: {
    ...t.typography.display,
    color: c.text.primary,
    marginBottom: 16,
    marginTop: 20,
  },
  h2: {
    ...t.typography.h2,
    color: c.text.primary,
    marginBottom: 12,
    marginTop: 16,
  },
  h3: {
    ...t.typography.h3,
    color: c.text.primary,
    marginBottom: 8,
    marginTop: 16,
    letterSpacing: -0.3,
  },
  h4: {
    ...t.typography.h3,
    color: c.text.primary,
    marginBottom: 8,
    marginTop: 12,
  },
  body: {
    ...t.typography.body,
    color: c.text.primary,
    marginBottom: 12,
  },
  bodyLarge: {
    ...t.typography.body,
    color: c.text.primary,
    marginBottom: 12,
  },
  listItem: {
    flexDirection: "row",
    marginBottom: 8,
    paddingRight: 16,
  },
  bullet: {
    ...t.typography.body,
    color: c.text.secondary,
    marginRight: 8,
    width: 20,
    textAlign: "center",
  },
  checkboxIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  completedText: {
    textDecorationLine: "line-through",
    opacity: 0.6,
  },
  blockquote: {
    borderLeftWidth: 4,
    borderLeftColor: c.action.primary,
    paddingLeft: 16,
    paddingVertical: 4,
    marginVertical: 12,
    backgroundColor: c.action.primaryTint,
    borderRadius: t.radius.xs,
  },
  blockquoteText: {
    ...t.typography.bodySm,
    fontStyle: "italic",
    color: c.text.secondary,
    lineHeight: 22,
  },
}));
