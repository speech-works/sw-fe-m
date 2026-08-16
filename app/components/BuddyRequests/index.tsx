import React from "react";
import { StyleSheet, View } from "react-native";

import {
  Button,
  EmptyState,
  Icon,
  Text,
  borderWidth,
  icons,
  radius,
  size,
  space,
  spacing,
  useTheme,
} from "../../design-system";
import PressableScale from "../PressableScale";
import { UserAvatar } from "../UserAvatar";
import type { BuddyRequest } from "../../api/buddies";
import { relativeAgo } from "../../util/functions/time";
import { hasPublishedDetail } from "./RequestSheet";

export interface BuddyRequestListProps {
  requests: BuddyRequest[];
  /** The row currently mid-flight; its controls dim and stop responding. */
  busyId: string | null;
  onOpen: (req: BuddyRequest) => void;
  onAccept: (req: BuddyRequest) => void;
  onDecline: (req: BuddyRequest) => void;
  /**
   * Paired already, so nothing here can be accepted.
   *
   * The rows stay legible and stay open (you can still decline, and you can
   * still see who asked) but the Accept button goes, because a control that
   * cannot work is worse than no control: it looks live and it lies.
   */
  onHold?: boolean;
}

/**
 * The people waiting on an answer.
 *
 * Two things this list refuses to do. It never prints the same sentence under
 * every name — the old row said "wants to practise together" for everyone,
 * which is a constant dressed as information, and a constant is exactly what a
 * list should drop. And it only offers to open a person when opening them adds
 * something: no published card, no chevron.
 */
export const BuddyRequestList: React.FC<BuddyRequestListProps> = ({
  requests,
  busyId,
  onOpen,
  onAccept,
  onDecline,
  onHold = false,
}) => {
  const { colors } = useTheme();

  if (requests.length === 0) {
    return (
      <EmptyState
        icon={icons.success}
        title="All caught up"
        message="No one is waiting on you right now."
      />
    );
  }

  return (
    <View
      style={[
        styles.group,
        { backgroundColor: colors.surface.default, borderColor: colors.border.default },
      ]}
    >
      {requests.map((req, i) => {
        const first = req.profile.name?.split(" ")[0] || "Someone";
        const asked = relativeAgo(req.createdAt);
        const openable = hasPublishedDetail(req);
        const busy = busyId === req.id;

        const body = (
          <View style={styles.row}>
            <UserAvatar manifest={req.profile.avatarManifest} size={40} shape="square" />

            <View style={styles.text}>
              <Text variant="title" numberOfLines={1}>
                {first}
              </Text>
              {/* Tags where the constant sentence used to be, as a joined line
                  rather than chips: the DS `Chip` is 36pt tall by design and
                  would make every row a card. Chips get their room in the
                  sheet, where the person is the whole subject.

                  When there are no tags, the time they asked is the only true
                  thing left to say, and it is at least different per row. */}
              <Text variant="bodySm" color="tertiary" numberOfLines={1}>
                {req.tags?.length ? req.tags.slice(0, 2).join(" · ") : asked ? `Asked you ${asked}` : ""}
              </Text>
            </View>

            {onHold ? (
              <Text variant="caption" color="tertiary">
                On hold
              </Text>
            ) : (
              <View style={styles.actions}>
                <Button
                  label="Accept"
                  size="sm"
                  fullWidth={false}
                  disabled={busy}
                  onPress={() => onAccept(req)}
                />
                <PressableScale
                  onPress={() => onDecline(req)}
                  disabled={busy}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Decline ${first}`}
                >
                  <Text variant="bodySm" color="secondary">
                    Decline
                  </Text>
                </PressableScale>
              </View>
            )}

            {/* Only when there is somewhere to go. */}
            {openable ? (
              <Icon name={icons.chevronRight} size={size.iconSm} color={colors.text.tertiary} />
            ) : null}
          </View>
        );

        const divider =
          i < requests.length - 1
            ? { borderBottomWidth: borderWidth.hairline, borderBottomColor: colors.border.default }
            : null;

        // The whole row is the target when it opens something. Not wrapped in a
        // touchable otherwise: a row that highlights under your thumb and then
        // does nothing is a dead tap, and the dead-tap detector would be right
        // to flag it.
        return openable ? (
          <PressableScale
            key={req.id}
            scaleTo={0.99}
            onPress={() => onOpen(req)}
            accessibilityRole="button"
            accessibilityLabel={`${first}, see details`}
            style={divider}
          >
            {body}
          </PressableScale>
        ) : (
          <View key={req.id} style={divider}>
            {body}
          </View>
        );
      })}
    </View>
  );
};

export default BuddyRequestList;

const styles = StyleSheet.create({
  group: {
    borderRadius: radius.card,
    borderWidth: borderWidth.hairline,
    paddingHorizontal: space.cardPad,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.iconText,
    paddingVertical: space.rowGap,
  },
  text: { flex: 1, minWidth: 0, gap: space.titleSub },
  actions: { alignItems: "center", gap: spacing.sm },
});
