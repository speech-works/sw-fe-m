import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { showPipMoment } from "../../components/Pip";
import { getOffers, type OfferItem, type Wallet } from "../../api";
import { getPackBrochure, getPackProgress, restartPack } from "../../api/packs";
import { selectOffer } from "../../util/packs/offers";
import { isModuleOfferable } from "../../util/packs/dayLock";
import { packErrorMessage } from "../../util/packs/packErrors";
import { PackBrochure, PackProgress } from "../../api/packs/types";
import {
  confirmWalletGrant,
  devPaymentsHooks,
  finishEarlierPurchase,
  purchaseCatalogItem,
  releaseCheckout,
  storeCheckForCheckout,
} from "../../services/purchases";
import {
  BUY_READY,
  buyGateView,
  checkoutFromConflict,
  decideAfterEarlierFinished,
  earlierPurchaseSuspectSince,
  f3RoundVerdict,
  newlyOwnedOthers,
  lastAttempt,
  clearProgramPending,
  gateAfterBuyTap,
  markProgramPending,
  OTHER_ACCOUNT,
  offersPaused,
  onPurchasesMayHaveChanged,
  pendingLine,
  programAttemptKey,
  programPending,
  PURCHASES_PAUSED_LINE,
  SETTLE_TIMEOUT_LINE,
  showsOtherAccount,
  type BuyGate,
  type OpenCheckout,
  type PendingKind,
} from "../../services/purchaseSettlement";
import {
  clearOpenCheckout,
  loadAllOpenCheckouts,
  loadOpenCheckout,
  saveOpenCheckout,
} from "../../services/openCheckout";
import { useUserStore } from "../../stores/user";
import { PaymentProblemLink } from "../../components/PaymentProblemLink";
import { OtherAccountNotice } from "../../components/OtherAccountNotice";
import {
  size,
  Button,
  Page,
  Text,
  Icon,
  icons,
  useTheme,
  spacing,
  fonts,
  Spinner,
  ErrorState,
} from "../../design-system";


