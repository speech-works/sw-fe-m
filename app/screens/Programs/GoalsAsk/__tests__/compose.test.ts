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

  it("lowers a small first word after the verb, and keeps names", () => {
    expect(composeGoal("Tell {}", "My barber")).toBe("Tell my barber");
    expect(composeGoal("Tell {}", "The new manager")).toBe("Tell the new manager");
    expect(composeGoal("Tell {}", "Priya")).toBe("Tell Priya");
    expect(composeGoal("{} again", "My call")).toBe("My call again");
  });

  it("lowers an -ing word that starts a phrase, and keeps a name's capital", () => {
    expect(composeGoal("Get through {}", "Saying my name on calls")).toBe("Get through saying my name on calls");
    expect(composeGoal("Get through {}", "Asking a question in class")).toBe("Get through asking a question in class");
    expect(composeGoal("Tell {}", "Sterling")).toBe("Tell Sterling");
    expect(composeGoal("Tell {}", "Sterling Smith")).toBe("Tell Sterling Smith");
  });
});
