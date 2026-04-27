import PostHog from 'posthog-react-native';
import type { PostHogEventProperties } from '@posthog/core';


// Single shared instance — initialized once on app start.
let client: PostHog | null = null;

export function initAnalytics(): PostHog {
    if (client) return client;

    console.log("[PostHog] Initializing with:", {
        host: process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com',
        hasApiKey: !!process.env.EXPO_PUBLIC_POSTHOG_API_KEY,
        dev: __DEV__,
    });

    client = new PostHog(process.env.EXPO_PUBLIC_POSTHOG_API_KEY!, {
        host: process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com',
        // Flush immediately in dev so events show up in PostHog right away.
        // In production, batch for efficiency.
        flushAt: __DEV__ ? 1 : 20,
        flushInterval: __DEV__ ? 5000 : 30000,
    });

    return client;
}

export function getAnalytics(): PostHog | null {
    return client;
}

// ─── Identity ──────────────────────────────────────────────────────────────

/**
 * Call this once when the user logs in successfully.
 * Links all future events to their userId in PostHog.
 */
export function identifyUser(userId: string, properties?: PostHogEventProperties) {
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
    client?.capture(event, properties);
}

// ─── Screen Tracking ───────────────────────────────────────────────────────

/**
 * Track a screen view. Call this in your navigation state change handler.
 */
export function trackScreen(screenName: string, properties?: PostHogEventProperties) {
    client?.screen(screenName, properties);
}
