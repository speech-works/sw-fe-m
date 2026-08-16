import React from "react";
import { StyleSheet, View } from "react-native";

import {
  Button,
  Chip,
  Sheet,
  Text,
  spacing,
  space,
} from "../../design-system";
import PressableScale from "../PressableScale";
import { UserAvatar } from "../UserAvatar";
import type { BuddyRequest } from "../../api/buddies";
import { monthYear, relativeAgo } from "../../util/functions/time";

/**
 * Does this request have anything to say beyond a name?
 *
 * Exported because the LIST needs the same answer: a row is only worth opening
 * when opening it adds something, and a chevron that leads to a repeat of the
 * row is worse than no chevron. Keeping the test in one place is what stops the
 * two drifting apart the day a new field is added.
 *
 * `memberSince` deliberately does NOT count. It is true of everybody and it is
 * not why you would say yes to someone, so a sheet containing only that is
 * still an empty sheet.
 */
export const hasPublishedDetail = (req: BuddyRequest): boolean =>
  !!req.matchReason || (req.tags?.length ?? 0) > 0;

export interface RequestSheetProps {
  /** The request being examined, or null when the sheet is closed. */
  request: BuddyRequest | null;
  busy: boolean;
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
  onClose,
  onAccept,
  onDecline,
  onReport,
  onDismissed,
}) => {
  // Hold the last non-null request so the content does not blank out during the
  // 200ms exit — clearing the parent's state is what closes the sheet.
  const lastRef = React.useRef<BuddyRequest | null>(null);
  if (request) lastRef.current = request;
  const req = request ?? lastRef.current;
  if (!req) return null;

  const first = req.profile.name?.split(" ")[0] || "Someone";
  const asked = relativeAgo(req.createdAt);
  const since = req.memberSince ? monthYear(req.memberSince) : null;

  return (
    <Sheet visible={request !== null} onClose={onClose} onDismissed={onDismissed}>
      <View style={styles.body}>
        <View style={styles.head}>
          <UserAvatar manifest={req.profile.avatarManifest} size={64} shape="square" />
          <View style={styles.headText}>
            <Text variant="h3" numberOfLines={1}>
              {first}
            </Text>
            {asked ? (
              <Text variant="bodySm" color="tertiary">
                Asked you {asked}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Null means there is nothing honest to claim. Show nothing, never a
            softer line. */}
        {req.matchReason ? (
          <Text variant="bodySm" color="secondary" style={styles.reason}>
            {req.matchReason}
          </Text>
        ) : null}

        {req.tags?.length ? (
          <View style={styles.tags}>
            {req.tags.map((t) => (
              <Chip key={t} label={t} />
            ))}
          </View>
        ) : null}

        {since ? (
          <Text variant="caption" color="tertiary" style={styles.since}>
            On Speechworks since {since}
          </Text>
        ) : null}

        {/* Accept is the filled one and sits on the right, where the row's
            Accept already is. Two surfaces, one muscle memory. */}
        <View style={styles.actions}>
          <Button
            variant="secondary"
            label="Decline"
            disabled={busy}
            onPress={() => onDecline(req)}
            style={styles.action}
          />
          <Button
            label="Accept"
            disabled={busy}
            onPress={() => onAccept(req)}
            style={styles.action}
          />
        </View>

        {/* Quiet, and last. This is the one surface where a stranger can reach
            you, so the exit has to be here — but a person who asked to practise
            with you is not a suspect, and it must not sit at the same weight as
            the answer. */}
        <PressableScale
          onPress={() => onReport(req)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`Block or report ${first}`}
          style={styles.report}
        >
          <Text variant="caption" color="tertiary">
            Block or report {first}
          </Text>
        </PressableScale>
      </View>
    </Sheet>
  );
};

export default RequestSheet;

const styles = StyleSheet.create({
  body: { paddingBottom: space.inlineGap },
  head: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  headText: { flex: 1, minWidth: 0, gap: spacing.xxs },
  reason: { marginTop: space.titleGap },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: space.inlineGap,
  },
  since: { marginTop: space.inlineGap },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: space.sectionGap,
  },
  action: { flex: 1 },
  report: { alignSelf: "center", marginTop: space.inlineGap, padding: spacing.xs },
});
