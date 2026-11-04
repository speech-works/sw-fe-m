import { readableParagraphs } from "../readableParagraphs";

const long =
  'Write two short lists in the box at the end of this step. First, what the people around you believe about how you speak. Second, what you do to keep that picture true, so that they keep believing it. For example: "My colleagues think I rarely stutter. I change words before calls." Think about one ordinary week, one relationship, or one place you go often. Before you write, guess how many things will be on your second list.';

describe("readableParagraphs", () => {
  it("leaves a short paragraph alone", () => {
    expect(readableParagraphs("One short line.")).toEqual(["One short line."]);
  });

  it("changes no words", () => {
    expect(readableParagraphs(long).join(" ")).toBe(long);
  });

  it("breaks a long paragraph", () => {
    expect(readableParagraphs(long).length).toBeGreaterThan(1);
  });

  it("keeps an example with the sentence before it, and a quote whole", () => {
    expect(readableParagraphs(long)[0]).toContain("I change words before calls.\"");
  });

  it("keeps the second half of an example together", () => {
    const text =
      "Think about one ordinary week, one relationship, or one place you go often. Before you write, guess how many things will be on your second list. For example, your colleagues may think you rarely stutter. To keep that picture true, you may plan what to say before calls.";
    expect(readableParagraphs(text)).toEqual([text]);
  });

  it("keeps a very short sentence with the one before it", () => {
    const text =
      'Four lines, in your own words. Your notes from each day are in the step before, under "Your week". If you typed your two lists on day 1, the first box already shows them. If you wrote your answer on day 4, the third box already shows it. It is private. Only you can see it.';
    const parts = readableParagraphs(text);
    expect(parts[parts.length - 1]).toContain("It is private. Only you can see it.");
  });

  it("leaves text with its own line breaks alone", () => {
    const text = `${long}\nA second line.`;
    expect(readableParagraphs(text)).toEqual([text]);
  });
});
