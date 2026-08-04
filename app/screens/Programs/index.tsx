import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Line } from "react-native-svg";
import { getOffers, type OfferItem, type Offers } from "../../api";
import { track } from "../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../util/analytics/analyticsEvents";
import PriceTag from "../../components/PriceTag";
import {
  Page,
  Text,
  Icon,
  icons,
  useTheme,
  spacing,
  radius,
  space,
  borderWidth,
  withAlpha,
  Spinner,
} from "../../design-system";
import PressableScale from "../../components/PressableScale";
import RecHeroCard, { CTA_ICON } from "../../components/Dashboard/RecHeroCard";
import {
  programEyebrow,
  programShelfLabel,
  priceNoteFor,
} from "../../util/packs/offers";
import { useStorePrices } from "../../hooks/useStorePrices";
import { openOnboarding } from "../../util/functions/openOnboarding";
import { ExploreStackNavigationProp } from "../../navigators/stacks/ExploreStack/types";

/**
 * THE SHOP — every program we sell, ranked for the person looking at it.
 *
 * Two rules govern this screen:
 *
 * 1. EVERY WORD ABOUT A PRODUCT COMES FROM THE SERVER. The screen used to
 *    hardcode one product's title, pitch and bullets, with a `?? items[0]`
 *    fallback that would render a DIFFERENT pack under that heading at that
 *    other pack's price. Nothing here is written in the app.
 *
 * 2. A "MATCHED TO YOU" BADGE MUST BE EARNED. The backend only sends `match`
 *    when a real onboarding signal justifies it, and `signalLevel: "none"`
 *    means it has nothing to go on. In that state this screen shows NO badges
 *    at all and asks them to finish onboarding instead — a fabricated match is
 *    worse than no match, and it is the one thing that would make this screen
 *    feel like an ad rather than a guide.
 *
 * Order is the server's ranking, not price. Cheapest-first taught nobody
 * anything; "closest to what you told us" is the whole point.
 */

