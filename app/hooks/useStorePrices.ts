import { useEffect, useState } from "react";
import { getStorePrices } from "../services/purchases";
import type { StorePrice } from "../services/priceDisplay";

/**
 * Store prices for a set of product ids, in the buyer's own currency.
 *
 * Deliberately forgiving: it starts empty, so every screen renders its backend
 * INR price immediately and swaps to the local one when the store answers. No
 * spinner, no layout shift beyond the string itself — a paywall that blocks on
 * a network call to show a price is worse than one that shows ₹ for 300ms.
 *
 * Results are cached for the process lifetime. Store prices change about as
 * often as you edit them in the console, so re-fetching per mount would be
 * pure latency; a fresh app launch picks up any change.
 */

const cache = new Map<string, StorePrice>();
/** In-flight and completed lookups, so N mounts don't fire N identical calls. */
const pending = new Map<string, Promise<void>>();

/** Test-only: drop memoized state between cases. */
export function __resetStorePriceCache(): void {
  cache.clear();
  pending.clear();
}

function cachedSubset(ids: string[]): Record<string, StorePrice> {
  const out: Record<string, StorePrice> = {};
  for (const id of ids) {
    const hit = cache.get(id);
    if (hit) out[id] = hit;
  }
  return out;
}

export function useStorePrices(productIds: (string | null | undefined)[]): {
  prices: Record<string, StorePrice>;
  loading: boolean;
} {
  // Stable primitive key: the hook is usually called with a freshly-built array
  // (e.g. offers.map(o => o.tierProductId)), so depending on the array itself
  // would refetch on every single render.
  const ids = Array.from(
    new Set(productIds.filter((id): id is string => !!id)),
  ).sort();
  const key = ids.join("|");

  const [prices, setPrices] = useState<Record<string, StorePrice>>(() =>
    cachedSubset(ids),
  );
  const [loading, setLoading] = useState(() => ids.some((id) => !cache.has(id)));

  useEffect(() => {
    const wanted = key ? key.split("|") : [];
    const missing = wanted.filter((id) => !cache.has(id));

    if (missing.length === 0) {
      setPrices(cachedSubset(wanted));
      setLoading(false);
      return;
    }

    let alive = true;
    setLoading(true);

    const lookupKey = missing.join("|");
    let job = pending.get(lookupKey);
    if (!job) {
      job = getStorePrices(missing)
        .then((found) => {
          for (const [id, price] of Object.entries(found)) cache.set(id, price);
        })
        .catch(() => {
          // getStorePrices already swallows its own errors; this is belt-and-braces
          // so a rejected promise can never leave the hook stuck loading.
        })
        .finally(() => {
          pending.delete(lookupKey);
        });
      pending.set(lookupKey, job);
    }

    void job.then(() => {
      // Unmounted, or the caller asked for a different set while we were away.
      if (!alive) return;
      setPrices(cachedSubset(wanted));
      setLoading(false);
    });

    return () => {
      alive = false;
    };
  }, [key]);

  return { prices, loading };
}
