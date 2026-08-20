/**
 * Decides WHAT PRICE STRING to put on screen.
 *
 * The bug this exists to kill: every paywall rendered `₹${priceInr}`, so a
 * buyer in Ohio saw "₹499" and was then charged $6.99. The number shown and the
 * number charged were different, in a different currency. `ExhaustionSheet`
 * already warns that "a stale literal in a button is how a user ends up being
 * charged something other than what they were shown" — the currency glyph was
 * exactly that literal, one layer up.
 *
 * The rules, in priority order:
 *
 * 1. **If the store told us the price, show the store's own string.** RevenueCat
 *    hands back `priceString` already localized and formatted by Google/Apple
 *    ("₹499", "$6.99", "£5.99"). It is by definition what the user will be
 *    charged, so it can never drift from the charge. We never re-format it.
 *
 * 2. **An anchor must be in the SAME currency, and must be real.** Best is a
 *    store price for the anchor itself (`anchorStore`) — that works in all ~170
 *    countries with no price book of our own. Failing that we fall back to the
 *    backend's INR/USD anchors, which are only meaningful to an INR/USD buyer.
 *    In any other currency we show NO strike: a missing strike is a small loss;
 *    "₹999" struck through above "£5.99" is nonsense, and converting one
 *    ourselves would be a fabricated price. `PriceTag` promises "never a
 *    fabricated 'was'".
 *
 * 3. **If the store is silent, fall back to INR.** Payments disabled, offline,
 *    or the product not yet created in the console — all land here. India is the
 *    launch market, so INR is the least-wrong default, and it is exactly the
 *    behaviour that shipped before this module existed.
 */

/** A price as the store itself reports it. Mirrors RevenueCat's StoreProduct. */
export interface StorePrice {
  /** Localized and formatted BY THE STORE — e.g. "₹499", "$6.99". */
  priceString: string;
  /** The same value as a number, for deriving savings and per-month figures. */
  price: number;
  /** ISO-4217, e.g. "INR", "USD", "GBP". */
  currencyCode: string;
}

export interface PriceInputs {
  /** Store price for the product actually charged. Absent ⇒ rule 3. */
  store?: StorePrice | null;
  /**
   * Store price for the ANCHOR (the struck-through "was"). When present this is
   * what makes a real discount showable in any currency on earth.
   */
  anchorStore?: StorePrice | null;
  /** Backend price in INR (always present). */
  inr: number;
  /** Backend price in USD (always present). */
  usd: number;
  /** Backend anchor in INR. Equal to `inr` when nothing is discounted. */
  anchorInr?: number;
  /** Backend anchor in USD. Equal to `usd` when nothing is discounted. */
  anchorUsd?: number;
}

export interface PriceDisplay {
  /** Render this as the price. Never empty. */
  price: string;
  /** Render this struck through, or null for no strike at all. */
  anchor: string | null;
  /** True when `price` came from the store, i.e. is exactly what gets charged. */
  exact: boolean;
  /** The currency actually being displayed, for callers formatting extras. */
  currencyCode: string;
  /** Numeric price in `currencyCode`, for derived figures. Null if unknown. */
  priceAmount: number | null;
  /** Numeric anchor in `currencyCode`. Null when no honest anchor exists. */
  anchorAmount: number | null;
}

export function formatInr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

export function formatUsd(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/**
 * Closes the gap between a LEADING currency symbol and its digits.
 *
 * Several locales put a non-breaking or narrow no-break space there, so `Intl`
 * returns "$ 2.92" while the store's own string for the very same currency is
 * "$2.92". Both appear on the membership sheet, one line apart, and the
 * mismatch reads as a rendering fault rather than as two sources.
 *
 * Only a LEADING symbol is touched. Locales that put the symbol after the
 * number ("2,92 €") need that space and keep it.
 */
export function tightenLeadingSymbol(formatted: string): string {
  return formatted.replace(/^([^\d\s]+)\s+(?=\d)/u, "$1");
}

/**
 * Formats an amount we genuinely hold in that currency. Uses the platform's own
 * currency formatting so £, €, ¥ and the rest come out right without us
 * shipping a symbol table. Falls back to our two hand-rolled formatters if
 * `Intl` is missing or rejects the code, and returns null only when there is
 * nothing sensible to print — callers then withhold the line entirely.
 */
export function formatCurrency(
  amount: number,
  currencyCode: string,
): string | null {
  if (!Number.isFinite(amount) || !currencyCode) return null;
  try {
    const formatted = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currencyCode,
      // INR is quoted in whole rupees across the app; everything else keeps cents.
      maximumFractionDigits: currencyCode === "INR" ? 0 : 2,
    }).format(amount);
    return tightenLeadingSymbol(formatted);
  } catch {
    if (currencyCode === "INR") return formatInr(amount);
    if (currencyCode === "USD") return formatUsd(amount);
    return null;
  }
}

