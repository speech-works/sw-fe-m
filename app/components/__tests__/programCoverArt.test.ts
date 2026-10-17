import { COVER_ASPECT, coverTitle, fitCoverTitle } from "../ProgramCoverArt";
import {
  COVER_BOOK_H,
  COVER_BOOK_W,
  COVER_FOOTER_HEIGHT,
  COVER_SLIDE_HEIGHT,
} from "../Dashboard/CoverSlide";
import { SLIDE_CARD_HEIGHT } from "../Dashboard/OfferSlide";

describe("the Home cover slide", () => {
  it("is as tall as the plain slides beside it", () => {
    // Restated in CoverSlide to dodge an import cycle; this holds them equal.
    expect(COVER_SLIDE_HEIGHT).toBe(SLIDE_CARD_HEIGHT);
  });

  it("shows the whole cover at 3:4 above the strip", () => {
    expect(COVER_BOOK_W / COVER_BOOK_H).toBeCloseTo(COVER_ASPECT, 2);
    expect(COVER_BOOK_H).toBeLessThan(COVER_SLIDE_HEIGHT - COVER_FOOTER_HEIGHT);
  });
});

describe("fitCoverTitle", () => {
  it("leaves a title that fits at the full cut", () => {
    expect(fitCoverTitle("Interview Ready", 300, coverTitle.card)).toBe(coverTitle.card);
  });

  it("shrinks the size AND the line height for a long word", () => {
    // iOS's own shrink keeps the line height, which spread the lines apart.
    const fitted = fitCoverTitle("Dating, Intimacy & Vulnerability", 150, coverTitle.page);
    expect(fitted.fontSize).toBeLessThan(coverTitle.page.fontSize);
    expect(fitted.lineHeight! / fitted.fontSize!).toBeCloseTo(
      coverTitle.page.lineHeight / coverTitle.page.fontSize,
      1,
    );
  });
});
