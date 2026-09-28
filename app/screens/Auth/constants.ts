export const COMPANY_NAME = "Speechworks";
export const COMPANY_SLOGAN = "Change the Conversation";
/**
 * Shown on the auth screen and required, reachable, by both stores — this app
 * takes voice recordings and health-adjacent answers, so a dead link here is a
 * review rejection rather than a cosmetic bug.
 *
 * It pointed at speechworks.com, a domain that does not resolve at all. Verify
 * this one still answers before any store submission; nothing in the build
 * fails if it stops.
 */
export const PRIVACY_POLICY_URL = "https://speechworks.app/privacy/";
/**
 * Terms of Use, linked from the auth screen and the paywall.
 *
 * App Store Guideline 3.1.2 requires a functional Terms of Use link in the
 * BINARY for any auto-renewing subscription, not just in App Store Connect.
 * The Speechworks terms add to Apple's standard EULA and Google Play's terms,
 * and link to both, so one URL serves both platforms. Verify it still answers
 * before any store submission; nothing in the build fails if it stops.
 */
export const TERMS_OF_USE_URL = "https://speechworks.app/terms/";
/**
 * The one support channel, used everywhere.
 *
 * There were three: this number (a UAE one), and a separate India number plus
 * contact@speechworks.in in Settings → Contact Support. App Store Connect takes
 * exactly one Support URL, and a number nobody watches is worse than an
 * inconsistent one — so everything now points at the India WhatsApp line, which
 * matches the canonical contact@speechworks.in address in the privacy policy.
 */
export const SUPPORT_URL = "https://wa.me/917350075986";
/** Canonical support inbox. Also the address published in the privacy policy. */
export const SUPPORT_EMAIL = "contact@speechworks.in";
