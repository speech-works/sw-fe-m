import { formatRemaining } from "../NextDayCountdown";

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

describe("formatRemaining — the wait, said the way a person would say it", () => {
  it("reads in hours and minutes for a long wait, because seconds there are only anxiety", () => {
    expect(formatRemaining(9 * HOUR + 12 * MINUTE)).toBe("9h 12m");
    expect(formatRemaining(23 * HOUR + 59 * MINUTE + 59 * SECOND)).toBe("23h 59m");
    expect(formatRemaining(HOUR)).toBe("1h 0m");
  });

  it("switches to mm:ss under an hour, where the user might actually wait it out", () => {
    expect(formatRemaining(HOUR - SECOND)).toBe("59:59");
    expect(formatRemaining(41 * MINUTE + 20 * SECOND)).toBe("41:20");
    // Zero-padded seconds: without it "5:7" reads as five hours seven.
    expect(formatRemaining(5 * MINUTE + 7 * SECOND)).toBe("5:07");
  });

  it("stops giving a number in the last minute — there is none worth reading", () => {
    expect(formatRemaining(MINUTE)).toBe("Under a minute");
    expect(formatRemaining(SECOND)).toBe("Under a minute");
  });

  it("never counts up. A negative remainder means the caller should have handed over already", () => {
    expect(formatRemaining(-1)).toBe("Under a minute");
    expect(formatRemaining(-5 * HOUR)).toBe("Under a minute");
  });
});
