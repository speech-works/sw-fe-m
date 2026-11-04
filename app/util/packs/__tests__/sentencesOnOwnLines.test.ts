import { sentencesOnOwnLines } from "../sentencesOnOwnLines";

describe("sentencesOnOwnLines", () => {
  it("splits sentences and changes no word", () => {
    const text = 'Say it. Ask "Why?" Then stop! Is that fine? Yes.';
    const out = sentencesOnOwnLines(text);
    expect(out).toBe('Say it.\n\nAsk "Why?"\n\nThen stop!\n\nIs that fine?\n\nYes.');
    expect(out.replace(/\n\n/g, " ")).toBe(text);
  });

  it("keeps a quotation of two sentences in one paragraph", () => {
    const text =
      "Then write what the swap changed. For example: \"I asked for tea, because 'coffee' felt hard. I wanted coffee.\" If you cannot find a swap, write that.";
    expect(sentencesOnOwnLines(text)).toBe(
      "Then write what the swap changed.\n\nFor example: \"I asked for tea, because 'coffee' felt hard. I wanted coffee.\"\n\nIf you cannot find a swap, write that.",
    );
  });

  it("does the same with curly quotes", () => {
    expect(sentencesOnOwnLines("Say “One. Two.” Then stop.")).toBe(
      "Say “One. Two.”\n\nThen stop.",
    );
  });

  it("leaves text with its own line breaks alone", () => {
    expect(sentencesOnOwnLines("One. Two.\n- Three")).toBe("One. Two.\n- Three");
  });
});
