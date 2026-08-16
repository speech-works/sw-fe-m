import React from "react";
import { StyleSheet, View } from "react-native";

import {
  EmptyState,
  Icon,
  Text,
  borderWidth,
  icons,
  radius,
  size,
  space,
  useTheme,
} from "../../design-system";
import PressableScale from "../PressableScale";
import { UserAvatar } from "../UserAvatar";
import type { BuddyRequest } from "../../api/buddies";
import { relativeAgo } from "../../util/functions/time";

export interface BuddyRequestListProps {
  requests: BuddyRequest[];
  onOpen: (req: BuddyRequest) => void;
}

/**
 * The people waiting on an answer.
 *
 * ANSWERING HAPPENS IN THE SHEET, not here. Every row used to carry its own
 * Accept and Decline, and five of them stacked up made five solid accent fills
 * on one screen — at which point nothing is the primary action and the eye
 * reads buttons instead of people. Worse, Accept was the largest, easiest
 * target on a row you had not read yet, and accepting pairs you with somebody
 * while putting everyone else on hold. That is not a decision to put under a
 * thumb travelling down a list.
 *
 * Removing the actions collapsed three other problems at once:
 *
 *  - The chevron used to be conditional on `hasPublishedDetail`, and being a
 *    flex sibling, its absence pushed everything left of it 28pt to the right.
 *    Rows with no published card sat visibly out of line with the rest.
 *  - "Decline" was bare text centred under a pill of a different width, so it
 *    lined up with nothing, at a 36pt touch target on the destructive action.
 *  - The gate itself is gone. It existed to avoid opening a sheet that only
 *    repeated its row; now the sheet is where you answer, so every row is
 *    worth opening and every row gets a chevron.
 *
 * The one thing this list still refuses to do is print the same sentence under
 * every name. The old row said "wants to practise together" for everyone,
 * which is a constant dressed as information.
 */
export const BuddyRequestList: React.FC<BuddyRequestListProps> = ({
  requests,
  onOpen,
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

        const body = (
          <View style={styles.row}>
            <UserAvatar manifest={req.profile.avatarManifest} size={40} shape="square" />

            <View style={styles.text}>
              <Text variant="title" numberOfLines={1}>
                {first}
              </Text>
              {/* Tags where the constant sentence used to be, as a line rather
                  than chips: the DS `Chip` is 36pt tall by design and would
                  make every row a card. The labelled form gets its room in the
                  sheet, where the person is the whole subject.

                  TWO LABELS AND A COUNT, over two lines. With Accept and
                  Decline gone the column went from about 125pt to 231, and
                  the worst pair the vocabulary can produce ("Talking about
                  stuttering, Answering questions +1") measures 301 against a
                  two-line capacity of 462. It was cut to one label because the
                  buttons were taking the width, not because one was the right
                  amount to say. Nothing here may ellipsise: a count is a
                  complete thing to read, half a word is not. */}
              <Text variant="bodySm" color="tertiary" numberOfLines={2}>
                {req.tags?.length
                  ? req.tags
                      .slice(0, 2)
                      .map((t) => t.label)
                      .join(", ") +
                    (req.tags.length > 2 ? ` +${req.tags.length - 2}` : "")
                  : asked
                    ? `Asked you ${asked}`
                    : ""}
              </Text>
            </View>

            {/* Always. It is the row's only affordance, so its position must be
                the same on every row — which is exactly what the conditional
                version could not manage. Nudged down to sit against the NAME
                rather than the middle of a block that runs one to three lines,
                so it holds still as you read down the list. */}
            <Icon
              name={icons.chevronRight}
              size={size.iconSm}
              color={colors.text.tertiary}
              style={styles.chevron}
            />
          </View>
        );

        const divider =
          i < requests.length - 1
            ? { borderBottomWidth: borderWidth.hairline, borderBottomColor: colors.border.default }
            : null;

        // The whole row, every row. There is no dead-tap case left: opening
        // somebody is how you answer them, so a row always has somewhere to go.
        return (
          <PressableScale
            key={req.id}
            scaleTo={0.99}
            onPress={() => onOpen(req)}
            accessibilityRole="button"
            accessibilityLabel={`${first}, open to answer`}
            style={divider}
          >
            {body}
          </PressableScale>
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
  // `flex-start`, not `center`. The rows run one to three lines and centring
  // the trailing content against the whole block made it drift up and down the
  // list; anchored to the top it holds a constant offset from the name, which
  // is what the eye is actually tracking.
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.iconText,
    paddingVertical: space.rowGap,
  },
  text: { flex: 1, minWidth: 0, gap: space.titleSub },
  // Optically centred on the `title` line (22pt) rather than the row.
  chevron: { marginTop: 3 },
});
