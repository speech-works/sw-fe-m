import React from "react";

import ProgramEvidence from "../ProgramEvidence";
import { getProgramEvidence } from "../../../api/packs";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const TestRenderer = require("react-test-renderer");

/**
 * ONE RULE THIS SCREEN MUST NEVER BREAK.
 *
 * The payload carries two versions of every claim's limit, because one
 * response serves both this screen and the clinical review console.
 * `whatItDoesNotShow` is the reviewer's: it shouts, it names effect sizes, and
 * it records what this product got wrong and on what date.
 * `theLimitInPlainWords` is the same limit for the person holding the phone.
 *
 * A future edit that reaches for the wrong field would put
 * "READ THIS BEFORE WRITING ANY TIMING COPY" and "our copy said the opposite
 * until 2026-09-21" in front of somebody who has just paid. Nothing about the
 * types prevents it: both fields are strings and both are present. This test
 * is what prevents it.
 */

jest.mock("../../../api/packs", () => ({
  getProgramEvidence: jest.fn(),
}));

// The design system reads a theme from context and pulls in native modules
// that do not exist under jest-expo's node environment. The rule under test is
// about WHICH STRING reaches the tree, so the primitives are replaced with
// plain hosts that keep their children and drop the styling.
jest.mock("../../../design-system", () => {
  // Required INSIDE the factory: jest forbids a mock factory from reaching
  // out to an import at the top of the file.
  const React = require("react");
  const RN = require("react-native");
  // Named, because the lint gate (react/display-name) refuses an anonymous
  // component even in a mock, and it has been failing CI on main since the
  // morning of 2026-09-22.
  const passthrough = (name: string) => {
    const Passthrough = ({ children, ...rest }: any) =>
      React.createElement(RN.View, { testID: name, ...rest }, children);
    Passthrough.displayName = name;
    return Passthrough;
  };
  return {
    Page: ({ title, description, children }: any) =>
      React.createElement(RN.View, null, [
        React.createElement(RN.Text, { key: "t" }, title),
        React.createElement(RN.Text, { key: "d" }, description),
        children,
      ]),
    Surface: passthrough("Surface"),
    Text: ({ children }: any) => React.createElement(RN.Text, null, children),
    Icon: () => null,
    Spinner: () => null,
    ErrorState: ({ title }: any) => React.createElement(RN.Text, null, title),
    icons: {
      chevronRight: "chevronRight",
    },
    size: { iconInline: 16 },
    spacing: { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 20 },
    duration: { reveal: 240 },
    useTheme: () => ({
      colors: {
        accent: { success: "#0f0", warning: "#fa0", danger: "#f00" },
        accentText: { success: "#030", warning: "#530", danger: "#300" },
        surface: { control: "#eee", track: "#ccc" },
        text: {
          secondary: "#666",
          tertiary: "#999",
          disabled: "#aaa",
          link: "#f80",
        },
        border: { hairline: "#ddd" },
      },
    }),
  };
});

jest.mock("../../../components/PressableScale", () => {
  const React = require("react");
  const RN = require("react-native");
  // Forwards every prop, so the accessibility labels the screen sets are
  // visible to the test. Finding a row by its label is both how the test
  // stays readable and how it checks those labels exist at all.
  const PressableScale = ({ children, ...rest }: any) =>
    React.createElement(RN.Pressable, rest, children);
  PressableScale.displayName = "PressableScale";
  return PressableScale;
});

const REVIEWER_ONLY =
  "READ THIS BEFORE WRITING ANY TIMING COPY. Our copy said the opposite until 2026-09-21, d = 0.32.";
const READER_SAFE =
  "The two recordings were worded differently, so nobody can tell whether it was the timing or the words.";

const SUMMARY = {
  catalogKey: "art_of_disclosure",
  title: "The Art of Disclosure",
  lastCheckedAt: "2026-09-21",
  oldestCheckedAt: "2026-09-21",
  claimCount: 2,
  contestedCount: 1,
  claims: [
    {
      claim: "Where the line sits has been studied twice, and they disagree.",
      plainCount: "Two studies. Neither settles it.",
      whatItIs: "Two small studies, 90 and 137 raters",
      source: "Healey, E. C., et al. (2007). J Fluency Disord, 32, 51-69.",
      sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/17275902/",
      strength: "CONTESTED" as const,
      population: "90 listeners rating a recording.",
      design: "Two experiments.",
      whatItDoesNotShow: REVIEWER_ONLY,
      theLimitInPlainWords: READER_SAFE,
      lastCheckedAt: "2026-09-21",
    },
    {
      claim: "Telling people usually improves how they rate you.",
      plainCount: "Fifteen of eighteen studies.",
      whatItIs: "Review of 18 studies",
      source: "Coalson, G. A., et al. (2026). J Fluency Disord, 88, 106200.",
      strength: "STRONG" as const,
      population: "Mixed.",
      design: "Systematic review.",
      whatItDoesNotShow: "Reviewer text for the second claim.",
      theLimitInPlainWords: "No study has measured a hiring decision.",
      lastCheckedAt: "2026-09-21",
    },
  ],
};

