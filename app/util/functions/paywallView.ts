import type { User } from "../../api/users";
import { FREE_DAYS_END_LINE } from "./membership";

/**
 * ===========================================================================
 * WHAT THE MEMBERSHIP PAYWALL SHOWS, FROM WHAT THE SERVER SAYS
 * ---------------------------------------------------------------------------
 * One pure function, so every decision on the paywall can be tested without a
 * screen: which plan cards can be picked, which one is picked, what the main
 * button says and does, and which notice lines sit above it.
 *
 * The server sends `membership.actions` with the plans that can be bought and
 * what the main button does. An older server does not, and then this falls
 * back to what the app did before: both plans open unless they already have a
 * store plan.
 *
 * The bugs this replaced:
 * - Every member saw both plan cards disabled, including somebody on free
 *   days who had nothing to manage and could only buy.
 * - Nothing was picked when `plan` was null, so the button named a price for
 *   a card that did not look picked.
 * - Somebody whose plan was on the other store was offered a second one.
 * ===========================================================================
 */

export type PlanKey = "monthly" | "annual";
export type StoreKey = "app_store" | "play_store";
type Membership = NonNullable<User["membership"]>;

/** The store this device buys from, or null where there is none. */
export function deviceStoreFor(os: string): StoreKey | null {
  if (os === "ios") return "app_store";
  if (os === "android") return "play_store";
  return null;
}

/** The store's name as a reader would say it, inside a sentence. */
export function storeName(store: StoreKey): string {
  return store === "app_store" ? "the App Store" : "Google Play";
}

/** Where a person manages a plan on that store. */
/**
 * Apple's own help page for cancelling a subscription. Covers people with no
 * Apple device (Windows PC, Android). Apple does not let us cancel an App Store
 * subscription for the customer, and its subscriptions web address does nothing
 * on an Android phone, so this is the one place that helps them.
 */
export const APPLE_CANCEL_HELP_URL = "https://support.apple.com/118428";

export const STORE_SUBSCRIPTIONS_URL: Record<StoreKey, string> = {
  app_store: "https://apps.apple.com/account/subscriptions",
  play_store: "https://play.google.com/store/account/subscriptions",
};

export interface PlanCardView {
  enabled: boolean;
  selected: boolean;
  /** Their plan now. Gets the CURRENT PLAN tag. */
  current: boolean;
  /** `Renews {date}` or `Ends {date}` on the current plan, else null. */
  endFootnote: string | null;
}

export type PaywallCta =
  | { kind: "buy"; plan: PlanKey | null; label: string; a11y: string; enabled: boolean }
  | { kind: "upgrade"; plan: "annual"; label: string; a11y: string; enabled: boolean }
  | { kind: "manage"; label: string; a11y: string; enabled: boolean }
  | { kind: "openStore"; store: StoreKey; url: string; label: string; a11y: string; enabled: boolean }
  | { kind: "none" };

export interface PaywallView {
  /** Show the single member page rather than the three-page pitch. */
  memberLayout: boolean;
  cards: Record<PlanKey, PlanCardView>;
  selectedPlan: PlanKey | null;
  cta: PaywallCta;
  /**
   * Lines shown in body size directly above the main button, in this order.
   * Never a grey caption: these say something the reader has to know before
   * paying.
   */
  notices: string[];
  /** The line beside the shield or tick under the button. */
  guarantee: string;
  /** Tick (they have a plan) rather than shield. */
  guaranteeIsMember: boolean;
  /** Offer the "Manage current plan" link under the button. */
  showManageLink: boolean;
  /**
   * Which renewal text the screen prints for Guideline 3.1.2. "plan" means the
   * price and renewal terms of the plan being bought; "current" means when
   * their plan renews; null means nothing is sold or renewing here.
   */
  disclosure: "plan" | "current" | null;
}

export interface PaywallViewInput {
  membership: User["membership"] | null | undefined;
  /** `Platform.OS`. */
  platformOS: string;
  /** The card the reader tapped, or null before they tap one. */
  picked: PlanKey | null;
  /** Store price strings. Only used when the price is known. */
  monthlyLabel: string;
  annualLabel: string;
  monthlyKnown: boolean;
  annualKnown: boolean;
  /** The yearly saving the plan screen shows on its tag; 0 when unknown. */
  annualSavingsPct?: number;
  /** Their membership end date, formatted for display, or null. */
  endDateText: string | null;
  /** The clock for the free-days date (year shown only when not this year). Tests set it. */
  now?: Date;
}

