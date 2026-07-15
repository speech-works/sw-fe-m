import Constants from "expo-constants";

// Dormant monetization switch. Kept false until billing is reconnected via
// Apple In-App Purchase (StoreKit) + Google Play Billing — NOT a third-party web
// processor (those are disallowed for digital goods on both stores). While
// false, all premium UI (paywall CTA, BuyPro card, upsell modals) is hidden.
// TODO(payments): wire IAP / Play Billing, then flip this on.
export const PAYMENTS_ENABLED =
  String(Constants.expoConfig?.extra?.PAYMENTS_ENABLED ?? "false").toLowerCase() ===
  "true";

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
