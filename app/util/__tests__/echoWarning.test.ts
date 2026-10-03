import {
  ECHO_WARNING_TEXT,
  ECHO_WARNING_VISIBLE_MS,
  isEchoWarningVisible,
  shouldShowEchoWarning,
} from "../echoWarning";

describe("echo warning", () => {
  it("uses the founder's wording", () => {
    expect(ECHO_WARNING_TEXT).toBe("Turn your volume down a little.");
  });

  it("shows once per call", () => {
    expect(shouldShowEchoWarning(false)).toBe(true);
    expect(shouldShowEchoWarning(true)).toBe(false);
  });

  it("hides after 8 seconds", () => {
    expect(ECHO_WARNING_VISIBLE_MS).toBe(8000);
    expect(isEchoWarningVisible(0)).toBe(true);
    expect(isEchoWarningVisible(7999)).toBe(true);
    expect(isEchoWarningVisible(8000)).toBe(false);
  });
});
