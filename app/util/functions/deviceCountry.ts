import * as Localization from "expo-localization";
import { updateMyUser, type User } from "../../api/users";

const COUNTRY_CODE_RE = /^[A-Za-z]{2}$/;

/**
 * The device's Region setting (iOS Language & Region, Android Region), as an
 * upper-case ISO 3166-1 alpha-2 code. Undefined when the OS gives nothing
 * usable. Picks the crisis helpline, so it never throws.
 */
export function getDeviceCountry(): string | undefined {
  try {
    const region = Localization.getLocales()?.[0]?.regionCode;
    return region && COUNTRY_CODE_RE.test(region)
      ? region.toUpperCase()
      : undefined;
  } catch {
    return undefined;
  }
}

// The user this session has already synced. Keyed by id so a different
// account signing in on the same device syncs again.
let syncedForUserId: string | null = null;

/**
 * Once per session: store the device region as User.countryCode when it
 * differs from what the server has. GET /crisis-resources resolves the
 * helpline from that stored value, and nothing else ever writes it.
 *
 * Returns the code it wrote, or null when it wrote nothing. Never throws; a
 * failed write is retried on the next user fetch.
 */
export async function syncDeviceCountry(
  user: Pick<User, "id" | "countryCode"> | null | undefined,
): Promise<string | null> {
  if (!user?.id || syncedForUserId === user.id) return null;
  syncedForUserId = user.id;

  const country = getDeviceCountry();
  if (!country || country === user.countryCode?.toUpperCase()) return null;

  try {
    await updateMyUser({ countryCode: country });
    return country;
  } catch {
    syncedForUserId = null;
    return null;
  }
}

/** Sign-out, and tests. */
export function resetDeviceCountrySync(): void {
  syncedForUserId = null;
}
