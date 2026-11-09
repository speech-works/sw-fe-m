// app/services/openCheckout.ts
//
// The program checkouts this phone started and has not seen end, kept on disk.
//
// Why on disk: the backend tells the app nothing about an open checkout until
// Buy is tapped (the 409 CHECKOUT_IN_PROGRESS). A purchase killed mid-way
// (app force-closed 1.5 s after Buy, Android, 8 Nov 2026) came back to a live
// Buy button for a minute before the grant landed. With this record the
// program page opens on "Checking your payment…" instead.
//
// Holds NO entitlement. Whether a program is owned is only ever the server's
// answer. Every read is tolerant: anything unreadable is "no record", which is
// what the app did before this file existed. Wiped on sign-out with the other
// user-scoped keys (ASYNC_KEYS_NAME), and each record carries its user id.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ASYNC_KEYS_NAME } from "../constants/asyncStorageKeys";
import { OPEN_CHECKOUT_MAX_AGE_MS, type OpenCheckout } from "./purchaseSettlement";

const KEY = ASYNC_KEYS_NAME.SW_OPEN_CHECKOUTS;

type Records = Record<string, OpenCheckout>;

function isRecord(v: unknown): v is OpenCheckout {
  if (!v || typeof v !== "object") return false;
  const r = v as Partial<OpenCheckout>;
  return (
    typeof r.userId === "string" &&
    typeof r.catalogKey === "string" &&
    typeof r.productId === "string" &&
    typeof r.startedAt === "number" &&
    typeof r.holdEndsAt === "number" &&
    (r.intentId === null || typeof r.intentId === "string") &&
    typeof r.noCharge === "boolean"
  );
}

/** Parse what is on disk. Unreadable or stale entries are left out. */
export function parseOpenCheckouts(raw: string | null, now: number): Records {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const out: Records = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (!isRecord(v)) continue;
      if (now - v.startedAt > OPEN_CHECKOUT_MAX_AGE_MS) continue;
      out[k] = { ...v, charge: v.charge ?? null };
    }
    return out;
  } catch {
    return {};
  }
}

async function readAll(): Promise<Records> {
  try {
    return parseOpenCheckouts(await AsyncStorage.getItem(KEY), Date.now());
  } catch (error) {
    console.warn("[openCheckout] read failed:", error);
    return {};
  }
}

async function writeAll(records: Records): Promise<void> {
  try {
    if (Object.keys(records).length === 0) await AsyncStorage.removeItem(KEY);
    else await AsyncStorage.setItem(KEY, JSON.stringify(records));
  } catch (error) {
    console.warn("[openCheckout] write failed:", error);
  }
}

/** The open checkout for this user and program, or null. */
export async function loadOpenCheckout(
  userId: string | null | undefined,
  catalogKey: string,
): Promise<OpenCheckout | null> {
  if (!userId) return null;
  const record = (await readAll())[catalogKey];
  return record && record.userId === userId ? record : null;
}

/** Every open checkout of this user, for any program. */
export async function loadAllOpenCheckouts(
  userId: string | null | undefined,
): Promise<OpenCheckout[]> {
  if (!userId) return [];
  return Object.values(await readAll()).filter((r) => r.userId === userId);
}

export async function saveOpenCheckout(checkout: OpenCheckout): Promise<void> {
  const all = await readAll();
  all[checkout.catalogKey] = checkout;
  await writeAll(all);
}

/** Merge fields into an existing record. No record, nothing written. */
export async function updateOpenCheckout(
  catalogKey: string,
  patch: Partial<Pick<OpenCheckout, "noCharge" | "charge">>,
): Promise<void> {
  const all = await readAll();
  const current = all[catalogKey];
  if (!current) return;
  all[catalogKey] = { ...current, ...patch };
  await writeAll(all);
}

export async function clearOpenCheckout(catalogKey: string): Promise<void> {
  const all = await readAll();
  if (!(catalogKey in all)) return;
  delete all[catalogKey];
  await writeAll(all);
}
