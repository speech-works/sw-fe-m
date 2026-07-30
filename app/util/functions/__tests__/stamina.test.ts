import { User } from "../../../api/users";
import { estimateStaminaRecharge, staminaCapFor } from "../stamina";

/**
 * The cap fallback is only used in one window: after /auth/callback returns the
 * bare user row and before GET /users/me answers with the server-computed
 * cap. That window is exactly a new user's first Home render — so getting it
 * wrong is most visible to the people least able to interpret it. Assuming the
 * paid pool (80) for everyone drew a brand-new free user's FULL 35/35 bar as
 * 44%, which reads as "you already spent half your energy" on a fresh account.
 */

const user = (over: Partial<User>): User => ({ ...over }) as User;

describe("staminaCapFor", () => {
  it("prefers the server-computed cap whenever it is present", () => {
    expect(staminaCapFor(user({ maxStaminaCap: 110, isPaid: true }))).toBe(110);
    expect(staminaCapFor(user({ maxStaminaCap: 35, isPaid: false }))).toBe(35);
  });

  it("falls back to the FREE bar for a free user, not the paid pool", () => {
    expect(staminaCapFor(user({ isPaid: false }))).toBe(35);
  });

  it("falls back to the paid pool for a member", () => {
    expect(staminaCapFor(user({ isPaid: true }))).toBe(80);
  });

  it("treats an unknown tier as free — never overstate the bar we cannot verify", () => {
    expect(staminaCapFor(user({}))).toBe(35);
    expect(staminaCapFor(null)).toBe(35);
    expect(staminaCapFor(undefined)).toBe(35);
  });

  it("shows a freshly-seeded free user as FULL, not 44%", () => {
    // Exactly the post-signup payload: currentStamina present, cap absent.
    const fresh = user({ currentStamina: 35, isPaid: false });
    const pct = Math.round((fresh.currentStamina! / staminaCapFor(fresh)) * 100);
    expect(pct).toBe(100);
  });
});

describe("estimateStaminaRecharge regen fallback", () => {
  it("uses the free cadence (41 min/pt) when the server rate is absent", () => {
    const { estimatedStamina } = estimateStaminaRecharge(
      user({
        currentStamina: 0,
        isPaid: false,
        lastStaminaUpdate: new Date(Date.now() - 82 * 60 * 1000),
      }),
      Date.now(),
    );
    expect(estimatedStamina).toBe(2);
  });

  it("uses the paid cadence (18 min/pt) for a member", () => {
    const { estimatedStamina } = estimateStaminaRecharge(
      user({
        currentStamina: 0,
        isPaid: true,
        lastStaminaUpdate: new Date(Date.now() - 36 * 60 * 1000),
      }),
      Date.now(),
    );
    expect(estimatedStamina).toBe(2);
  });

  it("caps a free user's estimate at the free bar", () => {
    const { estimatedStamina, isFull } = estimateStaminaRecharge(
      user({
        currentStamina: 30,
        isPaid: false,
        lastStaminaUpdate: new Date(Date.now() - 100 * 60 * 60 * 1000),
      }),
      Date.now(),
    );
    expect(estimatedStamina).toBe(35);
    expect(isFull).toBe(true);
  });
});
