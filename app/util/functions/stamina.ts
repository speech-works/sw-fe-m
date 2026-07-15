import { User } from "../../api/users";

/** Regen cadence fallback when the backend doesn't specify one: 1 point / 18 min. */
const DEFAULT_RECHARGE_MS = 18 * 60 * 1000;
/** Stamina-cap fallback, mirrors the Energy Tank meter default. */
const DEFAULT_MAX_STAMINA = 80;

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
 * display (the Energy Tank meter and the out-of-energy modal). Callers pass
 * `nowMs` so the live-ticking meter (ResourceStats) and one-shot callers (the
 * modal) share the exact same math.
 */
export function estimateStaminaRecharge(
  user: User | null | undefined,
  nowMs: number,
): StaminaRechargeEstimate {
  const max = user?.maxStaminaCap || DEFAULT_MAX_STAMINA;
  const current = user?.currentStamina ?? 0;

  if (!user?.lastStaminaUpdate) {
    return { estimatedStamina: current, msUntilFull: 0, isFull: current >= max };
  }

  const rechargeMs = user.staminaRegenRateMs || DEFAULT_RECHARGE_MS;
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
