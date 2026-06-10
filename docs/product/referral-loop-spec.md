# Lean Referral Loop — Spec

> Status: **Draft for review** · Owner: product · Last updated: 2026-06-03
> Goal of this batch (per product): **Growth & virality**. Audience: **adults (self-directed PWS)**.

## 1. One-sentence summary

Replace the high-friction "buy a membership and gift one" idea with a **two-sided, comp-based referral loop**: *"Invite a practice partner — you both get free Premium time."* No purchase is required to participate, which is what makes it a real viral loop instead of a paid gift.

## 2. Why this shape (design decisions)

| Decision | Choice | Rationale |
|---|---|---|
| Loop type | Two-sided incentive (both giver + receiver rewarded) | Highest-converting consumer referral pattern (Dropbox/Calm). A one-sided "pay to gift" loop is high-friction and rarely compounds. |
| Reward currency | **Comp Premium days** (a complimentary, time-boxed subscription), not cash/discount | Reuses the existing `Subscription` model (`status`/`endDate`). No Razorpay transaction needed in the loop → genuinely lean. |
| Does Razorpay enter the loop? | **No**, for the reward itself. | Razorpay only fires later, if/when a referred user converts to a *real paid* plan. The lean loop touches the comp-grant + a new referral entity, not checkout. |
| Paid gifting ("buy one for a friend") | **Deferred** to a later track | It needs Razorpay (buy plan → assign to another account) and is a weaker loop. Keep it out of the lean MVP. |
| Pairing (shared progress/accountability) | **Deferred**, gated on this loop showing a K-factor | Build the cheap loop first; only invest in the social graph if invites actually happen. |

## 3. The loop

```
Referrer (existing user)
  └─ taps "Invite a partner" (after a win moment)
       └─ gets personal code  e.g.  MAYA-7K2   +  share link  speechworks://r/MAYA-7K2
            └─ shares via OS share sheet
                 │
Referee (new or existing free user)
  └─ enters code (onboarding field / Settings "Redeem code" / in-app deep link)
       └─ REFEREE reward granted immediately:  +30 comp Premium days
            └─ referee activates (onboarding done + first practice, or 2-day streak)
                 └─ REFERRAL marked "qualified"
                      └─ REFERRER reward granted:  +30 comp Premium days  (idempotent, capped)
```

Two reward triggers, deliberately asymmetric in timing:
- **Referee** is rewarded *on redemption* (instant gratification → removes friction to join).
- **Referrer** is rewarded *on qualification* (referee proved real → blocks fake-account farming).

## 4. Reward model & a measurement caveat that matters for the pitch

Reward amounts should be **backend-config-owned** (same pattern as the DAF/Chorus thresholds), not hardcoded in the app. Suggested starting values for the test phase:

- Referee: **30 comp days** on redemption.
- Referrer: **30 comp days** per *qualified* referral, capped at **6 qualified referrals (180 days)** during the test.
- Stacking: define how comp days interact with the existing **7-day free trial** (see Payments screen footer copy "Start 7-Day Free Trial") so a user can't double-dip. Recommend: comp days *extend* the access window from `max(now, currentAccessEnd)`.

> ⚠️ **Comp access must not be counted as "paid" in pitch metrics.** Today `User.isPaid` gates Premium. If comp/referral access also flips `isPaid=true`, then "paid users" silently includes comped users and the conversion/revenue numbers you'd show GFS x Antler are inflated. **Add a server-side `accessSource: 'paid' | 'trial' | 'referral_comp' | 'free'`** so access-gating can treat comp == premium while analytics can still separate *real revenue* from *comped access*. (This is exactly the honesty trap to avoid in the pitch.)

## 5. Anti-abuse / qualification

- **Qualified referral** = referee is a *new* verified account that reaches an activation milestone (onboarding complete + ≥1 practice session, or a 2-day streak). Only then does the referrer reward unlock.
- **Self-referral block**: reject when referee device/IP/email fingerprint matches referrer (server-side).
- **Idempotent grants**, capped per referrer (see §4).
- A referee can redeem **at most one** referral code, ever.

## 6. Data model (backend — FE needs the shapes)

```ts
// User (extend existing app/api/users/index.ts → User)
referralCode: string;          // short, human-readable, generated server-side e.g. "MAYA-7K2"
accessSource?: 'paid' | 'trial' | 'referral_comp' | 'free';  // NEW — see §4 caveat

// New entity
interface Referral {
  id: string;
  referrerUserId: string;
  refereeUserId: string | null;     // null until redeemed
  code: string;
  status: 'pending' | 'qualified' | 'rewarded' | 'rejected';
  createdAt: Date;
  qualifiedAt?: Date | null;
  rewardGrantedAt?: Date | null;
}

// Referral summary (for the invite screen)
interface ReferralSummary {
  code: string;
  shareUrl: string;          // speechworks://r/<code>  (+ https fallback later)
  invitedCount: number;      // redemptions started
  qualifiedCount: number;    // activated referees
  daysEarned: number;        // comp days credited to referrer
  daysRemaining?: number;    // optional: comp access left
}
```

Reward delivery = create a comp `Subscription` (`status: 'active'`, `endDate = start + grant`, plus a `source: 'referral'` marker) — reuses `app/api/subscription/index.ts`.

## 7. Frontend work

