/**
 * Canonical event names for PostHog analytics.
 * Grouped by product area.
 */
export const ANALYTICS_EVENTS = {

    // ── Auth ──────────────────────────────────────────────────────────
    USER_SIGNED_UP: 'user_signed_up',
    USER_LOGGED_IN: 'user_logged_in',
    USER_LOGGED_OUT: 'user_logged_out',

    // ── Onboarding ────────────────────────────────────────────────────
    ONBOARDING_STARTED: 'onboarding_started',
    ONBOARDING_STEP_VIEWED: 'onboarding_step_viewed',    // props: { step }
    ONBOARDING_COMPLETED: 'onboarding_completed',
    ONBOARDING_SKIPPED: 'onboarding_skipped',        // props: { atStep }

    // ── Clinical Estimation Flow ───────────────────────────────────────
    // This is your core conversion funnel. Track every step.
    ASSESSMENT_STARTED: 'assessment_started',           // props: { totalQuestions }
    ASSESSMENT_STEP_VIEWED: 'assessment_step_viewed',    // props: { step, totalSteps }
    ASSESSMENT_COMPLETED: 'assessment_completed',       // props: { totalAnswered }
    ASSESSMENT_ABANDONED: 'assessment_abandoned',       // props: { atStep, totalSteps }

    // ── Practice Sessions ─────────────────────────────────────────────
    PRACTICE_SESSION_STARTED: 'practice_session_started',  // props: { packId, moduleId, moduleTitle, totalBlocks }
    PRACTICE_SESSION_ENDED: 'practice_session_ended',    // props: { packId, moduleId, moduleTitle, completedBlocks, totalBlocks }
    ACTIVITY_STARTED: 'activity_started',             // props: { activityId, contentType, title, isPackContext }
    ACTIVITY_COMPLETED: 'activity_completed',         // props: { activityId, contentType, title, isPackContext, vitals? }
    ACTIVITY_ABANDONED: 'activity_abandoned',         // props: { activityId, contentType, progressSeconds }

    // ── Paywall & Payments ────────────────────────────────────────────
    PAYWALL_VIEWED: 'paywall_viewed',             // props: none
    PAYMENT_STARTED: 'payment_started',            // props: { planId, amountInr }
    PAYMENT_COMPLETED: 'payment_completed',          // props: { planId, amountInr }
    PAYMENT_FAILED: 'payment_failed',             // props: { planId, amountInr, reason }

    // ── Stamina System ────────────────────────────────────────────────
    STAMINA_LOW_ALERT_SHOWN: 'stamina_low_alert_shown',   // props: { staminaPct }
    STAMINA_DEPLETED: 'stamina_depleted',

    // ── Community ─────────────────────────────────────────────────────
    COMMUNITY_POST_VIEWED: 'community_post_viewed',
    COMMUNITY_POST_CREATED: 'community_post_created',

    // ── Settings & Profile ────────────────────────────────────────────
    NOTIFICATION_REMINDER_SET: 'notification_reminder_set', // props: { category, time }
    PROFILE_PICTURE_UPDATED: 'profile_picture_updated',

    // ── Library ───────────────────────────────────────────────────────
    LIBRARY_TECHNIQUE_VIEWED: 'library_technique_viewed',   // props: { techniqueId, techniqueName, level }
    LIBRARY_TECHNIQUE_STARTED: 'library_technique_started',  // props: { techniqueId, techniqueName, mode: TUTORIAL | EXERCISE }

    // ── Fluency-aid over-reliance guardrails (DAF/Chorus) ──────────────
    TOOL_CONSENT_SHOWN: 'tool_consent_shown',           // props: { tool }
    TOOL_CONSENT_ACK: 'tool_consent_ack',               // props: { tool }
    TOOL_NUDGE_SHOWN: 'tool_nudge_shown',               // props: { tool, variant }
    TOOL_NUDGE_ACTION: 'tool_nudge_action',             // props: { tool, variant, action: 'try_without' | 'dismiss' }
    TOOL_FREE_COMPLETION_AFTER_NUDGE: 'tool_free_completion_after_nudge', // props: { tool, contentType }

} as const;

export type AnalyticsEvent = typeof ANALYTICS_EVENTS[keyof typeof ANALYTICS_EVENTS];
