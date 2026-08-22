import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { getOffers, type OfferItem } from "../../api";
import { getPackBrochure, getPackProgress, restartPack } from "../../api/packs";
import { selectOffer } from "../../util/packs/offers";
import { PackBrochure, PackProgress } from "../../api/packs/types";
import { purchaseCatalogItem, pollWalletUntil } from "../../services/purchases";
import {
  size,
  Button,
  Page,
  Text,
  Icon,
  icons,
  useTheme,
  spacing,
  radius,
  Spinner,
} from "../../design-system";
import PressableScale from "../../components/PressableScale";
import ProgramSalesFlow from "./ProgramSalesFlow";
import NextDayCountdown from "./NextDayCountdown";
import {
  showErrorBottomSheet,
  showSuccessBottomSheet,
} from "../../util/functions/bottomSheet";
import { track } from "../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../util/analytics/analyticsEvents";
import {
  ExploreStackNavigationProp,
  ExploreStackRouteProp,
} from "../../navigators/stacks/ExploreStack/types";

/**
 * One program's detail page — every word of it from the server.
 *
 * The pitch, the day count and the curriculum come from
 * GET /packs/{id}/brochure; the price comes from GET /users/me/offers and
 * NOWHERE else. Two sources for a price is how someone is shown one number and
 * charged another, so this screen never computes or hardcodes one.
 *
 * The brochure is safe to fetch before purchase: it carries titles and day
 * numbers, never blocks. See sw-be-2/src/types/packBrochure.types.ts.
 */
