import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { getOffers, type OfferItem, type Wallet } from "../../api";
import { getPackBrochure, getPackProgress, restartPack } from "../../api/packs";
import { selectOffer } from "../../util/packs/offers";
import { isModuleOfferable } from "../../util/packs/dayLock";
import { packErrorMessage } from "../../util/packs/packErrors";
import { PackBrochure, PackProgress } from "../../api/packs/types";
import {
  purchaseCatalogItem,
  pollWalletUntil,
  recheckWalletUntil,
} from "../../services/purchases";
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
  ErrorState,
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
/**
 * The day's title WITHOUT the day number it already carries.
 *
 * The seed writes titles as "Day 1: Stop the panic", which is right when the
 * title stands alone (Home's card, the module screen's own header). In a list
 * that already has a "Day 1" gutter it printed the number twice on every row.
 *
 * Display only, and a no-op on anything that does not start that way, so a
 * pack whose titles are not numbered is untouched.
 */
export function dayTitle(title: string): string {
  return title.replace(/^\s*Day\s+\d+\s*[:.\u2013\u2014-]\s*/i, "");
}

/**
 * Day one's module id, for the restart path.
 *
 * A restarted pack has to open on a REAL module id: PackModule cannot resolve
 * day one from a missing one, so passing `undefined` there is a spinner that
 * never resolves.
 *
 * Arc packs are ordered by `dayIndex`; packs with no arc carry nulls there and
 * are ordered by `orderIndex` instead. The two are never mixed in one sort,
 * because a list where some rows have a day and some don't has no single
 * ordering, and guessing one is how the wrong day gets opened.
 */
