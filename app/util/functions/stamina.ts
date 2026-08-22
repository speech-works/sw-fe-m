import { User } from "../../api/users";
import { isMember } from "./membership";

// Fallbacks for the window before GET /users/me has answered with the
// server-computed cap/rate — notably right after signup, where the
// /auth/callback payload carries currentStamina but NOT maxStaminaCap or
// staminaRegenRateMs (those are computed in getMe). They mirror the backend's
// LevelStages config and must stay TIER-AWARE: assuming the paid pool for
// everyone rendered a new free user's full 35/35 bar as 44%.
const PAID_RECHARGE_MS = 18 * 60 * 1000; // level-1 member pool
const FREE_RECHARGE_MS = 41 * 60 * 1000; // FREE_STAMINA_CONFIG
const PAID_MAX_STAMINA = 80;
const FREE_MAX_STAMINA = 35;

/**
 * What one practice costs, when the server has not said.
 *
 * Same fallback rule as the two above: `GET /users/me` sends the real value
 * (`practiceStaminaCost`), and this only covers the window before it answers.
 * It mirrors TASK_CONFIG[PRACTICE].staminaCost in the backend and must be
 * changed with it.
 */
const PRACTICE_STAMINA_COST = 7;

/** The stamina cap to display: server value, else the fallback for their tier. */
export function staminaCapFor(user: User | null | undefined): number {
  return (
    user?.maxStaminaCap || (isMember(user) ? PAID_MAX_STAMINA : FREE_MAX_STAMINA)
  );
}

/**
 * HOW MANY PRACTICES THEY CAN STILL START.
 *
 * ── WHY THIS EXISTS ────────────────────────────────────────────────────────
 * Energy was shown as a percentage, which answers a question nobody has. What
 * somebody wants to know is how much they can still do, and 100% does not say
 * it: the cap is 35 for a free account and 80 for a member, so the same "100%"
 * is five practices for one person and eleven for another.
 *
 * ── IT FLOORS, AND THAT IS THE POINT ───────────────────────────────────────
 * Half a practice is not a practice. Rounding up would promise something the
 * stamina gate then refuses, which is worse than a smaller number.
 *
 * PRACTICE is the only task type that costs stamina today, so one number
 * describes everything. If a second type ever charges, this becomes a lie and
 * the wording has to change with it.
 */
export function practicesLeftFor(
  user: User | null | undefined,
  stamina: number,
): number {
  const cost = user?.practiceStaminaCost || PRACTICE_STAMINA_COST;
  if (cost <= 0) return 0;
  return Math.max(0, Math.floor(stamina / cost));
}

export interface StaminaRechargeEstimate {
  /** Server value plus points regenerated since `lastStaminaUpdate`, capped at max. */
  estimatedStamina: number;
  /** Milliseconds until the tank is full (0 when already full). */
  msUntilFull: number;
  isFull: boolean;
}

/**
 * Pure, client-side ESTIMATE of stamina regen — mirrors the backend's
 * "1 point every `staminaRegenRateMs`" model. Never writes back; used only for
 * display (the Home energy meter and the out-of-energy modal). Callers pass
 * `nowMs` so the live-ticking meter (Home's useStaminaEstimate) and one-shot
 * callers (the modal) share the exact same math.
 */
export function estimateStaminaRecharge(
  user: User | null | undefined,
  nowMs: number,
): StaminaRechargeEstimate {
  const max = staminaCapFor(user);
  const current = user?.currentStamina ?? 0;

  if (!user?.lastStaminaUpdate) {
    return { estimatedStamina: current, msUntilFull: 0, isFull: current >= max };
  }

  const rechargeMs =
    user.staminaRegenRateMs || (isMember(user) ? PAID_RECHARGE_MS : FREE_RECHARGE_MS);
  const msPassed = nowMs - new Date(user.lastStaminaUpdate).getTime();
  const pointsRecharged = Math.max(0, Math.floor(msPassed / rechargeMs));
  const estimatedStamina = Math.min(max, current + pointsRecharged);

  if (estimatedStamina >= max) {
    return { estimatedStamina: max, msUntilFull: 0, isFull: true };
  }

  // Time to the very next point, then the remaining whole points.
  const msUntilNextPoint = rechargeMs - (msPassed % rechargeMs);
  const pointsToFull = max - estimatedStamina;
  const msUntilFull = (pointsToFull - 1) * rechargeMs + msUntilNextPoint;

  return { estimatedStamina, msUntilFull, isFull: false };
}

/**
 * Coarse "1h 20m" / "45m" / "under a minute" label for time-until-full — used by
 * the out-of-energy modal, which shows a single static estimate (so, unlike the
 * live meter, seconds are omitted).
 */
export function formatRechargeDuration(msUntilFull: number): string {
  const totalMinutes = Math.max(0, Math.round(msUntilFull / 60000));
  if (totalMinutes < 1) return "under a minute";
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}

/** Drops a trailing ".0" so 1.0 renders as "1", not "1.0". */
const trim1 = (n: number): string => n.toFixed(1).replace(/\.0$/, "");

/**
 * ONE UNIT, ONE DECIMAL — "1.3h", "43m", "under a minute".
 *
 * The Home meter used to build its own string at seconds precision, which gave
 * "~42m 46s to full": four numbers and two units inside a 12px caption sharing a
 * row with the energy percentage. It was the longest string on the card and the
 * only one that changed every second.
 *
 * THE SECONDS WERE NOT INFORMATION. Nobody schedules around a stamina refill to
 * the second, and a digit that ticks constantly in peripheral vision is a cost
 * with no matching benefit. One decimal keeps the estimate honest — "1.3h" is a
 * real distinction from "1h" — while changing at most every six seconds.
 *
 * Separate from `formatRechargeDuration` on purpose: that one is for the
 * out-of-energy modal, which is a single static reading with room to be
 * conversational, and where "1h 20m" is friendlier than "1.3h".
 */
export function formatRechargeShort(msUntilFull: number): string {
  const ms = Math.max(0, msUntilFull);
  const minutes = ms / 60000;
  // Below the resolution we report, say so in words rather than showing "0.1m",
  // which reads as a broken number rather than a small one.
  if (minutes < 0.5) return "under a minute";
  if (minutes >= 60) return `${trim1(minutes / 60)}h`;
  return `${trim1(minutes)}m`;
}