function isUsable(store?: StorePrice | null): store is StorePrice {
  return (
    !!store &&
    !!store.priceString &&
    !!store.currencyCode &&
    Number.isFinite(store.price)
  );
}

/**
 * Builds a store-quality anchor by scaling a real store price — used for the
 * annual membership, whose "was" is 12 × the monthly product rather than a
 * product of its own. The backend already derives it exactly this way
 * ("Annual's honest anchor = 12 × the monthly price"); doing it from the store's
 * own monthly figure simply keeps that same honest sum in the buyer's currency.
 */
export function deriveAnchor(
  base: StorePrice | null | undefined,
  multiplier: number,
): StorePrice | null {
  if (!isUsable(base) || !Number.isFinite(multiplier) || multiplier <= 0) {
    return null;
  }
  const amount = base.price * multiplier;
  const priceString = formatCurrency(amount, base.currencyCode);
  if (!priceString) return null;
  return { priceString, price: amount, currencyCode: base.currencyCode };
}

export function resolvePriceDisplay(input: PriceInputs): PriceDisplay {
  const { store, anchorStore, inr, usd, anchorInr, anchorUsd } = input;

  // ── Rule 3: no store data → the pre-existing INR behaviour, unchanged. ──
  if (!isUsable(store)) {
    const showAnchor = anchorInr != null && anchorInr > inr;
    return {
      price: formatInr(inr),
      anchor: showAnchor ? formatInr(anchorInr) : null,
      exact: false,
      currencyCode: "INR",
      priceAmount: inr,
      anchorAmount: showAnchor ? anchorInr : null,
    };
  }

  const currencyCode = store.currencyCode;

  // ── Rule 2, best case: a real store price for the anchor. Any currency. ──
  if (
    isUsable(anchorStore) &&
    anchorStore.currencyCode === currencyCode &&
    anchorStore.price > store.price
  ) {
    return {
      price: store.priceString,
      anchor: anchorStore.priceString,
      exact: true,
      currencyCode,
      priceAmount: store.price,
      anchorAmount: anchorStore.price,
    };
  }

  // ── Rule 2, fallback: our own price book, which covers INR and USD only. ──
  let anchor: string | null = null;
  let anchorAmount: number | null = null;
  if (currencyCode === "INR" && anchorInr != null && anchorInr > inr) {
    anchor = formatInr(anchorInr);
    anchorAmount = anchorInr;
  } else if (currencyCode === "USD" && anchorUsd != null && anchorUsd > usd) {
    anchor = formatUsd(anchorUsd);
    anchorAmount = anchorUsd;
  }

  return {
    price: store.priceString,
    anchor,
    exact: true,
    currencyCode,
    priceAmount: store.price,
    anchorAmount,
  };
}

/**
 * The "Save X" line, in the same currency as the prices above it. Null whenever
 * there is no honest saving to quote — the caller then omits the line rather
 * than printing a zero or a number in the wrong money.
 */
export function savingLabelFor(display: PriceDisplay): string | null {
  const { priceAmount, anchorAmount, currencyCode } = display;
  if (priceAmount == null || anchorAmount == null) return null;
  const delta = anchorAmount - priceAmount;
  if (!(delta > 0)) return null;
  return formatCurrency(delta, currencyCode);
}

/**
 * The "save N%" badge. Currency-independent by nature, but it must be computed
 * from the pair actually on screen: ₹1499-vs-₹2388 is 37% while
 * $34.99-vs-$59.88 is 42%, so reading it off the INR book would under-claim to
 * every dollar buyer.
 */
export function savingPercentFor(display: PriceDisplay): number | null {
  const { priceAmount, anchorAmount } = display;
  if (priceAmount == null || anchorAmount == null || anchorAmount <= 0) {
    return null;
  }
  const pct = Math.round((1 - priceAmount / anchorAmount) * 100);
  return pct > 0 ? pct : null;
}
