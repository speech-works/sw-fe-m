import React from "react";
import { StyleSheet, Text, View, Linking } from "react-native";
import { theme } from "../../Theme/tokens";

export const SimpleMarkdown = ({ content }: { content: string }) => {
  if (!content) return null;

  const lines = content.split("\n");

  return (
    <View>
      {lines.map((line, index) => {
        // Headers
        if (line.startsWith("#### ")) {
          return (
            <Text key={index} style={styles.h4}>
              {line.replace("#### ", "")}
            </Text>
          );
        }
        if (line.startsWith("### ")) {
          return (
            <Text key={index} style={styles.h3}>
              {line.replace("### ", "")}
            </Text>
          );
        }
        if (line.startsWith("## ")) {
          return (
            <Text key={index} style={styles.h2}>
              {line.replace("## ", "")}
            </Text>
          );
        }
        if (line.startsWith("# ")) {
          return (
            <Text key={index} style={styles.h1}>
              {line.replace("# ", "")}
            </Text>
          );
        }

        // List items
        if (line.trim().startsWith("- ")) {
          return (
            <View key={index} style={styles.listItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.body}>
                {parseLinksAndBold(line.trim().replace("- ", ""))}
              </Text>
            </View>
          );
        }

        // Ordered list (basic support for "1. ")
        if (/^\d+\.\s/.test(line.trim())) {
          const parts = line.trim().split(/\.\s/);
          const number = parts[0];
          const text = parts.slice(1).join(". ");
          return (
            <View key={index} style={styles.listItem}>
              <Text style={styles.bullet}>{number}.</Text>
              <Text style={styles.body}>{parseLinksAndBold(text)}</Text>
            </View>
          );
        }

        // Regular Text (with bold support)
        if (line.trim() === "") {
          return <View key={index} style={{ height: 8 }} />;
        }

        return (
          <Text key={index} style={styles.body}>
            {parseLinksAndBold(line)}
          </Text>
        );
      })}
    </View>
  );
};

// Helper: **Bold** and [link](url) parsing
const parseLinksAndBold = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*|\[.*?\]\(.*?\))/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <Text key={i} style={{ fontWeight: "700" }}>
          {part.slice(2, -2)}
        </Text>
      );
    }
    const linkMatch = part.match(/\[(.*?)\]\((.*?)\)/);
    if (linkMatch) {
      return (
        <Text
          key={i}
          style={{ color: theme.colors.library.purple[500], textDecorationLine: "underline" }}
          onPress={() => Linking.openURL(linkMatch[2])}
        >
          {linkMatch[1]}
        </Text>
      );
    }
    return <Text key={i}>{part}</Text>;
  });
};

const styles = StyleSheet.create({
  h1: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.colors.text.title,
    marginBottom: 12,
    marginTop: 16,
  },
  h2: {
    fontSize: 20,
    fontWeight: "600",
    color: theme.colors.text.title,
    marginBottom: 8,
    marginTop: 12,
  },
  h3: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text.title,
    marginBottom: 6,
    marginTop: 10,
  },
  h4: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text.title,
    marginBottom: 4,
    marginTop: 8,
  },
  body: {
    fontSize: 16,
    color: theme.colors.text.default,
    lineHeight: 24,
    marginBottom: 4,
  },
  listItem: {
    flexDirection: "row",
    marginBottom: 4,
  },
  bullet: {
    fontSize: 16,
    color: theme.colors.text.default,
    lineHeight: 24,
    marginRight: 8,
    width: 20,
  },
});
