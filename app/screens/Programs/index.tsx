import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Line } from "react-native-svg";
import { getOffers, type OfferItem, type Offers } from "../../api";
import { track } from "../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../util/analytics/analyticsEvents";
import PriceTag from "../../components/PriceTag";
import {
  size,
  Page,
  Text,
  Icon,
  Chip,
  type IconName,
  icons,
  useTheme,
  accentEdge,
  primaryEdge,
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
  shelfLabel,
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
  const [tier, setTier] = useState<TierFilter>("all");
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
  /**
   * What a deep-work pack includes, as ticked lines.
   *
   * EVERY LINE IS DERIVED FROM A FIELD, none is written here. The repo's rule is
   * that product copy never lives in the app, and a hardcoded list of benefits
   * per pack would both break that and go stale the first time a pack changed.
   * So this renders only what the payload can prove: the arc length, the calls
   * the pack actually grants, and the bonus month — the last gated on
   * `bonusMembershipEligible`, which is first-purchase-only.
   *
   * THE LINE THIS CANNOT YET SHOW is what the arc actually covers ("mock panels,
   * phone screens, salary talk"). That is the most persuasive line on the card
   * and there is no field for it: offers carries exactly one piece of prose per
   * pack, `blurb`. The backend already stores the module outline, it is simply
   * not projected into this response — so it is a controller change rather than
   * new modelling. Until it lands, this list renders what it can and the card
   * shortens by a row rather than inventing anything.
   */
  const inclusions = (item: OfferItem): string[] => {
    const lines: string[] = [];
    if (item.arcDays) lines.push(`${item.arcDays}-day guided arc`);
    if (item.creditGrantAmount > 0) {
      lines.push(`${item.creditGrantAmount} AI practice calls`);
    }
    // Same rule as the chips: not on a card for something already bought.
    if (
      !item.owned &&
      item.bonusMembershipDays > 0 &&
      offers?.bonusMembershipEligible
    ) {
      lines.push("First month of membership free");
    }
    return lines;
  };

  const factChips = (item: OfferItem): string[] => {
    const chips: string[] = [];
    if (item.arcDays) chips.push(`${item.arcDays} days`);
    chips.push(capitalise(programShelfLabel(item).toLowerCase()));
    if (item.creditGrantAmount > 0) {
      chips.push(`${item.creditGrantAmount} AI calls`);
    }
    /*
     * NOT ON SOMETHING THEY ALREADY BOUGHT. "1 month free" is a reason to
     * purchase, and on an owned card it is either an offer they cannot take or
     * one they already took. Either way it is the shop talking on the shelf
     * that exists to get them back INTO the program.
     */
    if (
      !item.owned &&
      item.bonusMembershipDays > 0 &&
      offers?.bonusMembershipEligible
    ) {
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
            the card; both references commit to one saturated colour.

            NO `primaryEdge` HERE — see `styles.heroOutline`. A border on this
            view is a border on a RECTANGLE, and this card is not one. */}
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
              <Icon name={icons.star} size={size.iconInline} color={colors.accent.lime} />
              <Text variant="eyebrow" color={colors.accent.lime}>
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

          {/* ── the silhouette, drawn last so it sits over everything ──────
              THE EDGE AND THE PUNCHES ARE ONE OBJECT, and they have to be, or
              the ticket stops being a ticket.

              The punches are paint, not a hole: two discs of the PAGE colour
              centred on the card's edge, cropped to their inner half by the
              card's own `overflow: "hidden"`. Same silhouette as an SVG clip
              for a fraction of the cost. It works only because this card sits
              on a flat canvas — move it onto a gradient or an image and the
              discs stop matching.

              What that trick cannot survive is a border on the card itself.
              `primaryEdge` used to live on `styles.hero`, and a border there
              traces the RECTANGLE: on iOS a `CALayer` border paints above every
              subview, so a hairline ran straight across both punches; on
              Android it paints below, so the outline just stopped dead at each
              one. Two platforms, two bugs, one cause — the edge described a
              shape the fill did not have.

              So the outline moved to a sibling overlay UNDER the discs, and the
              discs carry the same edge as a ring. The stroke now runs down the
              side, turns into the bite, and comes back out: a punched ticket,
              and identical on both platforms. On the ink scheme every `*Edge`
              role is transparent, so all three of these draw nothing.

              Drawn after the tear line so the discs still cover its ends. */}
          <View style={[styles.heroOutline, primaryEdge(colors)]} pointerEvents="none" />
          <View
            style={[
              styles.notch,
              styles.notchLeft,
              { backgroundColor: colors.background.canvas },
              primaryEdge(colors),
            ]}
            pointerEvents="none"
          />
          <View
            style={[
              styles.notch,
              styles.notchRight,
              { backgroundColor: colors.background.canvas },
              primaryEdge(colors),
            ]}
            pointerEvents="none"
          />
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
    const isDeep = item.shelf === "deep";
    const facts = factChips(item);
    const lines = inclusions(item);

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
        {/* PREMIUM GETS A DIFFERENT CARD, not a louder one. The tier chip is
            purple — the one accent the shop does not otherwise use, so it cannot
            be confused with the orange hero or the lime TOP MATCH — and the
            ticked list replaces the fact chips, because at this price the
            question stops being "what is this" and becomes "what do I get".
            Label text reads from `programShelfLabel`, not a literal here — see
            its header for why "Deep work" was retired. */}
        {isDeep ? (
          <View
            style={[styles.tierChip, { backgroundColor: colors.accent.purple }, accentEdge(colors, "purple")]}
          >
            <Icon name={icons.pro} size={size.iconInline} color={colors.accentOn.purple} />
            <Text variant="eyebrow" color={colors.accentOn.purple}>
              {programShelfLabel(item)}
            </Text>
          </View>
        ) : null}

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
                size={size.iconSm}
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

        {isDeep ? (
          /* THE TICKS ARE `accentText.success`, NOT LIME — deliberately. Lime on
             a paper card measures about 1.8:1 and would disappear, but the real
             reason is that lime is the TOP MATCH mark. Spending it on nine
             inclusion bullets is how a signal stops meaning anything. Success
             green says "included", which is what a tick means, and
             `accentText.*` resolves per scheme so it is legible on both. */
          <View style={[styles.incl, { borderTopColor: colors.border.default }]}>
            {lines.map((line) => (
              <View key={line} style={styles.inclLine}>
                <Icon
                  name={icons.success}
                  size={size.iconInline}
                  color={colors.accentText.success}
                />
                <Text variant="bodySm" color="secondary" style={styles.inclText}>
                  {line}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          /* The comparables. `surface.control` and not a low-alpha wash: a 6%
             scrim reads at 1.10:1 against the paper card and the chips vanish,
             which is the same near-white-on-cream failure the whole scheme is
             prone to. `control` is the DS's answer to exactly this — 1.31:1 on
             ink, 1.39:1 on paper — and its label clears AA on both. */
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
        )}
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
  const afterHero = heroItem ? items.filter((i) => i.key !== heroItem.key) : items;

  /**
   * ── WHAT THEY ALREADY BOUGHT COMES OUT OF THE SHOP ───────────────────────
   * A program somebody owns sat in the sale list between two they could buy,
   * marked only by a small tag. That is the wrong shelf: they are not deciding
   * whether to get it, they are looking for the way back into it. Worse, a
   * FINISHED program had nowhere else to be — the For-you shelf leads with the
   * ACTIVE one, so completing a program made it disappear from every surface
   * except a scroll through the shop.
   *
   * So owned programs lift into their own short section above, and the sale
   * list below is only things to buy.
   *
   * THE TIER PILLS DO NOT TOUCH IT. They answer "which of these would I buy",
   * and hiding a program somebody already paid for behind a shelf filter would
   * make it unfindable for the second time.
   */
  const ownedItems = afterHero.filter((i) => i.owned);
  const forSale = afterHero.filter((i) => !i.owned);

  // Filtered, never re-sorted. `items` arrives ranked for this user and a
  // previous `groupByShelf` was deleted precisely because grouping threw that
  // ranking away; `filter` preserves order by definition, which is the whole
  // reason this is a filter and not a set of sections. Splitting owned out is
  // not that mistake repeated: it removes rows from the ranked list without
  // reordering the ones that remain.
  const shownItems =
    tier === "all" ? forSale : forSale.filter((i) => i.shelf === tier);

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

          {/* ABOVE THE SHOP, ALWAYS. Somebody who owns a program is not
              browsing, and this is the only place a FINISHED one still lives. */}
          {ownedItems.length ? (
            <>
              <Text variant="h3" color="primary" style={styles.sectionHeading}>
                {ownedItems.length === 1 ? "Your program" : "Your programs"}
              </Text>
              {ownedItems.map(renderCard)}
            </>
          ) : null}

          {/* Only when something sits ABOVE it. With no hero and nothing owned,
              the list is the page and a heading over it labels nothing. */}
          {(heroItem || ownedItems.length) && forSale.length ? (
            <Text variant="h3" color="primary" style={styles.sectionHeading}>
              {ownedItems.length ? "More to explore" : "More programs"}
            </Text>
          ) : null}

          {/* BELOW THE HERO, AND THE HERO IS NEVER FILTERED. The top match is
              the answer to "which one is for me", and a shelf filter is a
              different question entirely — hiding the best-matched pack because
              somebody tapped "Premium" would trade the one card most likely to
              convert for a tidier list. So the pills govern the list underneath
              them and nothing above. */}
          {forSale.length > 1 ? (
            <View style={styles.filterBar}>
              {TIER_FILTERS.map((f) => (
                <Chip
                  key={f.value}
                  label={f.label}
                  icon={f.icon}
                  selected={tier === f.value}
                  onPress={() => setTier(f.value)}
                />
              ))}
            </View>
          ) : null}

          {shownItems.length ? (
            shownItems.map(renderCard)
          ) : forSale.length ? (
            // A shelf filter emptied the list, not the catalogue.
            <Text variant="bodySm" color="secondary" center>
              Nothing on this shelf yet.
            </Text>
          ) : ownedItems.length ? (
            // They own every one. "Nothing on this shelf yet" would read as a
            // catalogue that failed to load, which is the opposite of the truth.
            <Text variant="bodySm" color="secondary" center>
              You have them all. More are on the way.
            </Text>
          ) : null}
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
 * The shelf filter.
 *
 * KEYED TO `shelf`, NOT TO `arcDays`, and that distinction is the whole reason
 * this reads correctly: the obvious rule — "premium is longer than 7 days" —
 * quietly drags `speech_toolkit` in, which is an 8-day pack on the REGULAR
 * shelf at half the price. `shelf === "deep"` is exactly the two ₹1,999-anchor
 * packs and exactly the two that bundle AI calls, so it is the only axis where
 * length, price and what-you-get all agree.
 *
 * `small` is deliberately absent. The catalog defines a third shelf and no pack
 * has ever used it, so offering a "Focused" pill would be offering a filter that
 * can only ever return nothing.
 */
type TierFilter = "all" | "regular" | "deep";

// Labels come from `shelfLabel`, not literals — see its header. A pill and the
// card it filters to reading different words for the same shelf is exactly
// the drift `programEyebrow`/`programShelfLabel` already exist to prevent.
const TIER_FILTERS: { value: TierFilter; label: string; icon: IconName }[] = [
  { value: "all", label: "All", icon: "layout-grid" },
  { value: "regular", label: shelfLabel("regular"), icon: "layers" },
  { value: "deep", label: shelfLabel("deep"), icon: icons.pro },
];

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
  // Carries `elevation.e2`, so it needs the card's radius: a shadow is cast by
  // the view's own outline, and an unrounded wrapper cast a SQUARE one — four
  // wedges of shade poking out past a 24-radius card. A third silhouette in a
  // stack that is supposed to agree on one.
  heroWrap: {
    borderRadius: radius.card,
  },
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
  // The paper edge, as an overlay rather than a border on the card. Same box,
  // same radius, so it lands exactly where `styles.hero` ends — the difference
  // is only that the punches are free to paint over it.
  heroOutline: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.card,
  },
  notch: {
    position: "absolute",
    top: NOTCH_Y - NOTCH_R,
    width: NOTCH_R * 2,
    height: NOTCH_R * 2,
    borderRadius: NOTCH_R,
  },
  // Centred ON the card's edge, so half of each disc is clipped away and the
  // visible half reads as a punch. Exactly half now that the card carries no
  // border of its own: absolute children lay out against the PADDING box, so a
  // 1px border used to push both discs a pixel inboard on paper and nowhere on
  // ink — the one geometry in here that differed between the two schemes.
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
  // Edge-to-edge would need the row to escape `Page`'s gutter; these are few
  // enough to wrap instead of scroll, which keeps every option visible at once —
  // a filter you have to scroll to discover is a filter nobody uses.
  filterBar: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  tierChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: space.inlineGap - 2,
    paddingHorizontal: space.inlineGap + 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.chip,
  },
  incl: {
    borderTopWidth: borderWidth.hairline,
    paddingTop: space.rowGap,
    gap: space.inlineGap,
  },
  inclLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.inlineGap + 1,
  },
  inclText: {
    flex: 1,
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