import {
  programCoverFor,
} from "../../util/packs/programCover";
import PressableScale from "../../components/PressableScale";
import ProgramSalesFlow from "./ProgramSalesFlow";
import { OwnedProgramPage } from "./OwnedProgramPage";
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
 * title stands alone (Home's card). In a list that already has a "Day 1"
 * gutter it printed the number twice on every row, and the module screen's
 * header has "Day 1 of 7" right under the title.
 *
 * Display only, and a no-op on anything that does not start that way, so a
 * pack whose titles are not numbered is untouched.
 */
export function dayTitle(title: string): string {
  return title.replace(/^\s*Day\s+\d+\s*[:.\u2013\u2014-]\s*/i, "");
}

/** The programs this account owns now, by catalog key, or null if unknown. */
async function ownedProgramKeys(): Promise<string[] | null> {
  try {
    const offers = await getOffers();
    return offers.items.filter((i) => i.owned).map((i) => i.key);
  } catch (error) {
    console.warn("[ProgramDetail] could not read owned programs:", error);
    return null;
  }
}

/** How long the F3 check rests between rounds (each round also polls). */
const OPEN_CHECKOUT_RECHECK_MS = 10_000;
/** F1: after the earlier purchase finished, how long to look for THIS grant. */
const EARLIER_FINISHED_GRANT_LOOK_MS = 4_000;

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
  const userId = useUserStore((s) => s.user?.id ?? null);

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
   * The server's emergency stop: offers.purchasesPaused, or a 503
   * PURCHASES_PAUSED on the checkout. The sales flow shows the paused line in
   * place of its buy button, so no store sheet can open. Owned programs and
   * the pending screen are untouched.
   */
  const [purchasesPaused, setPurchasesPaused] = useState(false);
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
   *
   * "This session" reaches past this screen: the program is also recorded in
   * purchaseSettlement's in-memory list, so backing out and coming in again
   * lands on the pending screen, not on Buy.
   */
  const [charged, setCharged] = useState(
    () => programPending(catalogKey) !== null,
  );
  /**
   * Why we are waiting, when it is not a plain `purchased`: the purchase call
   * failed after it ran, Google Play holds the payment, or the backend says an
   * earlier checkout is still open. Null keeps the original pending copy.
   */
  const [pendingKind, setPendingKind] = useState<PendingKind | null>(() =>
    programPending(catalogKey),
  );
  /** The first wait ran out without the grant. Re-entry starts here too. */
  const [settleTimedOut, setSettleTimedOut] = useState(
    () => programPending(catalogKey) !== null,
  );
  const [confirming, setConfirming] = useState(false);
  /**
   * What the Buy button may do right now, for the two waits that are NOT a
   * payment of this attempt (purchaseSettlement.ts, BuyGate):
   *  F1  Google refused Buy because an earlier purchase of the same SKU is
   *      still open. We finish it, then offer Buy with a one-time note.
   *  F3  an open checkout for this program (from this phone's record, or the
   *      backend's 409). "Checking your payment…" until the grant lands, or it
   *      is certain nothing was paid.
   * The note lives in this state only, so leaving the screen drops it.
   */
  const [gate, setGate] = useState<BuyGate>(BUY_READY);
  /** The open checkout the F3 check is about. */
  const openCheckoutRef = useRef<OpenCheckout | null>(null);
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
        setPurchasesPaused(offersPaused(offers));
        setOwned(match?.owned ?? false);
        // The grant landed while they were away. The latch has done its job.
        if (match?.owned) clearProgramPending(catalogKey);
        setLoadFailed(false);
        // Only for owners: for everybody else the endpoint is a 403 and the
        // sales flow needs nothing from it.
        if (match?.owned && match.packId) {
          // A failure here is recorded, not swallowed: the owned screen shows a
          // retry rather than an "Open" button with no day to open.
          void fetchProgress(match.packId);
        }
        // AN OPEN CHECKOUT FROM BEFORE (F3). Read before the page shows, so a
        // purchase killed mid-way never flashes a live Buy. Nothing on the
        // server says a checkout is open until Buy is tapped, so this phone's
        // own record is the only early signal (services/openCheckout.ts).
        if (match?.owned) {
          void clearOpenCheckout(catalogKey);
        } else if (match && programPending(catalogKey) === null) {
          const open = await loadOpenCheckout(userId, catalogKey);
          if (cancelled) return;
          if (open?.charge) {
            // The purchase call came back as a payment before the app died.
            // That is the ordinary pending screen, never "no payment".
            markProgramPending(catalogKey, open.charge);
            setPendingKind(open.charge);
            setSettleTimedOut(true);
            setCharged(true);
          } else if (open) {
            openCheckoutRef.current = open;
            setGate({ state: "checking_payment" });
          }
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
  }, [catalogKey, packId, reloadNonce, fetchProgress, userId]);

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
   * Returns "waiting" when the wallet has not caught up yet. That is a WAIT,
   * never a reason to show a buy button again. Returns "other_account" when
   * the server lists this attempt's tier SKU, bought since it started, as
   * another Speechworks account's: the screen then shows "Paid on your other
   * account", latched for the session, with "Check again" still under it.
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
    async ({
      userInitiated = false,
      timeoutMs,
    }: { userInitiated?: boolean; timeoutMs?: number } = {}): Promise<
      "landed" | "waiting" | "other_account"
    > => {
      if (!offer) return "waiting";
      const landed = (w: Wallet) =>
        w.entitlements.includes(`pack:${offer.key}`);
      const wallet = await confirmWalletGrant(landed, {
        userInitiated,
        timeoutMs,
        attemptKey: programAttemptKey(offer.key),
      });
      if (wallet === OTHER_ACCOUNT) {
        markProgramPending(offer.key, "other_account");
        setPendingKind("other_account");
        setSettleTimedOut(true);
        return "other_account";
      }
      if (!wallet) return "waiting";
      setOwned(true);
      clearProgramPending(offer.key);
      void clearOpenCheckout(offer.key);
      openCheckoutRef.current = null;
      setGate(BUY_READY);
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
          undefined,
          undefined,
          { dimBackdrop: true },
        );
      } else {
        // THE PURCHASE STILL HAS TO BE ACKNOWLEDGED. This used to be the only
        // success sheet on the screen, sitting inside the gift branch, so anyone
        // who bought a pack without a gift attached paid and got no sentence at
        // all. Tightening the branch above without this one would have turned a
        // wrong congratulation into a silent charge, which is worse.
        // Pip's moment replaced the "You're in" sheet (founder 2026-11-26); same words: "You're in" / "Your program is unlocked. You can start now."
        void showPipMoment("program-bought");
      }
      return "landed";
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
      const result = await confirmPurchase({ userInitiated: true });
      // Under the other-account notice a tap that finds nothing new keeps the
      // notice. "Still confirming" there would contradict it.
      if (result === "waiting" && !showsOtherAccount(pendingKind)) {
        showErrorBottomSheet(
          "Still confirming",
          "Your payment is safe. Please check again in a moment.",
        );
      }
    } finally {
      setConfirming(false);
    }
  }, [confirming, confirmPurchase, pendingKind]);

  /**
   * Wait for a grant after a purchase that did not come back clean: the
   * purchase call failed after it ran, Google Play holds the payment, or the
   * backend says an earlier checkout is still open.
   *
   * The Buy button is gone from the first line of this, for this program, for
   * the rest of the session. The same poll as a clean purchase runs; when the
   * grant lands the normal success sheet shows. When it does not, the screen
   * says it will unlock on its own.
   */
  const settlePending = async (kind: PendingKind) => {
    if (!offer) return;
    markProgramPending(offer.key, kind);
    setPendingKind(kind);
    setSettleTimedOut(false);
    setCharged(true);
    const result = await confirmPurchase();
    if (result === "waiting") {
      setSettleTimedOut(true);
      // Only the "it failed after it ran" case changes its line on timeout.
      // The other two already say they will unlock on their own.
      if (kind === "after_charge") {
        showErrorBottomSheet("Almost there", SETTLE_TIMEOUT_LINE);
      }
    }
  };

  const handleBuy = async () => {
    if (!offer || purchasesPaused || gate.state !== "ready") return;
    // The one-time note is spent by this tap.
    setGate(gateAfterBuyTap);
    setPurchasing(true);
    // Funnel: bottom of the recommendation → purchase chain. `planId` is the
    // tier SKU key; `catalogKey` ties it back to the recommended pack.
    const payProps = {
      planId: offer.key,
      catalogKey,
      amountInr: offer.priceInr,
    };
    track(ANALYTICS_EVENTS.PAYMENT_STARTED, payProps);
    // Set once the store may have taken money. After that, nothing on this
    // path may say "nothing has been charged" or show Buy again.
    let mayHaveCharged = false;
    try {
      const outcome = await purchaseCatalogItem(offer.key);
      switch (outcome.status) {
        case "purchased": {
          track(ANALYTICS_EVENTS.PAYMENT_COMPLETED, payProps);
          // LATCH FIRST, ASK THE WALLET SECOND. The charge is already real, so
          // from here on this screen must never offer to sell it again, whatever
          // the wallet says next.
          mayHaveCharged = true;
          markProgramPending(offer.key, "after_charge");
          setPendingKind(null);
          setCharged(true);
          const result = await confirmPurchase();
          if (result === "waiting") {
            setSettleTimedOut(true);
            // Not a failure: the store took the payment and our side has not
            // caught up. The pending screen below is what they land on, and it
            // carries the way to check again.
            showErrorBottomSheet(
              "Almost there",
              "We have your payment. It is still being confirmed.",
            );
          }
          break;
        }
        case "pending":
          // The purchase call ran and did not come back clean, or Play is
          // holding the payment. Either way money may have moved.
          mayHaveCharged = true;
          track(ANALYTICS_EVENTS.PAYMENT_FAILED, {
            ...payProps,
            reason: `pending:${outcome.kind}`,
          });
          await settlePending(outcome.kind);
          break;
        case "checkout_in_progress": {
          // The backend refused a second checkout. No store sheet was opened,
          // and an open checkout is not a payment: no "Payment received", no
          // "It will unlock on its own". The F3 check decides (see `gate`).
          mayHaveCharged = true;
          track(ANALYTICS_EVENTS.PAYMENT_FAILED, {
            ...payProps,
            reason: "checkout_in_progress",
          });
          const stored = await loadOpenCheckout(userId, offer.key);
          if (stored?.charge) {
            await settlePending(stored.charge);
            break;
          }
          openCheckoutRef.current =
            stored ??
            checkoutFromConflict(
              {
                userId: userId ?? "",
                catalogKey: offer.key,
                productId: offer.tierProductId,
              },
              Date.now(),
            );
          setGate({ state: "checking_payment" });
          break;
        }
        case "earlier_purchase_open":
          // F1. Google refused THIS purchase: an earlier one of the same SKU
          // is still open. Nothing was charged for this program, and the
          // checkout was already released (purchases.ts). Finish the earlier
          // purchase, then offer Buy again. Never "Payment received".
          track(ANALYTICS_EVENTS.PAYMENT_FAILED, {
            ...payProps,
            reason: "earlier_purchase_open",
          });
          setGate({ state: "finishing_earlier" });
          break;
        case "paused":
          // The server paused selling. No intent, no store sheet, no charge.
          track(ANALYTICS_EVENTS.PAYMENT_FAILED, { ...payProps, reason: "paused" });
          setPurchasesPaused(true);
          showErrorBottomSheet("Purchases paused", PURCHASES_PAUSED_LINE, undefined, undefined, { dimBackdrop: true });
          break;
        case "already_owned":
          // They own it. Show it as theirs, with no error.
          track(ANALYTICS_EVENTS.PAYMENT_FAILED, {
            ...payProps,
            reason: "already_owned",
          });
          clearProgramPending(offer.key);
          void clearOpenCheckout(offer.key);
          setOwned(true);
          if (offer.packId) await fetchProgress(offer.packId);
          break;
        case "cancelled":
        case "error":
          // Not completed: a user cancel or an error before any charge.
          // `reason` separates the two so an abandonment isn't read as a
          // genuine payment failure.
          track(ANALYTICS_EVENTS.PAYMENT_FAILED, {
            ...payProps,
            reason: outcome.status === "error" ? outcome.message : outcome.status,
          });
          // A STORE ERROR MUST SAY SO. This branch used to track and nothing
          // else, so a failed unlock closed the sheet and left the screen
          // unchanged: a dead button. That silence is what App Review saw when
          // it reported it "cannot locate the In-App Purchases" (Guideline
          // 2.1(b)).
          //
          // Only "error" speaks. A "cancelled" is the user's own choice and
          // must stay quiet or every backed-out sheet accuses them of a
          // failure. Same split, same copy as the membership paywall
          // (screens/Payments/index.tsx).
          if (outcome.status === "error") {
            showErrorBottomSheet("Purchase didn't complete", outcome.message, undefined, undefined, { dimBackdrop: true });
          }
          break;
      }
    } catch (error) {
      console.error("[ProgramDetail] Purchase failed:", error);
      track(ANALYTICS_EVENTS.PAYMENT_FAILED, { ...payProps, reason: "exception" });
      // Past the charge, the pending screen is already up and says the right
      // thing. Claiming "nothing has been charged" there would be false.
      if (!mayHaveCharged) {
        showErrorBottomSheet(
          "Purchase didn't complete",
          "Nothing has been charged. Please try again in a moment.",
        );
      }
    } finally {
      setPurchasing(false);
    }
  };

  /**
   * The app came to the front, or the RevenueCat SDK sent a transaction it
   * had left unfinished (it does that on the next launch after the app was
   * killed mid-purchase). Ask our backend again whether this program is owned,
   * so a payment that settled while they were away unlocks without a tap.
   */
  useEffect(() => {
    if (owned) return;
    return onPurchasesMayHaveChanged(() => {
      void (async () => {
        try {
          const offers = await getOffers();
          const match = selectOffer(offers.items, catalogKey);
          if (!match?.owned) return;
          clearProgramPending(catalogKey);
          void clearOpenCheckout(catalogKey);
          setOwned(true);
          if (match.packId) await fetchProgress(match.packId);
        } catch (error) {
          console.warn("[ProgramDetail] ownership refresh failed:", error);
        }
      })();
    });
  }, [owned, catalogKey, fetchProgress]);

  // The latest check, for the two loops below, so a re-render does not
  // restart them.
  const confirmPurchaseRef = useRef(confirmPurchase);
  confirmPurchaseRef.current = confirmPurchase;

  /**
   * F1: finish the earlier open purchase while this screen is open, with a
   * backoff (finishEarlierPurchase). Once it finished, look once for THIS
   * program's grant, because the earlier purchase may have been for this very
   * program. Otherwise Buy comes back with its one-time note. Nothing here
   * starts a purchase.
   */
  useEffect(() => {
    if (gate.state !== "finishing_earlier" || !offer || owned) return;
    let alive = true;
    const attemptStartedAt =
      lastAttempt(programAttemptKey(offer.key))?.startedAt ?? Date.now();
    void (async () => {
      // What the account owned BEFORE the earlier purchase is posted, so a
      // program that becomes owned by it can explain the purchase (rule b).
      const ownedBefore = await ownedProgramKeys();
      const finished = await finishEarlierPurchase(() => alive);
      if (!finished || !alive) return;
      const result = await confirmPurchaseRef.current({
        userInitiated: true,
        timeoutMs: EARLIER_FINISHED_GRANT_LOOK_MS,
      });
      if (!alive) return;
      if (result === "landed") return;
      if (result === "other_account") {
        setCharged(true);
        return;
      }
      // ZERO RISK OF A DOUBLE CHARGE. Google sells the SKU again now. If the
      // earlier purchase may have paid for THIS program (its record survives,
      // or the store just posted a purchase of this product that no other
      // program explains), its grant can still be on the way: a BOUNDED wait
      // in F3 (at most 17 minutes), never the note + Buy straight away.
      const [prior, records, ownedNow] = await Promise.all([
        loadOpenCheckout(userId, offer.key),
        loadAllOpenCheckouts(userId),
        ownedProgramKeys(),
      ]);
      if (!alive) return;
      const decision = decideAfterEarlierFinished({
        prior,
        suspectSince: earlierPurchaseSuspectSince({
          before: finished.before,
          after: finished.after,
          productId: offer.tierProductId,
          attemptStartedAt,
        }),
        otherRecords: records.filter((r) => r.catalogKey !== offer.key),
        newlyOwnedOthers: newlyOwnedOthers(ownedBefore, ownedNow, offer.key),
        othersOwnedBefore: ownedBefore,
        userId: userId ?? "",
        catalogKey: offer.key,
        productId: offer.tierProductId,
        now: Date.now(),
      });
      if (decision.kind === "paid") {
        // This program's earlier store call came back as PAID. Never Buy
        // again: the usual "Payment received" pending screen, with "Problem
        // with a payment?", until the grant lands (a parked one needs a manual
        // grant).
        markProgramPending(offer.key, decision.pendingKind);
        setPendingKind(decision.pendingKind);
        setSettleTimedOut(true);
        setCharged(true);
        return;
      }
      if (decision.kind === "wait") {
        openCheckoutRef.current = decision.checkout;
        // On disk too, so leaving and coming back does not bring Buy back.
        if (userId) void saveOpenCheckout(decision.checkout);
        setGate({ state: "checking_payment" });
        return;
      }
      setGate({ state: "ready", note: "earlier_finished" });
    })();
    return () => {
      alive = false;
    };
  }, [gate.state, offer, owned, userId]);

  /**
   * F3: an open checkout for this program. Keep asking our server whether the
   * program is owned (the settle poll, then the forced reconcile), and the
   * "You're in" flow runs as usual when it is. Each round, f3RoundVerdict
   * decides the rest: an ordinary checkout gets Buy back only when
   * certainNoPayment agrees; a bounded F1 wait ends at its bound (or when
   * another program newly became owned). Short of that, keep checking.
   */
  useEffect(() => {
    if (gate.state !== "checking_payment" || !offer || owned) return;
    let alive = true;
    void (async () => {
      for (let round = 0; alive; round++) {
        const checkout = openCheckoutRef.current;
        if (!checkout) return;
        const result = await confirmPurchaseRef.current({
          userInitiated: round > 0,
        });
        if (!alive || result === "landed") return;
        if (result === "other_account") {
          setCharged(true);
          return;
        }
        // A checkout whose store sheet ended with no charge, where only the
        // release call failed: release it now.
        let released = false;
        if (checkout.noCharge && checkout.intentId) {
          released = (await releaseCheckout(checkout.intentId)) === "released";
        }
        const holdOver =
          Date.now() >= checkout.holdEndsAt || devPaymentsHooks().holdOver === true;
        // A bounded F1 wait that another program can explain: did one become
        // owned since the attempt started?
        const others =
          checkout.explainableByOthers && checkout.othersOwnedBefore
            ? newlyOwnedOthers(
                checkout.othersOwnedBefore,
                await ownedProgramKeys(),
                checkout.catalogKey,
              )
            : [];
        if (!alive) return;
        if (released || holdOver || others.length > 0) {
          const store = holdOver || released
            ? await storeCheckForCheckout(checkout)
            : { synced: false, hasPurchase: true };
          if (!alive) return;
          const verdict = f3RoundVerdict({
            checkout,
            now: holdOver ? Math.max(Date.now(), checkout.holdEndsAt) : Date.now(),
            owned: false,
            intentReleased: released,
            storeSynced: store.synced,
            storeHasPurchase: store.hasPurchase,
            newlyOwnedOthers: others,
          });
          if (verdict === "note_no_payment" || verdict === "note_earlier_finished") {
            openCheckoutRef.current = null;
            void clearOpenCheckout(checkout.catalogKey);
            setGate({
              state: "ready",
              note: verdict === "note_no_payment" ? "no_payment" : "earlier_finished",
            });
            return;
          }
        }
        await new Promise((r) => setTimeout(r, OPEN_CHECKOUT_RECHECK_MS));
      }
    })();
    return () => {
      alive = false;
    };
  }, [gate.state, offer, owned]);

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
      const started = progress.modules.some(
        (m) => m.status === "COMPLETED" || m.status === "IN_PROGRESS",
      );
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
  //
  // With a cover, the header is the sales page's: the whole cover on a blurred
  // copy of the same picture, the length and the title under it. The page they
  // bought from and the page they come back to then open on the same object.
  if (owned) {
    const cover = programCoverFor(
      catalogKey,
      brochure?.coverImage ?? offer.coverImage,
    );
    const metaLine =
      [
        dayCount ? `${dayCount} days` : null,
        moduleCount > 0 ? `${moduleCount} sessions` : null,
      ]
        .filter(Boolean)
        .join(" \u00b7 ") || null;

    // The owned line: what the screen can honestly say it is. No line, no gap.
    let ownedLine: string | null = null;
    let extra: React.ReactNode = null;
    if (ownedState.needsRetry) {
      // A retry, NOT an "Open" button. There is no day id to open, and a
      // button that leads to a spinner that never resolves is worse than no
      // button at all.
      ownedLine = ownedState.line;
      extra = (
        <Text variant="body" color="secondary">
          We couldn&apos;t load your days just now.
        </Text>
      );
    } else if (ownedState.loadingProgress) {
      extra = <Spinner label="Loading your days…" />;
    } else if (ownedState.canOpen) {
      ownedLine = ownedState.line;
    } else if (opensAt) {
      extra = (
        <NextDayCountdown
          opensAt={opensAt}
          dayIndex={progress?.nextIncompleteDay}
          // Without this the card paired a day number with an instant that
          // belongs to a different day. See `describesNamedDay` there.
          currentDay={progress?.currentDay}
          onOpened={refreshProgress}
        />
      );
    } else {
      ownedLine = "That\u2019s today done.";
    }

    // The one pinned button.
    const cta = ownedState.needsRetry
      ? {
          label: "Try again",
          icon: icons.retry,
          loading: refreshingProgress,
          onPress: () => void retryProgress(),
        }
      : ownedState.canOpen
        ? {
            label: ownedState.cta,
            icon: ownedState.finished ? icons.refresh : icons.play,
            loading: opening,
            // NOT `onPress={openOwned}`. `PressableScale` forwards the raw
            // `GestureResponderEvent`, which would BECOME `targetModuleId`
            // and send PackModule a moduleId that is not a string.
            onPress: () => openOwned(),
          }
        : null;

    // ── THE LIST IS THE WAY BACK IN, NOT A BUTTON ─────────────────────────
    // The list names every day, so it is the only surface that scales. A row
    // opens when the SERVER says it is open (`unlocked` from
    // GET /packs/{id}/progress). A day behind the user is never gated, so
    // `isModuleOfferable` adds the second question once the arc is COMPLETE
    // (a skipped day then dead-ends: the server refuses to start it).
    // Rows have no lines between them: their own height separates them.
    // Bold = the next day to do; none is bold when every day is done.
    const nextDay =
      progress && progress.packStatus !== "COMPLETED"
        ? progress.nextIncompleteDay
        : null;
    const days =
      brochure && brochure.modules.length > 0 ? (
        <View>
          {brochure.modules.map((m) => {
            const mp = moduleStateById.get(m.id);
            const done = mp?.status === "COMPLETED";
            // Only an explicit `false` locks a row. An older backend that does
            // not send the field leaves every day openable.
            const locked = mp?.unlocked === false;
            const offerable =
              !!mp &&
              isModuleOfferable(mp, {
                packStatus: progress?.packStatus,
                // `arcDays` decides the refusal, so it must not read as "no
                // arc" just because one payload left it out.
                arcDays: progress?.arcDays ?? brochure?.arcDays ?? null,
              });
            // Not offerable, and NOT because the clock has yet to reach it: a
            // day they skipped on a program they have since finished. Closed
            // silently would be a dead end, so it stays pressable and
            // explains itself.
            const skipped = !!mp && !locked && !offerable;
            const isNext =
              !done && nextDay != null && m.dayIndex === nextDay && !locked && !skipped;
            const dayName = m.dayIndex
              ? `Day ${m.dayIndex}`
              : `Session ${m.orderIndex}`;

            const row = (
              <View style={styles.moduleRow}>
                <Text variant="label" color="tertiary" style={styles.dayLabel}>
                  {m.dayIndex ? `Day ${m.dayIndex}` : `${m.orderIndex}`}
                </Text>
                <Text
                  variant={isNext ? "title" : "body"}
                  color={locked || skipped ? "tertiary" : "primary"}
                  style={[styles.moduleTitle, !isNext && styles.moduleTitleMed]}
                >
                  {dayTitle(m.title)}
                </Text>
                {/* TWO SLOTS, TWO JOBS: the state glyph says what this day IS,
                    the chevron says the row opens. Both keep a fixed width, so
                    a row with no tick leaves nothing but its own width. */}
                <View style={styles.moduleMark}>
                  {done ? (
                    <Icon
                      name={icons.success}
                      size={size.iconSm}
                      color={colors.feedback.successText}
                    />
                  ) : locked || skipped ? (
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

            return offerable || skipped ? (
              <PressableScale
                key={m.id}
                scaleTo={0.99}
                disabled={opening}
                onPress={() => (skipped ? explainSkippedDay() : openOwned(m.id))}
                accessibilityRole="button"
                accessibilityLabel={`${dayName}, ${dayTitle(m.title)}.${
                  done ? " Done." : ""
                } ${skipped ? "Not open. Explains why." : "Opens it."}`}
              >
                {row}
              </PressableScale>
            ) : (
              <View
                key={m.id}
                accessibilityLabel={`${dayName}, ${dayTitle(m.title)}. Not open yet.`}
              >
                {row}
              </View>
            );
          })}
        </View>
      ) : null;

    return (
      <OwnedProgramPage
        cover={cover}
        eyebrow={dayCount ? `${dayCount}-day program` : null}
        title={offer.title}
        description={brochure?.description ?? null}
        meta={metaLine}
        ownedLine={ownedLine}
        extra={extra}
        daysHeading={days ? (progress ? "The days" : "What\u2019s inside") : null}
        days={days}
        cta={cta}
        onBack={() => navigation.goBack()}
      />
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
          {showsOtherAccount(pendingKind) ? (
            /* PAID ON THE OTHER ACCOUNT. Nothing unlocks here on its own, so
               no line says it will. "Check again" stays below: a grant that
               does arrive always wins. */
            <OtherAccountNotice headingVariant="title" />
          ) : pendingKind ? (
            /* No "Payment received" heading here: the line carries its own
               words, and for a Play pending payment it would not be true. */
            <Text variant="body" color="secondary">
              {pendingLine(pendingKind, "program", settleTimedOut, Platform.OS)}
            </Text>
          ) : (
            <>
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
                We&apos;re confirming it now. This can take a moment. You
                won&apos;t be charged again.
              </Text>
            </>
          )}
          <Button
            label="Check again"
            leftIcon={icons.retry}
            loading={confirming || purchasing}
            onPress={() => void recheckPurchase()}
          />
          <PaymentProblemLink product={brochure?.title ?? offer.title} />
        </View>
      </Page>
    );
  }

  const gateView = buyGateView(gate, "program");

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
      pausedLine={purchasesPaused ? PURCHASES_PAUSED_LINE : null}
      statusLine={gateView.line}
      busyLabel={gateView.busyLabel}
      note={gateView.note}
      onBuyTapped={() => setGate(gateAfterBuyTap)}
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
  // A row is a tap target: 58 high, like the mock. Rows have no lines between
  // them, so nothing is left behind when one has no tick.
  moduleRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 58,
    paddingVertical: spacing.sm,
  },
  dayLabel: {
    width: 58,
  },
  moduleTitle: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  moduleTitleMed: {
    fontFamily: fonts.medium,
    fontWeight: "500",
  },
  // Fixed, so every title ends at the same place whether its row carries a
  // tick, a lock or nothing at all.
  moduleMark: {
    width: 28,
    alignItems: "center",
  },
  // Its own slot, so the state glyph never shifts when a chevron appears
  // beside it.
  moduleChevron: {
    width: size.iconSm,
    alignItems: "center",
  },
  ownedBlock: {
    gap: spacing.lg,
  },
  ownedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  ownedText: {
    flex: 1,
  },
});
