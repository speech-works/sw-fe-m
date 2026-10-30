import { sentencesOnOwnLines } from "../sentencesOnOwnLines";

describe("sentencesOnOwnLines", () => {
  it("splits sentences and changes no word", () => {
    const text = 'Say it. Ask "Why?" Then stop! Is that fine? Yes.';
    const out = sentencesOnOwnLines(text);
    expect(out).toBe('Say it.\n\nAsk "Why?"\n\nThen stop!\n\nIs that fine?\n\nYes.');
    expect(out.replace(/\n\n/g, " ")).toBe(text);
  });

  it("leaves text with its own line breaks alone", () => {
    expect(sentencesOnOwnLines("One. Two.\n- Three")).toBe("One. Two.\n- Three");
  });
});