/**
 * A short display date: day and short month in the device's own locale ("8
 * Dec", or "Dec 8" on a US phone), the same options the plan card's "Renews"
 * date uses, with the year only when it is not this year. Null for no date.
 */
export function shortDisplayDate(
  iso: string | null | undefined,
  now: Date = new Date(),
): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" as const } : {}),
  });
}

/**
 * M3 (founder-approved wording, 9 Nov 2026), above the buy button while they
 * have free days and can buy or upgrade:
 *   "Enjoy your free days until {date}. If you buy now, your plan starts today."
 * {date} is when the free days end: `freeUntil`, else `until` for free-month
 * or gift access. With no date: "Enjoy your free days. If you buy now, your
 * plan starts today."
 */
export function freeDaysLine(
  m: Pick<Membership, "freeUntil" | "until" | "source"> | null | undefined,
  now: Date = new Date(),
): string {
  const end =
    m?.freeUntil ??
    (m?.source === "pack_bonus" || m?.source === "grant" ? m.until : null);
  const date = shortDisplayDate(end, now);
  return date
    ? `Enjoy your free days until ${date}. ${FREE_DAYS_END_LINE}`
    : `Enjoy your free days. ${FREE_DAYS_END_LINE}`;
}

/** The plan cards the reader may pick, and what the main button does. */
function serverActions(m: Membership | null | undefined): {
  pick: PlanKey[];
  primary: "buy" | "upgrade" | "manage" | "none";
} {
  if (m?.actions && Array.isArray(m.actions.pick) && m.actions.primary) {
    return {
      pick: m.actions.pick.filter((p) => p === "monthly" || p === "annual"),
      primary: m.actions.primary,
    };
  }
  // An older server. What the app did before: a store plan cannot be picked
  // again, monthly upgrades to annual, annual is managed, and anybody else
  // can buy either plan.
  const plan = m?.active ? (m.plan ?? null) : null;
  // A plan whose store we do not know (missing, "unknown", or Stripe) is never
  // upgraded from here, the same answer the server gives. An upgrade on this
  // device's store would start a second plan beside the one they pay for
  // elsewhere, and charge them twice.
  const store = m?.store ?? null;
  const storeKnown = store === "app_store" || store === "play_store";
  if (plan && !storeKnown) return { pick: [], primary: "manage" };
  if (plan === "annual") return { pick: [], primary: "manage" };
  if (plan === "monthly") return { pick: [], primary: "upgrade" };
  return { pick: ["monthly", "annual"], primary: "buy" };
}

