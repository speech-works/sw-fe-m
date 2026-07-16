import { useIsFocused } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { User } from "../../../../api/users";
import { estimateStaminaRecharge } from "../../../../util/functions/stamina";

export interface StaminaEstimate {
  estimatedStamina: number;
  staminaPercentage: number;
  rechargeTimeLeft: string;
  currentMaxStamina: number;
}

/**
 * Live energy meter estimate — ported verbatim from the legacy ResourceStats so
 * the behavior is frozen: seconds-precision recharge countdown for paid users,
 * driven by `estimateStaminaRecharge` (the single source of truth shared with
 * the out-of-energy modal). The estimate only advances while the screen is
 * focused.
 */
export function useStaminaEstimate(user: User | null): StaminaEstimate {
  const isFocused = useIsFocused();
  const [rechargeTimeLeft, setRechargeTimeLeft] = useState<string>("");
  const [estimatedStamina, setEstimatedStamina] = useState<number>(
    user?.currentStamina ?? 0,
  );

  const currentMaxStamina = user?.maxStaminaCap || 80;
  const staminaPercentage: number =
    Math.min(100, Math.max(0, Math.round((estimatedStamina / currentMaxStamina) * 100))) || 0;

  useEffect(() => {
    if (user?.currentStamina !== undefined) {
      setEstimatedStamina(user.currentStamina);
    }
  }, [user?.currentStamina]);

  useEffect(() => {
    if (
      !isFocused ||
      !user ||
      !user.isPaid ||
      (user.currentStamina ?? 0) >= currentMaxStamina ||
      !user.lastStaminaUpdate
    ) {
      setRechargeTimeLeft((prev) => (prev !== "" ? "" : prev));
      if (user?.currentStamina !== undefined) {
        setEstimatedStamina((prev) =>
          prev !== user.currentStamina ? user.currentStamina! : prev,
        );
      }
      return;
    }

    const updateTimerAndEstimation = () => {
      const {
        estimatedStamina: newEstimation,
        msUntilFull,
        isFull,
      } = estimateStaminaRecharge(user, new Date().getTime());

      setEstimatedStamina((prev) => (prev !== newEstimation ? newEstimation : prev));

      if (isFull) {
        setRechargeTimeLeft((prev) => (prev !== "" ? "" : prev));
        return;
      }

      const totalSeconds = Math.floor(msUntilFull / 1000);
      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = totalSeconds % 60;

      const newTime = h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`;
      setRechargeTimeLeft((prev) => (prev !== newTime ? newTime : prev));
    };

    updateTimerAndEstimation();
    const interval = setInterval(updateTimerAndEstimation, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.currentStamina, user?.lastStaminaUpdate, user?.isPaid, isFocused]);

  return { estimatedStamina, staminaPercentage, rechargeTimeLeft, currentMaxStamina };
}
