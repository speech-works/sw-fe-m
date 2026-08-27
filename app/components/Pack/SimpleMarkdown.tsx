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

  // Normalize line endings, split, then group into blocks BEFORE rendering.
  // A block can span several raw source lines (a wrapped list item, a
  // multi-line quote) — grouping first is what lets those render as one
  // element instead of one element per line.
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks = groupBlocks(lines);

  const textStyle = textColor ? { color: textColor } : {};
  const linkColor = colors.text.link;

  return (
    <View style={styles.container}>
      {blocks.map((block, index) => {
        switch (block.kind) {
          case "blank":
            return <View key={index} style={{ height: 12 }} />;

          case "header": {
            const headerStyle = {
              1: styles.h1,
              2: styles.h2,
              3: styles.h3,
              4: styles.h4,
            }[block.level];
            return (
              <Text
                key={index}
                style={[
                  headerStyle,
                  block.level === 3 && index === 0 && { marginTop: 0 },
                  textStyle,
                ]}
              >
                {block.text}
              </Text>
            );
          }

          case "blockquote":
            return (
              <View key={index} style={styles.blockquote}>
                <Text style={[styles.blockquoteText, textStyle]}>
                  {parseLinksAndBold(block.text, linkColor, textColor)}
                </Text>
              </View>
            );

          case "checkbox":
            return (
              <View key={index} style={styles.listItem}>
                <MaterialCommunityIcons
                  name={
                    block.checked ? "checkbox-marked" : "checkbox-blank-outline"
                  }
                  size={18}
                  color={
                    block.checked
                      ? colors.feedback.success
                      : textColor || colors.text.secondary
                  }
                  style={styles.checkboxIcon}
                />
                <Text
                  style={[
                    variant === "instruction" ? styles.bodyLarge : styles.body,
                    block.checked && styles.completedText,
                    textStyle,
                  ]}
                >
                  {parseLinksAndBold(block.text, linkColor, textColor)}
                </Text>
              </View>
            );

          case "list":
            return (
              <View key={index} style={styles.listItem}>
                <Text style={[styles.bullet, textStyle]}>{block.marker}</Text>
                <Text
                  style={[
                    variant === "instruction" ? styles.bodyLarge : styles.body,
                    styles.listText,
                    textStyle,
                  ]}
                >
                  {parseLinksAndBold(block.text, linkColor, textColor)}
                </Text>
              </View>
            );

          case "paragraph":
          default:
            return (
              <Text
                key={index}
                style={[
                  variant === "instruction" ? styles.bodyLarge : styles.body,
                  textStyle,
                ]}
              >
                {parseLinksAndBold(block.text, linkColor, textColor)}
              </Text>
            );
        }
      })}
    </View>
  );
};

type Block =
  | { kind: "blank" }
  | { kind: "header"; level: 1 | 2 | 3 | 4; text: string }
  | { kind: "blockquote"; text: string }
  | { kind: "checkbox"; checked: boolean; text: string }
  | { kind: "list"; marker: string; text: string }
  | { kind: "paragraph"; text: string };

/** Does a trimmed line carry a marker that starts a genuinely new block? */
function isBlockMarker(trimmed: string): boolean {
  return (
    trimmed.startsWith("#") ||
    trimmed.startsWith("> ") ||
    trimmed.startsWith("- ") ||
    trimmed.startsWith("* ") ||
    /^\d+\.\s/.test(trimmed)
  );
}

/** Does a trimmed line start a NEW block, rather than continue the current one? */
function startsNewBlock(trimmed: string): boolean {
  return trimmed === "" || isBlockMarker(trimmed);
}

/**
 * Groups raw source lines into render blocks.
 *
 * The server wraps prose at arbitrary source-line boundaries — a single quote
 * or a single list item's text routinely spans several lines with no blank
 * line between them. Rendering one line at a time (the previous behaviour)
 * turned each of those into its own element: a wrapped list item lost its
 * hanging indent the moment its second line didn't start with "2. ", and a
 * multi-line quote became several disconnected boxes with the sentence cut
 * between them. Grouping first — a blockquote run joins into one quote, a
 * list item swallows any immediately-following unmarked lines as its own
 * continuation — is what lets those render as a single element again.
 */
