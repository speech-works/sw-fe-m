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

            // A level-2 heading carries the brand mark, and the mark is its own
            // fixed-width View rather than a border on the Text.
            //
            // The border version was tried first and is wrong on real content.
            // A bordered Text hugs its words only while the words fit one line;
            // the moment the text wraps, the Text fills the column and the rule
            // spans the full width. 52% of the 141 headings in the catalogue
            // wrap at this size, so half the shelf silently rendered as a
            // full-bleed masthead and half as a content-width rule — one
            // component producing two different designs, decided by how long
            // somebody's heading happened to be.
            //
            // A fixed mark reads identically at every heading length.
            if (block.level === 2) {
              return (
                // No marginTop reset at index 0. A teach block opens on its
                // heading, and that heading sits directly under the progress
                // bar; zeroing the margin crowds the two together. The 36 is
                // the breathing room at the top of a day, not dead space.
                <View key={index} style={styles.h2Block}>
                  <Text style={[styles.h2, textStyle]}>{block.text}</Text>
                  <View style={styles.h2Mark} />
                </View>
              );
            }

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
  // ── THE SLAB ──────────────────────────────────────────────────────────
  // A section heading is an OBJECT, not just larger text: 25 against a 16px
  // body is a 1.56x jump where `typography.h2` gave 1.37x, and the brand rule
  // under it is structural rather than decorative. Not a new hue — the rule is
  // `action.primary`, the same orange the CTA uses.
  //
  // `alignSelf: "flex-start"` is the React Native equivalent of
  // `width: fit-content`, and it is load-bearing: without it the Text
  // stretches to the column and the rule runs edge to edge, which is a
  // different (and much heavier) design than the one that was chosen.
  //
  // The values are spelled out rather than spread from a typography token
  // because no token carries this pairing, and inventing `typography.slab`
  // for one consumer would put a pack-specific decision in the design system.
  // The wrapper owns the spacing so the heading and its mark move together.
  // More room above than below, so a heading binds to the section it opens
  // rather than to the paragraph it follows. It used to get 16 on both.
  h2Block: {
    marginTop: 36,
    marginBottom: 12,
  },
  h2: {
    fontFamily: fonts.extrabold,
    fontSize: 25,
    lineHeight: 28.5,
    letterSpacing: -0.7,
    color: c.text.primary,
  },
  // Fixed width on purpose. See the note at the level-2 branch above: anything
  // that derives its width from the text is a different design on a heading
  // that wraps, and most of them do.
  h2Mark: {
    width: 44,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: c.action.primary,
    marginTop: 12,
  },
  h3: {
    ...t.typography.title,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.2,
    color: c.text.primary,
    marginTop: 28,
    marginBottom: 8,
  },
  h4: {
    ...t.typography.title,
    fontSize: 16,
    color: c.text.primary,
    marginTop: 22,
    marginBottom: 8,
  },
  body: {
    ...t.typography.body,
    color: c.text.primary,
    // 4, not 12. A blank source line already emits its own 12px spacer, so a
    // 12 here made every paragraph gap 24px and the day read as one long
    // undifferentiated column. 4 + 12 = the 16 that was wanted all along.
    marginBottom: 4,
  },
  // Was byte-identical to `body`, which made `variant="instruction"` a no-op
  // at its one call site (RealLifeChallenge). It now actually is larger.
  bodyLarge: {
    ...t.typography.body,
    fontSize: 17,
    lineHeight: 26,
    color: c.text.primary,
    marginBottom: 4,
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
  // A blockquote in pack content is never an aside. It carries the lines the
  // user is meant to say out loud, and the definitions. Rendering it SMALLER
  // than the prose around it inverted the emphasis.
  blockquote: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginVertical: 16,
    backgroundColor: c.action.primaryTint,
    borderRadius: t.radius.md,
  },
  blockquoteText: {
    ...t.typography.body,
    // Semibold, not italic. A run of italic at body length is harder to read,
    // and weight carries the emphasis without costing legibility.
    fontFamily: fonts.semibold,
    lineHeight: 24,
    // A FALLBACK, not the effective value. Every caller passes `textColor`,
    // which is applied after this style and wins — which is why the old
    // `text.secondary` here never actually rendered grey. It is kept at
    // `primary` so the style is still correct on its own if a future caller
    // omits the prop, rather than falling through to platform-default black.
    // If a variant ever needs the quote to own its colour (a solid brand fill
    // needs `action.onPrimary`), the override in the component has to move.
    color: c.text.primary,
  },
}));