export function paywallView(input: PaywallViewInput): PaywallView {
  const m = input.membership ?? null;
  const active = m?.active === true;
  const plan: PlanKey | null = active ? (m?.plan ?? null) : null;
  const willNotRenew = active && !!plan && m?.willRenew === false;
  const deviceStore = deviceStoreFor(input.platformOS);

  // ── H2e: the plan is on the other store ─────────────────────────────────
  // Only the two stores we can name. "stripe" and "unknown" fall through to
  // what the server allows, because there is no store page to send them to.
  const planStore = m?.store ?? null;
  const otherStore: StoreKey | null =
    (planStore === "app_store" || planStore === "play_store") &&
    planStore !== deviceStore
      ? planStore
      : null;

  const actions = serverActions(m);
  // No plan to pick while a payment is failing: the fix is the payment (W9),
  // and a highlighted Yearly card next to "Update payment" reads as a sale.
  const pick = otherStore || m?.billingIssue === true ? [] : actions.pick;
  const primary = otherStore ? "openStore" : actions.primary;

  const enabled = (p: PlanKey) => pick.includes(p);
  const known = (p: PlanKey) =>
    p === "annual" ? input.annualKnown : input.monthlyKnown;

  // The tapped card if it can be picked, else annual, else monthly, else
  // their current plan so it still reads as theirs.
  const selectedPlan: PlanKey | null =
    input.picked && enabled(input.picked)
      ? input.picked
      : enabled("annual")
        ? "annual"
        : enabled("monthly")
          ? "monthly"
          : plan;

  const endFootnote = (p: PlanKey): string | null =>
    plan === p && input.endDateText
      ? willNotRenew
        ? `Ends ${input.endDateText}`
        : `Renews ${input.endDateText}`
      : null;

  const card = (p: PlanKey): PlanCardView => ({
    enabled: enabled(p),
    selected: selectedPlan === p,
    current: plan === p,
    endFootnote: endFootnote(p),
  });

  // ── The main button ─────────────────────────────────────────────────────
  // The store that bills this plan: the plan's own, else this device's.
  const billedBy: StoreKey | null =
    planStore === "app_store" || planStore === "play_store"
      ? planStore
      : deviceStore;
  // W9: a failed payment on THIS device's store. The fix is the payment, not
  // a bigger plan, so the main button opens the store's subscriptions page.
  const fixPayment = !otherStore && m?.billingIssue === true && !!billedBy;

  let cta: PaywallCta;
  if (fixPayment && billedBy) {
    cta = {
      kind: "openStore",
      store: billedBy,
      url: STORE_SUBSCRIPTIONS_URL[billedBy],
      label: "Update payment",
      a11y: `Update payment in ${storeName(billedBy)}`,
      enabled: true,
    };
  } else if (otherStore === "app_store" && deviceStore !== "app_store") {
    // Apple-billed plan on a phone that is not an iPhone: Apple's own steps.
    cta = {
      kind: "openStore",
      store: otherStore,
      url: APPLE_CANCEL_HELP_URL,
      label: "Open Apple's steps",
      a11y: "Open Apple's steps to change or cancel your plan",
      enabled: true,
    };
  } else if (otherStore) {
    const name = otherStore === "app_store" ? "the App Store" : "Google Play";
    cta = {
      kind: "openStore",
      store: otherStore,
      url: STORE_SUBSCRIPTIONS_URL[otherStore],
      label: `Open ${name}`,
      a11y: `Open ${name}`,
      enabled: true,
    };
  } else if (primary === "none") {
    cta = { kind: "none" };
  } else if (primary === "manage") {
    cta = {
      kind: "manage",
      label: "Manage Subscription",
      a11y: "Manage Speechworks subscription",
      enabled: true,
    };
  } else if (primary === "upgrade") {
    cta = {
      kind: "upgrade",
      plan: "annual",
      // No price here: the selected plan row right above shows it (K3).
      label: "Switch to yearly",
      a11y: "Switch to the yearly plan",
      enabled: true,
    };
  } else {
    const p = selectedPlan && enabled(selectedPlan) ? selectedPlan : null;
    cta = {
      kind: "buy",
      plan: p,
      label: !p
        ? "Start membership"
        : !known(p)
          ? "Pricing unavailable"
          : "Start membership",
      a11y: "Start Speechworks membership",
      enabled: !!p && known(p),
    };
  }

  // ── The lines above the button ──────────────────────────────────────────
  const notices: string[] = [];
  if (otherStore === "app_store" && deviceStore !== "app_store") {
    notices.push(
      "You pay for your plan through Apple. To change or cancel it without an iPhone, follow Apple's steps.",
    );
  } else if (otherStore) {
    notices.push(
      `You bought your plan on ${storeName(otherStore)}. Change or cancel it there.`,
    );
  }
  if (m?.billingIssue === true) {
    // No App Store on an Android phone: there, the payment details live with Apple.
    const where =
      billedBy === "app_store" && deviceStore !== "app_store"
        ? "with Apple"
        : `in ${billedBy ? storeName(billedBy) : "your store account"}`;
    notices.push(
      `Your last payment did not go through. To keep your membership, update your payment details ${where}.`,
    );
  }
  // H2b. The founder asked for this to be clearly said: buying ends the free
  // days, and here is how many are left.
  const canBuy = cta.kind === "buy" || cta.kind === "upgrade";
  if (m?.freeUntil && canBuy) {
    notices.push(freeDaysLine(m, input.now));
  }
  if (cta.kind === "none") {
    notices.push("Your membership has no end date.");
  }

  // ── The line under the button ───────────────────────────────────────────
  const save = input.annualSavingsPct ?? 0;
  const guarantee = willNotRenew && input.endDateText
    ? `Your plan ends on ${input.endDateText}. To keep it, turn renewal back on in ${
        billedBy ? storeName(billedBy) : "your store account"
      }.`
    : plan === "annual"
      ? "You already have an active subscription"
      : plan === "monthly"
        ? // No switch named unless the button offers one (not on the other
          // store, a failed payment, or a store we do not know), and no
          // saving claimed when we cannot price it.
          cta.kind !== "upgrade" || save <= 0
          ? "You are on the monthly plan."
          : `You are on the monthly plan. Switch to yearly and save ${save}%.`
        : "Secure payment. Cancel anytime.";

  const disclosure: PaywallView["disclosure"] =
    cta.kind === "buy" || cta.kind === "upgrade"
      ? "plan"
      : cta.kind === "manage" && active && m?.willRenew !== false
        ? "current"
        : null;

  return {
    memberLayout: active,
    cards: { monthly: card("monthly"), annual: card("annual") },
    selectedPlan,
    cta,
    notices,
    guarantee,
    guaranteeIsMember: !!plan,
    showManageLink: cta.kind === "upgrade",
    disclosure,
  };
}

