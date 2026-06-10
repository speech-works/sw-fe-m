/**
 * Canonical event names for PostHog analytics.
 * Grouped by product area.
 */
export const ANALYTICS_EVENTS = {

    // ── Auth ──────────────────────────────────────────────────────────
    USER_SIGNED_UP: 'user_signed_up',
    USER_LOGGED_IN: 'user_logged_in',
    USER_LOGGED_OUT: 'user_logged_out',
    ACCOUNT_DELETED: 'account_deleted',

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

    // ── Practice Buddy (v1: invite-by-code) ───────────────────────────
    BUDDY_INVITE_VIEWED: 'buddy_invite_viewed',         // props: { source: 'done_practice' | 'settings' }
    BUDDY_INVITE_SHARED: 'buddy_invite_shared',         // props: { source }
    BUDDY_CODE_ENTERED: 'buddy_code_entered',           // props: { source: 'onboarding' }
    BUDDY_LINKED: 'buddy_linked',                       // props: { role: 'inviter' | 'invitee' }
    BUDDY_STARTED: 'buddy_started',                     // invitee completed first practice (may also be server-side)
    BUDDY_REPORT_CONSENT_SET: 'buddy_report_consent_set', // props: { shared: boolean }
    BUDDY_REPORT_VIEWED: 'buddy_report_viewed',
    BUDDY_CHEER_SENT: 'buddy_cheer_sent',               // props: { type }
    BUDDY_CHEER_RECEIVED: 'buddy_cheer_received',       // props: { type }
    BUDDY_LEFT: 'buddy_left',                           // props: { by: 'me' | 'them' }

    // ── Posts / Feed (session card-posts; audience carried by `visibility`) ──
    POST_COMPOSER_OPENED: 'post_composer_opened',       // props: { source: 'done_practice', activityKind, visibility }
    POST_TEMPLATE_SELECTED: 'post_template_selected',   // props: { templateId, activityKind }
    POST_CREATED: 'post_created',                       // props: { templateId, activityKind, visibility, hasCaption, includedFields }
    POST_CANCELLED: 'post_cancelled',                   // props: { activityKind }
    POST_FEED_VIEWED: 'post_feed_viewed',               // props: { scope, count }
    POST_REACTION_SENT: 'post_reaction_sent',           // props: { type }
    POST_REACTION_REMOVED: 'post_reaction_removed',     // props: { type }
    POST_DELETED: 'post_deleted',

    // ── Share a moment (canned struggle/win check-ins, buddy-to-buddy) ──
    MOMENT_COMPOSER_OPENED: 'moment_composer_opened',         // props: { source: 'community' }
    MOMENT_SELECTED: 'moment_selected',                       // props: { momentId, valence }
    MOMENT_SHARED: 'moment_shared',                           // props: { momentId, valence, sensitive }
    MOMENT_CANCELLED: 'moment_cancelled',                     // props: { hadSelection }
    MOMENT_CRISIS_PROMPT_SHOWN: 'moment_crisis_prompt_shown', // props: { momentId }
    MOMENT_CRISIS_RESOURCE_TAPPED: 'moment_crisis_resource_tapped', // props: { resource: '988' | 'text_line' | 'resources' }

    // ── Buddy crisis support (responding to a sensitive "Share a moment") ──
    BUDDY_SUPPORT_OPENED: 'buddy_support_opened',             // props: { postId }
    BUDDY_SUPPORT_NOTE_SENT: 'buddy_support_note_sent',       // props: { noteId }
    BUDDY_SUPPORT_LIFELINE_SENT: 'buddy_support_lifeline_sent',
    BUDDY_SUPPORT_GUIDE_VIEWED: 'buddy_support_guide_viewed',
    BUDDY_SUPPORT_SELF_RESOURCE_TAPPED: 'buddy_support_self_resource_tapped', // props: { resource: '988' | 'resources' }

} as const;

export type AnalyticsEvent = typeof ANALYTICS_EVENTS[keyof typeof ANALYTICS_EVENTS];