export function firstDayModuleId(
  modules: {
    moduleId: string;
    dayIndex?: number | null;
    orderIndex: number;
  }[],
): string | undefined {
  const dayed = modules.filter((m) => m.dayIndex != null);
  const ordered = dayed.length
    ? [...dayed].sort((a, b) => (a.dayIndex ?? 0) - (b.dayIndex ?? 0))
    : [...modules].sort((a, b) => a.orderIndex - b.orderIndex);
  return ordered[0]?.moduleId;
}

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
   * `moduleId` it has no day to open and nothing useful to show (it used to
   * hang on a spinner forever). So the screen that offers the button has to
   * know which day the button opens, and must offer no button at all when it
   * does not.
   */
  const [progress, setProgress] = useState<PackProgress | null>(null);
  /**
   * The progress call FAILED, as opposed to not having answered yet. Without
   * this the two look identical (`progress` is null either way) and the screen
   * used to offer an "Open" button in both — a button with no `moduleId`, which
   * is the stuck-spinner dead end described above. Failure now earns a retry;
   * still-in-flight earns a spinner.
   */
  const [progressError, setProgressError] = useState(false);
  const [refreshingProgress, setRefreshingProgress] = useState(false);
  const [opening, setOpening] = useState(false);
  const [loading, setLoading] = useState(true);
  /**
   * The offer call failed. NOT the same thing as `offer === null`, which means
   * the program is genuinely not on sale. One is "try again", the other is
   * "this is retired", and telling a user with flaky signal that the program is
   * gone sends them away for good.
   */
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [purchasing, setPurchasing] = useState(false);
  /**
   * ── MONEY HAS LEFT THE USER'S ACCOUNT ─────────────────────────────────────
   * Latched the instant the store says `purchased`, BEFORE the wallet is asked
   * anything. The tier SKUs are consumable on purpose (see
   * sw-be-2/docs/PAYMENTS-GO-LIVE-RUNBOOK.md), so the store will happily charge
   * a second time. This screen used to leave the full-price buy button live
   * whenever the wallet poll timed out, and a second tap was a second charge.
   *
   * Once this is true the screen NEVER shows a buy affordance again in this
   * session: it either becomes the owned screen or the pending screen below.
   */
  const [charged, setCharged] = useState(false);
  const [confirming, setConfirming] = useState(false);
  /**
   * The mount-time load already fetches progress, so the first focus must not
   * fetch it a second time. Every focus after that does.
   */
  const skipFirstProgressFocus = useRef(true);

  // Funnel: the recommendation→click→DETAIL step. Fires once per opened
  // program, independent of how the user got here (Home rec, shop, deep link).
  useEffect(() => {
    track(ANALYTICS_EVENTS.PROGRAM_DETAIL_VIEWED, { catalogKey, packId });
  }, [catalogKey, packId]);

  /**
   * The one place progress is fetched. Records a failure instead of swallowing
   * it, because the UI has to be able to tell "we don't know yet" from "we
   * asked and it failed" — see `progressError` above.
   */
  const fetchProgress = useCallback(async (targetPackId: string) => {
    try {
      const fresh = await getPackProgress(targetPackId);
      setProgress(fresh);
      setProgressError(false);
      return fresh;
    } catch (error) {
      console.error("[ProgramDetail] Failed to load pack progress:", error);
      setProgressError(true);
      return null;
    }
  }, []);

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
        setLoadFailed(false);
        // Only for owners: for everybody else the endpoint is a 403 and the
        // sales flow needs nothing from it.
        if (match?.owned && match.packId) {
          // A failure here is recorded, not swallowed: the owned screen shows a
          // retry rather than an "Open" button with no day to open.
          void fetchProgress(match.packId);
        }
      } catch (error) {
        console.error("[ProgramDetail] Failed to load offer:", error);
        // The offer is unknown, not absent. Say so, and offer a way back.
        if (!cancelled) setLoadFailed(true);
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
  }, [catalogKey, packId, reloadNonce, fetchProgress]);

  // "Try again" after a failed load. Bumping the nonce re-runs the effect
  // above, so there is still exactly one loading path.
  const retryLoad = useCallback(() => {
    setLoading(true);
    setLoadFailed(false);
    setReloadNonce((n) => n + 1);
  }, []);

  // The clock ran out while they were sitting here. Ask the server what is
  // open now, so the wait turns into the way in without a manual reload.
  const refreshProgress = useCallback(() => {
    if (!offer?.packId) return;
    void fetchProgress(offer.packId);
  }, [offer?.packId, fetchProgress]);

  // The same refresh with a spinner on it, for the explicit retry button.
  const retryProgress = useCallback(async () => {
    if (!offer?.packId || refreshingProgress) return;
    setRefreshingProgress(true);
    try {
      await fetchProgress(offer.packId);
    } finally {
      setRefreshingProgress(false);
    }
  }, [offer?.packId, refreshingProgress, fetchProgress]);

  /**
   * COMING BACK FROM A DAY MUST NOT SHOW YESTERDAY'S SCREEN.
   *
   * Progress used to be fetched on mount only, so finishing a day and pressing
   * back left the tick missing and the CTA still inviting them to redo the day
   * they had just done. One refresh per focus, and the first focus is skipped
   * because the mount load already fetched it.
   */
  useFocusEffect(
    useCallback(() => {
      if (!offer?.packId || !owned) return;
      if (skipFirstProgressFocus.current) {
        skipFirstProgressFocus.current = false;
        return;
      }
      refreshProgress();
    }, [offer?.packId, owned, refreshProgress]),
  );

  /**
   * Turn a completed payment into an unlocked program.
   *
   * Shared by the buy button and the pending screen's "Check again", so a
   * confirmation that arrives late does exactly what an instant one does:
   * unlock the screen, fetch progress so "Open" has a day to open, say the
   * purchase went through, and name the bonus month when there really is one.
   *
   * Returns false when the wallet has not caught up yet. That is a WAIT, never
   * a reason to show a buy button again.
   *
   * `userInitiated` chooses WHICH DOOR the question goes through, and on the
   * pending screen it is the difference between a button that can work and one
   * that cannot. False reads GET /users/me/wallet, whose reconcile is throttled
   * to one pass per user per ten minutes and is spent by any ordinary wallet
   * read (the credit chip, the call gate) long before a purchase here. That is
   * the right door for the automatic check after paying, where the webhook is
   * what we are waiting on. It is the wrong one for a tap from somebody whose
   * webhook never came, because it cannot ask the store at all. See
   * recheckWalletUntil.
   */
  const confirmPurchase = useCallback(
    async ({ userInitiated = false }: { userInitiated?: boolean } = {}) => {
      if (!offer) return false;
      const landed = (w: Wallet) =>
        w.entitlements.includes(`pack:${offer.key}`);
      const wallet = userInitiated
        ? await recheckWalletUntil(landed)
        : await pollWalletUntil(landed);
      if (!wallet) return false;
      setOwned(true);
      // WITHOUT THIS, "Open" HAS NOWHERE TO SEND THEM. `ownedState` reads
      // `progress`, and the mount-time effect above only fetches it when the pack
      // is ALREADY owned — a purchase made mid-visit never triggers that fetch,
      // so `progress` stays null and the screen cannot name day one's real id.
      if (offer.packId) {
        await fetchProgress(offer.packId);
      }
      // CLAIM THE GIFT, but only when all three of these agree.
      //
      // The bonus membership month is granted silently by the webhook and was
      // never mentioned anywhere in the app, which wasted the single most
      // generous thing we do. Naming it needs all three, because the wallet on
      // its own cannot tell "this purchase gave you a month" apart from "you
      // already had membership":
      //
      //   bonusEligible  the server's own answer, from before the purchase, to
      //                  whether this user would really be given it. It is
      //                  `!everHadMembership`, so it is false for a paying member
      //                  and for a repeat pack buyer whose earlier bonus month is
      //                  still running. Those are precisely the people the
      //                  webhook withholds it from (strategy §6.9).
      //   gift days      this pack gifts one at all. Not every pack does.
      //   the wallet     it landed. A race, a refund or a changed rule must never
      //                  produce a congratulation for a gift nobody gave.
      //
      // With only the wallet check, an existing member who buys a pack was
      // congratulated on a free month the backend had already decided to withhold.
      // Same condition as the Programs list (screens/Programs/index.tsx), and what
      // the API contract asks for in so many words: gate every "free month
      // included" line on `bonusMembershipEligible`.
      //
      // `bonusEligible` starts false, so a failed offers fetch says nothing rather
      // than guessing. That is the safe direction: the harm is claiming a gift
      // that was never given, not staying quiet about one that was.
      const giftLanded =
        bonusEligible &&
        offer.bonusMembershipDays > 0 &&
        wallet.entitlements.includes("membership");
      if (giftLanded) {
        setBonusEligible(false); // spent, never advertise it twice
        showSuccessBottomSheet(
          "You're in. The first month is on us",
          "Your program is unlocked, plus a free month of membership: 4 AI practice calls to use whenever you want them.",
        );
      } else {
        // THE PURCHASE STILL HAS TO BE ACKNOWLEDGED. This used to be the only
        // success sheet on the screen, sitting inside the gift branch, so anyone
        // who bought a pack without a gift attached paid and got no sentence at
        // all. Tightening the branch above without this one would have turned a
        // wrong congratulation into a silent charge, which is worse.
        showSuccessBottomSheet(
          "You're in",
          "Your program is unlocked. You can start now.",
        );
      }
      return true;
    },
    [offer, fetchProgress, bonusEligible],
  );

  // The pending screen's button. Re-runs the same check, and on success takes
  // the identical path a confirmed purchase takes. `userInitiated` is what gives
  // it any power: a person is standing here asking, so the store gets asked too,
  // instead of the ten-minute window getting consulted and found spent.
  const recheckPurchase = useCallback(async () => {
    if (confirming) return;
    setConfirming(true);
    try {
      const confirmed = await confirmPurchase({ userInitiated: true });
      if (!confirmed) {
        showErrorBottomSheet(
          "Still confirming",
          "Your payment is safe. Please check again in a moment.",
        );
      }
    } finally {
      setConfirming(false);
    }
  }, [confirming, confirmPurchase]);

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
        // A STORE ERROR MUST SAY SO. This branch used to track and nothing else,
        // so a failed unlock closed the sheet and left the screen unchanged: a
        // dead button. That silence is what App Review saw when it reported it
        // "cannot locate the In-App Purchases" (Guideline 2.1(b)). It also hid
        // the real cause from us, which is why 10 of 11 purchase attempts are on
        // record with no reason attached.
        //
        // Only "error" speaks. A "cancelled" is the user's own choice and must
        // stay quiet or every backed-out sheet accuses them of a failure. Same
        // split, same copy as the membership paywall (screens/Payments/index.tsx).
        if (outcome.status === "error") {
          showErrorBottomSheet("Purchase didn't complete", outcome.message);
        }
      }
      if (outcome.status === "purchased") {
        track(ANALYTICS_EVENTS.PAYMENT_COMPLETED, payProps);
        // LATCH FIRST, ASK THE WALLET SECOND. The charge is already real, so
        // from here on this screen must never offer to sell it again, whatever
        // the wallet says next.
        setCharged(true);
        const confirmed = await confirmPurchase();
        if (!confirmed) {
          // Not a failure: the store took the payment and our side has not
          // caught up. The pending screen below is what they land on, and it
          // carries the way to check again.
          showErrorBottomSheet(
            "Almost there",
            "We have your payment. It is still being confirmed.",
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

  // THE CALL FAILED, THE PROGRAM DID NOT DIE. These two used to share one
  // message, so a dropped connection told the user the program was gone and
  // gave them nothing to press. A failure gets a retry; only a genuinely
  // missing offer gets the "not available" line below.
  if (loadFailed) {
    return (
      <Page
        title={brochure?.title ?? "Program"}
        onBack={() => navigation.goBack()}
      >
        <ErrorState
          title="Couldn't load this program"
          message="Check your connection and try again."
          onRetry={retryLoad}
        />
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
   * What the owned screen can honestly offer.
   *
   * The countdown state is the one worth having: today's work is DONE and
   * tomorrow has not opened, so there is nothing to press. A button there would
   * either lie or dump them on a locked day, and this feature has spent a lot
   * of effort not doing that to people.
   *
   * NO PROGRESS = NO OPEN BUTTON. It used to offer one anyway, with no
   * `moduleId` behind it, which sent the user to a PackModule that has no day
   * to open. Waiting shows a spinner here instead; a failed fetch shows a
   * retry.
   */
  const ownedState = (() => {
    if (!progress) {
      return {
        line: "You own this. It's unlocked.",
        cta: "",
        canOpen: false,
        needsRetry: progressError,
        loadingProgress: !progressError,
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
        needsRetry: false,
        loadingProgress: false,
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
        needsRetry: false,
        loadingProgress: false,
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
      needsRetry: false,
      loadingProgress: false,
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
    const targetPackId = offer.packId;
    if (!targetPackId || opening) return;
    setOpening(true);
    try {
      // The review path: an explicit day, nothing to resolve or restart.
      if (targetModuleId) {
        navigation.navigate("PackModule", {
          packId: targetPackId,
          moduleId: targetModuleId,
        });
        return;
      }

      if (ownedState.finished) {
        /**
         * ── RESTART USED TO DESTROY PROGRESS AND THEN STRAND THEM ───────────
         * `restartPack` wiped the finished arc server-side and the navigation
         * that followed carried `moduleId: undefined`, which PackModule cannot
         * resolve into a day. A completed pack became a dead end with the
         * progress already gone.
         *
         * So: resolve a destination FIRST, from data we already hold. If day
         * one cannot be named, nothing is wiped and they keep their pack.
         */
        const fallbackDayOne =
          firstDayModuleId(progress?.modules ?? []) ??
          firstDayModuleId(
            (brochure?.modules ?? []).map((m) => ({
              moduleId: m.id,
              dayIndex: m.dayIndex,
              orderIndex: m.orderIndex,
            })),
          );
        if (!fallbackDayOne) {
          showErrorBottomSheet(
            "Couldn't start it again",
            "Your progress is safe. Please try again in a moment.",
          );
          return;
        }
        // Awaited, not raced: PackModule reads progress on open, so a restart
        // fired alongside the navigation would land them on a day that has not
        // been cleared yet.
        await restartPack(targetPackId);
        // Read the reset arc back and take ITS day one. Module ids survive a
        // restart (it clears progress, not content), so the pre-restart id is a
        // safe fallback if this refetch fails.
        const fresh = await fetchProgress(targetPackId);
        navigation.navigate("PackModule", {
          packId: targetPackId,
          moduleId: firstDayModuleId(fresh?.modules ?? []) ?? fallbackDayOne,
        });
        return;
      }

      // Every other CTA. `canOpen` already implies a real id, but never
      // navigate on a maybe: an undefined id is the stuck spinner.
      if (!ownedState.moduleId) {
        setProgressError(true);
        showErrorBottomSheet(
          "Couldn't open it",
          "Please try again in a moment.",
        );
        return;
      }
      navigation.navigate("PackModule", {
        packId: targetPackId,
        moduleId: ownedState.moduleId,
      });
    } catch (err) {
      console.error("Could not open the program", err);
      showErrorBottomSheet(
        "Couldn't open it",
        "Please try again in a moment.",
      );
    } finally {
      setOpening(false);
    }
  };

  /**
   * A day they skipped, on a program they have since finished.
   *
   * `startModule` refuses this one (PackCompletedError), so this never asks.
   * It says what the refusal would have said, without the round trip and
   * without a failure the person has to interpret. The words come from the one
   * place that owns them, so this row and PackModule cannot disagree.
   */
  const explainSkippedDay = () => {
    const message = packErrorMessage("PACK_COMPLETED");
    if (message) showErrorBottomSheet(message.title, message.body);
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

        {/* THE WAY IN. Without this the screen was a receipt. */}
        {ownedState.needsRetry ? (
          // A retry, NOT an "Open" button. There is no day id to open, and a
          // button that leads to a spinner that never resolves is worse than
          // no button at all.
          <View style={styles.ownedBlock}>
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
                {ownedState.line}
              </Text>
            </View>
            <Text variant="body" color="secondary">
              We couldn&apos;t load your days just now.
            </Text>
            <Button
              label="Try again"
              leftIcon={icons.retry}
              loading={refreshingProgress}
              onPress={() => void retryProgress()}
            />
          </View>
        ) : ownedState.loadingProgress ? (
          <View style={styles.centered}>
            <Spinner label="Loading your days…" />
          </View>
        ) : ownedState.canOpen ? (
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
              // NOT `onPress={openOwned}`. `PressableScale` forwards the raw
              // `GestureResponderEvent` to whatever `onPress` it is given —
              // `Button`'s `onPress: () => void` type does not stop that at
              // the call site, since a function expecting fewer args is a
              // valid `() => void`. Passed directly, that event object BECAME
              // `targetModuleId` (`targetModuleId ?? ownedState.moduleId` sees
              // a truthy event and never falls through), so every tap of this
              // button sent PackModule a moduleId that was never a string —
              // `getModule` 404'd, surfacing as "Module not found." on
              // return from GoalsAsk (the redirect there races ahead of the
              // failed content fetch, which is why the bug is invisible on
              // the page you land on first). The wrapper is what the day-row
              // taps already do correctly a few lines below.
              onPress={() => openOwned()}
            />
          </View>
        ) : opensAt ? (
          <View style={styles.ownedBlock}>
            <NextDayCountdown
              opensAt={opensAt}
              dayIndex={progress?.nextIncompleteDay}
              // Without this the card paired a day number with an instant that
              // belongs to a different day. See `describesNamedDay` there.
              currentDay={progress?.currentDay}
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
            <Text variant="h3" color="primary">
              {progress ? "The days" : "What\u2019s inside"}
            </Text>
            {/*
              ── THE LIST IS THE WAY BACK IN, NOT A BUTTON ───────────────────
              A "Review Day N" button answers the question once and then has to
              grow: on day 6 the same logic wants six of them, and picking one
              day to feature is arbitrary. The list already names every day, so
              it is the only surface that scales.

              A row opens when the SERVER says it is open. `unlocked` comes
              from GET /packs/{id}/progress; a day already behind the user is
              never gated, because `isModuleUnlocked` only closes days AHEAD of
              the clock. So finished days stay readable for the whole arc.

              That last sentence is why `unlocked` cannot be the only gate once
              the arc is COMPLETE: at that point EVERY day is behind the user,
              including one they skipped and never did. `isModuleOfferable` adds
              that second question.
            */}
            <View style={styles.dayList}>
              {brochure.modules.map((m, i) => {
                const mp = moduleStateById.get(m.id);
                const done = mp?.status === "COMPLETED";
                // Only an explicit `false` locks a row. An older backend that
                // does not send the field leaves every day openable, which is
                // what this screen did before the field existed.
                const locked = mp?.unlocked === false;
                // `!!mp && !locked` was not enough on a FINISHED arc. Progress
                // returns a row for every module, so `!!mp` is always true, and
                // every day of a finished arc is behind the clock, so `locked`
                // is always false. A day the user SKIPPED therefore looked open
                // and dead-ended: the server refuses to start it. One shared
                // rule now answers this for both surfaces.
                const offerable =
                  !!mp &&
                  isModuleOfferable(mp, {
                    packStatus: progress?.packStatus,
                    // Fall back to the brochure: `arcDays` is the field that
                    // decides the refusal, so it must not read as "no arc" just
                    // because one payload left it out.
                    arcDays: progress?.arcDays ?? brochure?.arcDays ?? null,
                  });
                // Not offerable, and NOT because the clock has yet to reach it:
                // a day they skipped on a program they have since finished.
                //
                // Closing the row is right, but closing it silently is the same
                // dead end one step quieter. With no chevron and no lock glyph
                // the row reads as ordinary text, and a paid row that ignores a
                // tap without saying anything is exactly the kind of thing
                // people write reviews about. So it stays pressable and
                // explains itself instead.
                const skipped = !!mp && !locked && !offerable;
                const dayName = m.dayIndex
                  ? `Day ${m.dayIndex}`
                  : `Session ${m.orderIndex}`;

                const row = (
                  <View style={styles.moduleRow}>
                    <Text variant="label" color="tertiary" style={styles.dayLabel}>
                      {m.dayIndex ? `Day ${m.dayIndex}` : `${m.orderIndex}`}
                    </Text>
                    <Text
                      variant="body"
                      color={locked || skipped ? "tertiary" : "primary"}
                      style={styles.moduleTitle}
                    >
                      {dayTitle(m.title)}
                    </Text>
                    {/*
                      TWO SLOTS, TWO JOBS. The state glyph says what this day
                      IS; the chevron says the row opens. They were one slot,
                      and a finished day showed only its tick — which reads as
                      "done", not as "tap me". The one row the user most wants
                      to reopen was the one row with no affordance on it.
                    */}
                    <View style={styles.moduleMark}>
                      {done ? (
                        <Icon
                          name={icons.success}
                          size={size.iconSm}
                          color={colors.feedback.successText}
                        />
                      ) : locked || skipped ? (
                        // A skipped day on a finished program is closed too, so
                        // it carries the same glyph. The two are not the same
                        // reason, and the sheet on tap is what tells them apart:
                        // this one needs a restart, not a wait.
                        <Icon
                          name={icons.locked}
                          size={size.iconSm}
                          color={colors.text.tertiary}
                        />
                      ) : null}
                    </View>
                    <View style={styles.moduleChevron}>
                      {offerable ? (
                        <Icon
                          name={icons.chevronRight}
                          size={size.iconSm}
                          color={colors.text.tertiary}
                        />
                      ) : null}
                    </View>
                  </View>
                );

                // A hairline between rows, never under the last one. Rows are
                // tappable now, so they need to read as separate targets
                // rather than as lines of one paragraph.
                const divider =
                  i < brochure.modules.length - 1 ? (
                    <View
                      style={[
                        styles.dayDivider,
                        { backgroundColor: colors.border.default },
                      ]}
                    />
                  ) : null;

                return (
                  <React.Fragment key={m.id}>
                    {offerable || skipped ? (
                      <PressableScale
                        scaleTo={0.99}
                        disabled={opening}
                        onPress={() =>
                          skipped ? explainSkippedDay() : openOwned(m.id)
                        }
                        accessibilityRole="button"
                        accessibilityLabel={`${dayName}, ${dayTitle(m.title)}.${
                          done ? " Done." : ""
                        } ${skipped ? "Not open. Explains why." : "Opens it."}`}
                      >
                        {row}
                      </PressableScale>
                    ) : (
                      <View
                        accessibilityLabel={`${dayName}, ${dayTitle(
                          m.title,
                        )}. Not open yet.`}
                      >
                        {row}
                      </View>
                    )}
                    {divider}
                  </React.Fragment>
                );
              })}
            </View>
          </View>
        )}

      </Page>
    );
  }

  // PAID, NOT YET CONFIRMED — the only other thing this screen may show once a
  // charge has happened. The sales flow below is unreachable from here, because
  // the tier SKUs are consumable and a second tap of Buy is a second charge.
  if (charged) {
    return (
      <Page
        title={brochure?.title ?? offer.title}
        onBack={() => navigation.goBack()}
      >
        <View style={styles.ownedBlock}>
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
              Payment received
            </Text>
          </View>
          <Text variant="body" color="secondary">
            We&apos;re confirming it now. This can take a moment. You won&apos;t
            be charged again.
          </Text>
          <Button
            label="Check again"
            leftIcon={icons.retry}
            loading={confirming}
            onPress={() => void recheckPurchase()}
          />
        </View>
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
  // The card owns the gap between its heading and the list; the list owns the
  // rows. Without this the card's own `gap` doubled up with the row padding.
  dayList: {
    marginTop: spacing.xs,
  },
  moduleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    // A row is a tap target now. It used to be text height (about 20pt), which
    // is half the 44pt minimum and the real reason tapping a day felt wrong.
    minHeight: 44,
    paddingVertical: spacing.sm,
  },
  dayLabel: {
    minWidth: 46,
  },
  moduleTitle: {
    flex: 1,
  },
  // Fixed, so every title ends at the same place whether its row carries a
  // tick, a lock or nothing at all.
  moduleMark: {
    width: size.iconSm,
    alignItems: "center",
  },
  // Its own slot, so the state glyph never shifts when a chevron appears
  // beside it.
  moduleChevron: {
    width: size.iconSm,
    alignItems: "center",
  },
  dayDivider: {
    height: StyleSheet.hairlineWidth,
    // Starts under the title, not under the day number: an inset rule reads as
    // "these belong to one list", a full-bleed one cuts the card into strips.
    marginLeft: 46 + spacing.md,
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
