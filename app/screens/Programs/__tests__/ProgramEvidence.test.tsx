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
  const passthrough =
    (name: string) =>
    ({ children, ...rest }: any) =>
      React.createElement(RN.View, { testID: name, ...rest }, children);
  return {
    Page: ({ title, description, children }: any) =>
      React.createElement(RN.View, null, [
        React.createElement(RN.Text, { key: "t" }, title),
        React.createElement(RN.Text, { key: "d" }, description),
        children,
      ]),
    Surface: passthrough("Surface"),
    Text: ({ children }: any) => React.createElement(RN.Text, null, children),
    TextLink: ({ label }: any) => React.createElement(RN.Text, null, label),
    Icon: () => null,
    Spinner: () => null,
    ErrorState: ({ title }: any) => React.createElement(RN.Text, null, title),
    icons: { chevronUp: "chevronUp", chevronDown: "chevronDown" },
    size: { iconInline: 16 },
    spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
    useTheme: () => ({
      colors: {
        accent: { success: "#0f0", warning: "#fa0", danger: "#f00" },
        accentText: { success: "#030", warning: "#530", danger: "#300" },
        surface: { control: "#eee" },
        text: { secondary: "#666", tertiary: "#999" },
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
  return ({ children, ...rest }: any) =>
    React.createElement(RN.Pressable, rest, children);
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

async function renderScreen() {
  let tree: any;
  await TestRenderer.act(async () => {
    tree = TestRenderer.create(
      React.createElement(ProgramEvidence, {
        catalogKey: "art_of_disclosure",
        programTitle: "The Art of Disclosure",
        onBack: () => undefined,
      }),
    );
  });
  return tree;
}

/**
 * Opens the row whose accessibility label contains `text`.
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
      pressRow(tree, "Two studies. Neither settles it.");
    });
    expect(flatten(tree.toJSON())).toContain(READER_SAFE);
  });

  it("never renders the reviewer's version, open or closed", async () => {
    const tree = await renderScreen();

    // Closed.
    expect(flatten(tree.toJSON())).not.toContain(REVIEWER_ONLY);

    // Open, which is where a wrong field reference would surface.
    await TestRenderer.act(async () => {
      pressRow(tree, "Two studies. Neither settles it.");
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
    expect(rendered.indexOf("Two studies. Neither settles it.")).toBeLessThan(
      rendered.indexOf("Fifteen of eighteen studies."),
    );
  });

  it("renders a claim with no source link without throwing", async () => {
    const tree = await renderScreen();
    await TestRenderer.act(async () => {
      pressRow(tree, "Fifteen of eighteen studies.");
    });
    expect(flatten(tree.toJSON())).toContain("Coalson");
  });

  it("offers a retry instead of a blank screen when the call fails", async () => {
    (getProgramEvidence as jest.Mock).mockRejectedValue(new Error("offline"));
    const tree = await renderScreen();
    expect(flatten(tree.toJSON())).toContain("Couldn't load the research");
  });
});
