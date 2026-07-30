import { User } from "../../api/users";

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

/** The stamina cap to display: server value, else the fallback for their tier. */
export function staminaCapFor(user: User | null | undefined): number {
  return (
    user?.maxStaminaCap || (user?.isPaid ? PAID_MAX_STAMINA : FREE_MAX_STAMINA)
  );
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
    user.staminaRegenRateMs || (user.isPaid ? PAID_RECHARGE_MS : FREE_RECHARGE_MS);
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
