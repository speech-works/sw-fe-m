import React from "react";
import { StyleSheet, View } from "react-native";

import {
  Button,
  IconButton,
  Sheet,
  Text,
  icons,
  fonts,
  spacing,
  space,
  useTheme,
} from "../../design-system";
import { UserAvatar } from "../../components/UserAvatar";
import TagGroup from "../../components/DiscoveryTags/TagGroup";
import type { DiscoveryCandidate } from "../../api/buddies";

/**
 * One person from Discover, in enough detail to decide.
 *
 * DELIBERATELY THE SAME SHEET AS A REQUEST. Same header, same identity row,
 * same mutual line, same labelled tag cards, same pinned pair of actions. Two
 * surfaces showing the same kind of object should not be two designs, and the
 * roster row that opens this is now the same row the requests list uses.
 *
 * It exists because the row could not hold this. Discover's rows had grown a
 * reason line, two labelled tag lines, a button and an overflow — four text
 * elements and three controls each — while the requests list next door said a
 * name, one line and a chevron. The detail was never wrong, it was in the wrong
 * place: a list is for choosing what to open, and this is what you opened.
 */
export interface CandidateSheetProps {
  person: DiscoveryCandidate | null;
  /** Mid-flight, so both actions dim and stop responding. */
  busy: boolean;
  onClose: () => void;
  onAsk: (p: DiscoveryCandidate) => void;
  onWithdraw: (p: DiscoveryCandidate) => void;
  onReport: (p: DiscoveryCandidate) => void;
  /** Fires once the sheet has FULLY unmounted; anything that opens another
   *  native Modal must wait for it. */
  onDismissed: () => void;
}

export const CandidateSheet: React.FC<CandidateSheetProps> = ({
  person,
  busy,
  onClose,
  onAsk,
  onWithdraw,
  onReport,
  onDismissed,
}) => {
  const { colors } = useTheme();
  // Hold the last non-null person so the content does not blank out during the
  // exit — clearing the parent's state is what closes the sheet.
  const lastRef = React.useRef<DiscoveryCandidate | null>(null);
  if (person) lastRef.current = person;
  const p = person ?? lastRef.current;
  if (!p) return null;

  const first = p.name.split(" ")[0];
  const asked = !!p.requestId;
  const practising = p.tags.filter((t) => t.group === "practising");
  const hoping = p.tags.filter((t) => t.group === "hoping");

  /**
   * Asked is a STATE, not a button.
   *
   * When you have already asked, the filled control would be "cancel", and
   * making the loudest thing on the sheet the destructive one is backwards.
   * So the state sits where the button was, at the same height, and
   * withdrawing is the quiet half of the pair.
   */
  const footer = (
    <View style={styles.actions}>
      {asked ? (
        <>
          <Button
            variant="outline"
            onColor={colors.text.secondary}
            label={busy ? "Cancelling…" : "Cancel request"}
            disabled={busy}
            onPress={() => onWithdraw(p)}
            style={styles.action}
          />
          <View style={[styles.settled, { borderColor: colors.border.hairline }]}>
            <Text variant="label" color="tertiary">
              Asked
            </Text>
          </View>
        </>
      ) : (
        <Button
          label={busy ? "Sending…" : "Ask to pair"}
          disabled={busy}
          onPress={() => onAsk(p)}
          style={styles.action}
        />
      )}
    </View>
  );

  return (
    <Sheet
      visible={person !== null}
      onClose={onClose}
      onDismissed={onDismissed}
      title="Profile"
      right={
        <>
          <IconButton
            name={icons.more}
            onPress={() => onReport(p)}
            accessibilityLabel={`Block or report ${first}`}
          />
          <IconButton name={icons.close} onPress={onClose} accessibilityLabel="Close" />
        </>
      }
      footer={footer}
    >
      <View style={styles.body}>
        <View style={styles.head}>
          <UserAvatar manifest={p.avatarManifest} size={58} shape="square" />
          <View style={styles.headText}>
            <Text variant="h3" numberOfLines={1}>
              {first}
            </Text>
            <Text variant="caption" color="tertiary" numberOfLines={1}>
              {asked ? "You asked them" : "Open to a practice buddy"}
            </Text>
          </View>
        </View>

        {/* Null means there is nothing honest to claim. Show nothing at all,
            never a softer line. */}
        {p.matchReason ? (
          <View style={styles.mutual}>
            <View style={[styles.mutualDot, { backgroundColor: colors.text.accent }]} />
            <Text variant="bodySm" color="accent" style={styles.mutualText}>
              {p.matchReason}
            </Text>
          </View>
        ) : null}

        <TagGroup label="Practising" tags={practising} />
        <TagGroup label="Hoping for" tags={hoping} />
      </View>
    </Sheet>
  );
};

export default CandidateSheet;

const styles = StyleSheet.create({
  body: { paddingBottom: space.inlineGap },
  head: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  headText: { flex: 1, minWidth: 0, gap: spacing.xxs },
  mutual: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: space.titleGap,
  },
  mutualDot: { width: 7, height: 7, borderRadius: 99 },
  mutualText: { flex: 1, fontFamily: fonts.semibold },
  actions: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  action: { flex: 1 },
  // Matches `Button` size md, so swapping the filled control for a state does
  // not change the footer's height.
  settled: {
    height: 48,
    paddingHorizontal: space.cardPad,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
