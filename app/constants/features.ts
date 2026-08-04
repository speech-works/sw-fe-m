import Constants from "expo-constants";

// Master monetization switch, set per build profile in eas.json. Billing is
// Apple In-App Purchase (StoreKit) + Google Play Billing via RevenueCat — NOT a
// third-party web processor (those are disallowed for digital goods on both
// stores).
//
// Turned ON in b13d6ba2. It was dormant for a long time and this comment used
// to say so.
//
// DO NOT gate purchase UI on this flag directly — use `purchasesAvailable()`
// from services/purchases, which also requires a RevenueCat key for the CURRENT
// platform. The flag alone is true on a build with no iOS key, and a paywall
// that advertises a price it cannot charge is an App Store 2.1 rejection.
export const PAYMENTS_ENABLED =
  String(Constants.expoConfig?.extra?.PAYMENTS_ENABLED ?? "false").toLowerCase() ===
  "true";

/**
 * Ask the first five onboarding questions BEFORE signup.
 *
 * Today the app demands an account before it gives anything back. With this on,
 * a stranger answers five questions in about a minute, sees their own words
 * reflected with the area we'd start them on, and only then creates an account
 * — so signing up unlocks their plan rather than guarding it.
 *
 * Defaults ON. Like the other flags this is a RUNTIME read of
 * `Constants.expoConfig.extra`, not a compile-time constant, so both paths ship
 * and turning it off is an env-var change rather than an App Store round trip.
 */
export const PRE_AUTH_ONBOARDING_ENABLED =
  String(
    Constants.expoConfig?.extra?.PRE_AUTH_ONBOARDING_ENABLED ?? "true",
  ).toLowerCase() === "true";

export const ALLOW_SIMULATOR_HEADSET_BYPASS =
  String(
    Constants.expoConfig?.extra?.ALLOW_SIMULATOR_HEADSET_BYPASS ?? "false",
  ).toLowerCase() === "true";

// RevenueCat public SDK keys (PAYMENTS-PLAN.md) — publishable, safe client-side.
// Empty until the founder creates the RevenueCat project + store apps; the
// purchases service treats an empty key the same as PAYMENTS_ENABLED=false.
export const REVENUECAT_ANDROID_API_KEY: string =
  Constants.expoConfig?.extra?.REVENUECAT_ANDROID_API_KEY ?? "";
export const REVENUECAT_IOS_API_KEY: string =
  Constants.expoConfig?.extra?.REVENUECAT_IOS_API_KEY ?? "";
