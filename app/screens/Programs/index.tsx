import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  type LayoutChangeEvent,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
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
  haptics,
  spring,
  useNavBarInset,
  zIndex,
  IconButton,
  SchemeStatusBar,
} from "../../design-system";
import PressableScale from "../../components/PressableScale";
import ScreenView from "../../components/ScreenView";
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
import { useProgramsDock, type ProgramsView } from "../../stores/programsDock";
import ProgramsDock from "./ProgramsDock";

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
   * ── THE SHOP'S TWO HALVES ────────────────────────────────────────────────
   * `view` lives in the store rather than in this component because the
   * control that changes it is the bottom dock, which is rendered by
   * `CustomTabBar` at the root of the app. One value, two readers, and the
   * dock and the screen can never disagree about which half is showing.
   */
  const view = useProgramsDock((s) => s.view);
  const setView = useProgramsDock((s) => s.setView);
  const enterDock = useProgramsDock((s) => s.enter);
  const leaveDock = useProgramsDock((s) => s.leave);
  const setOwnedCount = useProgramsDock((s) => s.setOwnedCount);

  // The dock is the shop's for exactly as long as the shop is on screen. The
  // Menu pill is handed the ONE navigator that can actually leave: `goBack` on
  // the tab navigator would pop the tab, not this stack screen inside it.
  useFocusEffect(
    useCallback(() => {
      enterDock(() => navigation.goBack());
      return () => leaveDock();
    }, [enterDock, leaveDock, navigation]),
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
    source: "programs_hero" | "programs_list" | "programs_owned",
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
              <Icon
                name={icons.star}
                size={size.iconInline}
                color={colors.accent.lime}
              />
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
          <View
            style={[styles.heroOutline, primaryEdge(colors)]}
            pointerEvents="none"
          />
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
  const renderCard = (
    item: OfferItem,
    index: number,
    source: "programs_list" | "programs_owned" = "programs_list",
  ) => {
    const reason = item.match?.reason ?? null;
    const isDeep = item.shelf === "deep";
    const facts = factChips(item);
    const lines = inclusions(item);

    return (
      <PressableScale
        key={item.key}
        scaleTo={0.98}
        onPress={() => openDetail(item, source, index)}
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
            style={[
              styles.tierChip,
              { backgroundColor: colors.accent.purple },
              accentEdge(colors, "purple"),
            ]}
          >
            <Icon
              name={icons.pro}
              size={size.iconInline}
              color={colors.accentOn.purple}
            />
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
            /* ON THE YOURS SHELF, "OWNED" IS THE NAME OF THE SHELF.
               Printing it on every card there says nothing the tab did not
               already say, and it says it where the only useful thing a card
               can offer is a way in. So the badge becomes the action. */
            view === "yours" ? (
              <View style={styles.ownedTag}>
                <Text variant="title" color={colors.text.accent}>
                  Open
                </Text>
                <Icon
                  name={icons.chevronRight}
                  size={size.iconSm}
                  color={colors.text.accent}
                />
              </View>
            ) : (
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
            )
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
          <View
            style={[styles.incl, { borderTopColor: colors.border.default }]}
          >
            {lines.map((line) => (
              <View key={line} style={styles.inclLine}>
                <Icon
                  name={icons.success}
                  size={size.iconInline}
                  color={colors.accentText.success}
                />
                <Text
                  variant="bodySm"
                  color="secondary"
                  style={styles.inclText}
                >
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
                style={[
                  styles.fact,
                  { backgroundColor: colors.surface.control },
                ]}
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
  const afterHero = heroItem
    ? items.filter((i) => i.key !== heroItem.key)
    : items;

  /**
   * ── WHAT THEY ALREADY BOUGHT COMES OUT OF THE SHOP ───────────────────────
   * A program somebody owns sat in the sale list between two they could buy,
   * marked only by a small tag. That is the wrong shelf: they are not deciding
   * whether to get it, they are looking for the way back into it. Worse, a
   * FINISHED program had nowhere else to be — the For-you shelf leads with the
   * ACTIVE one, so completing a program made it disappear from every surface
   * except a scroll through the shop.
   *
   * It first lifted into its own short SECTION above the sale list, and that
   * fixed the wrong-shelf problem while creating a worse one: the second card
   * on the page was something nobody could buy, and every further program a
   * person owned pushed the catalogue further down. The more they had bought,
   * the less shop they saw.
   *
   * So the two are now two halves of the screen, switched by the bottom dock.
   * Browse is only things to buy. Yours is only things they have.
   *
   * THE TIER PILLS BELONG TO BROWSE ONLY. They answer "which of these would I
   * buy", and hiding a program somebody already paid for behind a shelf filter
   * would make it unfindable for the second time.
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

  // The number ON the Yours tab. Written from here rather than read by the
  // dock, because the offers request is the only place that knows it, and the
  // dock has no business fetching anything.
  useEffect(() => {
    setOwnedCount(ownedItems.length);
  }, [ownedItems.length, setOwnedCount]);

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

  /**
   * ── SWIPING BETWEEN THE TWO HALVES ───────────────────────────────────────
   * A REAL PAGER: both halves sit side by side in one row, and the row follows
   * the finger. Half a swipe is half the next shelf, and reversing mid-drag
   * brings the old one back, because nothing is decided until you let go.
   *
   * Two earlier attempts are worth recording so neither comes back.
   *
   * A pan that only nudged the page and swapped the content on release. It
   * answered "did the tab change" and nothing else: half a swipe showed a
   * shrug, and changing your mind halfway did nothing, because the direction
   * was only ever read at the end.
   *
   * A native `pagingEnabled` ScrollView, which would have been free. It cannot
   * work here: each half is itself a vertical ScrollView, and the inner one
   * swallows the horizontal pan before the outer sees it. `Gesture.Pan`
   * does not have that problem, because gesture-handler arbitrates across the
   * whole tree rather than letting the innermost scroll view win by default.
   *
   * `activeOffsetX` at 16 with `failOffsetY` at 12 is what keeps the vertical
   * lists feeling untouched: the pan cannot claim the gesture until the finger
   * has clearly gone sideways, and it gives up the moment it goes down.
   */
  const { width: windowW } = useWindowDimensions();
  const navBarInset = useNavBarInset();
  const reduced = useReducedMotion();

  // The pages are as wide as the column, not as the window: they live inside
  // `Page`, which owns the screen gutter. Seeded from the window so the very
  // first frame is right, then corrected from the real layout.
  const [pageW, setPageW] = useState(windowW);
  const onPagerLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setPageW((prev) => (Math.abs(prev - w) < 1 ? prev : w));
  }, []);

  const index = view === "yours" ? 1 : 0;
  const x = useSharedValue(0);
  const startX = useSharedValue(0);

  /**
   * ── THE CROSSING IS SOFT, THE ENDS ARE SHARP ─────────────────────────────
   * A blur laid over both halves while the row is in motion, at zero on both
   * ends and full in the middle. What it buys is not decoration: two shelves
   * of cards side by side, both perfectly legible and both sliding, is a lot
   * of small type asking to be read while it moves. Softening the crossing
   * says "this is one thing becoming another" instead of asking the eye to
   * track nine prices going past.
   *
   * ZERO AT BOTH ENDS, deliberately. A blur that is still clearing when the
   * page lands would undo the thing this pager was rebuilt for: you have to be
   * able to see where you are going, and you have to arrive sharp.
   *
   * MOUNTED ONLY WHILE MOVING. A blur view at zero opacity is still a blur
   * view: the compositor does the work and throws it away, on every frame of a
   * screen people sit and read. So it exists for the length of the transition
   * and no longer.
   */
  const [blurring, setBlurring] = useState(false);

  // The dock drives the row. Also runs on mount and whenever the column is
  // remeasured, which is what keeps a rotation from leaving it between pages.
  useEffect(() => {
    const target = -index * pageW;
    if (reduced) {
      x.value = target;
      return;
    }
    if (x.value !== target) setBlurring(true);
    x.value = withSpring(target, spring.gentle, (finished) => {
      if (finished) runOnJS(setBlurring)(false);
    });
  }, [index, pageW, reduced, x]);

  const commitView = useCallback(
    (next: ProgramsView) => {
      haptics.selection();
      setView(next);
    },
    [setView],
  );

  const pan = Gesture.Pan()
    // A wide gap between the two on purpose. The pan may not claim the gesture
    // until the finger has gone 20 points sideways, and it gives up as soon as
    // it has gone 8 points down, so a drag that is mostly vertical fails before
    // it can ever activate. Narrow the gap and a fast diagonal flick starts
    // paging when the person meant to scroll.
    .activeOffsetX([-20, 20])
    .failOffsetY([-8, 8])
    .onBegin(() => {
      // From wherever the row currently is, not from where the last page
      // settled. Grabbing it mid-flight has to catch it, not restart it.
      startX.value = x.value;
      if (!reduced) runOnJS(setBlurring)(true);
    })
    .onUpdate((e) => {
      const raw = startX.value + e.translationX;
      const min = -pageW;
      // Past either end the row still moves, at a quarter rate. Rubber-banding
      // says "nothing over there" without a message and without a dead stop.
      x.value =
        raw > 0 ? raw * 0.25 : raw < min ? min + (raw - min) * 0.25 : raw;
    })
    .onEnd((e) => {
      // Where the row WOULD come to rest if it kept its speed. A flick that
      // has barely moved still lands on the next page, which is what makes a
      // quick gesture feel heard.
      const projected = x.value + e.velocityX * 0.15;
      const next = projected < -pageW / 2 ? 1 : 0;
      x.value = withSpring(-next * pageW, spring.gentle, (finished) => {
        if (finished) runOnJS(setBlurring)(false);
      });
      if (next !== index) {
        runOnJS(commitView)(next === 1 ? "yours" : "browse");
      }
    });

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));

  /**
   * ── THE HEADER MOVES ON ONE AXIS AND NOT THE OTHER ───────────────────────
   * Vertically it behaves like every other screen in the app: the title and
   * the back arrow scroll away with the content, because they are part of the
   * page and not a bar bolted to the top of it.
   *
   * Horizontally it does not move at all. It belongs to the screen, not to
   * either half, and a back button that slides sideways while you are deciding
   * whether to swipe is one you cannot aim at.
   *
   * So it lives OUTSIDE the sliding row, in a layer of its own, and that layer
   * is pushed up by exactly the scroll offset of whichever half is showing.
   * Same rate as the content, so the two never drift apart and never overlap.
   *
   * BLENDED ACROSS THE SWIPE rather than switched at the end of it. The two
   * halves keep separate scroll positions, and if the header jumped from one
   * to the other on release it would snap at the exact moment everything else
   * had finished settling. Interpolating on the row's own position means the
   * header is already where the incoming half needs it by the time it lands.
   */
  const insets = useSafeAreaInsets();
  const browseY = useSharedValue(0);
  const yoursY = useSharedValue(0);

  const onBrowseScroll = useAnimatedScrollHandler((e) => {
    browseY.value = e.contentOffset.y;
  });
  const onYoursScroll = useAnimatedScrollHandler((e) => {
    yoursY.value = e.contentOffset.y;
  });

  const blurStyle = useAnimatedStyle(() => {
    const t = pageW > 0 ? Math.min(1, Math.max(0, -x.value / pageW)) : 0;
    // A half sine: 0 at both ends, 1 halfway across. Not linear-to-the-middle,
    // which would leave a visible corner in the fade at the exact moment the
    // eye is on it.
    return { opacity: Math.sin(Math.PI * t) };
  });

  const headerStyle = useAnimatedStyle(() => {
    const t = pageW > 0 ? Math.min(1, Math.max(0, -x.value / pageW)) : 0;
    const y = browseY.value * (1 - t) + yoursY.value * t;
    // Not clamped at zero: on an overscroll bounce the content comes down, and
    // the header has to come with it or it detaches from the page it is part of.
    return { transform: [{ translateY: -y }] };
  });

  // Each half scrolls on its own, so each needs its own clearance under the
  // dock. `Page` only reserves this on its own scroll body, and the body here
  // is the pager.
  /**
   * Exactly `PageHeader`'s geometry, rebuilt from the same tokens: the safe
   * area, its 8pt breath, the back bar's own height, then the 28pt drop to the
   * title. The bar is a floating layer now, so each half has to leave the room
   * the bar would have taken.
   */
  const headerPad =
    insets.top + space.inlineGap + size.backBtn + space.titleGap;

  const pageContent = {
    paddingTop: headerPad,
    paddingHorizontal: space.screenX,
    paddingBottom: size.tabBarSafe + navBarInset,
    gap: space.groupGap,
  };

  // ── WHAT THE CATALOGUE HALF HOLDS ─────────────────────────────────────────
  const browseBody = (
    <>
      {/*
        THIS CARD STANDS IN THE HERO'S SLOT, and the two are mutually
        exclusive: the hero needs `hasSignal`, this renders only when we don't
        have it. So it is not a small aside above the shop — when it shows, it
        is the ONLY thing at the top of the screen, and the list below it is
        unranked because of the very thing it is asking for.

        It gets the vivid banner treatment in LIME rather than the default
        blue: it is not a product, and it must not read as one more thing to
        buy. Nothing else in the shop is lime.
      */}
      {!hasSignal ? (
        <RecHeroCard
          accentKey="lime"
          eyebrow="PERSONALISE THIS LIST"
          title="Not sure where to start?"
          subtitle="Answer a few questions and we'll point you to the program built for what you find hardest."
          ctaLabel="Get matched"
          // Not the default pack glyph: this button doesn't open a program, it
          // starts the questions that decide which one to point at.
          ctaIcon={icons.roadmap}
          onPress={startOnboarding}
        />
      ) : null}

      {heroItem ? renderHero(heroItem) : null}

      {/* Only when the hero sits above it. With no hero the list is the page,
          and a heading over it labels nothing. It reads "More programs" in
          every case now: what they own is no longer on this half, so there is
          nothing for "More to explore" to be more THAN. */}
      {heroItem && forSale.length ? (
        <Text variant="h3" color="primary" style={styles.sectionHeading}>
          More programs
        </Text>
      ) : null}

      {/* BELOW THE HERO, AND THE HERO IS NEVER FILTERED. The top match is the
          answer to "which one is for me", and a shelf filter is a different
          question entirely — hiding the best-matched pack because somebody
          tapped "Premium" would trade the one card most likely to convert for
          a tidier list. So the pills govern the list underneath them and
          nothing above. */}
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
        shownItems.map((item, index) => renderCard(item, index))
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
  );

  // ── AND WHAT THE OTHER ONE HOLDS ──────────────────────────────────────────
  // No hero, no filter pills, no prices. Nothing on this half is a decision,
  // so nothing on it should look like one.
  const yoursBody = ownedItems.length ? (
    ownedItems.map((item, index) => renderCard(item, index, "programs_owned"))
  ) : (
    /* The half exists before anything is in it, on purpose: a screen that
       changes shape the first time you buy something is a screen you have to
       learn twice. So it says what will be here, and sends them back to the
       half that can put something in it. */
    <View style={styles.centered}>
      <Text variant="body" color="secondary" center>
        Nothing here yet. A program you buy stays yours, and it will wait for
        you on this shelf.
      </Text>
      <View style={styles.emptyAction}>
        <Chip
          label="See what's available"
          icon={icons.explore}
          onPress={() => setView("browse")}
        />
      </View>
    </View>
  );

  const status = loading ? (
    <View style={styles.centered}>
      <Spinner label="Loading programs…" />
    </View>
  ) : failed ? (
    <View style={styles.centered}>
      <Text variant="body" color="secondary" center>
        We couldn&apos;t load the programs just now. Pull back and try again in
        a moment.
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
  ) : null;

  // A catalogue that has not arrived yet is not two halves of anything, so it
  // gets one page and no pager. The dock stays: it is the frame, and a frame
  // that appears once the content loads is a screen that jumps.
  if (status) {
    return (
      <View style={styles.screen}>
        <Page
          title="Programs"
          description={BROWSE_DESCRIPTION}
          onBack={() => navigation.goBack()}
          tabBarSafe
        >
          {status}
        </Page>
        <ProgramsDock />
      </View>
    );
  }

  return (
    <ScreenView style={{ backgroundColor: colors.background.canvas }}>
      <SchemeStatusBar />

      <GestureDetector gesture={pan}>
        <Animated.View
          onLayout={onPagerLayout}
          style={styles.pagerViewport}
          collapsable={false}
        >
          <Animated.View
            style={[styles.pagerRow, { width: pageW * 2 }, rowStyle]}
          >
            <View style={{ width: pageW }}>
              <Animated.ScrollView
                onScroll={onBrowseScroll}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={pageContent}
              >
                {/* THE TITLE RIDES INSIDE THE HALF. The two shelves are not
                    the same thing and do not have the same name, so the name
                    travels with the shelf. Left in the fixed bar it would have
                    to change at the end of every swipe, and a word swapping
                    itself the instant everything else stops moving is the one
                    kind of snap this pager was rebuilt to remove. */}
                <Text variant="h1">Programs</Text>
                <Text
                  variant="body"
                  color="secondary"
                  style={styles.pageDescription}
                >
                  {BROWSE_DESCRIPTION}
                </Text>
                {browseBody}
              </Animated.ScrollView>
            </View>

            <View style={{ width: pageW }}>
              <Animated.ScrollView
                onScroll={onYoursScroll}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={pageContent}
              >
                <Text variant="h1">Your programs</Text>
                <Text
                  variant="body"
                  color="secondary"
                  style={styles.pageDescription}
                >
                  Everything you have bought. Open one to carry on.
                </Text>
                {yoursBody}
              </Animated.ScrollView>
            </View>
          </Animated.View>
        </Animated.View>
      </GestureDetector>

      {/* Over the halves, under the header: the title and the back arrow stay
          readable while the shelves behind them soften. */}
      {blurring ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.blurLayer, blurStyle]}
        >
          <BlurView
            intensity={Platform.OS === "ios" ? 24 : 40}
            tint={isDark ? "dark" : "light"}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : null}

      {/* THE ONE THING THAT DOES NOT SLIDE. It scrolls away with the page like
          any other header, but it never moves sideways, because it belongs to
          the screen rather than to either half. Above the blur too: chrome you
          might need mid-transition should not go soft with the content.

          `box-none` so only the button itself takes a touch. */}
      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.backLayer,
          headerStyle,
          {
            paddingTop: insets.top + space.inlineGap,
            paddingLeft: space.screenX,
          },
        ]}
      >
        <IconButton name="arrow-left" onPress={() => navigation.goBack()} />
      </Animated.View>

      {/* Opaque status-bar cap, the same one `Page` carries: a title that
          scrolls away has to disappear BEHIND the clock rather than through it. */}
      {insets.top > 0 ? (
        <View
          pointerEvents="none"
          style={[
            styles.statusCap,
            {
              height: insets.top,
              backgroundColor: colors.background.canvas,
            },
          ]}
        />
      ) : null}

      {/* OUTSIDE the pager, so the dock does not slide with the content it is
          switching. It is the frame, not the picture. */}
      <ProgramsDock />
    </ScreenView>
  );
};

const BROWSE_DESCRIPTION =
  "Guided programs built around one situation at a time. Buy once, yours to keep.";

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
  screen: { flex: 1 },
  /**
   * The window the row slides behind. `overflow: hidden` is what stops the
   * off-screen half from painting into the gutter, and `flex: 1` is what gives
   * both halves a height to scroll inside.
   */
  pagerViewport: { flex: 1, overflow: "hidden" },
  pagerRow: { flex: 1, flexDirection: "row" },
  /** Between the sliding halves and the header that sits still above them. */
  blurLayer: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
  /** Above the halves AND above the blur, below the status cap. */
  backLayer: { position: "absolute", top: 0, left: 0, zIndex: 2 },
  /** The h1 → subtitle gap, the same one `PageHeader` uses. */
  pageDescription: { marginTop: space.titleSub },
  statusCap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: zIndex.sticky,
  },
  /** The sentence and its way out are one block, not two stacked paragraphs. */
  emptyAction: { marginTop: space.groupGap, alignItems: "center" },
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
