import React, { useState } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { Text, spacing } from "../design-system";
import { splitWaitMessage } from "../services/purchaseSettlement";

/**
 * The message UNDER a Buy button while it waits, or once it is free again
 * (F1 "Your last purchase is still finishing.", its one-time "has finished"
 * note, the F3 "No payment went through." note). The founder's layout, 9 Nov
 * 2026: centred, in the caption style of the checkout sheet's "Nothing is
 * charged until you confirm.", the first sentence in the bright ink, then the
 * rest in grey on the next line. No icon, no box, no background.
 *
 * ── NO LAYOUT SHIFT ────────────────────────────────────────────────────────
 * With `reserve`, the slot has ONE height whatever it shows (or nothing, as in
 * F3 "Checking your payment…"): the tallest of `candidates` at the current
 * font scale. An invisible in-flow copy of the longest candidate gives that
 * height from the first frame; invisible copies of every candidate are
 * measured and the slot takes the tallest, which covers a shorter text that
 * wraps to more lines. The visible message is laid over the slot, so changing
 * it never moves the button or the price. Remounted on a font-scale change
 * (Dynamic Type, Android font size), so it is measured again.
 */
export interface WaitMessageProps {
  text: string | null | undefined;
  /** Every message this slot can show. Sizes the reserved slot. */
  candidates?: readonly string[];
  /** Keep the slot's full height even with no text. */
  reserve?: boolean;
  /**
   * Shown when there is no message: one grey caption line, top-aligned (the
   * program sales page's "Nothing is charged until you confirm."). Counted in
   * the slot's height like any candidate.
   */
  idleText?: string | null;
}

export const WaitMessage: React.FC<WaitMessageProps> = (props) => {
  const { fontScale } = useWindowDimensions();
  return <WaitMessageSlot key={fontScale} {...props} />;
};

const WaitMessageSlot: React.FC<WaitMessageProps> = ({
  text,
  candidates = [],
  reserve = false,
  idleText = null,
}) => {
  const [tallest, setTallest] = useState(0);
  if (!reserve || candidates.length === 0) {
    if (text) return <Lines text={text} />;
    return idleText ? <IdleLine text={idleText} /> : null;
  }
  const longest = candidates.reduce((a, b) => (b.length > a.length ? b : a), "");
  return (
    <View style={[styles.slot, { minHeight: tallest }]}>
      {/* The in-flow sizer: the slot has a height on its very first frame. */}
      <View style={styles.hidden} {...HIDDEN}>
        <Lines text={longest} />
      </View>
      {/* Every candidate, measured where nobody sees it. */}
      {candidates.map((c) => (
        <View
          key={c}
          style={[styles.layer, styles.hidden]}
          {...HIDDEN}
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            setTallest((t) => (h > t ? h : t));
          }}
        >
          <Lines text={c} />
        </View>
      ))}
      {idleText ? (
        <View
          style={[styles.layer, styles.hidden]}
          {...HIDDEN}
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            setTallest((t) => (h > t ? h : t));
          }}
        >
          <IdleLine text={idleText} />
        </View>
      ) : null}
      {text ? (
        <View style={styles.layer}>
          <Lines text={text} />
        </View>
      ) : idleText ? (
        <View style={styles.layer}>
          <IdleLine text={idleText} />
        </View>
      ) : null}
    </View>
  );
};

const HIDDEN = {
  pointerEvents: "none" as const,
  accessibilityElementsHidden: true,
  importantForAccessibility: "no-hide-descendants" as const,
};

const Lines: React.FC<{ text: string }> = ({ text }) => {
  const { lead, rest } = splitWaitMessage(text);
  return (
    <View style={styles.lines} accessible accessibilityLabel={text}>
      <Text variant="caption" color="primary" center>
        {lead}
      </Text>
      {rest ? (
        <Text variant="caption" color="secondary" center>
          {rest}
        </Text>
      ) : null}
    </View>
  );
};

/** The idle caption: the checkout sheet's own style, grey, one line. */
const IdleLine: React.FC<{ text: string }> = ({ text }) => (
  <Text variant="caption" color="tertiary" center numberOfLines={1}>
    {text}
  </Text>
);

const styles = StyleSheet.create({
  slot: { alignSelf: "stretch" },
  lines: { gap: spacing.xs / 2, alignSelf: "stretch" },
  layer: { position: "absolute", top: 0, left: 0, right: 0 },
  hidden: { opacity: 0 },
});
