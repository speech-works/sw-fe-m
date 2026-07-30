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
    // The four assessment_* events were removed with the 20-item impact
    // assessment: no screen exists that could fire them. Historic events keep
    // their names in the warehouse; nothing new will arrive.

    // ── Practice Sessions ─────────────────────────────────────────────
    PRACTICE_SESSION_STARTED: 'practice_session_started',  // props: { packId, moduleId, moduleTitle, totalBlocks }
    PRACTICE_SESSION_ENDED: 'practice_session_ended',    // props: { packId, moduleId, moduleTitle, completedBlocks, totalBlocks }
    ACTIVITY_STARTED: 'activity_started',             // props: { activityId, contentType, title, isPackContext }
    ACTIVITY_COMPLETED: 'activity_completed',         // props: { activityId, contentType, title, isPackContext, vitals? }
    ACTIVITY_ABANDONED: 'activity_abandoned',         // props: { activityId, contentType, progressSeconds }

    // ── Recommendation Funnel ─────────────────────────────────────────
    // The pack recommendation → click → detail → purchase funnel. Server-side
    // attribution (signalLevel, reasonPath, every candidate score) lives in the
    // RecommendationLog; these are the CLIENT-observable steps that let us see
    // where the funnel leaks. Consent-gated, release-only (existing setup).
    // surface: 'home' (SmartRecommendationCard — owned_pack | all_complete)
    //        | 'home_for_you' (ForYouCarousel — carousel | browse_fallback)
    // The 'home' surface stopped emitting top_pick/browse_fallback when selling
    // moved to the carousel; those variants now arrive under 'home_for_you'.
    RECOMMENDATION_SHOWN: 'recommendation_shown',   // props: { surface, variant, state, catalogKey, packId, strategy, priceInr, hasMatchReason, isRefresher, signalLevel?, count?, remaining? }
    PACK_CLICKED: 'pack_clicked',                   // props: { source, catalogKey, packId, priceInr, hasMatchReason, position? }
    PROGRAM_DETAIL_VIEWED: 'program_detail_viewed', // props: { catalogKey, packId }

    // ── Paywall & Payments ────────────────────────────────────────────
    PAYWALL_VIEWED: 'paywall_viewed',             // props: none
    PAYMENT_STARTED: 'payment_started',            // props: { planId, catalogKey, amountInr }
    PAYMENT_COMPLETED: 'payment_completed',          // props: { planId, catalogKey, amountInr }
    PAYMENT_FAILED: 'payment_failed',             // props: { planId, catalogKey, amountInr, reason }

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

    // ── The once-in-a-lifetime first call ──
    // A funnel, not a counter: each user appears at most once at each step, so
    // the drop between any two steps IS the conversion rate for that step. The
    // steps are deliberately fine-grained around the headphone gate, which is
    // the one place we knowingly stand between somebody and the experience.
    // Pre-signup: the offer is made after Act 1's questions, so these three
    // fire with no user attached and join up on signup.
    FIRST_CALL_PRESIGNUP_SHOWN: 'first_call_presignup_shown',       // props: { action, callerName }
    FIRST_CALL_PRESIGNUP_ACCEPTED: 'first_call_presignup_accepted', // props: { action, callerName }
    FIRST_CALL_PRESIGNUP_DECLINED: 'first_call_presignup_declined', // props: { action }
    FIRST_CALL_OFFERED: 'first_call_offered',           // props: { action, callerName, quiet }
    FIRST_CALL_OPENED: 'first_call_opened',             // props: { action, quiet }
    FIRST_CALL_GATE_PASSED: 'first_call_gate_passed',   // props: { attempts }
    FIRST_CALL_GATE_DEFERRED: 'first_call_gate_deferred', // props: { reason: 'later' | 'no_headphones', attempts }
    FIRST_CALL_RINGING: 'first_call_ringing',           // props: { action }
    FIRST_CALL_ANSWERED: 'first_call_answered',         // props: { action }
    FIRST_CALL_DECLINED: 'first_call_declined',         // props: { action }
    FIRST_CALL_CONNECTED: 'first_call_connected',       // props: { action } — the offer is now spent
    FIRST_CALL_ENDED: 'first_call_ended',               // props: { action, completed, reason }
    FIRST_CALL_FEELING: 'first_call_feeling',           // props: { feeling: 'good'|'mixed'|'alot'|null }
    FIRST_CALL_BREATHING_TAKEN: 'first_call_breathing_taken',

    // ── Growth & progress ─────────────────────────────────────────────
    // ADDED BECAUSE THE ANSWER WAS "WE CANNOT TELL". Eighty-three events
    // existed and not one covered the progress report or the growth loops, so
    // "does anyone look at their progress" had no answer and the last revision
    // of this feature was argued entirely from taste. These land BEFORE the
    // growth surfaces so the before-and-after is measurable rather than
    // asserted.
    //
    // The four axes are Braver / Wider / Finisher / Regular. `Finisher` is the
    // display name for the STEADIER enum value; events carry the ENUM value so
    // the warehouse doesn't have to track a rename.
    PROGRESS_REPORT_OPENED: 'progress_report_opened',   // props: { tab: 'weekly' | 'lifetime', source }
    PROGRESS_REPORT_TAB_SWITCHED: 'progress_report_tab_switched', // props: { tab }
    // The Home summary that leads into the report. `stage` is what the person
    // actually saw, which is the whole question: an empty frame is a very
    // different experience from three real counts, and lumping them together
    // would hide it.
    GROWTH_SUMMARY_SHOWN: 'growth_summary_shown',       // props: { stage: 'empty' | 'counts', braver, wider, regular }
    GROWTH_SUMMARY_TAPPED: 'growth_summary_tapped',     // props: { stage }
    GROWTH_CARD_SHOWN: 'growth_card_shown',             // props: { stage, braver, wider, regular }
    // The daily loops. `shown` fires only when the strip actually renders —
    // it returns null whenever the server lists no closable loop, and those
    // silences are data, not gaps. `closed` rides along on the same event
    // rather than getting its own: the strip fetches once on mount and never
    // refetches, so there is no open→closed transition for the client to
    // witness. A loop is either already closed when the plan loads (earned
    // elsewhere in the app, not an interaction with this component) or it is
    // not. A separate `today_loop_closed` was declared here and deleted before
    // it shipped for exactly that reason — nothing could honestly emit it.
    TODAY_LOOPS_SHOWN: 'today_loops_shown',             // props: { axes: string[], closed: string[] }

    // ── Diagnostics ───────────────────────────────────────────────────
    // A finger went down and up in the same spot, quickly, and no instrumented
    // touchable fired. Instrumentation for the intermittent "buttons randomly
    // don't respond" bug — see app/util/diagnostics/deadTap.ts for what the
    // properties mean and why raw counts must not be compared across screens.
    DEAD_TAP_DETECTED: 'dead_tap_detected',
    // props: { screen, msSinceScreenEnter, x, y, xPct, yPct, durationMs,
    //          instrumented, nearTop, nearEdge }

} as const;
