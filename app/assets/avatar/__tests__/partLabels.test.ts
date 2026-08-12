import { PART_LABELS, PART_REGISTRY } from "../registry";
import type { AvatarSlot } from "../../../types/avatar";

/**
 * Part names must never be cut.
 *
 * The wardrobe picker gives each name a 96pt cell, and its padding leaves about
 * 64pt of text — roughly 11 characters at caption size, over two lines. A name
 * that overflows that gets an ellipsis, and a part whose name reads "Wavy
 * ban..." is a part the user cannot identify.
 *
 * This is a guard rather than a measurement: it cannot know real font metrics,
 * so the budgets are deliberately slack. It exists because the catalog grows in
 * batches — 32 parts landed in one change — and eyeballing every new label is
 * exactly the check that gets skipped.
 */
/**
 * Hard limits, chosen as a rule rather than a measurement.
 *
 * Letter COUNT is a poor proxy for width — "Deerstalker" is eleven letters and
 * fits, "Headphones" is ten and broke mid-word. Rather than chase per-word
 * metrics we cap words short enough that no reasonable font can overflow the
 * ~80pt a cell gives its label. It costs the occasional abbreviation
 * ("Headset" for headphones) and buys a guarantee.
 */
const MAX_WORD = 9;
const MAX_TOTAL = 24;

describe("part labels", () => {
  it("gives every registered part a name", () => {
    const missing: string[] = [];
    (Object.keys(PART_REGISTRY) as AvatarSlot[]).forEach((slot) => {
      // `head` is the one fixed base part and never appears in a picker.
      if (slot === "head") return;
      Object.keys(PART_REGISTRY[slot]).forEach((id) => {
        if (!PART_LABELS[id]) missing.push(id);
      });
    });
    expect(missing).toEqual([]);
  });

  it("has no single word too long to fit one line", () => {
    // A long WORD is the unfixable case: wrapping cannot help it, so it breaks
    // mid-word no matter how many lines the cell allows. Shorten the NAME.
    const tooLong = Object.entries(PART_LABELS)
      .flatMap(([id, label]) => label.split(/[\s-]/).map((w) => ({ id, w })))
      .filter(({ w }) => w.length > MAX_WORD)
      .map(({ id, w }) => `${id}: "${w}"`);
    expect(tooLong).toEqual([]);
  });

  it("keeps every name inside the two lines the cell allows", () => {
    const tooLong = Object.entries(PART_LABELS)
      .filter(([, label]) => label.length > MAX_TOTAL)
      .map(([id, label]) => `${id}: "${label}" (${label.length} chars)`);
    expect(tooLong).toEqual([]);
  });
});