const ProgramDetailScreen = () => {
  const navigation = useNavigation<ExploreStackNavigationProp<"ProgramDetail">>();
  const route = useRoute<ExploreStackRouteProp<"ProgramDetail">>();
  const { catalogKey, packId } = route.params;
  const { colors } = useTheme();

  const [offer, setOffer] = useState<OfferItem | null>(null);
  const [isFounder, setIsFounder] = useState(false);
  /**
   * Whether the first-purchase bonus month would ACTUALLY be granted to this
   * user. The backend gives it to first-time pack buyers only, so this gates
   * every mention of it — advertising a gift a repeat buyer won't receive is
   * the same shown≠charged harm as a wrong price.
   */
  const [bonusEligible, setBonusEligible] = useState(false);
  const [brochure, setBrochure] = useState<PackBrochure | null>(null);
  const [owned, setOwned] = useState(false);
  /**
   * ── OWNING A PROGRAM USED TO BE A DEAD END ────────────────────────────────
   * This screen said "You own this. It's unlocked." and offered no way in. The
   * list card that got you here goes to this screen for owned packs too, so the
   * only route back into something you had paid for was Home's For-you shelf,
   * which shows the ACTIVE program and nothing else.
   *
   * PackModule cannot work this out for itself: handed a `packId` with no
   * `moduleId` it logs "No module ID provided" and renders nothing. So the
   * screen that offers the button has to know which day the button opens.
   */
  const [progress, setProgress] = useState<PackProgress | null>(null);
  const [opening, setOpening] = useState(false);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  // Funnel: the recommendation→click→DETAIL step. Fires once per opened
  // program, independent of how the user got here (Home rec, shop, deep link).
  useEffect(() => {
    track(ANALYTICS_EVENTS.PROGRAM_DETAIL_VIEWED, { catalogKey, packId });
  }, [catalogKey, packId]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const offers = await getOffers();
        if (cancelled) return;
        // Matched by key with NO fallback. The old screen fell through to
        // `?? items[0]`, which would render a different product under this
        // one's heading and price. Missing means missing.
        const match = selectOffer(offers.items, catalogKey);
        setOffer(match);
        setIsFounder(offers.isFounderCohort);
        setBonusEligible(offers.bonusMembershipEligible);
        setOwned(match?.owned ?? false);
        // Only for owners: for everybody else the endpoint is a 403 and the
        // sales flow needs nothing from it.
        if (match?.owned && match.packId) {
          getPackProgress(match.packId)
            .then(setProgress)
            .catch(() => {
              /* The button falls back to "Open", which PackModule can still
                 resolve from day one. Never worth blocking the screen. */
            });
        }
      } catch (error) {
        console.error("[ProgramDetail] Failed to load offer:", error);
      }

      // The curriculum is a nice-to-have: a missing brochure costs the outline,
      // not the ability to buy, so it is fetched separately and failure here
      // does not block the page.
      if (packId) {
        try {
          const b = await getPackBrochure(packId);
          if (!cancelled) setBrochure(b);
        } catch (error) {
          console.error("[ProgramDetail] Failed to load brochure:", error);
        }
      }

      if (!cancelled) setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [catalogKey, packId]);

  // The clock ran out while they were sitting here. Ask the server what is
  // open now, so the wait turns into the way in without a manual reload.
  const refreshProgress = useCallback(() => {
    if (!offer?.packId) return;
    getPackProgress(offer.packId)
      .then(setProgress)
      .catch(() => {
        /* Nothing to recover: the countdown stays at "Opening now" and a
           back-and-forward re-fetches anyway. */
      });
  }, [offer?.packId]);

  const handleBuy = async () => {
    if (!offer) return;
    setPurchasing(true);
    // Funnel: bottom of the recommendation → purchase chain. `planId` is the
    // tier SKU key; `catalogKey` ties it back to the recommended pack.
    const payProps = {
      planId: offer.key,
      catalogKey,
      amountInr: offer.priceInr,
    };
    track(ANALYTICS_EVENTS.PAYMENT_STARTED, payProps);
    try {
      const outcome = await purchaseCatalogItem(offer.key);
      if (outcome.status !== "purchased") {
        // Not completed: a user cancel or a store error. `reason` separates the
        // two so an abandonment isn't read as a genuine payment failure.
        track(ANALYTICS_EVENTS.PAYMENT_FAILED, {
          ...payProps,
          reason: outcome.status === "error" ? outcome.message : outcome.status,
        });
      }
      if (outcome.status === "purchased") {
        track(ANALYTICS_EVENTS.PAYMENT_COMPLETED, payProps);
        const wallet = await pollWalletUntil((w) =>
          w.entitlements.includes(`pack:${offer.key}`),
        );
        if (wallet) {
          setOwned(true);
          // CLAIM THE GIFT — but only once the wallet proves it landed.
          // The bonus membership month is granted silently by the webhook and
          // was never mentioned anywhere in the app, which wasted the single
          // most generous thing we do. Read it back from the wallet rather
          // than assuming from pre-purchase eligibility: a race, a refund or a
          // changed rule must never produce a congratulation for a gift the
          // user did not actually get.
          if (wallet.entitlements.includes("membership")) {
            setBonusEligible(false); // spent — never advertise it twice
            showSuccessBottomSheet(
              "You're in. The first month is on us",
              "Your program is unlocked, plus a free month of membership: 4 AI practice calls to use whenever you want them.",
            );
          }
        } else {
          showErrorBottomSheet(
            "Almost there",
            "Your purchase went through but is still being confirmed. It should appear shortly.",
          );
        }
      }
    } catch (error) {
      console.error("[ProgramDetail] Purchase failed:", error);
      track(ANALYTICS_EVENTS.PAYMENT_FAILED, { ...payProps, reason: "exception" });
      showErrorBottomSheet(
        "Purchase didn't complete",
        "Nothing has been charged. Please try again in a moment.",
      );
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <Page title="" onBack={() => navigation.goBack()}>
        <View style={styles.centered}>
          <Spinner label="Loading…" />
        </View>
      </Page>
    );
  }

  // No offer for this key means it is not on sale — retired, or a catalog entry
  // that never shipped. Say so plainly instead of showing a buy button that
  // cannot work.
  if (!offer) {
    return (
      <Page
        title={brochure?.title ?? "Program"}
        onBack={() => navigation.goBack()}
      >
        <View style={styles.centered}>
          <Text variant="body" color="secondary" center>
            This program isn&apos;t available right now.
          </Text>
        </View>
      </Page>
    );
  }

  const dayCount = brochure?.arcDays ?? null;
  const moduleCount = brochure?.moduleCount ?? 0;

  /**
   * What the owned screen can honestly offer, in three states.
   *
   * The middle one is the one worth having: today's work is DONE and tomorrow
   * has not opened, so there is nothing to press. A button there would either
   * lie or dump them on a locked day, and this feature has spent a lot of
   * effort not doing that to people.
   */
  const ownedState = (() => {
    if (!progress) {
      return {
        line: "You own this. It's unlocked.",
        cta: "Open",
        canOpen: true,
        finished: false,
        moduleId: undefined as string | undefined,
      };
    }
    const finished = progress.packStatus === "COMPLETED";
    if (finished) {
      return {
        line: "You finished this one.",
        cta: "Start again from day one",
        canOpen: true,
        finished: true,
        moduleId: undefined,
      };
    }
    const open = progress.modules.find(
      (m) =>
        m.dayIndex != null &&
        m.dayIndex === progress.nextIncompleteDay &&
        m.status !== "COMPLETED" &&
        m.unlocked !== false,
    );
    if (open) {
      const started = progress.modules.some((m) => m.status === "COMPLETED");
      return {
        line: "You own this. It's unlocked.",
        cta: started ? "Continue" : "Start day one",
        canOpen: true,
        finished: false,
        moduleId: open.moduleId,
      };
    }
    // Today is done and the next day has not opened. Nothing here CONTINUES
    // the arc, so this state gets the countdown and no primary button — one
    // would either lie or drop them on a locked day.
    //
    // It is not a dead end, though: days already behind them are still open
    // (`isModuleUnlocked` only gates days AHEAD of the clock), and the day
    // list above is where they are reached. That list is the way back in for
    // every state, which is why there is no per-day button here to multiply.
    return {
      line: "",
      cta: "",
      canOpen: false,
      finished: false,
      moduleId: undefined,
    };
  })();

  /**
   * The instant the next day unlocks, straight from the server.
   *
   * Never derived on the device. The gate is elapsed-24h measured on the
   * server clock, so deriving it here would be a second copy of that formula,
   * free to drift from the one that actually holds the lock. An older backend
   * that does not send it simply gets no countdown.
   */
  const opensAt = progress?.nextDayOpensAt
    ? new Date(progress.nextDayOpensAt)
    : null;

  /**
   * Per-day state, keyed by the module id the brochure uses.
   *
   * The brochure calls it `id` and the progress payload calls it `moduleId`;
   * they are the same value (`useActiveProgram` already joins them this way).
   * Empty before progress lands, and for anybody whose progress call failed,
   * which leaves every row inert rather than guessing that a day is open.
   */
  const moduleStateById = new Map(
    (progress?.modules ?? []).map((m) => [m.moduleId, m]),
  );

  /**
   * `targetModuleId` defaults to the arc's own CTA target. The review path
   * passes the last completed day explicitly instead — it is never the
   * restart case, so passing an id here also skips the `restartPack` call
   * below regardless of `ownedState.finished`.
   */
  const openOwned = async (targetModuleId?: string) => {
    if (!offer.packId || opening) return;
    setOpening(true);
    try {
      // Awaited, not raced: PackModule reads progress on open, so a restart
      // fired alongside the navigation would land them on a day that has not
      // been cleared yet.
      if (!targetModuleId && ownedState.finished) {
        await restartPack(offer.packId);
      }
      navigation.navigate("PackModule", {
        packId: offer.packId,
        moduleId: targetModuleId ?? ownedState.moduleId,
      });
    } catch (err) {
      console.error("Could not open the program", err);
    } finally {
      setOpening(false);
    }
  };

  // OWNED — a calm confirmation with the curriculum recap, no buy affordance.
  // Kept on the standard Page (the sales funnel is only for the buyable state).
  if (owned) {
    return (
      <Page
        title={brochure?.title ?? offer.title}
        description={brochure?.description}
        onBack={() => navigation.goBack()}
      >
        {(dayCount || moduleCount > 0) && (
          <View style={styles.metaRow}>
            {dayCount ? (
              <View style={styles.metaChip}>
                <Icon name={icons.timeline} size={size.iconInline} color={colors.text.secondary} />
                <Text variant="label" color="secondary">
                  {dayCount} days
                </Text>
              </View>
            ) : null}
            {moduleCount > 0 ? (
              <View style={styles.metaChip}>
                <Icon name={icons.checklist} size={size.iconInline} color={colors.text.secondary} />
                <Text variant="label" color="secondary">
                  {moduleCount} sessions
                </Text>
              </View>
            ) : null}
          </View>
        )}

        {brochure && brochure.modules.length > 0 && (
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.surface.default,
                borderColor: colors.border.default,
              },
            ]}
          >
            <Text variant="title" color="primary">
              {progress ? "The days" : "What\u2019s inside"}
            </Text>
            {/*
              ── THE LIST IS THE WAY BACK IN, NOT A BUTTON ───────────────────
              A "Review Day N" button answers the question once and then has to
              grow: on day 6 the same logic wants six of them, and picking one
              day to feature is arbitrary. The list already names every day, so
              it is the only surface that scales — one row per day, each one
              carrying its own state and its own tap.

              A row opens when the SERVER says it is open. `unlocked` comes
              from GET /packs/{id}/progress; a day already behind the user is
              never gated, because `isModuleUnlocked` only closes days AHEAD of
              the clock. So finished days stay readable for the whole arc.
            */}
            {brochure.modules.map((m) => {
              const mp = moduleStateById.get(m.id);
              const done = mp?.status === "COMPLETED";
              // Only an explicit `false` locks a row. An older backend that
              // does not send the field leaves every day openable, which is
              // what this screen did before the field existed.
              const locked = mp?.unlocked === false;
              const openable = !!mp && !locked;

              const row = (
                <View style={styles.moduleRow}>
                  <Text variant="label" color="tertiary" style={styles.dayLabel}>
                    {m.dayIndex ? `Day ${m.dayIndex}` : `${m.orderIndex}`}
                  </Text>
                  <Text
                    variant="bodySm"
                    color={locked ? "tertiary" : "secondary"}
                    style={styles.moduleTitle}
                  >
                    {m.title}
                  </Text>
                  {/* One slot, one glyph, so the titles all end at the same
                      place whatever state the row is in. */}
                  <View style={styles.moduleMark}>
                    {done ? (
                      <Icon
                        name={icons.success}
                        size={size.iconSm}
                        color={colors.feedback.successText}
                      />
                    ) : locked ? (
                      <Icon
                        name={icons.locked}
                        size={size.iconSm}
                        color={colors.text.tertiary}
                      />
                    ) : openable ? (
                      <Icon
                        name={icons.chevronRight}
                        size={size.iconSm}
                        color={colors.text.tertiary}
                      />
                    ) : null}
                  </View>
                </View>
              );

              return openable ? (
                <PressableScale
                  key={m.id}
                  scaleTo={0.98}
                  disabled={opening}
                  onPress={() => openOwned(m.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`${
                    m.dayIndex ? `Day ${m.dayIndex}` : `Session ${m.orderIndex}`
                  }, ${m.title}.${done ? " Done." : ""} Opens it.`}
                >
                  {row}
                </PressableScale>
              ) : (
                <View key={m.id}>{row}</View>
              );
            })}
          </View>
        )}

        {/* THE WAY IN. Without this the screen was a receipt. */}
        {ownedState.canOpen ? (
          <View style={styles.ownedBlock}>
            <View style={styles.ownedRow}>
              <Icon
                name={icons.success}
                size={size.iconSm}
                color={colors.feedback.successText}
              />
              {/* flex: 1 — a Text in a row does not shrink in React Native, so
                  without it this line overflowed the screen gutter on both
                  sides and the tick sat outside the page padding. */}
              <Text
                variant="title"
                color={colors.feedback.successText}
                style={styles.ownedText}
              >
                {ownedState.line}
              </Text>
            </View>
            <Button
              label={ownedState.cta}
              leftIcon={ownedState.finished ? icons.refresh : icons.play}
              loading={opening}
              onPress={openOwned}
            />
          </View>
        ) : opensAt ? (
          <View style={styles.ownedBlock}>
            <NextDayCountdown
              opensAt={opensAt}
              dayIndex={progress?.nextIncompleteDay}
              onOpened={refreshProgress}
            />
          </View>
        ) : (
          <View style={styles.ownedRow}>
            <Icon
              name={icons.success}
              size={size.iconSm}
              color={colors.feedback.successText}
            />
            <Text
              variant="title"
              color={colors.feedback.successText}
              style={styles.ownedText}
            >
              That&apos;s today done.
            </Text>
          </View>
        )}
      </Page>
    );
  }

  // NOT OWNED — the immersive, conversion-focused sales flow. Every honesty rule
  // above still holds: the flow only PRESENTS the offer/brochure it's handed and
  // buys through this screen's `handleBuy`; it computes no price and invents no
  // proof. The bonus-month gate is threaded through as `bonusEligible`.
  return (
    <ProgramSalesFlow
      brochure={brochure}
      offer={offer}
      isFounder={isFounder}
      bonusEligible={bonusEligible}
      purchasing={purchasing}
      onBuy={handleBuy}
      onBack={() => navigation.goBack()}
    />
  );
};

export default ProgramDetailScreen;

const styles = StyleSheet.create({
  centered: {
    paddingVertical: spacing["3xl"],
    alignItems: "center",
  },
  // No bottom margin here or on `card`: `Page` already puts space.groupGap
  // between its children, and the hand-rolled margins were stacking on top of
  // it for a rhythm nothing else on the screen shared.
  metaRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    padding: spacing.xl,
    gap: spacing.md,
  },
  moduleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  dayLabel: {
    minWidth: 52,
  },
  moduleTitle: {
    flex: 1,
  },
  // Fixed, so every title ends at the same place whether its row carries a
  // tick, a lock, a chevron or nothing at all.
  moduleMark: {
    width: size.iconSm,
    alignItems: "center",
  },
  ownedBlock: {
    gap: spacing.lg,
  },
  // Left-aligned like every other block on the page. It used to centre itself,
  // which on an overflowing row pushed the tick outside the screen gutter.
  ownedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  ownedText: {
    flex: 1,
  },
});
