import { practicesLeftFor } from "../stamina";
import type { User } from "../../../api/users";

const user = (over: Partial<User> = {}) => over as User;

/**
 * The number that replaced the percentage on Home's energy sheet. It has to be
 * right, because it is a promise: the stamina gate refuses anything it cannot
 * pay for, so a count that is one too high is the app offering something and
 * then saying no.
 */
describe("practicesLeftFor", () => {
  it("uses the cost the server sent", () => {
    expect(practicesLeftFor(user({ practiceStaminaCost: 7 }), 35)).toBe(5);
    expect(practicesLeftFor(user({ practiceStaminaCost: 7 }), 80)).toBe(11);
  });

  it("falls back before /users/me has answered", () => {
    // Same rule the cap and regen-rate fallbacks already follow.
    expect(practicesLeftFor(null, 35)).toBe(5);
    expect(practicesLeftFor(user({}), 21)).toBe(3);
  });

  it("floors, because half a practice is not a practice", () => {
    // 34 is four practices and six points spare. Rounding to five would offer
    // a fifth that the stamina gate then refuses.
    expect(practicesLeftFor(user({ practiceStaminaCost: 7 }), 34)).toBe(4);
    expect(practicesLeftFor(user({ practiceStaminaCost: 7 }), 6)).toBe(0);
  });

  it("never goes below zero", () => {
    expect(practicesLeftFor(user({ practiceStaminaCost: 7 }), 0)).toBe(0);
    expect(practicesLeftFor(user({ practiceStaminaCost: 7 }), -5)).toBe(0);
  });

  it("treats a zero cost as unset, not as free practice", () => {
    // `||` on purpose, matching `staminaCapFor` right above it: a 0 from the
    // server is a missing value, not a real price. If practices were genuinely
    // free the count would be meaningless anyway, so falling back to the known
    // cost is the safer read.
    expect(practicesLeftFor(user({ practiceStaminaCost: 0 }), 35)).toBe(5);
  });

  it("shows a free and a paid account different numbers at the same 100%", () => {
    // The whole reason the percentage had to go: identical bars, different
    // amounts of practice behind them.
    const free = practicesLeftFor(user({ practiceStaminaCost: 7 }), 35);
    const member = practicesLeftFor(user({ practiceStaminaCost: 7 }), 80);
    expect(free).not.toBe(member);
  });
});
