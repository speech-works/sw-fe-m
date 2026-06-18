import PostHog from 'posthog-react-native';
import type { PostHogEventProperties } from '@posthog/core';
import { useAnalyticsConsentStore } from '../../stores/analyticsConsent';

/** Whether the user currently allows analytics capture (Settings toggle). */
function consented(): boolean {
    return useAnalyticsConsentStore.getState().enabled;
}

/**
 * Reflect the analytics preference onto the PostHog client itself (in addition
 * to the per-call gating below), so any provider-level capture also stops.
 */
export function applyAnalyticsConsent(enabled: boolean): void {
    const c = client as unknown as {
        optIn?: () => void;
        optOut?: () => void;
    } | null;
    if (!c) return;
    try {
        if (enabled) c.optIn?.();
        else c.optOut?.();
    } catch {
        // optIn/optOut may not exist on every version — call gating still applies.
    }
}

// Single shared instance — initialized once on app start.
let client: PostHog | null = null;

export function initAnalytics(): PostHog {
    if (client) return client;

    // Disabled in development (Expo Go / Metro bundler / simulator).
    // Enabled only in release builds (EAS preview / production APK/IPA).
    console.log('[PostHog] Initializing:', {
        hasApiKey: !!process.env.EXPO_PUBLIC_POSTHOG_API_KEY,
        host: process.env.EXPO_PUBLIC_POSTHOG_HOST,
        disabled: __DEV__,
    });

    client = new PostHog(process.env.EXPO_PUBLIC_POSTHOG_API_KEY!, {
        host: process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com',
        disabled: __DEV__,
        flushAt: 20,
        flushInterval: 30000,
    });

    return client;
}

// ─── Identity ──────────────────────────────────────────────────────────────

/**
 * Call this once when the user logs in successfully.
 * Links all future events to their userId in PostHog.
 */
export function identifyUser(userId: string, properties?: PostHogEventProperties) {
    if (!consented()) return;
    client?.identify(userId, properties);
}

/**
 * Call this when the user logs out.
 * Resets the PostHog identity so subsequent events are anonymous.
 */
export function resetAnalyticsIdentity() {
    client?.reset();
}

// ─── Event Tracking ────────────────────────────────────────────────────────

/**
 * Track a named event with optional properties.
 * Use the ANALYTICS_EVENTS constants rather than raw strings.
 */
export function track(event: string, properties?: PostHogEventProperties) {
    if (!consented()) return;
    client?.capture(event, properties);
}

// ─── Screen Tracking ───────────────────────────────────────────────────────

/**
 * Track a screen view. Call this in your navigation state change handler.
 */
export function trackScreen(screenName: string, properties?: PostHogEventProperties) {
    if (!consented()) return;
    client?.screen(screenName, properties);
}