/**
 * The purchase landed when the server says the membership is a store plan.
 *
 * NOT the wallet's "membership" entitlement. Somebody on free days already
 * has that, so a wait on it ended the moment it started and called a purchase
 * confirmed that the server had not seen yet.
 */
export function purchaseConfirmed(
  m: User["membership"] | null | undefined,
  bought: PlanKey,
): boolean {
  if (!m?.active) return false;
  if (bought === "annual" && m.plan === "annual") return true;
  if (bought === "monthly" && m.plan != null) return true;
  return m.source === "purchase" && bought === "monthly";
}

/**
 * ===========================================================================
 * DELETING THE ACCOUNT DOES NOT STOP THE STORE BILLING
 * ---------------------------------------------------------------------------
 * Apple and Google bill the plan, not us, so deleting a Speechworks account
 * leaves the store subscription running. Somebody about to delete needs to
 * hear that, and needs the same way to cancel that the plan screen gives them.
 *
 * Only for a store plan that renews: `source === "purchase"` and
 * `willRenew === true`. Free days and grants renew nothing.
 *
 * The store is the plan's own; when the server does not say which (missing,
 * "unknown", or Stripe), it is this device's store. The way to manage it is
 * the plan screen's for the same case:
 *   same store as this phone   the native manage sheet (manageSubscriptions)
 *   Apple plan on Android      Apple's own steps (APPLE_CANCEL_HELP_URL)
 *   Play plan on an iPhone     Google Play's subscriptions page
 * ===========================================================================
 */
export type DeleteAccountManage =
  | { kind: "native" }
  | { kind: "url"; url: string };

export interface DeleteAccountRenewalNotice {
  line: string;
  manage: DeleteAccountManage;
}

export function deleteAccountRenewalNotice(
  membership: User["membership"] | null | undefined,
  platformOS: string,
): DeleteAccountRenewalNotice | null {
  const m = membership;
  if (!m?.active || m.willRenew !== true || m.source !== "purchase") return null;

  const deviceStore = deviceStoreFor(platformOS);
  const store: StoreKey | null =
    m.store === "app_store" || m.store === "play_store" ? m.store : deviceStore;
  if (!store) return null;

  // No App Store on an Android phone: there, the plan is cancelled with Apple.
  if (store === "app_store" && deviceStore !== "app_store") {
    return {
      line: "Your membership keeps renewing until you cancel it with Apple.",
      manage: { kind: "url", url: APPLE_CANCEL_HELP_URL },
    };
  }
  return {
    line: `Your membership keeps renewing until you cancel it in ${storeName(store)}.`,
    manage:
      store === deviceStore
        ? { kind: "native" }
        : { kind: "url", url: STORE_SUBSCRIPTIONS_URL[store] },
  };
}