**New API module** — `app/api/referrals/index.ts` (mirror existing api modules / `axiosClient`):
- `getMyReferralSummary(): Promise<ReferralSummary>` → `GET /referrals/me`
- `validateReferralCode(code): Promise<{ valid: boolean; reason?: string }>` → `GET /referrals/validate?code=`
- `redeemReferralCode(code): Promise<{ grantedDays: number }>` → `POST /referrals/redeem`

**New screens / surfaces:**
1. **Invite screen** — shows code + share link, "you both get 30 days free", a Share button (RN `Share` API → OS share sheet), and a simple tracker ("1 of 6 friends joined → you've earned 30 days"). Reads `getMyReferralSummary()`.
2. **Redeem entry points:**
   - **Onboarding**: optional "Have an invite code?" field (best conversion — capture at first run).
   - **Settings**: a "Redeem a code" row for existing free users.
   - **In-app deep link**: handle `speechworks://r/<code>` to pre-fill the redeem sheet (works only for users who already have the app — see §9).

**Entry points to the invite screen (placement = growth lever):** surface "Invite a partner" right after a **win moment** — the activity-success / session-complete screen — when goodwill is highest, plus a persistent row in Settings and an optional card after the paywall is dismissed.

**Access gating:** wherever `user.isPaid` currently gates Premium, switch to "has active premium access" so comp users get in. Keep `accessSource` for analytics only.

## 8. Analytics & K-factor (the number for the pitch)

**New events** — add a `Referral / Invite` section to `app/util/analytics/analyticsEvents.ts`:

```ts
// ── Referral / Invite ─────────────────────────────────────────────
REFERRAL_INVITE_VIEWED:  'referral_invite_viewed',   // props: { source }
REFERRAL_INVITE_SHARED:  'referral_invite_shared',   // props: { source, channel? }
REFERRAL_CODE_COPIED:    'referral_code_copied',     // props: { source }
REFERRAL_CODE_ENTERED:   'referral_code_entered',    // props: { source: 'onboarding'|'settings'|'deeplink' }
REFERRAL_CODE_REDEEMED:  'referral_code_redeemed',   // props: { source, grantedDays }
REFERRAL_REDEEM_FAILED:  'referral_redeem_failed',   // props: { reason }
REFERRAL_QUALIFIED:      'referral_qualified',        // server-side or on-activation
REFERRAL_REWARD_GRANTED: 'referral_reward_granted',  // props: { role: 'referrer'|'referee', days }
```

**Attribution stitching (critical):** when a referred user signs up, fire `USER_SIGNED_UP` with `{ referredBy: <referrerUserId>, referralCode }` **and** add PostHog person properties on `identifyUser()`:
- `acquiredVia: 'referral'`
- `referredByCode: <code>`

Extend the existing `identifyUser()` call in `app/stores/user/index.ts` (which already sends `isPaid`, `freeTasksRemaining`, etc.) to include `accessSource` and these referral traits. This is what lets you build referrer→referee cohorts in PostHog.

**Computing K-factor:** `K = i × c`
- `i` = avg invitations sent per user ≈ distinct referees per referrer. Proxy: `REFERRAL_INVITE_SHARED` count, but the OS share sheet doesn't guarantee a send — so also track the truer denominator: distinct codes with ≥1 `REFERRAL_CODE_ENTERED`. Report `c` as a **range** (shares-based lower bound ↔ redemption-based upper bound).
- `c` = conversion per invite = `USER_SIGNED_UP{acquiredVia:referral}` ÷ invites.
- Also report **cycle time** (invite_shared → referee signup): shorter cycle = faster compounding, and it's a number investors understand.
- Separate **qualified K** (using `REFERRAL_QUALIFIED`) from raw K — qualified K is the honest growth number.

## 9. Deep-link reality (scope guard)

- `speechworks://` custom scheme **is** configured (`app.config.js`). In-app deep links (`speechworks://r/<code>`) work for users who *already have the app*.
- There is **no** deferred-deep-link / attribution SDK installed (no Branch / Firebase Dynamic Links / AppsFlyer). So **"tap link → App Store → install → code auto-applies" is NOT possible today.** A new install must type/paste the code manually.
- MVP therefore = copyable code + share link (works for installed users) + manual entry field in onboarding.
- **Biggest Phase-2 lever for conversion (`c`)** = adding deferred deep linking so the code survives the install. Evaluate Branch (free tier) vs a custom universal-link + clipboard-read approach. Verify universal-link/`associatedDomains` setup before committing.

## 10. Phasing

- **Phase 1 (lean MVP):** backend code generation + `accessSource` + comp-grant on redeem/qualify · `app/api/referrals` · invite screen · redeem (onboarding + settings) · analytics events + attribution stitching. No deep-link auto-apply, no paid gifting, no pairing.
- **Phase 2:** deferred deep linking, richer referrer dashboard, paid gifting (Razorpay buy-for-another), then pairing/accountability if K justifies it.

## 11. Open decisions (need product / clinical / backend input)

These are tracked as community questions in `docs/research/surveys/` so we validate, not assume:
1. Reward sizing — 30/30 days? cap at 6? (pricing/finance call)
2. Who do adult PWS actually want to invite — a fellow PWS, or a supportive non-PWS? (forks the *eventual* pairing build; survey question for PWS)
3. Activation definition for "qualified" — onboarding+1 session vs 2-day streak? (data/retention call)
4. `isPaid` vs `accessSource` semantics — confirm comp must not count as paid in revenue reporting. (backend + pitch-metrics call)
5. Stacking rule with the existing 7-day trial. (backend)
