import React from "react";
import { StyleSheet, View } from "react-native";

import { Text, space, fonts } from "../../design-system";
import type { DiscoveryTag } from "../../api/buddies";

/**
 * What somebody said about themselves, under the question they answered.
 *
 * THE PROBLEM THIS EXISTS TO FIX. These used to render as a flat row of pills:
 * "Presenting", "Feeling calmer". One is a situation you practise, the other an
 * outcome you want, and nothing on screen said which was which — the person who
 * picked them saw the question above the picker, and the stranger reading the
 * card never did. So a value arrived with nothing to attach it to and meant
 * nothing at all. The question is now part of the line, always, in both places
 * a card appears.
 *
 * Two more things follow from that decision:
 *
 *  - NOT CHIPS. A `Chip` is 36pt tall and looks pressable, and these are not
 *    pressable. Three of them also cost more height than the rest of the card
 *    put together, which is most of why only one person fitted on screen.
 *    They are text on a labelled line.
 *  - SHARED IS COLOUR, NOT A SECOND SENTENCE. A tag you also claim is drawn in
 *    the accent. The alternative was repeating it in prose under the name,
 *    which is the same fact twice on one card.
 *
 * `shared` and `group` both come from the server. See `DiscoveryTag`.
 */
export interface DiscoveryTagsProps {
  tags: DiscoveryTag[];
  /** `sm` on a roster row, `md` in the spotlight and the request sheet. */
  size?: "sm" | "md";
  /** Shown when the person has published nothing. Omit to render nothing. */
  emptyLabel?: string;
}

const QUESTION: Record<DiscoveryTag["group"], string> = {
  practising: "Practising",
  hoping: "Hoping for",
};

/** The order the questions are asked in, so two cards never disagree. */
const GROUPS: DiscoveryTag["group"][] = ["practising", "hoping"];

export const DiscoveryTags: React.FC<DiscoveryTagsProps> = ({
  tags,
  size = "md",
  emptyLabel,
}) => {
  if (tags.length === 0) {
    return emptyLabel ? (
      <Text variant="caption" color="tertiary">
        {emptyLabel}
      </Text>
    ) : null;
  }

  const lines = GROUPS.map((group) => ({
    group,
    items: tags.filter((t) => t.group === group),
  })).filter((l) => l.items.length > 0);

  const body = size === "sm" ? "caption" : "bodySm";

  return (
    <View style={size === "sm" ? styles.wrapSm : styles.wrap}>
      {lines.map(({ group, items }) => (
        /**
         * ONE flowing line per question, label included.
         *
         * The label was a fixed-width column beside the values, and it could
         * not survive a narrow screen: "HOPING FOR" needs about 96pt at the
         * eyebrow's tracking, and on a roster row at 375pt that left roughly
         * 69pt for the values. The column wrapped its own label to "PRACTIS /
         * ING". Inline, there is no width to get wrong — the label is the
         * first word of a paragraph that wraps like any other, at any size.
         */
        <Text key={group} variant={body} color="secondary">
          <Text variant="eyebrow" color="disabled">
            {QUESTION[group]}
          </Text>
          {"  "}
          {items.map((t, i) => (
            <Text
              key={t.id}
              variant={body}
              // `text.accent`, NOT `action.primary`. Both are orange on the
              // dark scheme, but the action fill is #FF9040, which as TEXT on
              // the paper canvas measures 2.02:1. `text.accent` is the ink
              // cut (#A84600 there) and is the token the DS guards for it.
              color={t.shared ? "accent" : "secondary"}
              style={t.shared ? styles.shared : undefined}
            >
              {i > 0 ? ", " : ""}
              {t.label}
            </Text>
          ))}
        </Text>
      ))}
    </View>
  );
};

export default DiscoveryTags;

const styles = StyleSheet.create({
  wrap: { gap: space.titleSub },
  wrapSm: { gap: 1 },
  // Weight as well as colour, so a shared tag is still distinguishable to
  // anyone who cannot separate the two hues.
  shared: { fontFamily: fonts.semibold },
});
