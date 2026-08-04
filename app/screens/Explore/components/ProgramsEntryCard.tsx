import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React from "react";
import { StyleSheet, View } from "react-native";
import PressableScale from "../../../components/PressableScale";
import { ExploreStackParamList } from "../../../navigators/stacks/ExploreStack/types";
import { track } from "../../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../../util/analytics/analyticsEvents";
import {
  Text,
  Icon,
  icons,
  useTheme,
  borderWidth,
  spacing,
  radius,
} from "../../../design-system";

/**
 * The entrance to the programs shop, on Explore.
 *
 * IT USED TO BE TITLED "INTERVIEW READY", which was true when it shipped and
 * stopped being true the moment there was a second pack. The tap has always
 * opened the ranked LIST, so the card named one product and delivered ten —
 * a softer form of the exact bug `util/packs/offers.ts` exists to prevent, and
 * which its header records as already having shipped once. It also can't be
 * fixed by pointing the tap at Interview Ready instead: the list is ranked per
 * user, and hardcoding a destination throws that away.
 *
 * SO IT NAMES NO PACK AND NO COUNT. Not a count either — "10 programs" is true
 * this week and quietly false the week a pack is added, and nobody would notice
 * it had gone stale. What the copy describes instead is the SHAPE of a program,
 * which stays true at three packs or thirty.
 *
 * WHAT THE CARD HAS TO EARN, and why the words are these words: the practice
 * grid sits directly above it, so the reader's question is not "what is a
 * program" but "how is this different from the practice I already have". The
 * grid is do-something-today; a program is a sequence aimed at one event. That
 * difference IS the pitch, so the title borrows the noun from the tiles above
 * ("practice") and adds the thing they lack ("a plan"). "Build up to" is the
 * honest description of what these packs do — graded exposure.
 *
 * "RIGHT NOW" IS THE LAST THING THE LINE SAYS, which is the emphatic position
 * and the reason it earns its place. It is what keeps the sentence about the
 * reader's present rather than about the catalogue: not a program for a hard
 * situation in the abstract, but for the one that is live in their life today.
 * Note it deliberately does NOT mean "starts instantly" — these arcs run 7 to
 * 21 days, and the copy must not imply otherwise.
 *
 * No outcome is claimed anywhere. Nothing here says fluency, confidence or a
 * result, for the same reason nothing else in the app does.
 *
 * Gated by `purchasesAvailable()` at the call site (Explore/index.tsx) —
 * there's nothing to sell unless payments are on AND this platform has a
 * RevenueCat key.
 */

/**
 * How far the stack hangs below the card, and therefore the room the wrapper
 * has to reserve for it.
 *
 * THE EDGES ARE REAL VIEWS, NOT A SHADOW. A shadow reads as one card floating;
 * the entire point of the stack is to read as SEVERAL, so that the card can say
 * "there is more than one of these behind me" without spending a word on it —
 * the same job the For-you carousel's peek does on Home.
 *
 * They are absolutely positioned and hang past the card's bottom edge, which
 * occupies no layout. Without this padding the section below (the Library
 * heading) sits `DECK_BLEED` too close and crops the pile. Same device, and the
 * same reason, as `OfferSlide`'s `STAMP_BLEED_BOTTOM`.
 */
const DECK_BLEED = 14;

const ProgramsEntryCard = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<ExploreStackParamList>>();
  const { colors, elevation } = useTheme();

  return (
    <PressableScale
      onPress={() => {
        track(ANALYTICS_EVENTS.PROGRAMS_LIST_OPENED, { source: "explore_entry" });
        navigation.navigate("Programs");
      }}
      scaleTo={0.98}
      style={styles.wrap}
    >
      <View>
        {/* Drawn before the card so they sit behind it — RN paints siblings in
            order. The deeper edge is dimmer, which says "further away" on the
            ink scheme, where the fills differ enough to be read on their own.
            On paper they do not, which is what the shadows below are for. */}
        <View
          style={[
            styles.edge,
            styles.edgeBack,
            elevation.e2,
            {
              backgroundColor: colors.surface.elevated,
              borderColor: colors.border.default,
            },
          ]}
        />
        <View
          style={[
            styles.edge,
            styles.edgeFront,
            elevation.e2,
            {
              backgroundColor: colors.surface.elevated,
              borderColor: colors.border.default,
            },
          ]}
        />

        {/* THE SHADOWS ARE WHAT MAKE THIS A STACK ON THE PAPER SCHEME.
            On ink the layers separate on fill alone — `surface.elevated`
            (#2E2A24) against `surface.default` (#24211B) against the canvas.
            On paper those two are #FFFEFB and #FFFDF8: the same white to any
            eye, so the pile collapsed into one card with a faint line under it.
            A shadow is the only cue left, and it is the honest one — stacked
            paper casts onto the sheet beneath it. Each layer gets its own, so
            the card falls on the front edge and the front edge falls on the
            back one; a single shadow under the whole group would go back to
            reading as one floating card, which is the thing to avoid. */}
        <View
          style={[
            styles.card,
            elevation.e2,
            {
              backgroundColor: colors.surface.default,
              borderColor: colors.border.default,
            },
          ]}
        >
          {/* `action.primaryTint` + `action.primary`, NOT the premium gold this
              card used to wear. `palette.ts` scopes that gold to the BuyPro
              upsell, so wearing it here quietly claimed a tier this card does
              not sell — the same species of small dishonesty as the hardcoded
              pack name above. `journey` is the registry's word for a pack, and
              the glyph the pack CTA already uses. */}
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: colors.action.primaryTint },
            ]}
          >
            <Icon name={icons.journey} size={22} color={colors.action.primary} />
          </View>
          <View style={styles.textCol}>
            <Text variant="title" color="primary">
              Practice with a plan
            </Text>
            <Text variant="bodySm" color="secondary">
              Guided programs that build up to what&apos;s hardest right now.
            </Text>
          </View>
          {/* `flexShrink: 0` is load-bearing. The old one-line subtitle left
              room to spare; this one wraps, and a shrinkable chevron in a row
              with a `flex: 1` sibling gets compressed to nothing — the arrow
              silently vanished and the copy ran to the card's edge. */}
          <View style={styles.chevron}>
            <Icon name="chevron-right" size={20} color={colors.text.tertiary} />
          </View>
        </View>
      </View>
    </PressableScale>
  );
};

export default ProgramsEntryCard;

const styles = StyleSheet.create({
  // Reserves layout for the overhanging stack; see DECK_BLEED.
  wrap: {
    paddingBottom: DECK_BLEED,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    borderRadius: radius.card,
    borderWidth: borderWidth.hairline,
    padding: spacing.xl,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: radius.input,
    alignItems: "center",
    justifyContent: "center",
  },
  textCol: {
    flex: 1,
    gap: spacing.xxs,
  },
  chevron: {
    flexShrink: 0,
  },
  // Only the bottom corners are rounded: each edge is the exposed foot of a
  // card whose top is hidden behind the one in front of it.
  edge: {
    position: "absolute",
    borderWidth: borderWidth.hairline,
    borderTopWidth: 0,
    borderBottomLeftRadius: radius.card,
    borderBottomRightRadius: radius.card,
  },
  edgeFront: {
    left: spacing.lg,
    right: spacing.lg,
    bottom: -7,
    height: 22,
  },
  // Inset further and dimmed — one step further back in the pile.
  edgeBack: {
    left: spacing.lg + 13,
    right: spacing.lg + 13,
    bottom: -13,
    height: 20,
    opacity: 0.6,
  },
});
