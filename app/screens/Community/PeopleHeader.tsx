import React from "react";
import { StyleSheet, View } from "react-native";

import {
  IconButton,
  TabDock,
  Text,
  icons,
  space,
  spacing,
  useTheme,
} from "../../design-system";
import type { PeopleTab } from "../../stores/communityDock";

/**
 * The top of the People page: a way back, a title, and the switcher.
 *
 * RENDERED ONCE, BY THE HOST, AS A FIXED OVERLAY ABOVE THE PAGER — exactly
 * where the paired Us/Timeline screen puts its own header, and for the same
 * reason. It used to sit inside each half of the pager, which meant a swipe
 * between halves dragged the back arrow, the title and the switcher sideways
 * along with the list. Chrome that identifies the page should not travel with
 * the content the page is showing.
 *
 * THE SWITCHER IS HERE AND ALSO IN THE DOCK, and that is the point rather than
 * a duplication: the dock copy is the one your thumb can reach once you are
 * reading. `onCueLayout` is what tells the host when to hand it over.
 */
export interface PeopleHeaderProps {
  tab: PeopleTab;
  waitingCount: number;
  onTab: (t: PeopleTab) => void;
  onBack: () => void;
  /**
   * Reports the switcher's BOTTOM edge, for the scroll cue.
   *
   * A pure scroll DISTANCE, not a position, now that the header is fixed and
   * never leaves the screen: "you have read past the switcher", which is the
   * moment a thumb-height copy of it starts earning its place. Same measurement
   * the paired screen takes (`y + height`), so both pages hand over at the same
   * point in the same gesture.
   */
  onCueLayout: (anchor: number) => void;
}

export const PeopleHeader: React.FC<PeopleHeaderProps> = ({
  tab,
  waitingCount,
  onTab,
  onBack,
  onCueLayout,
}) => {
  const { colors } = useTheme();

  return (
    <>
      {/* Matches `PageHeader`'s geometry so this page's header sits at the same
          height as every other screen's. */}
      <View style={styles.backBar}>
        <IconButton name="arrow-left" onPress={onBack} accessibilityLabel="Back" />
      </View>

      <View style={styles.titleBlock}>
        <Text variant="h1">People</Text>
        <Text variant="bodySm" color="secondary">
          {waitingCount > 0
            ? waitingCount === 1
              ? "One person is waiting on you."
              : `${waitingCount} people are waiting on you.`
            : "Everyone here chose to be findable."}
        </Text>
      </View>

      <View
        style={styles.tabs}
        onLayout={(e) => {
          const { y, height } = e.nativeEvent.layout;
          onCueLayout(y + height);
        }}
      >
        {/* THE SAME COMPONENT THE DOCK BECOMES, and the same one the Us/Timeline
            header already uses: `TabDock` with `inline`. It was a `Segmented`,
            which is a different control with different geometry — so the page
            switcher and the dock switcher it hands over to did not look like
            the same object, and neither matched the switcher one screen away. */}
        <TabDock
          inline
          fitContent
          accessibilityLabel="People page tabs"
          items={[
            { key: "waiting", label: "Waiting", icon: icons.addPerson, pillCount: waitingCount },
            { key: "discover", label: "Discover", icon: icons.find },
          ]}
          activeKey={tab}
          onSelect={(k) => onTab(k as PeopleTab)}
        />
      </View>

      <View style={[styles.rule, { backgroundColor: colors.border.hairline }]} />
    </>
  );
};

export default PeopleHeader;

const styles = StyleSheet.create({
  backBar: { minHeight: 44, flexDirection: "row", alignItems: "center" },
  titleBlock: { marginTop: space.titleGap, gap: spacing.xxs },
  tabs: { marginTop: space.sectionGap },
  rule: { height: StyleSheet.hairlineWidth, marginTop: space.rowGap },
});
