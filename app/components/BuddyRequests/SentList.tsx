import React from "react";
import { StyleSheet, View } from "react-native";

import {
  Text,
  borderWidth,
  radius,
  space,
  useTheme,
} from "../../design-system";
import PressableScale from "../PressableScale";
import { UserAvatar } from "../UserAvatar";
import type { BuddyRequest } from "../../api/buddies";
import { relativeAgo } from "../../util/functions/time";

export interface SentRequestListProps {
  requests: BuddyRequest[];
  /** The id being cancelled right now, if any: its button reads "Cancelling…". */
  busyId: string | null;
  onCancel: (req: BuddyRequest) => void;
}

/**
 * Requests YOU sent that are still waiting for an answer.
 *
 * These were nowhere in the app (buddy audit 2026-11-28, B5). A request sent
 * by code, or to someone who later stopped being listed or paired with
 * somebody else, could not be seen or withdrawn, yet still counted toward the
 * limit of five, which then refused the next ask with nothing to act on.
 *
 * `recipientPaired` is the one fact the sender cannot learn anywhere else, and
 * it is what the receiver's "On hold" note promises them: they can see you are
 * paired. Said here, plainly, instead of a softer line.
 */
export const SentRequestList: React.FC<SentRequestListProps> = ({
  requests,
  busyId,
  onCancel,
}) => {
  const { colors } = useTheme();
  if (requests.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text variant="title">Sent</Text>
      <View
        style={[
          styles.group,
          { backgroundColor: colors.surface.default, borderColor: colors.border.default },
        ]}
      >
        {requests.map((req, i) => {
          const first = req.profile.name?.split(" ")[0] || "Someone";
          const asked = relativeAgo(req.createdAt);
          const sub = req.recipientPaired
            ? "Paired with someone else for now"
            : asked
              ? `You asked ${asked}`
              : "Waiting for an answer";
          const busy = busyId === req.id;
          return (
            <View
              key={req.id}
              style={[
                styles.row,
                i < requests.length - 1
                  ? { borderBottomWidth: borderWidth.hairline, borderBottomColor: colors.border.default }
                  : null,
              ]}
            >
              <UserAvatar manifest={req.profile.avatarManifest} size={40} shape="square" />
              <View style={styles.text}>
                <Text variant="title" numberOfLines={1}>
                  {first}
                </Text>
                <Text variant="bodySm" color="tertiary" numberOfLines={2}>
                  {sub}
                </Text>
              </View>
              <PressableScale
                onPress={() => onCancel(req)}
                disabled={busyId !== null}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={`Cancel your request to ${first}`}
              >
                <Text variant="caption" color={busy ? "tertiary" : "accent"} style={styles.cancel}>
                  {busy ? "Cancelling…" : "Cancel"}
                </Text>
              </PressableScale>
            </View>
          );
        })}
      </View>
    </View>
  );
};

export default SentRequestList;

const styles = StyleSheet.create({
  section: { gap: space.rowGap },
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
  cancel: { fontWeight: "600" },
});
