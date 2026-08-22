import {
  looksThin,
  pickNext,
  placeholderFor,
  slotForCue,
} from "../draft";

describe("placeholderFor", () => {
  const three = "the landlord, the dentist, Amma";

  it("gives each slot its own example", () => {
    expect(placeholderFor(three, 0)).toBe("the landlord");
    expect(placeholderFor(three, 2)).toBe("Amma");
  });

  it("repeats the last one when a program asks for more slots than examples", () => {
    // Word Swap asks for 5 answers and its placeholder names 3.
    expect(placeholderFor(three, 4)).toBe("Amma");
  });

  it("survives a placeholder with no commas", () => {
    expect(placeholderFor("Monday standup", 0)).toBe("Monday standup");
    expect(placeholderFor("Monday standup", 2)).toBe("Monday standup");
  });

  it("survives an empty placeholder rather than showing 'undefined'", () => {
    expect(placeholderFor("", 0)).toBe("");
  });
});

describe("looksThin", () => {
  it("says nothing while a slot is still empty", () => {
    // Correcting somebody mid-typing is the fastest way to lose them.
    expect(looksThin(["bank", "", ""], "call")).toBe(false);
  });

  it("nudges when an answer is one word", () => {
    expect(looksThin(["bank", "the dentist on Monday", "my manager"], "call")).toBe(
      true,
    );
  });

  it("never nudges a name, because a name is a whole answer", () => {
    expect(looksThin(["Amma", "Priya", "Sagar"], "person")).toBe(false);
  });

  it("says nothing when every answer already carries detail", () => {
    expect(
      looksThin(
        ["the landlord about the deposit", "my dentist", "call Amma back"],
        "call",
      ),
    ).toBe(false);
  });
});

describe("slotForCue", () => {
  it("fills the focused slot when it is empty", () => {
    expect(slotForCue(["", "", ""], 1)).toBe(1);
  });

  it("never overwrites something they typed", () => {
    expect(slotForCue(["a", "", ""], 0)).toBe(1);
  });

  it("does nothing when every slot is full", () => {
    expect(slotForCue(["a", "b", "c"], 0)).toBe(-1);
  });
});

describe("pickNext", () => {
  it("fills the last slot on its own, so three answers take two taps", () => {
    let order: number[] = [];
    order = pickNext(order, 2, 3);
    expect(order).toEqual([2]);
    order = pickNext(order, 0, 3);
    // The third is decided. Asking for a tap on the only option left is
    // asking somebody to confirm arithmetic.
    expect(order).toEqual([2, 0, 1]);
  });

  it("takes four taps for five answers", () => {
    let order: number[] = [];
    for (const i of [4, 1, 0, 3]) order = pickNext(order, i, 5);
    expect(order).toEqual([4, 1, 0, 3, 2]);
  });

  it("ignores a second tap on the same answer", () => {
    expect(pickNext([1], 1, 3)).toEqual([1]);
  });

  it("keeps the user's order exactly, never sorted", () => {
    let order: number[] = [];
    for (const i of [2, 1]) order = pickNext(order, i, 3);
    expect(order).toEqual([2, 1, 0]);
  });
});
