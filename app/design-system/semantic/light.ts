import { SemanticColors } from "./roles";
import { darkColors } from "./dark";

/**
 * STUB — not wired yet. Light mode is a future phase (Phase F). For now this
 * mirrors dark so the type/contract is satisfied and the provider can compile;
 * real light values + per-scheme shadowColor are derived in Phase F. Do not ship
 * light mode off this stub.
 */
export const lightColors: SemanticColors = {
  ...darkColors,
  // TODO(Phase F): real light scheme (warm off-white canvas, dark text, etc.).
};