function groupBlocks(lines: string[]): Block[] {
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const trimmed = lines[i].trim();

    if (trimmed === "") {
      blocks.push({ kind: "blank" });
      i++;
      continue;
    }

    if (trimmed.startsWith("#### ")) {
      blocks.push({ kind: "header", level: 4, text: trimmed.slice(5) });
      i++;
      continue;
    }
    if (trimmed.startsWith("### ")) {
      blocks.push({ kind: "header", level: 3, text: trimmed.slice(4) });
      i++;
      continue;
    }
    if (trimmed.startsWith("## ")) {
      blocks.push({ kind: "header", level: 2, text: trimmed.slice(3) });
      i++;
      continue;
    }
    if (trimmed.startsWith("# ")) {
      blocks.push({ kind: "header", level: 1, text: trimmed.slice(2) });
      i++;
      continue;
    }

    if (trimmed.startsWith("> ")) {
      const parts = [trimmed.slice(2)];
      i++;
      while (i < lines.length && lines[i].trim().startsWith("> ")) {
        parts.push(lines[i].trim().slice(2));
        i++;
      }
      blocks.push({ kind: "blockquote", text: parts.join(" ") });
      continue;
    }

    const checkboxMatch = trimmed.match(/^- \[([ xX])\] (.*)/);
    if (checkboxMatch) {
      blocks.push({
        kind: "checkbox",
        checked: checkboxMatch[1].toLowerCase() === "x",
        text: checkboxMatch[2],
      });
      i++;
      continue;
    }

    const bulletMatch = trimmed.match(/^[-*] (.*)/);
    const orderedMatch = trimmed.match(/^(\d+)\.\s(.*)/);
    if (bulletMatch || orderedMatch) {
      const marker = orderedMatch ? `${orderedMatch[1]}.` : "•";
      const parts = [orderedMatch ? orderedMatch[2] : bulletMatch![1]];
      i++;
      // Lazy continuation: unmarked lines right after a list item are that
      // item's own wrapped text. A blank line inside that run is swallowed
      // as an internal paragraph break rather than ending the item — it only
      // really ends the item when the blank is followed by nothing else, or
      // by the start of the next block (a new list entry, a header, a quote).
      // Without this, a stray blank line mid-explanation knocks the rest of
      // the item's own text out to the left margin as an unindented paragraph.
      while (i < lines.length) {
        const next = lines[i].trim();
        if (next === "") {
          const after = lines[i + 1]?.trim() ?? "";
          if (after === "" || isBlockMarker(after)) break;
          i++;
          continue;
        }
        if (isBlockMarker(next)) break;
        parts.push(next);
        i++;
      }
      blocks.push({ kind: "list", marker, text: parts.join(" ") });
      continue;
    }

    // Paragraph: merge consecutive unmarked lines into one block of prose,
    // the same way a blank-line-free run of lines is one paragraph in
    // standard markdown.
    const parts = [trimmed];
    i++;
    while (i < lines.length && !startsNewBlock(lines[i].trim())) {
      parts.push(lines[i].trim());
      i++;
    }
    blocks.push({ kind: "paragraph", text: parts.join(" ") });
  }

  return blocks;
}

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
  // flexShrink so a merged multi-line item wraps within the row instead of
  // pushing past it — items can now carry a full continuation paragraph.
  listText: {
    flexShrink: 1,
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
    paddingRight: 16,
    paddingVertical: 12,
    marginVertical: 12,
    backgroundColor: c.action.primaryTint,
    borderRadius: t.radius.sm,
  },
  blockquoteText: {
    ...t.typography.bodySm,
    fontStyle: "italic",
    color: c.text.secondary,
    lineHeight: 22,
  },
}));
