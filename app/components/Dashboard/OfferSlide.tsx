import React from "react";
import { StyleSheet, View } from "react-native";
import PressableScale from "../PressableScale";
import PriceTag from "../PriceTag";
import {
  Text,
  Icon,
  icons,
  useTheme,
  withAlpha,
  spacing,
  space,
  radius,
  borderWidth,
} from "../../design-system";
import { REC_HERO_ACCENT, CTA_ICON } from "./RecHeroCard";
import TopMatchBadge, { BADGE_OVERHANG, BADGE_LANE } from "./TopMatchBadge";
import { programEyebrow } from "../../util/packs/offers";
import type { OfferItem } from "../../api/users";

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
 * The highlighted tier deliberately reuses the Home vivid-card language —
 * `PromoCard` / `RecHeroCard`: the same `accent.info` fill, the same `accentOn`
 * ink, the same TWO ink-circle blobs, the same padding rhythm, and the same
 * solid dark-island CTA pill with a label. The blue does not change for anyone;
 * it just moved into a deck.
 */

/**
 * The height of a whole SLOT — card plus the badge's overhang above it. Matches
 * Home's `PromoCard` so the shelf is the same height as its neighbours, and so
 * adding the badge did not push the carousel 8px taller; the card gave the room
 * back instead.
 */
export const SLIDE_MIN_HEIGHT = 260;

/**
 * Same words and the same glyph in both tiers — the tier changes the weight of
 * the island, never the affordance inside it. Icon leads the label, `PromoCard`
 * "▶ Check In" style; `journey` is the registry's word for a pack, which is
 * exactly what this opens.
 */
const CTA_LABEL = "See inside";

export interface OfferSlideProps {
  item: OfferItem;
  /** The vivid treatment, reserved for a top match that earned a reason. */
  highlight?: boolean;
  onPress: (item: OfferItem) => void;
}

const OfferSlide: React.FC<OfferSlideProps> = ({ item, highlight, onPress }) => {
  const { colors, scheme } = useTheme();
  const isDark = scheme === "dark";

  // Only ever rendered when the backend supplied one. `signalLevel: "none"`
  // never reaches here — `selectForYou` returns nothing in that state.
  const reason = item.match?.reason ?? null;

  const fill = colors.accent[REC_HERO_ACCENT];
  const ink = colors.accentOn[REC_HERO_ACCENT];

  // Every part of the tier difference, in one object. Both skins name the same
  // keys, so neither can quietly drop a part the other has.
  const skin = highlight
    ? {
        bg: fill,
        border: undefined as string | undefined,
        // Texture at 10% ink, the Home vivid-card recipe.
        blob: withAlpha(ink, 0.1),
        // On a bright fill there is exactly one legible ink, so every text role
        // collapses to it — the hierarchy is carried by type scale alone.
        eyebrow: ink,
        title: ink,
        // Bare copy: on an accent surface content is the only borderless thing
        // and actions are the only enclosed shapes.
        reasonText: ink,
        blurbText: ink,
        priceInk: ink as string | undefined,
        // The one loud CTA — a solid dark island (pure inverse in light mode).
        ctaBg: isDark ? colors.action.secondary : colors.surface.inverse,
        ctaInk: isDark ? colors.action.onSecondary : colors.text.primary,
        ctaBorder: undefined as string | undefined,
      }
    : {
        bg: colors.surface.default,
        // Load-bearing on the paper scheme, where `surface.default` sits at
        // roughly 1.02:1 against the canvas and the card edge vanishes.
        border: colors.border.default as string | undefined,
        // NO TEXTURE. A tinted echo of the hero's blobs used to sit here so the
        // deck would "read as one family", but decoration on a runner-up is
        // exactly what gave these slides a main-character feel: two big accent
        // discs on a neutral card are ornament, and ornament is the vivid tier's
        // signature. The family resemblance is carried by the SHARED SKELETON —
        // same slots, same order, same geometry — which is the part that
        // actually has to match.
        blob: undefined as string | undefined,
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
        // An OUTLINE, not a fill. The top match ends on a solid dark island; a
        // filled control pill here read as a second button of equal weight. A
        // hairline pill is one clear step down while keeping the affordance —
        // and `border.strong` is what stops it vanishing on the paper scheme,
        // where an unfilled control is otherwise ~1.1:1.
        ctaBg: undefined as string | undefined,
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
    <PressableScale
      scaleTo={0.98}
      onPress={() => onPress(item)}
      style={styles.wrap}
    >
      <View
        style={[
          styles.slide,
          {
            backgroundColor: skin.bg,
            borderColor: skin.border,
            borderWidth: skin.border ? borderWidth.hairline : 0,
          },
        ]}
      >
        {/* Two ink circles — the Explore / PromoCard texture. Depth without art,
            and the vivid tier's alone: `skin.blob` is undefined on the runners-up
            so they render nothing at all rather than a fainter version. */}
        {skin.blob ? (
          <>
            <View
              style={[styles.blobA, { backgroundColor: skin.blob }]}
              pointerEvents="none"
            />
            <View
              style={[styles.blobB, { backgroundColor: skin.blob }]}
              pointerEvents="none"
            />
          </>
        ) : null}

        <View style={styles.body}>
          {/* Reserves the badge's horizontal lane so a long shelf label can never
              run under it — the eyebrow is the one line at the badge's height. */}
          <Text
            variant="label"
            color={skin.eyebrow}
            numberOfLines={1}
            style={highlight ? styles.eyebrowClear : undefined}
          >
            {programEyebrow(item)}
          </Text>
          {/* h3, not h2: at slide width minus the peek, h2 wraps to three
              lines and swallows the card. */}
          <Text variant="h3" color={skin.title} numberOfLines={2}>
            {item.title}
          </Text>
          {support ? (
            <Text variant="bodySm" color={supportColor} numberOfLines={3}>
              {support}
            </Text>
          ) : null}
        </View>

        <View style={styles.footer}>
          <PriceTag
            priceInr={item.priceInr}
            anchorInr={item.anchorPriceInr}
            compact
            ink={skin.priceInk}
          />
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

      {highlight ? <TopMatchBadge /> : null}
    </PressableScale>
  );
};

export default OfferSlide;

const styles = StyleSheet.create({
  // Not on the card itself: the card clips, and the badge's overhang has to live
  // in a parent that doesn't. The padding buys back the vertical overhang so the
  // carousel's ScrollView frame never crops it.
  wrap: {
    paddingTop: BADGE_OVERHANG,
  },
  slide: {
    minHeight: SLIDE_MIN_HEIGHT - BADGE_OVERHANG,
    borderRadius: radius.card,
    overflow: "hidden",
    // The Home vivid-card padding rhythm (PromoCard / RecHeroCard), not a
    // uniform box — the extra head-room is what makes the type sit right.
    paddingHorizontal: spacing.xl,
    paddingTop: spacing["3xl"],
    paddingBottom: spacing["2xl"],
    justifyContent: "space-between",
  },
  blobA: {
    position: "absolute",
    top: -40,
    right: -30,
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  blobB: {
    position: "absolute",
    bottom: -20,
    right: 40,
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  body: {
    gap: space.titleSub,
  },
  // Keeps the eyebrow out of the badge's lane. Applied only on the highlighted
  // slide, so the other two get the full width for their label.
  eyebrowClear: {
    marginRight: BADGE_LANE,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.xl,
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
