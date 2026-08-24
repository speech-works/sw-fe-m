/**
 * Inline emphasis rules for pack lesson text.
 *
 * Only the tokenizer is tested — it is the part that decides what a paying
 * customer sees, and it is pure. Rendering the React Native tree is out of
 * scope per the note at the top of jest.config.js.
 *
 * The bug this covers: the splitter handled `**bold**` but had no italic arm,
 * so every single-asterisk run in the seed content ("let those parts *touch*")
 * rendered with visible stars.
 */
import { tokenizeInline } from "../SimpleMarkdown";

describe("tokenizeInline", () => {
  it("italicises a single-asterisk run", () => {
    expect(tokenizeInline("let those parts *touch* instead of *press*.")).toEqual([
      { type: "text", text: "let those parts " },
      { type: "italic", text: "touch" },
      { type: "text", text: " instead of " },
      { type: "italic", text: "press" },
      { type: "text", text: "." },
    ]);
  });

  it("reads a double asterisk as bold, never as two italics", () => {
    expect(tokenizeInline("**Yesterday, in one line:** it is *your* load")).toEqual([
      { type: "bold", text: "Yesterday, in one line:" },
      { type: "text", text: " it is " },
      { type: "italic", text: "your" },
      { type: "text", text: " load" },
    ]);
  });

  it("leaves a standalone asterisk literal", () => {
    expect(tokenizeInline("2 * 3 is 6")).toEqual([
      { type: "text", text: "2 * 3 is 6" },
    ]);
  });

  it("leaves a dangling asterisk literal instead of eating the line", () => {
    expect(tokenizeInline("a lone * and then some words")).toEqual([
      { type: "text", text: "a lone * and then some words" },
    ]);
    expect(tokenizeInline("*unclosed emphasis runs on")).toEqual([
      { type: "text", text: "*unclosed emphasis runs on" },
    ]);
  });

  it("does not let an italic run span a newline", () => {
    // The component splits on newlines before calling this, but the pattern
    // must not be the thing keeping that true.
    expect(tokenizeInline("*open\nclosed*")).toEqual([
      { type: "text", text: "*open\nclosed*" },
    ]);
  });

  it("keeps links working alongside emphasis", () => {
    expect(
      tokenizeInline("see [the guide](https://example.com) and go *now*"),
    ).toEqual([
      { type: "text", text: "see " },
      { type: "link", text: "the guide", href: "https://example.com" },
      { type: "text", text: " and go " },
      { type: "italic", text: "now" },
    ]);
  });

  it("handles a one-character run and punctuation inside the run", () => {
    expect(tokenizeInline("A tiny voiceless *h* before a vowel. *hhh-apple*.")).toEqual([
      { type: "text", text: "A tiny voiceless " },
      { type: "italic", text: "h" },
      { type: "text", text: " before a vowel. " },
      { type: "italic", text: "hhh-apple" },
      { type: "text", text: "." },
    ]);
  });

  it("handles a whole line wrapped in emphasis, quotes and all", () => {
    expect(tokenizeInline('The replay says: *"I completely fell apart."*')).toEqual([
      { type: "text", text: "The replay says: " },
      { type: "italic", text: '"I completely fell apart."' },
    ]);
  });

  it("returns plain text untouched", () => {
    expect(tokenizeInline("no markup here")).toEqual([
      { type: "text", text: "no markup here" },
    ]);
  });

  describe("nested emphasis", () => {
    // The line below is real day-5 content from the self-kindness pack. Before
    // this worked, the scan fell through to the bold arm in the middle of the
    // italic run and a paying customer read the sentence with two stray
    // asterisks hanging off it.
    it("keeps a bold run inside an italic run as one italic run", () => {
      expect(
        tokenizeInline('the difference between *"this is hard"* and *"this is hard **and I am uniquely bad at it**"*'),
      ).toEqual([
        { type: "text", text: "the difference between " },
        { type: "italic", text: '"this is hard"' },
        { type: "text", text: " and " },
        {
          type: "italic",
          text: '"this is hard **and I am uniquely bad at it**"',
          children: [
            { type: "text", text: '"this is hard ' },
            { type: "bold", text: "and I am uniquely bad at it" },
            { type: "text", text: '"' },
          ],
        },
      ]);
    });

    // The bug that a bare `\*\*` inner alternative would cause: the lazy
    // quantifier is satisfied by the OPENING delimiter of the bold run and
    // stops inside it, capturing "*a **b*" and leaving "* c*" behind.
    it("does not stop inside the bold run it contains", () => {
      const [token] = tokenizeInline("*a **b** c*");
      expect(token).toEqual({
        type: "italic",
        text: "a **b** c",
        children: [
          { type: "text", text: "a " },
          { type: "bold", text: "b" },
          { type: "text", text: " c" },
        ],
      });
    });

    it("keeps an italic run inside a bold run", () => {
      expect(tokenizeInline("**a *b* c**")).toEqual([
        {
          type: "bold",
          text: "a *b* c",
          children: [
            { type: "text", text: "a " },
            { type: "italic", text: "b" },
            { type: "text", text: " c" },
          ],
        },
      ]);
    });

    // Documents a KNOWN LIMIT, not a wish. `***x***` is not supported: the bold
    // arm claims the first two asterisks and the closing pair, so one star is
    // left over and stays visible.
    //
    // Left alone on purpose. Nothing in the seed uses a triple asterisk for
    // emphasis — the only triple run anywhere in it is a poem that uses
    // asterisks as redaction ("Great *** ****, are now your own."), where the
    // stars are the content and must stay literal. Teaching the pattern to tell
    // those two apart would cost real complexity for content that does not
    // exist. This test exists so the behaviour is a recorded decision instead of
    // a surprise.
    it("does not combine bold and italic from a triple asterisk", () => {
      expect(tokenizeInline("***both***")).toEqual([
        { type: "bold", text: "*both" },
        { type: "text", text: "*" },
      ]);
    });

    it("finds a link inside an italic run", () => {
      expect(tokenizeInline("*see [the guide](https://example.com) first*")).toEqual([
        {
          type: "italic",
          text: "see [the guide](https://example.com) first",
          children: [
            { type: "text", text: "see " },
            { type: "link", text: "the guide", href: "https://example.com" },
            { type: "text", text: " first" },
          ],
        },
      ]);
    });

    it("omits children when a run holds nothing but its own text", () => {
      // Flat is the common case and stays flat, so `children` appearing at all
      // is a reliable signal that something is genuinely nested.
      //
      // toStrictEqual, not toEqual: toEqual ignores a key whose value is
      // undefined, so it would pass even if every flat token carried a dead
      // `children: undefined`. The key has to be absent, not empty.
      expect(tokenizeInline("*plain*")[0]).toStrictEqual({
        type: "italic",
        text: "plain",
      });
      expect(tokenizeInline("**plain**")[0]).toStrictEqual({
        type: "bold",
        text: "plain",
      });
      expect(tokenizeInline("*plain*")[0]).not.toHaveProperty("children");
      expect(tokenizeInline("**plain**")[0]).not.toHaveProperty("children");
    });

    it("still refuses a bare double asterisk as an italic delimiter", () => {
      // "**" opening an italic run would make every bold run also an italic one.
      expect(tokenizeInline("**bold**")).toEqual([
        { type: "bold", text: "bold" },
      ]);
    });

    it("leaves an unclosed italic literal even when it contains a bold run", () => {
      expect(tokenizeInline("*unclosed **bold** and on")).toEqual([
        { type: "text", text: "*unclosed " },
        { type: "bold", text: "bold" },
        { type: "text", text: " and on" },
      ]);
    });
  });
});