const flatten = (tree: any): string => JSON.stringify(tree);

async function renderScreen(embedded = false) {
  let tree: any;
  await TestRenderer.act(async () => {
    tree = TestRenderer.create(
      React.createElement(ProgramEvidence, {
        catalogKey: "art_of_disclosure",
        programTitle: "The Art of Disclosure",
        onBack: () => undefined,
        embedded,
      }),
    );
  });
  return tree;
}

/**
 * Opens the page for the row whose accessibility label contains `text`.
 * Rows are labelled with the strength word and the claim; the count only
 * appears once the page is open.
 *
 * Finding by label rather than by index: react-test-renderer's findAll
 * matches BOTH a component and the host element it renders, so an index walks
 * into the same row twice. The first version of this test pressed index 1 and
 * re-opened row one, which looked like a screen bug and was a test bug.
 */
function pressRow(tree: any, text: string): void {
  const hits = tree.root.findAll((n: any) =>
    String(n.props?.accessibilityLabel ?? "").includes(text),
  );
  if (hits.length === 0) throw new Error(`No row labelled with "${text}"`);
  hits[0].props.onPress();
}

describe("ProgramEvidence", () => {
  beforeEach(() => {
    (getProgramEvidence as jest.Mock).mockResolvedValue(SUMMARY);
  });

  it("shows the reader's version of the limit once a row is open", async () => {
    const tree = await renderScreen();
    await TestRenderer.act(async () => {
      pressRow(
        tree,
        "Where the line sits has been studied twice, and they disagree.",
      );
    });
    const open = flatten(tree.toJSON());
    expect(open).toContain(READER_SAFE);
    // The count and the citation live on the page, not in the list.
    expect(open).toContain("Two studies. Neither settles it.");
    expect(open).toContain("Healey");
  });

  it("keeps the count and the citation off the list", async () => {
    const rendered = flatten((await renderScreen()).toJSON());
    expect(rendered).toContain(
      "Where the line sits has been studied twice, and they disagree.",
    );
    expect(rendered).not.toContain("Two studies. Neither settles it.");
    expect(rendered).not.toContain("Healey");
  });

  /**
   * Inside the sales sheet the way back to the list is the sheet's header
   * button, which the host draws. So the host owns the selection: the screen
   * reports a tap through `onSelectedChange` and shows whatever `selected`
   * says. A screen that kept its own copy would ignore the header button.
   */
  it("lets the host own the selection when embedded", async () => {
    const onSelectedChange = jest.fn();
    let tree: any;
    const render = (selected: number | null) =>
      React.createElement(ProgramEvidence, {
        catalogKey: "art_of_disclosure",
        onBack: () => undefined,
        embedded: true,
        selected,
        onSelectedChange,
      });
    await TestRenderer.act(async () => {
      tree = TestRenderer.create(render(null));
    });
    await TestRenderer.act(async () => {
      pressRow(
        tree,
        "Where the line sits has been studied twice, and they disagree.",
      );
    });
    expect(onSelectedChange).toHaveBeenCalledWith(0);
    // The host has not moved yet, so the list is still showing.
    expect(flatten(tree.toJSON())).toContain(
      "Telling people usually improves how they rate you.",
    );

    await TestRenderer.act(async () => {
      tree.update(render(0));
    });
    const page = flatten(tree.toJSON());
    expect(page).toContain(READER_SAFE);
    expect(page).not.toContain(
      "Telling people usually improves how they rate you.",
    );
    // No back control of its own: the sheet header carries it.
    expect(page).not.toContain("All sources");

    await TestRenderer.act(async () => {
      tree.update(render(null));
    });
    expect(flatten(tree.toJSON())).toContain(
      "Telling people usually improves how they rate you.",
    );
  });

  /**
   * FOUNDER DECISION, 2026-09-22: no outbound links. Fourteen of the nineteen
   * sources land on a paywall or a bare abstract, and the people who tap are
   * the most engaged buyers. The citation is plain text; the URL is on the
   * wire for the console and must never reach the tree.
   */
  it("never links out: the citation is plain text and the URL is not rendered", async () => {
    const tree = await renderScreen();
    await TestRenderer.act(async () => {
      pressRow(
        tree,
        "Where the line sits has been studied twice, and they disagree.",
      );
    });
    const open = flatten(tree.toJSON());
    expect(open).toContain("Healey");
    expect(open).not.toContain("Open on");
    expect(open).not.toContain("Open the source");
    expect(open).not.toContain("pubmed.ncbi.nlm.nih.gov");
  });

  /**
   * FOUNDER DECISION, 2026-09-22: two blocks per row, not five. The page is
   * the count, the limit and the citation. Who was studied, how they studied
   * it and the per-claim date live in the reviewer sheet and the console.
   * The whole-program date stays, because it is the receipt for the free
   * updates promise.
   */
  it("keeps the page to the count, the limit and the citation", async () => {
    const tree = await renderScreen();
    await TestRenderer.act(async () => {
      pressRow(
        tree,
        "Where the line sits has been studied twice, and they disagree.",
      );
    });
    const open = flatten(tree.toJSON());
    expect(open).toContain("Two studies. Neither settles it.");
    expect(open).toContain(READER_SAFE);
    expect(open).toContain("Healey");
    expect(open).not.toContain("90 listeners rating a recording.");
    expect(open).not.toContain("Two experiments.");
    expect(open).not.toContain("Who was studied");
    expect(open).not.toContain("How they studied it");
    expect(open).not.toContain("We read this one on");
  });

  it("keeps the whole-program date and says not every day rests on a study", async () => {
    const rendered = flatten((await renderScreen()).toJSON());
    expect(rendered).toContain("Checked 21 September 2026");
    expect(rendered).toContain("Some of these days come from studies.");
    expect(rendered).toContain("The studies are below.");
  });

  it("never renders the reviewer's version, open or closed", async () => {
    const tree = await renderScreen();

    // Closed.
    expect(flatten(tree.toJSON())).not.toContain(REVIEWER_ONLY);

    // Open, which is where a wrong field reference would surface.
    await TestRenderer.act(async () => {
      pressRow(
        tree,
        "Where the line sits has been studied twice, and they disagree.",
      );
    });
    const open = flatten(tree.toJSON());
    expect(open).not.toContain(REVIEWER_ONLY);
    expect(open).not.toContain("Reviewer text for the second claim.");
    expect(open).not.toContain("READ THIS");
    expect(open).not.toContain("d = 0.32");
  });

  it("keeps the server's order, so a thin claim is not buried", async () => {
    const tree = await renderScreen();
    const rendered = flatten(tree.toJSON());
    expect(
      rendered.indexOf(
        "Where the line sits has been studied twice, and they disagree.",
      ),
    ).toBeLessThan(
      rendered.indexOf("Telling people usually improves how they rate you."),
    );
  });

  it("renders a claim with no source link without throwing", async () => {
    const tree = await renderScreen();
    await TestRenderer.act(async () => {
      pressRow(tree, "Telling people usually improves how they rate you.");
    });
    const open = flatten(tree.toJSON());
    expect(open).toContain("Coalson");
    expect(open).not.toContain("Open on");
  });

  /**
   * The sales flow renders this inside a Sheet that already draws the title
   * and the close control. Drawing Page as well would stack two headers and
   * two ways out on one surface, and the second one would not dismiss the
   * sheet. The claims must still be there: an `embedded` that rendered nothing
   * would pass a title check and ship an empty sheet.
   */
  it("drops the page chrome when embedded, and keeps the claims", async () => {
    const framed = flatten((await renderScreen(false)).toJSON());
    expect(framed).toContain("What the research actually says");

    const bare = flatten((await renderScreen(true)).toJSON());
    expect(bare).not.toContain("What the research actually says");
    expect(bare).toContain(
      "Where the line sits has been studied twice, and they disagree.",
    );
    expect(bare).toContain(
      "Telling people usually improves how they rate you.",
    );
  });

  /**
   * FOUNDER DECISION, 2026-09-22: do not downplay the content. The line above
   * each claim says what the source is, in the registry's own words for it.
   * No grade reaches the screen: not the registry's ("CONTESTED"), and not the
   * labels this screen used to make from them ("Thin evidence"). A grade on a
   * source read as a verdict on the program. Rendering `claim.strength` is a
   * one-character mistake to make and invisible in a diff, so it is asserted.
   */
  it("describes each source and renders no grade, in either vocabulary", async () => {
    const rendered = flatten(await renderScreen().then((t) => t.toJSON()));
    expect(rendered).toContain("Two small studies, 90 and 137 raters");
    expect(rendered).toContain("Review of 18 studies");
    for (const grade of ["CONTESTED", "STRONG", "MODERATE", "WEAK", "ABSENT"]) {
      expect(rendered).not.toContain(grade);
    }
    for (const label of [
      "Studies disagree",
      "Well tested",
      "One solid study",
      "Thin evidence",
      "Untested",
      "shaky",
    ]) {
      expect(rendered).not.toContain(label);
    }
  });

  it("opens with what the sources found, not with a warning", async () => {
    const rendered = flatten((await renderScreen()).toJSON());
    expect(rendered).toContain(
      "Two sources. Tap one to see what it found, and where it stops.",
    );
  });

  it("offers a retry instead of a blank screen when the call fails", async () => {
    (getProgramEvidence as jest.Mock).mockRejectedValue(new Error("offline"));
    const tree = await renderScreen();
    expect(flatten(tree.toJSON())).toContain("Couldn't load the research");
  });
});
