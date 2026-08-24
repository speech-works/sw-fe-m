import React from "react";
import { Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { fonts, makeStyles, useTheme } from "../../design-system";
import { handleLinkPress } from "../../util/functions/externalLinks";
import { toSafeExternalUrl } from "../../util/functions/url";

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

/**
 * Inline token pattern, tried left to right at every position:
 *
 * 1. `**bold**`      — first, so a double asterisk is never read as two italics.
 * 2. `[label](url)`  — links.
 * 3. `*italic*`      — single asterisk runs.
 *
 * The italic arm is deliberately narrow. It requires a non-space, non-asterisk
 * character immediately after the opening `*` and immediately before the
 * closing one, so arithmetic ("2 * 3") and stray asterisks stay literal instead
 * of opening an emphasis run that eats the rest of the line. `[^*\n]` also
 * stops a run from spanning a line break. A dangling `*` with no partner simply
 * fails to match and falls through to the plain-text branch.
 *
 * Written without lookbehind on purpose — Hermes support for it is not
 * something this component should depend on.
 *
 * ── WHY THE ITALIC ARM KNOWS ABOUT BOLD ──────────────────────────────────────
 * A run of emphasis is allowed to contain a WHOLE bold run, because the paid
 * pack content already does it:
 *
 *   *"this is hard **and I am uniquely bad at it**"*
 *
 * With a flat italic arm that forbade every asterisk, the line above could not
 * be captured as one run. The scan then fell through to the bold arm in the
 * middle of it, and the customer read the sentence with two stray asterisks
 * hanging off the ends of it.
 *
 * The inner alternative is a COMPLETE bold run (`\*\*…\*\*`), never a bare pair
 * of asterisks. That distinction is the whole correctness of the pattern: with a
 * bare pair, the lazy quantifier is satisfied by the *opening* delimiter of the
 * bold run and stops inside it, so `*a **b** c*` captures as `*a **b*`. Matching
 * the run as a unit means the shortest legal match is the real one.
 *
 * The two inner alternatives start with different characters (non-asterisk vs
 * asterisk), so any input decomposes exactly one way and the nesting cannot
 * backtrack combinatorially.
 */
const BOLD_SOURCE = "\\*\\*.*?\\*\\*";
const LINK_SOURCE = "\\[.*?\\]\\(.*?\\)";
const ITALIC_INNER = "(?:[^*\\n]|\\*\\*[^*\\n]+?\\*\\*)";
const ITALIC_SOURCE = `\\*[^\\s*](?:${ITALIC_INNER}*?[^\\s*])?\\*`;

const INLINE_PATTERN = new RegExp(
  `(${BOLD_SOURCE}|${LINK_SOURCE}|${ITALIC_SOURCE})`,
  "g",
);

// Anchored forms, so a captured part is classified by the SAME rule that
// captured it. Sniffing with startsWith("*")/endsWith("*") instead would
// misread an unmatched leftover such as "*open\nclosed*" — which the pattern
// deliberately refused to capture — as a valid emphasis run.
const BOLD_EXACT = new RegExp(`^${BOLD_SOURCE}$`);
const LINK_EXACT = /^\[(.*?)\]\((.*?)\)$/;
const ITALIC_EXACT = new RegExp(`^${ITALIC_SOURCE}$`);

export type InlineToken =
  | { type: "text"; text: string }
  | { type: "bold"; text: string; children?: InlineToken[] }
  | { type: "italic"; text: string; children?: InlineToken[] }
  | { type: "link"; text: string; href: string };

/**
 * How deep emphasis may nest before the inside of a run is taken literally.
 *
 * Real content nests two deep at most (bold inside italic). This is a stop, not
 * a feature: pack text is server-supplied, and a bound that cannot be argued
 * with is cheaper than reasoning about how deep a pathological line could go.
 */
const MAX_NESTING_DEPTH = 4;

/**
 * Tokens for the INSIDE of an emphasis run, or undefined when there is nothing
 * in there but its own text.
 *
 * Undefined rather than a one-element list on purpose, and the caller leaves the
 * key off entirely in that case. The flat `{ type, text }` form already says
 * everything about the common case, so keeping it flat means the ordinary run
 * stays trivial to read and to assert on, and a `children` key existing at all
 * is a reliable signal that something is genuinely nested.
 */
function nestedChildren(
  inner: string,
  depth: number,
): InlineToken[] | undefined {
  if (depth >= MAX_NESTING_DEPTH) return undefined;
  const children = tokenizeInline(inner, depth + 1);
  if (children.length === 1 && children[0].type === "text") return undefined;
  return children;
}

/**
 * Pure tokenizer for one already-split line. Exported so the emphasis rules can
 * be tested without rendering a React Native tree.
 *
 * `depth` is internal. Every recursive call strips at least the two delimiters
 * off its input, so the string shrinks on every level and the recursion cannot
 * fail to terminate; MAX_NESTING_DEPTH is a second, cheaper stop.
 *
 * NOT supported, deliberately: `***both***` as combined bold and italic. The
 * bold arm claims the outer pair and the third asterisk is left over, so the
 * line keeps one visible star. No pack content uses it (the only triple run in
 * the seed is a poem using asterisks as redaction, which is meant to stay
 * literal), and the pattern needed to tell the two apart is not worth carrying
 * for content that does not exist.
 */
export const tokenizeInline = (text: string, depth = 0): InlineToken[] => {
  const tokens: InlineToken[] = [];
  for (const part of text.split(INLINE_PATTERN)) {
    if (!part) continue;
    if (BOLD_EXACT.test(part)) {
      tokens.push(emphasis("bold", part.slice(2, -2), depth));
      continue;
    }
    const linkMatch = part.match(LINK_EXACT);
    if (linkMatch) {
      tokens.push({ type: "link", text: linkMatch[1], href: linkMatch[2] });
      continue;
    }
    if (ITALIC_EXACT.test(part)) {
      tokens.push(emphasis("italic", part.slice(1, -1), depth));
      continue;
    }
    tokens.push({ type: "text", text: part });
  }
  return tokens;
};

/** One emphasis token, carrying a `children` key only when it truly nests. */
function emphasis(
  type: "bold" | "italic",
  inner: string,
  depth: number,
): InlineToken {
  const children = nestedChildren(inner, depth);
  return children ? { type, text: inner, children } : { type, text: inner };
}

// Helper: **Bold**, *italic* and [link](url) parsing
const parseLinksAndBold = (
  text: string,
  linkColor: string,
  textColor?: string,
) => {
  const inheritedColor = textColor ? { color: textColor } : {};
  return renderInline(tokenizeInline(text), linkColor, inheritedColor);
};

/**
 * Render one level of tokens, recursing into nested emphasis.
 *
 * Nesting is expressed as nested `<Text>` rather than by merging styles,
 * because that is how React Native already composes inline text: the inner
 * element inherits the outer one's family and style, so bold inside italic
 * needs only to declare the family it adds.
 *
 * `keyPrefix` keeps keys unique across levels. Sibling indexes alone would
 * collide the moment two different runs each had a child at index 0.
 */
const renderInline = (
  tokens: InlineToken[],
  linkColor: string,
  inheritedColor: { color?: string },
  keyPrefix = "",
): React.ReactNode[] =>
  tokens.map((token, i) => {
    const key = `${keyPrefix}${i}`;
    const body = (t: { text: string; children?: InlineToken[] }) =>
      t.children
        ? renderInline(t.children, linkColor, inheritedColor, `${key}.`)
        : t.text;

    if (token.type === "bold") {
      return (
        <Text key={key} style={[{ fontFamily: fonts.bold }, inheritedColor]}>
          {body(token)}
        </Text>
      );
    }
    if (token.type === "italic") {
      // Emphasis only — no family and no color of its own, so the run keeps the
      // surrounding variant's family and whatever color role the parent line
      // resolved (correct in both the dark and the light scheme). Matches the
      // blockquote treatment already in this file.
      return (
        <Text key={key} style={[{ fontStyle: "italic" as const }, inheritedColor]}>
          {body(token)}
        </Text>
      );
    }
    if (token.type === "link") {
      // This markdown comes from the server (pack content), so the href is
      // untrusted input. Everything else in the app routes through
      // toSafeExternalUrl before opening; this call site was handing the raw
      // captured group straight to Linking.openURL, which would happily launch
      // a `javascript:` or `intent:` URL. If it isn't http/https, render the
      // label as plain text rather than a link that silently does nothing.
      const safeHref = toSafeExternalUrl(token.href);
      if (!safeHref) {
        return (
          <Text key={key} style={inheritedColor}>
            {token.text}
          </Text>
        );
      }
      return (
        <Text
          key={key}
          style={{
            color: linkColor,
            textDecorationLine: "underline",
          }}
          onPress={() => handleLinkPress(safeHref)}
        >
          {token.text}
        </Text>
      );
    }
    return (
      <Text key={key} style={inheritedColor}>
        {token.text}
      </Text>
    );
  });


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
