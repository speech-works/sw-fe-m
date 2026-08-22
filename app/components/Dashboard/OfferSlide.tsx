import React from "react";
import { StyleSheet, View } from "react-native";
import PressableScale from "../PressableScale";
import PriceTag from "../PriceTag";
import {
  Text,
  Icon,
  Gradient,
  icons,
  useTheme,
  withAlpha,
  mix,
  assertContrast,
  spacing,
  space,
  radius,
  borderWidth,
} from "../../design-system";
import { REC_HERO_ACCENT, CTA_ICON } from "./RecHeroCard";
import { programEyebrow } from "../../util/packs/offers";
import type { OfferItem } from "../../api/users";
import type { StorePrice } from "../../services/priceDisplay";

/**
 * One program in the Home carousel, in two tiers.
 *
 * WHY THE HIGHLIGHT IS COLOUR AND NOT SIZE. `Carousel` snaps on a single
 * uniform slide width, so a wider first slide would desync the snap from the
 * slide boundaries a little further with every swipe. Height is safer — the
 * content row stretches — but a taller first slide just leaves dead space under
 * its neighbours. So every slide shares `SLIDE_MIN_HEIGHT` and the top match is
 * marked by fill, ink and an eyebrow instead.
 *
 * ONE SKELETON, TWO SKINS — and that is load-bearing, not tidiness. This file
 * used to be two independent JSX branches, and they drifted exactly the way two
 * independent branches always do: the plain tier grew a bordered chip around the
 * reason (louder than its own title), lost the eyebrow (so titles landed at a
 * different height and jumped as you swiped), and traded the CTA island for a
 * bare grey chevron. Nothing decided that; it just happened one edit at a time.
 * Now every slide renders the SAME nodes in the same order and `skin` carries
 * the entire difference, so a tier cannot gain or lose a part on its own.
 *
 * The highlighted tier USED to reuse the Home vivid-card language verbatim —
 * flat `accent.info`, dark `accentOn` ink, two ink circles, a dark-island CTA —
 * and that was the problem: the one card on Home that sells looked like one more
 * instance of the house style. It now deliberately departs from it (deep ramp,
 * white ink, a light CTA, `radius.sheet`, elevation), while the plain tier holds
 * the house geometry exactly. The distance between them IS the ranking.
 */

/**
 * The visible card keeps Home's 260pt card rhythm. There is nothing to bleed
 * past the paper edge any more, so the slide is exactly the card.
 */
export const SLIDE_CARD_HEIGHT = 260;
export const SLIDE_MIN_HEIGHT = SLIDE_CARD_HEIGHT;

/**
 * Distance from the card's top edge down to the BOTTOM of the CTA island — the
 * last pixel that has to clear the floating dock for this card's action to be
 * visible at all. Exported so the shelf can report whether it did, rather than
 * counting a card whose entire footer is under the dock as "shown".
 */
export const CTA_BOTTOM_FROM_CARD_TOP = SLIDE_CARD_HEIGHT - spacing["2xl"];

/**
 * Same words and the same glyph in both tiers — the tier changes the weight of
 * the island, never the affordance inside it. Icon leads the label, `PromoCard`
 * "▶ Check In" style; `journey` is the registry's word for a pack, which is
 * exactly what this opens.
 */
const CTA_LABEL = "See inside";

export interface OfferSlideProps {
  item: OfferItem;
  /** Local-currency price from the store; falls back to INR when absent. */
  store?: StorePrice | null;
  /** The vivid treatment, reserved for a top match that earned a reason. */
  highlight?: boolean;
  /** Revealed at the exact contact frame of the full-screen rubber die. */
  onPress: (item: OfferItem) => void;
}