const ProgramsScreen = () => {
  const navigation = useNavigation<ExploreStackNavigationProp<"Programs">>();
  const { colors, scheme, elevation } = useTheme();
  const isDark = scheme === "dark";
  const [offers, setOffers] = useState<Offers | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  // Local-currency prices for every tier on the shelf. Empty until the store
  // answers (and forever, if payments are off) — PriceTag falls back to INR.
  const { prices: storePrices } = useStorePrices(
    (offers?.items ?? []).map((i) => i.tierProductId),
  );

  // Refetched on focus so returning from a purchase shows the pack as owned
  // without a manual pull-to-refresh.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setFailed(false);
      getOffers()
        .then((data) => {
          if (cancelled) return;
          setOffers(data);
        })
        .catch((error) => {
          console.error("[Programs] Failed to load offers:", error);
          if (!cancelled) setFailed(true);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  /**
   * THIS SCREEN USED TO FIRE NOTHING AT ALL. Not a view, not a click — so a
   * purchase that started in the shop was indistinguishable from one that
   * started anywhere else, and the only measured arm of the funnel was Home's.
   * `PACK_CLICKED` is reused rather than given a shop-specific name so
   * Home → shop → detail → payment joins up in one query; `source` is what tells
   * the two apart.
   */
  const openDetail = (
    item: OfferItem,
    source: "programs_hero" | "programs_list",
    position: number,
  ) => {
    track(ANALYTICS_EVENTS.PACK_CLICKED, {
      source,
      catalogKey: item.key,
      packId: item.packId,
      priceInr: item.priceInr,
      hasMatchReason: !!item.match?.reason,
      position,
    });
    navigation.navigate("ProgramDetail", {
      catalogKey: item.key,
      packId: item.packId,
    });
  };

  // Reset per visit so a return counts as a new view.
  const listViewedRef = useRef(false);
  useFocusEffect(
    useCallback(
      () => () => {
        listViewedRef.current = false;
      },
      [],
    ),
  );

  // Was: fetch and `startFresh` ONLY when `state.flow` was null. `flow` is
  // persisted, so for any returning user both were skipped and this CTA emitted
  // against a stale position — dropping somebody mid-questionnaire from a
  // button that reads as a beginning.
  const startOnboarding = () => openOnboarding("programs");

  /**
   * WHAT YOU ALSO GET, with no leading verb — callers add the framing that suits
   * them. Server data only, and the free month is gated on real eligibility, so
   * a repeat buyer never sees a gift we withhold.
   *
   * The prefix moved out to the call sites because the hero now shows this
   * inside a gift-glyph callout, where "Includes" is a wasted word: the glyph and
   * the container already say "you also get", and dropping it is the difference
   * between the line fitting on one row and wrapping onto two.
   */
  const valueParts = (item: OfferItem): string | null => {
    const parts: string[] = [];
    if (item.creditGrantAmount > 0) {
      parts.push(`${item.creditGrantAmount} AI practice calls`);
    }
    if (item.bonusMembershipDays > 0 && offers?.bonusMembershipEligible) {
      parts.push("first month of membership free");
    }
    return parts.length ? parts.join(" · ") : null;
  };

  /** Sentence-cased for the hero's callout, which has no leading verb. */
  const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  /**
   * The row card's comparable facts, as separate chips rather than one joined
   * sentence — which is the entire point of the redesign. Nine cards of prose
   * cannot be scanned; nine cards whose length, tier and extras land in the same
   * place down the column can be compared without reading.
   *
   * SAME GATES AS `valueParts`, DELIBERATELY DUPLICATED RATHER THAN REUSED.
   * That function joins its parts with "·" for the hero's single line, so it
   * cannot be split back apart safely. What must not diverge is the CONDITIONS,
   * so they are written identically here: AI calls only when the pack actually
   * grants them, and the free month only when `bonusMembershipEligible` says
   * this buyer would really get one. That flag is first-purchase-only, and a
   * chip promising a free month to a repeat buyer is a lie in three words.
   *
   * The shelf word is derived from `programShelfLabel` rather than a local
   * table, for the reason its own header gives: two places naming a shelf is
   * two places to disagree about what a shelf is called.
   */
  const factChips = (item: OfferItem): string[] => {
    const chips: string[] = [];
    if (item.arcDays) chips.push(`${item.arcDays} days`);
    chips.push(capitalise(programShelfLabel(item).toLowerCase()));
    if (item.creditGrantAmount > 0) {
      chips.push(`${item.creditGrantAmount} AI calls`);
    }
    if (item.bonusMembershipDays > 0 && offers?.bonusMembershipEligible) {
      chips.push("1 month free");
    }
    return chips;
  };

  /**
   * The matched hero.
   *
   * THE REFERENCE CARDS HAVE NO TEXTURE AT ALL. Every previous pass tried to
   * make this card feel rich by ADDING a surface treatment — a sunrise ramp,
   * white bubbles, glow orbs, a medallion, a ghosted numeral watermark. The
   * cards it is actually being measured against have none of that. They are flat
   * saturated colour, and their richness is entirely STRUCTURAL: a nested panel
   * holding the data, type set two sizes bigger than feels safe, and one
   * full-width button. So this pass removes rather than adds.
   *
   * THREE OBJECTS, NOT SEVEN LINES. The old card stacked seven text blocks and
   * used a divider to imply two zones. Now the deal is a real nested panel, so
   * the zones are things you can see rather than a rule you have to infer:
   *   1. the pitch   — kicker, title, reason, printed straight on the fill
   *   2. the panel   — price, its reason, and the gift, grouped as one object
   *   3. the action  — a full-width island, the shape both references end on
   * The divider, the perk's separate wash pill, and the watermark all became
   * unnecessary the moment the panel existed, so all three are gone.
   *
   * The panel is a LIGHTER wash, not a darker one: on a bright fill, lifting a
   * nested surface toward white reads as depth, while darkening it reads as a
   * hole. Its dark ink then clears AA more easily than it did on the fill itself.
   */
  const renderHero = (item: OfferItem) => {
    const ink = colors.action.onPrimary;
    const perk = valueParts(item);
    // PromoCard's island pair, verbatim. An earlier version picked this by
    // measurement to survive a pale accent; on the brand orange that machinery
    // bought nothing and, in light mode, `onColor` could only choose between two
    // DARK inks — both illegible on the dark island it had just selected.
    const islandBg = isDark ? colors.action.secondary : colors.surface.inverse;
    const islandInk = isDark ? colors.action.onSecondary : colors.text.primary;

    return (
      // The claim is a STAMP INSIDE the card now, not a pill hung off its
      // corner, so — unlike the badge it replaces — it wants to be a child and
      // it wants to be clipped. See `styles.heroStamp`.
      <PressableScale
        key={item.key}
        scaleTo={0.98}
        onPress={() => openDetail(item, "programs_hero", 0)}
        style={[styles.heroWrap, elevation.e2]}
      >
        {/* FLAT, not a gradient. At this size a ramp just muddies the middle of
            the card; both references commit to one saturated colour. */}
        <View style={[styles.hero, { backgroundColor: colors.action.primary }]}>
          {/* ── 0. the stub ──────────────────────────────────────────────
              A DARK CHIP, NOT A LIME ONE — and that is the whole repair.
              Lime is a bright hue and this card is a bright ground, so a lime
              fill measures 1.81:1 against the orange: the words inside it are
              legible but its EDGE dissolves, and the badge reads as a pale
              smear rather than an object. Inverting fixes both numbers at once
              — a chip in the card's own ink sits at 7.71:1 against the orange,
              and lime on that dark ground reaches 13.97:1, the highest contrast
              lime achieves anywhere in this design. The hue keeps its meaning
              and finally gets a ground that suits it. */}
          <View style={styles.stubRow}>
            <View style={[styles.claimChip, { backgroundColor: ink }]}>
              <Icon name={icons.star} size={13} color={colors.accent.lime} />
              <Text variant="label" color={colors.accent.lime}>
                TOP MATCH
              </Text>
            </View>
            <Text
              variant="label"
              color={withAlpha(ink, INK_MUTED)}
              numberOfLines={1}
            >
              {programEyebrow(item)}
            </Text>
          </View>

          {/* The tear line. SVG rather than a dashed `borderTopWidth`, which
              RN renders inconsistently across platforms — Android has long
              ignored dash patterns unless every border width matches. */}
          <View style={styles.perfRow} pointerEvents="none">
            <Svg width="100%" height={2}>
              <Line
                x1="0"
                y1="1"
                x2="100%"
                y2="1"
                stroke={withAlpha(ink, 0.32)}
                strokeWidth={2}
                strokeDasharray="6 5"
              />
            </Svg>
          </View>

          {/* THE PUNCHES, AND WHY THEY ARE PAINT RATHER THAN A HOLE.
              A notch is really a bite taken out of the card, which in RN means
              an SVG-clipped container. These are two discs of the PAGE colour
              laid over the edges instead: centred exactly on the border so the
              card's own `overflow: "hidden"` crops each one to its inner half,
              which is the same silhouette for a fraction of the cost. It works
              only because this card sits on a flat canvas — move it onto a
              gradient or an image and the discs stop matching. Drawn after the
              tear line so they cover its ends. */}
          <View
            style={[
              styles.notch,
              styles.notchLeft,
              { backgroundColor: colors.background.canvas },
            ]}
            pointerEvents="none"
          />
          <View
            style={[
              styles.notch,
              styles.notchRight,
              { backgroundColor: colors.background.canvas },
            ]}
            pointerEvents="none"
          />

          <Text variant="h1" color={ink} style={styles.heroTitle}>
            {item.title}
          </Text>

          {item.match?.reason ? (
            <Text variant="body" color={ink} style={styles.heroReason}>
              {item.match.reason}
            </Text>
          ) : null}

          {/* ── 2. the deal, as one object ───────────────────────────────── */}
          {item.owned ? null : (
            <View
              style={[
                styles.dealPanel,
                { backgroundColor: withAlpha(colors.surface.inverse, 0.22) },
              ]}
            >
              <PriceTag
                priceInr={item.priceInr}
                anchorInr={item.anchorPriceInr}
                priceUsd={item.priceUsd}
                anchorUsd={item.anchorPriceUsd}
                store={storePrices[item.tierProductId]}
                note={priceNoteFor(item, offers?.isFounderCohort ?? false)}
                ink={ink}
              />

              {/* Inside the panel the gift needs no container of its own — the
                  panel IS its container, which is what the wash pill was
                  clumsily standing in for. */}
              {perk ? (
                <View style={styles.dealPerk}>
                  <Icon name={icons.gift} size={CTA_ICON} color={ink} />
                  <Text
                    variant="bodySm"
                    color={ink}
                    numberOfLines={2}
                    style={styles.dealPerkText}
                  >
                    {capitalise(perk)}
                  </Text>
                </View>
              ) : null}
            </View>
          )}

          {/* ── 3. the action ───────────────────────────────────────────── */}
          <View style={[styles.heroCta, { backgroundColor: islandBg }]}>
            <Icon name={icons.journey} size={CTA_ICON} color={islandInk} />
            <Text variant="title" color={islandInk} numberOfLines={1}>
              {item.owned ? "Open your program" : "See inside"}
            </Text>
          </View>
        </View>

      </PressableScale>
    );
  };

  /**
   * A shop row, in the same language as the Home carousel slide it links from:
   * eyebrow → title → why → footer with the price beside a real CTA island. A
   * product should not change shape between the two screens that sell it.
   *
   * WHAT THIS REPLACED, so it doesn't come back. The card was five equal-weight
   * rows — every one a full-width `space-between` line at the same 8px pitch —
   * so nothing led and the eye had no entry point. Three of them were also
   * broken:
   *   · title and price shared the header row, so a two-line title floated the
   *     price to its vertical middle and no two cards agreed on where the price
   *     sat;
   *   · the meta row put two texts in a `space-between` with no `flexShrink`,
   *     so the longer one ran off the right edge of the card ("…membership fr");
   *   · the reason was orange text on a 12% orange tint — about 1.5:1, the exact
   *     pairing the conventions call out, and `action.primary` as a text colour
   *     also trips the design-system's own dev warning on every render.
   * Shelf and length moved up into the eyebrow, which frees the header for the
   * title, kills the overflowing row outright, and gives the price the footer.
   */
  // `index` is the position within `restItems` — the position on screen, which
  // is what a position metric has to mean. Indexing `items` instead would report
  // 1 for the first card whenever a hero was lifted out above it.
  const renderCard = (item: OfferItem, index: number) => {
    const reason = item.match?.reason ?? null;
    const facts = factChips(item);

    return (
      <PressableScale
        key={item.key}
        scaleTo={0.98}
        onPress={() => openDetail(item, "programs_list", index)}
        style={[
          styles.card,
          // e1 — empty on ink, a soft lift on paper. A near-white card on a
          // cream canvas is about 1.02:1, so without it nine of these read as
          // one undivided field rather than as nine separate things to choose
          // between, which is exactly what this redesign is for.
          elevation.e1,
          {
            backgroundColor: colors.surface.default,
            borderColor: colors.border.default,
          },
        ]}
      >
        {/* ── the header: what it is, and what it costs ───────────────
            One row, because a title and its price are one fact when you are
            comparing nine of these. The price never shrinks — a half-shown
            price is worse than none — so the title yields instead. */}
        <View style={styles.cardHead}>
          <Text variant="h3" color="primary" style={styles.cardTitle}>
            {item.title}
          </Text>
          {item.owned ? (
            <View style={styles.ownedTag}>
              <Icon
                name={icons.success}
                size={16}
                color={colors.feedback.successText}
              />
              <Text variant="title" color={colors.feedback.successText}>
                Owned
              </Text>
            </View>
          ) : (
            <PriceTag
              priceInr={item.priceInr}
              anchorInr={item.anchorPriceInr}
              priceUsd={item.priceUsd}
              anchorUsd={item.anchorPriceUsd}
              store={storePrices[item.tierProductId]}
              compact
            />
          )}
        </View>

        {/* THE BLURB IS GONE, AND THAT IS THE POINT. Every card used to carry a
            marketing sentence AND this one, stacked at nearly the same weight —
            two paragraphs a card, thirty-odd lines down the list, competing with
            each other for the same job. This is the better line: it is the only
            text on the card that could not be printed in a brochure. Rendered
            only when the server sent a reason it can stand behind. */}
        {reason ? (
          <Text variant="bodySm" color="accent" numberOfLines={2}>
            {reason}
          </Text>
        ) : null}

        {/* The comparables. `surface.control` and not a low-alpha wash: a 6%
            scrim reads at 1.10:1 against the paper card and the chips vanish,
            which is the same near-white-on-cream failure the whole scheme is
            prone to. `control` is the DS's answer to exactly this — 1.31:1 on
            ink, 1.39:1 on paper — and its label clears AA on both. */}
        <View style={styles.facts}>
          {facts.map((fact) => (
            <View
              key={fact}
              style={[styles.fact, { backgroundColor: colors.surface.control }]}
            >
              <Text variant="caption" color="secondary">
                {fact}
              </Text>
            </View>
          ))}
        </View>
      </PressableScale>
    );
  };

  const items = offers?.items ?? [];
  // With no signal the backend sends no badges at all; the hero would be an
  // unearned recommendation, so the list stays flat and we ask for the one
  // thing that would let us actually help.
  const hasSignal = offers?.signalLevel !== "none";
  const heroItem = hasSignal
    ? items.find((i) => i.match?.level === "top" && !i.owned)
    : undefined;
  const restItems = heroItem ? items.filter((i) => i.key !== heroItem.key) : items;

  // Gated on the branch that actually renders the shelf, NOT on the fetch
  // resolving — loading, failed and empty all resolve too, and none of them is
  // somebody looking at programs.
  const listRendered = !loading && !failed && items.length > 0;
  useEffect(() => {
    if (!listRendered || listViewedRef.current) return;
    listViewedRef.current = true;
    track(ANALYTICS_EVENTS.PROGRAMS_LIST_VIEWED, {
      count: items.length,
      hasSignal,
      signalLevel: offers?.signalLevel ?? null,
      heroCatalogKey: heroItem?.key ?? null,
      bonusEligible: offers?.bonusMembershipEligible ?? false,
    });
  }, [
    listRendered,
    items.length,
    hasSignal,
    offers?.signalLevel,
    offers?.bonusMembershipEligible,
    heroItem?.key,
  ]);

  return (
    <Page
      title="Programs"
      description="Guided programs built around one situation at a time. Buy once, yours to keep."
      onBack={() => navigation.goBack()}
    >
      {loading ? (
        <View style={styles.centered}>
          <Spinner label="Loading programs…" />
        </View>
      ) : failed ? (
        <View style={styles.centered}>
          <Text variant="body" color="secondary" center>
            We couldn&apos;t load the programs just now. Pull back and try again
            in a moment.
          </Text>
        </View>
      ) : items.length === 0 ? (
        // Deliberately not an error: an empty catalog is a normal state before
        // anything is on sale, and it should read as "nothing yet", not "broken".
        <View style={styles.centered}>
          <Text variant="body" color="secondary" center>
            No programs are available right now. Check back soon.
          </Text>
        </View>
      ) : (
        <>
          {/*
            THIS CARD STANDS IN THE HERO'S SLOT, and the two are mutually
            exclusive: the hero needs `hasSignal`, this renders only when we
            don't have it. So it is not a small aside above the shop — when it
            shows, it is the ONLY thing at the top of the screen, and the list
            below it is unranked because of the very thing it is asking for.
            A muted bordered row understated all of that.

            It gets the vivid banner treatment for that reason, in LIME rather
            than the default blue: it is not a product, and it must not read as
            one more thing to buy. Nothing else in the shop is lime, and the
            accent is unclaimed elsewhere in the app — the colour alone says
            "this one is different" before a word is read.
          */}
          {!hasSignal ? (
            <RecHeroCard
              accentKey="lime"
              eyebrow="PERSONALISE THIS LIST"
              title="Not sure where to start?"
              subtitle="Answer a few questions and we'll point you to the program built for what you find hardest."
              ctaLabel="Get matched"
              // Not the default pack glyph: this button doesn't open a program,
              // it starts the questions that decide which one to point at.
              ctaIcon={icons.roadmap}
              onPress={startOnboarding}
            />
          ) : null}

          {heroItem ? renderHero(heroItem) : null}

          {heroItem ? (
            <Text variant="h3" color="primary" style={styles.sectionHeading}>
              More programs
            </Text>
          ) : null}

          {restItems.map(renderCard)}
        </>
      )}
    </Page>
  );
};

export default ProgramsScreen;

/**
 * The demoted ink tier. Everything on the hero is one of two alphas — full for
 * what sells, this for what is merely true — which is what lets the layout carry
 * hierarchy with no rules, boxes or indents at all.
 */
const INK_MUTED = 0.72;

/**
 * The ticket geometry, in one place because the three values have to agree.
 * `NOTCH_Y` is COMPUTED from the card's top padding, the stub's fixed height
 * and the gap above the tear line — so the punches sit on the perforation by
 * construction rather than by a hand-tuned offset that silently goes wrong the
 * first time any of the three changes.
 */
const NOTCH_R = 11;
const STUB_H = 26;
const PERF_GAP = spacing.md;
const NOTCH_Y = spacing["2xl"] + STUB_H + PERF_GAP;

const styles = StyleSheet.create({
  centered: {
    paddingVertical: spacing["3xl"],
    alignItems: "center",
    gap: spacing.md,
  },
  heroWrap: {},
  hero: {
    borderRadius: radius.card,
    overflow: "hidden",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing["2xl"],
    paddingBottom: spacing.xl,
  },
  // Bled off the bottom-right corner. A numeral crops gracefully — a disc does
  // not, which is why the medallion that used to sit here had to stay fully
  // inside and ended up looking pasted on. Declared first, so it is behind
  // everything; the copy above it never needs to dodge it because it is texture,
  // not an object.
  // Fixed height, and that is load-bearing: `NOTCH_Y` is derived from it, so
  // the punches always land exactly on the tear line instead of being tuned by
  // eye and drifting the next time the chip's padding changes.
  stubRow: {
    height: STUB_H,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  claimChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.inlineGap - 2,
    paddingHorizontal: space.inlineGap + 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.chip,
  },
  // Negative margins pull it out to the card's own edges — a perforation that
  // stops inside the padding is a dashed rule, not a tear.
  perfRow: {
    marginTop: PERF_GAP,
    marginHorizontal: -spacing.xl,
    marginBottom: spacing.lg,
    height: 2,
  },
  notch: {
    position: "absolute",
    top: NOTCH_Y - NOTCH_R,
    width: NOTCH_R * 2,
    height: NOTCH_R * 2,
    borderRadius: NOTCH_R,
  },
  // Centred ON the border, so half of each disc is clipped away and the visible
  // half reads as a punch.
  notchLeft: { left: -NOTCH_R },
  notchRight: { right: -NOTCH_R },
  heroTitle: {},
  heroReason: {
    marginTop: spacing.md,
  },
  // The nested data panel — the one structural device both references lean on.
  // `radius.input` rather than `radius.card`: a panel inside a 24-radius card
  // needs a visibly tighter corner, or the two curves fight.
  dealPanel: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: radius.input,
    gap: spacing.md,
  },
  dealPerk: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.inlineGap,
  },
  dealPerkText: {
    flexShrink: 1,
  },
  // FULL WIDTH. A small left-aligned pill left the bottom of the card ragged;
  // both references end on a single button that spans the whole card, which is
  // also the last thing the eye lands on.
  heroCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.inlineGap,
    paddingVertical: spacing.lg,
    borderRadius: radius.pill,
    marginTop: spacing.md,
  },
  sectionHeading: {
    // A heading belongs to what's UNDER it. `Page`'s uniform gap sits it
    // equidistant from both neighbours, so this buys back the difference.
    marginTop: spacing.sm,
  },
  card: {
    borderRadius: radius.card,
    borderWidth: borderWidth.hairline,
    padding: spacing.lg,
    // Blocks, not rows. The tight `titleSub` pitch inside `cardBody` binds the
    // eyebrow/title/blurb into ONE thing; this gap is what separates it from
    // the reason, the value line and the footer.
    gap: space.rowGap,
    // No marginBottom — `Page` already puts `space.groupGap` between children,
    // and the old margin stacked on top of it for a 28px trench between cards.
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: space.inlineGap + 4,
  },
  // The title yields, the price does not — `flexShrink` on the title alone is
  // what stops a long name pushing "₹499" off the card's right edge, which is
  // the bug the previous layout's header row shipped with.
  cardTitle: {
    flex: 1,
    flexShrink: 1,
  },
  facts: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.inlineGap - 2,
  },
  fact: {
    paddingHorizontal: space.inlineGap + 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.chip,
  },
  ownedTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
});
