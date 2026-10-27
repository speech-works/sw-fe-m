import { composeGoal } from "../compose";

describe("composeGoal", () => {
  it("wraps a noun in the verb", () => {
    expect(composeGoal("Call {}", "the landlord")).toBe("Call the landlord");
    expect(composeGoal("Say {}", "your name")).toBe("Say your name");
  });

  it("raises the first letter only when the answer comes first", () => {
    expect(composeGoal("{} again", "call someone")).toBe("Call someone again");
    expect(composeGoal("{}", "they will finish my word")).toBe("they will finish my word");
  });

  it("keeps the person's own verb when the answer is already an action", () => {
    expect(composeGoal("Say {}", "ask her out")).toBe("Ask her out");
    expect(composeGoal("Say {}", "say my name")).toBe("Say my name");
    expect(composeGoal("Say {}", "hi to strangers")).toBe("Say hi to strangers");
  });
});