const OfferSlide: React.FC<OfferSlideProps> = ({
  item,
  store,
  highlight,
  onPress,
}) => {
  const { colors, elevation } = useTheme();

  // Only ever rendered when the backend supplied one. `signalLevel: "none"`
  // never reaches here — `selectForYou` returns nothing in that state.
  const reason = item.match?.reason ?? null;

  const fill = colors.accent[REC_HERO_ACCENT];
  const ink = colors.accentOn[REC_HERO_ACCENT];

  /**
   * WHITE TYPE ON A DEEP FILL — the one rule this card is allowed to break.
   *
   * Every vivid surface in the app is a BRIGHT accent with dark `accentOn` ink,
   * and that rule exists for a good reason: white on `accent.info` measures
   * 2.7:1 and is illegible. But the rule is really "match the ink to the fill",
   * and the reverse pairing is just as valid once the fill is dark enough —
   * white on a deep blue is the pairing that makes a card read as premium
   * rather than as a coloured rectangle, which is the whole ask here.
   *
   * So the ramp is not a lightened accent, it is a DEEPENED one: `accent.info`
   * carried 40–62% of the way toward its own on-ink. Every stop lands between
   * 5.5:1 and 8.2:1 against white — comfortably past AA for the 14px reason
   * line, which is the smallest type on the card and therefore the constraint.
   * It stays unmistakably the info hue; it is the same blue with the lights
   * turned down, not a new colour.
   *
   * THE TOP MATCH IS A DIFFERENT KIND OF OBJECT, not a louder one.
   *
   * Every vivid card on Home is the same recipe — flat accent fill, two ink
   * circles, `radius.card`, no shadow — so the one card that sells was reading
   * as another instance of the house style rather than as the thing to look at.
   * The fix is to break the recipe on SEVEN axes at once (ramp, light, radius,
   * elevation, type scale, action width, head-room), none of which is "turn it
   * up": a gradient is not a brighter blue, a wider button is not a shoutier
   * one. Distinctiveness, not volume — volume is what makes a card read as an
   * advertisement and get skipped.
   *
   * A TONAL RAMP, NOT A SECOND HUE. Lighter top-left → deeper bottom-right. One
   * colour lit from a direction, which is what gives a flat rectangle the sense
   * of being a surface. A blue→purple ramp was the obvious alternative and is
   * worse: purple is the mood card's fill, and a second hue would make this read
   * as a different PRODUCT rather than as the same family, lit.
   */
  const liftStop = mix(fill, ink, 0.4);
  const deepStop = mix(fill, ink, 0.62);
  // Reserved for the card's own ink, so nothing here can be mistaken for a
  // `text.*` role that would flip with the scheme — this fill is dark in both.
  const heroInk = "#FFFFFF";
  if (__DEV__ && highlight) {
    // Copy spans the whole card, so its worst ground is the lightest stop.
    assertContrast(heroInk, liftStop, "OfferSlide top-match ramp (light stop)");
  }

  // Every part of the tier difference, in one object. Both skins name the same
  // keys, so neither can quietly drop a part the other has.
  const skin = highlight
    ? {
        bg: liftStop,
        // Rendered as a layer INSIDE the same card node, not as a different
        // wrapper element — so the two tiers keep one skeleton and the ramp is
        // just another optional texture, exactly like the circles below.
        gradient: [liftStop, deepStop] as readonly [string, string],
        border: undefined as string | undefined,
        // Light catching the surface, not depth pressed into it. A dark disc on
        // a deep fill would just be a hole.
        blob: withAlpha(heroInk, 0.1),
        // 28, not 24. Four points is barely nameable on its own and that is the
        // point — it changes the silhouette without announcing itself.
        radius: radius.sheet,
        elevate: elevation.e2,
        // The only h2 in the deck, so the size difference IS the ranking,
        // visible before a word is read. NOT h1, tempting as the reference's
        // three huge lines are: that card carries a title and nothing else,
        // while this one still owes the reader a price and the sentence about
        // why it was picked for them. h1 buys ~20pt of title and costs the
        // reason line, which is the only part of this card that is about them.
        titleVariant: "h2" as const,
        // A pane of light laid over the ramp rather than a second surface
        // colour. Only works on a fill, which is exactly why it is the top
        // match's and not the deck's.
        chipBg: withAlpha(heroInk, 0.18),
        chipInk: heroInk,
        // One ink for everything; the hierarchy is carried by type scale alone.
        eyebrow: heroInk,
        title: heroInk,
        // Bare copy: on an accent surface content is the only borderless thing
        // and actions are the only enclosed shapes.
        reasonText: heroInk,
        blurbText: heroInk,
        priceInk: heroInk as string | undefined,
        // FLIPPED WITH THE FILL. The dark island that reads as the loudest
        // object on a pale card all but disappears on a deep one — it is the
        // same value as the surface it sits on. White is now the high-contrast
        // move, and it is the same inversion the reference makes.
        ctaBg: heroInk,
        ctaInk: deepStop,
        ctaBorder: undefined as string | undefined,
      }
    : {
        // `elevated`, NOT `default` — AND THAT IS ABOUT THE 20pt OF THIS CARD
        // NOBODY SCROLLS TO.
        //
        // A carousel's peek is a promise that there is another card. This tier
        // only ever gets to keep that promise with the narrow strip of itself
        // showing past the settled slide, and on the ink scheme `surface.default`
        // (#24211B) sits at 1.18:1 against the canvas (#141311). At full width
        // that is a perfectly legible card. At 20pt, immediately beside a bright
        // blue one the eye has adapted to, it is nothing — the shelf reads as a
        // card clipped by the page padding, which is exactly what it got
        // reported as. `surface.elevated` lifts the same neutral to 1.32:1.
        bg: colors.surface.elevated,
        // Flat. The ramp is the top match's signature and a fainter version
        // here would blunt it — the same argument that removed the circles.
        gradient: undefined as readonly [string, string, string] | undefined,
        // `strong` (12% white) rather than `default` (8%), for the same reason
        // the fill moved up: at a 20pt sliver the EDGE is most of what there is
        // to see, so it has to survive standing next to the vivid tier. Still
        // load-bearing on the paper scheme, where `surface` sits at roughly
        // 1.02:1 against the canvas and the card edge vanishes outright.
        border: colors.border.strong as string | undefined,
        // NO TEXTURE. A tinted echo of the hero's blobs used to sit here so the
        // deck would "read as one family", but decoration on a runner-up is
        // exactly what gave these slides a main-character feel: two big accent
        // discs on a neutral card are ornament, and ornament is the vivid tier's
        // signature. The family resemblance is carried by the SHARED SKELETON —
        // same slots, same order, same geometry — which is the part that
        // actually has to match.
        blob: undefined as string | undefined,
        // The house geometry, unchanged — it is the reference the top match is
        // measured against, so it must stay exactly what every other Home card is.
        radius: radius.card,
        // e1, WHICH IS EMPTY ON INK AND A SOFT SHADOW ON PAPER — so this adds
        // nothing to the dark scheme (where the fill already separates it from
        // the canvas) and rescues the one place paper was failing badly: the
        // 20pt of this card that peeks past the settled slide. A near-white
        // card on cream is ~1.02:1, so that sliver had only a hairline holding
        // it apart from the page and simply vanished. It is the carousel's
        // whole "there is more this way" signal, so it cannot be invisible.
        elevate: elevation.e1 as ReturnType<typeof Object> | undefined,
        titleVariant: "h3" as const,
        // The runner-ups get chips too, and they have to: the meta row is what
        // sets where every title starts, so a chip on one tier and a bare line
        // on the other would make titles jump by 8pt as you swipe. Same shape,
        // one volume down — a control-surface pill instead of a pane of light.
        chipBg: colors.surface.control,
        chipInk: colors.text.tertiary,
        eyebrow: "tertiary",
        title: "primary",
        // Was `accent`. Two lines of full-strength orange were the loudest thing
        // on the card — louder than its own title — which is a strange thing for
        // the slide you did NOT rank first. The personal signal survives the
        // demotion because it was never really the colour doing it: "You said
        // ordering felt hardest" reads as being about you from the words alone.
        // That also lets a generic blurb share the role without borrowing a
        // claim, which is why the two keys now agree.
        reasonText: "secondary",
        blurbText: "secondary",
        priceInk: undefined,
        // FILLED NOW, AND THE REASON IT WASN'T IS GONE.
        //
        // This was a bare outline because the top match used to end on a solid
        // DARK island, and a filled control pill on a dark card read as a second
        // button of the same weight. The top match's action is now a solid WHITE
        // pill on a deep fill — several steps louder than anything a neutral
        // card can do — so the collision that argument was avoiding cannot
        // happen, and all the outline was buying was a button you had to look
        // for. `surface.control` on `surface.default` is a visible step up
        // while staying obviously subordinate.
        //
        // The border STAYS on top of the fill rather than being replaced by it:
        // that is what keeps the pill enclosed on the paper scheme, where the
        // control/default surfaces sit much closer together than they do here.
        ctaBg: colors.surface.control as string | undefined,
        ctaInk: colors.text.primary,
        ctaBorder: colors.border.strong as string | undefined,
      };

  // EVERY slide's eyebrow is now the same factual line — the claim moved out to
  // the badge. That is what keeps the titles on one baseline as you swipe: the
  // eyebrow row is present, and the same height, on all three.

  // Both tiers print this as bare copy in the same slot — the reason is marked
  // by ink, not by a container.
  const support = reason ?? item.blurb ?? null;
  const supportColor = reason ? skin.reasonText : skin.blurbText;

  return (
    // The badge is a SIBLING of the card, not a child: the card clips to its own
    // radius. It stays inside the Pressable so the corner is still part of the
    // tap target and it scales with the card on press — one object, one motion.
    <PressableScale scaleTo={0.98} onPress={() => onPress(item)}>
      <View
        style={[
          styles.slide,
          {
            backgroundColor: skin.bg,
            borderColor: skin.border,
            borderWidth: skin.border ? borderWidth.hairline : 0,
            borderRadius: skin.radius,
          },
          skin.elevate,
        ]}
      >
        <View
          style={[styles.cardCanvas, { borderRadius: skin.radius }]}
          pointerEvents="none"
        >
          {skin.gradient ? (
            <Gradient
              colors={skin.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          ) : null}

          {skin.blob ? (
            <View style={[styles.blobA, { backgroundColor: skin.blob }]} />
          ) : null}
        </View>


        <View style={styles.body}>
          {/* ONE META ROW, TWO ENDS — what it is on the left, what it costs on
              the right.
              These were two stacked lines, and with the title and the reason
              beneath them that made FOUR blocks sharing 3pt gaps at the top
              while `space-between` pooled every spare point into a single void
              above the button. The top read as crammed and the bottom as empty,
              from the same cause. Folding the price up beside the chip removes a
              row, which is what pays for real separation between the three
              blocks that remain.
              It does NOT put the price back in the footer. The last band of this
              card is what the dock crops, and a price nobody can see is not a
              price — that is why it left in the first place. It stays in the top
              half, just on a line that was already there.
              No badge lane needed: `padTop` (32) starts this row well below the
              badge, which overhangs from -6 to +14 relative to the card. */}
          <View style={styles.metaRow}>
            <View style={[styles.chip, { backgroundColor: skin.chipBg }]}>
              <Text variant="label" color={skin.chipInk} numberOfLines={1}>
                {programEyebrow(item)}
              </Text>
            </View>
            <PriceTag
              priceInr={item.priceInr}
              anchorInr={item.anchorPriceInr}
              priceUsd={item.priceUsd}
              anchorUsd={item.anchorPriceUsd}
              store={store}
              compact
              ink={skin.priceInk}
            />
          </View>

          <Text variant={skin.titleVariant} color={skin.title} numberOfLines={2}>
            {item.title}
          </Text>

          {/* Two lines, not three — a truncated third line of reason is worth
              less than the air that keeps these blocks apart. */}
          {support ? (
            <Text variant="bodySm" color={supportColor} numberOfLines={2}>
              {support}
            </Text>
          ) : null}
        </View>

        {/* The CTA hugs its label. A pill that spans the card stops reading as a
            button and starts reading as a banner — and at that width the label
            floats alone in the middle of a stripe with nothing to anchor it. */}
        <View style={styles.footer}>
          <View
            style={[
              styles.cta,
              {
                backgroundColor: skin.ctaBg,
                borderColor: skin.ctaBorder,
                borderWidth: skin.ctaBorder ? borderWidth.hairline : 0,
              },
            ]}
          >
            <Icon name={icons.journey} size={CTA_ICON} color={skin.ctaInk} />
            <Text variant="title" color={skin.ctaInk} numberOfLines={1}>
              {CTA_LABEL}
            </Text>
          </View>

        </View>
      </View>
    </PressableScale>
  );
};

export default OfferSlide;

const styles = StyleSheet.create({
  // `borderRadius` is set per tier from `skin`; the value here is the fallback.
  //
  // `paddingTop` is deliberately NOT per-tier. The top match briefly took 20 so
  // its bigger type had less head-room, and the cost was that its title started
  // 12pt higher than every other slide's — a visible jolt on every swipe, which
  // is exactly the drift the eyebrow row above exists to prevent. Every tier
  // starts its chip at the same y, so every tier starts its title at the same y.
  slide: {
    // `flex: 1` ON TOP OF THE MINIMUM, and the two do different jobs.
    //
    // The minimum is the floor: a slide is never shorter than Home's 260pt card
    // rhythm. `flex: 1` is what makes it STRETCH when a taller card shares the
    // row — the in-progress program is now slide one and is taller than any
    // offer, and without this the offers kept their natural size and left a gap
    // under each of them. See the note at the top of InProgressSlide.
    flex: 1,
    minHeight: SLIDE_CARD_HEIGHT,
    borderRadius: radius.card,
    overflow: "visible",
    // The Home vivid-card padding rhythm (PromoCard / RecHeroCard), not a
    // uniform box — the extra head-room is what makes the type sit right.
    paddingHorizontal: spacing.xl,
    paddingTop: spacing["3xl"],
    paddingBottom: spacing["2xl"],
    justifyContent: "space-between",
  },
  cardCanvas: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  blobA: {
    position: "absolute",
    top: -40,
    right: -30,
    width: 150,
    height: 150,
    borderRadius: radius.full,
  },
  // 3 → 10. `space.titleSub` is the gap for a title and its own subtitle — two
  // parts of one thing. These are three separate things (what it is and costs,
  // what it is called, why it was picked for you) and at 3pt they read as one
  // undifferentiated block. Ten is enough to group without drifting apart.
  //
  // Height budget against the 254pt box, worst case:
  //   32 pad + 24 meta + 10 + 56 title(2 lines) + 10 + 40 reason
  //   + 16 footer gap + 38 CTA + 24 pad = 250.
  // With the common one-line title it comes to 222, and the 32pt left over
  // lands above the CTA — which is where air belongs on a card that ends in an
  // action, rather than pooled there because the top had none to spare.
  body: {
    gap: 10,
  },
  // The chip yields first if a long store price (e.g. "$12.99") needs the room;
  // the price never truncates, because a half-shown price is worse than none.
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.inlineGap,
  },
  // `alignSelf: flex-start` is what makes the chip hug its text — without it a
  // chip in the `body` column stretches to the card's full width and stops
  // being a chip.
  chip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    flexShrink: 1,
    gap: space.inlineGap - 2,
    paddingHorizontal: space.inlineGap,
    paddingVertical: spacing.xs,
    borderRadius: radius.chip,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    marginTop: spacing.lg,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.inlineGap,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
});
