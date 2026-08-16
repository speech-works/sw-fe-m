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
import { UserAvatar } from "../UserAvatar";
import TagGroup from "../DiscoveryTags/TagGroup";
import type { BuddyRequest } from "../../api/buddies";
import { monthYear, relativeAgo } from "../../util/functions/time";

export interface RequestSheetProps {
  /** The request being examined, or null when the sheet is closed. */
  request: BuddyRequest | null;
  busy: boolean;
  /**
   * Paired already, so nothing here can be accepted.
   *
   * The sheet stays open and Decline stays available — you can still see who
   * asked, and you can still answer no. Accept goes, because a control that
   * cannot work is worse than no control: it looks live and it lies.
   *
   * This USED to be honoured only by the list, which hid its row-level Accept
   * while the sheet behind it went on offering one. Nobody caught it because
   * the row was the path everyone took. Now that answering happens here and
   * only here, the sheet is the only thing that can enforce it.
   */
  onHold?: boolean;
  onClose: () => void;
  onAccept: (req: BuddyRequest) => void;
  onDecline: (req: BuddyRequest) => void;
  onReport: (req: BuddyRequest) => void;
  /**
   * Fires once the sheet has fully unmounted.
   *
   * NOT a nicety. Accept opens the pairing modal and Decline opens the decline
   * sheet, and both are native `Modal`s: presenting one while this is still on
   * screen stacks two of them and freezes touch across the whole app on iOS.
   * Every action here therefore closes first and does its work from here.
   */
  onDismissed: () => void;
}

/**
 * Who is this, in enough detail to answer them.
 *
 * A sheet rather than a screen because the list underneath is the point: with
 * twenty requests you open somebody, close them, and carry on from where you
 * were. A pushed screen would make each of twenty answers a round trip.
 *
 * Everything shown here is the sender's own card. Nothing is inferred, nothing
 * is scored, and when a field is missing the sheet simply gets shorter — there
 * is no filler copy standing in for data we do not have. That is the same rule
 * the Discover card follows, and it matters more here: on Discover you chose to
 * browse, whereas this person arrived unasked.
 */
export const RequestSheet: React.FC<RequestSheetProps> = ({
  request,
  busy,
  onHold = false,
  onClose,
  onAccept,
  onDecline,
  onReport,
  onDismissed,
}) => {
  const { colors } = useTheme();
  // Hold the last non-null request so the content does not blank out during the
  // 200ms exit — clearing the parent's state is what closes the sheet.
  const lastRef = React.useRef<BuddyRequest | null>(null);
  if (request) lastRef.current = request;
  const req = request ?? lastRef.current;
  if (!req) return null;

  const first = req.profile.name?.split(" ")[0] || "Someone";
  const asked = relativeAgo(req.createdAt);
  const since = req.memberSince ? monthYear(req.memberSince) : null;
  // "Asked 21h ago · since Aug 2026", and gracefully shorter when either half
  // is missing rather than leaving a stray separator.
  const meta = [asked ? `Asked ${asked}` : null, since ? `since ${since}` : null]
    .filter(Boolean)
    .join("  ·  ");
  const practising = (req.tags ?? []).filter((t) => t.group === "practising");
  const hoping = (req.tags ?? []).filter((t) => t.group === "hoping");

  /**
   * The answer pair, pinned.
   *
   * DECLINE IS `outline`, NOT `secondary`, and that is a bug fix rather than a
   * preference. On the dark scheme `surface.elevated` and `action.secondary`
   * are the same token (`ink.row`, #2E2A24), so a secondary Button sitting on
   * a Sheet has a 1.00:1 boundary — it is not styled like text, it is an
   * invisible button. `outline` with a neutral `onColor` gives it a real edge
   * without borrowing the accent, which belongs to Accept alone here.
   */
  const answers = (
    <View style={styles.actions}>
      <Button
        variant="outline"
        onColor={colors.text.secondary}
        label="Decline"
        disabled={busy}
        onPress={() => onDecline(req)}
        style={styles.action}
      />
      {/* Held: you already have a buddy, so this cannot be accepted. The line
          says why rather than showing a button that would fail. */}
      {onHold ? (
        <Text variant="caption" color="tertiary" style={styles.held}>
          You have a buddy, so this one is waiting.
        </Text>
      ) : (
        <Button
          label="Accept"
          disabled={busy}
          onPress={() => onAccept(req)}
          style={styles.action}
        />
      )}
    </View>
  );

  return (
    <Sheet
      visible={request !== null}
      onClose={onClose}
      onDismissed={onDismissed}
      // The scaffolding every other sheet in the app has and this one did not:
      // a title naming what it is, and the close affordance. Without them it
      // opened as a floating slab of text with no frame, which is most of why
      // it did not read as one of ours.
      title="Request"
      /* TWO CONTROLS, overflow then close — the order they are reached in, and
         the order of consequence. Both live in the header rather than in the
         body: an action on the whole person belongs to the sheet's chrome, and
         the previous placements (a centred sentence in the flow, then a glyph
         on the identity row) both put a moderation action inside the reading
         order of somebody's profile. */
      right={
        <>
          <IconButton
            name={icons.more}
            onPress={() => onReport(req)}
            accessibilityLabel={`Block or report ${first}`}
          />
          <IconButton name={icons.close} onPress={onClose} accessibilityLabel="Close" />
        </>
      }
      // Pinned, like every other commit action. Two buttons rather than the
      // one the prop asks for, deliberately: these are the two halves of a
      // single answer, and putting the negative one somewhere else would make
      // saying no harder to find than saying yes.
      footer={answers}
    >
      <View style={styles.body}>
        <View style={styles.head}>
          <UserAvatar manifest={req.profile.avatarManifest} size={58} shape="square" />
          <View style={styles.headText}>
            <Text variant="h3" numberOfLines={1}>
              {first}
            </Text>
            {/* BOTH FACTS, ONE LINE. "On Speechworks since Aug 2026" used to be
                its own row further down, at the same weight as the things this
                person actually chose to say — and it is true of nearly
                everybody, so it earned none of that room. Up here next to the
                ask time it is context rather than content, and it costs a line
                instead of a block. */}
            {meta ? (
              <Text variant="caption" color="tertiary" numberOfLines={1}>
                {meta}
              </Text>
            ) : null}
          </View>
        </View>

        {/* The one thing you have in common, as a LINE rather than a proof.
            This replaced a two-column table of you against them: the table
            answered the question but made the sheet a report, and the answer
            fits in a sentence. Null when there is nothing honest to claim —
            show nothing at all, never a softer line. */}
        {req.matchReason ? (
          <View style={styles.mutual}>
            <View style={[styles.mutualDot, { backgroundColor: colors.text.accent }]} />
            <Text variant="bodySm" color="accent" style={styles.mutualText}>
              {req.matchReason}
            </Text>
          </View>
        ) : null}

        {/* One card per question, in the order they were asked, so a value is
            never shown without the thing it answers. Each renders nothing when
            its side is empty, so somebody who published only one gets one. */}
        <TagGroup label="Practising" tags={practising} />
        <TagGroup label="Hoping for" tags={hoping} />
      </View>
    </Sheet>
  );
};

export default RequestSheet;

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
  tags: { marginTop: space.inlineGap },
  since: { marginTop: space.inlineGap },
  // In the pinned footer now, so it owns no top margin of its own.
  actions: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  action: { flex: 1 },
  held: { flex: 1, textAlign: "center" },
});
