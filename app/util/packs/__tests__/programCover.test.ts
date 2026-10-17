import { BUNDLED_COVER_KEYS, programCoverFor } from "../programCover";

/**
 * The catalogKeys the backend seeds today. A COPY of sw-be-2's seeds, on
 * purpose, as `SEEDED_PACK_ICONS` is: the repos deploy separately, so an import
 * would only prove they agree in a checkout that has both. If this fails, a
 * program was added or renamed and its cover was not, and its cards fall back
 * to the plain design.
 */
const SEEDED_CATALOG_KEYS = [
  "interview_ready",
  "hard_conversations",
  "panic_button",
  "understanding_your_voice",
  "breaking_thought_traps",
  "bouncing_back",
  "dating_intimacy",
  "speech_toolkit",
  "art_of_disclosure",
  "word_swap",
];

describe("programCoverFor", () => {
  it("has bundled art and a description for every seeded program", () => {
    expect([...BUNDLED_COVER_KEYS].sort()).toEqual([...SEEDED_CATALOG_KEYS].sort());
    for (const key of SEEDED_CATALOG_KEYS) {
      const cover = programCoverFor(key);
      expect(cover).not.toBeNull();
      expect(cover!.description).toBeTruthy();
    }
  });

  it("keeps the bundled art when the server also sends a URL", () => {
    // The seeds used to carry URLs into a bucket that never existed. A stale
    // row like that must not be able to blank a cover the app has.
    const bundled = programCoverFor("panic_button");
    const both = programCoverFor(
      "panic_button",
      "https://speechworks-assets.s3.amazonaws.com/covers/panic_button.png",
    );
    expect(both!.source).toBe(bundled!.source);
  });

  it("uses a remote https cover for a program it has no art for", () => {
    const cover = programCoverFor("console_made", "https://cdn.example/c.png");
    expect(cover).toEqual({
      source: { uri: "https://cdn.example/c.png" },
      description: null,
    });
  });

  it("falls back to no cover rather than an empty box", () => {
    for (const [key, url] of [
      [null, null],
      ["console_made", null],
      ["console_made", ""],
      ["console_made", "   "],
      // iOS refuses plain http, which would draw a blank cover.
      ["console_made", "http://cdn.example/c.png"],
      ["console_made", "not a url"],
      // A free-text key must not walk the prototype chain into a "cover".
      ["constructor", null],
      ["__proto__", null],
    ] as const) {
      expect(programCoverFor(key, url)).toBeNull();
    }
  });

  it("writes the descriptions without dashes standing in for punctuation", () => {
    for (const key of SEEDED_CATALOG_KEYS) {
      expect(programCoverFor(key)!.description).not.toMatch(/[–—]/);
    }
  });
});
