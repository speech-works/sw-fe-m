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
    // NOT AN IMPRESSION. This fires when the offers FETCH SETTLES, which is a
    // fact about the network, not about the person: it counts a shelf sitting
    // entirely behind the tab dock exactly the same as one filling the screen.
    // It stays because dashboards are built on it — but every ratio computed
    // against it is a ratio against a denominator nobody saw. Use
    // FOR_YOU_SHELF_VIEWED for reach and this one only for "did we have
    // something to offer".
    RECOMMENDATION_SHOWN: 'recommendation_shown',   // props: { surface, variant, state, catalogKey, packId, strategy, priceInr, hasMatchReason, isRefresher, signalLevel?, count?, remaining? }
    PACK_CLICKED: 'pack_clicked',                   // props: { source, catalogKey, packId, priceInr, hasMatchReason, position? }
    PROGRAM_DETAIL_VIEWED: 'program_detail_viewed', // props: { catalogKey, packId }

    // ── For-you shelf: what was actually SEEN ──────────────────────────
    // Measured against the viewport minus the band the floating dock covers, so
    // "shown" means a human could have read it. Two properties carry the whole
    // fold question and are the reason this exists:
    //   `trigger: 'at_rest'` — it was visible on arrival, without scrolling.
    //                          The share of these IS the above-the-fold rate.
    //   `ctaVisible`        — the price + "See inside" band cleared the dock.
    //                          A shelf that is 60% visible with its price hidden
    //                          is a different product from one that isn't.
    FOR_YOU_SHELF_VIEWED: 'for_you_shelf_viewed',
    // props: { surface, variant, trigger: 'at_rest' | 'scroll', msToVisible,
    //          cardVisiblePct, ctaVisible, signalLevel, count, remaining,
    //          catalogKey, packId, hasMatchReason }

    // One per slide the person actually settled on, deduped per screen focus and
    // held back until they stop for SLIDE_DWELL_MS — a flick from 1 to 3 passes
    // over slide 2 without ever showing it. Slide 0 is seeded explicitly when
    // the shelf qualifies: the carousel reports index CHANGES, so without the
    // seed the top match — the one card with a badge — reports zero forever.
    FOR_YOU_SLIDE_VIEWED: 'for_you_slide_viewed',
    // props: { surface, index, catalogKey, packId, priceInr, highlight,
    //          dwellMs, trigger: 'initial' | 'swipe' }

    // The shop. `_opened` names who sent them (Home's link and Home's browse
    // fallback were one untracked function until now); `_viewed` fires only from
    // the branch that renders the list, never from loading/failed/empty.
    PROGRAMS_LIST_OPENED: 'programs_list_opened',   // props: { source: 'home_for_you_more' | 'home_browse_fallback' | 'explore_entry' | 'pack_not_owned' }
    PROGRAMS_LIST_VIEWED: 'programs_list_viewed',   // props: { count, hasSignal, signalLevel, heroCatalogKey, bonusEligible }

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

    // ── Moderation (App Store Guideline 1.2) ──
    // Volume here is a safety signal, not a growth one: a rising report rate on
    // one reason is the thing worth waking up for.
    CONTENT_REPORT_SENT: 'content_report_sent',               // props: { target: 'signal' | 'user', reason }
    // `source` distinguishes the two entry points; without it the Community-tab
    // block and the from-a-post block are indistinguishable in the funnel.
    // `reason` is absent for a block from a post — those are deliberately
    // reasonless, which is itself worth being able to count.
    BUDDY_BLOCKED: 'buddy_blocked',                           // props: { reason?, source: 'community' | 'post' }
    BUDDY_UNBLOCKED: 'buddy_unblocked',                       // props: { source: 'settings' }

    // ── Buddy requests ──
    // The accept/decline ratio is the health metric for pairing-by-request:
    // a low one means people are being asked by the wrong people.
    BUDDY_REQUEST_SENT: 'buddy_request_sent',
    BUDDY_REQUEST_ACCEPTED: 'buddy_request_accepted',
    BUDDY_REQUEST_DECLINED: 'buddy_request_declined',

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
