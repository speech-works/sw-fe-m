import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ReportSheet } from "../index";
import PressableScale from "../../PressableScale";
import { REPORT_REASONS } from "../../../constants/reportReasons";

/** Safe-area insets come from a native module that doesn't exist under Jest;
 *  seeding the provider is enough and keeps the shim local to this file. */
const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const TestRenderer = require("react-test-renderer");

/**
 * ReportSheet is where a distressed person's tap has to land exactly once.
 *
 * Two contracts live here and neither is checkable from the outside:
 *
 *  - `submitting` makes every row inert. Without it the rows stay pressable
 *    through the sheet's ~200ms exit animation, so one tap becomes two POSTs —
 *    and on the block path that meant a duplicate report row against a real
 *    person, in a queue a human reads.
 *  - the block row appears ONLY when the caller supplies `onBlock`, so the
 *    Community flow (which has its own block entry point) doesn't grow a second
 *    one, and system posts with no real author never offer it.
 */
function render(props: Partial<React.ComponentProps<typeof ReportSheet>> = {}) {
  let tree: any;
  TestRenderer.act(() => {
    tree = TestRenderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <ReportSheet
          visible
          onClose={() => {}}
          target="signal"
          personName="Sam"
          onSubmit={() => {}}
          {...props}
        />
      </SafeAreaProvider>,
    );
  });
  return tree;
}

/** Every rendered string in the tree, flattened. */
function texts(tree: any): string[] {
  const out: string[] = [];
  const walk = (node: any) => {
    if (node == null) return;
    if (typeof node === "string") return void out.push(node);
    if (Array.isArray(node)) return void node.forEach(walk);
    walk(node.children);
  };
  walk(tree.toJSON());
  return out;
}

/**
 * Press every row the sheet actually rendered as pressable.
 *
 * Driving `PressableScale` rather than the `ListItem` element is the whole
 * point: `findAll` on a prop would also match `<ListItem onPress=… disabled />`
 * and invoke its handler directly, walking straight past the `disabled` branch
 * these tests exist to verify. A disabled ListItem renders NO PressableScale at
 * all, so "nothing to press" is the real, structural assertion.
 */
function pressAll(tree: any) {
  const pressables = tree.root.findAllByType(PressableScale);
  TestRenderer.act(() => {
    pressables.forEach((p: any) => {
      try {
        p.props.onPress?.();
      } catch {
        // Some pressables are sheet chrome (backdrop, close); irrelevant here.
      }
    });
  });
}

/** The distinct reasons submitted, regardless of host nesting depth. */
function submittedIds(onSubmit: jest.Mock): string[] {
  return [...new Set(onSubmit.mock.calls.map((c) => c[0]))];
}

describe("ReportSheet", () => {
  it("offers every report reason", () => {
    const rendered = texts(render());
    for (const reason of REPORT_REASONS) {
      expect(rendered).toContain(reason.label);
    }
  });

  it("submits a reason on a single tap — no second confirm step", () => {
    const onSubmit = jest.fn();
    const tree = render({ onSubmit });
    pressAll(tree);
    // Every reason is submittable directly. The reason list IS the
    // confirmation; there is deliberately no second step.
    expect(submittedIds(onSubmit).sort()).toEqual(
      REPORT_REASONS.map((r) => r.id).sort(),
    );
  });

  it("goes completely inert while a submit is in flight", () => {
    // THE double-submit guard.
    const onSubmit = jest.fn();
    const tree = render({ onSubmit, submitting: true });
    pressAll(tree);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows no block row unless the caller asks for one", () => {
    const rendered = texts(render());
    expect(rendered.some((t) => /^Block /.test(t))).toBe(false);
  });

  it("shows a block row when the caller supplies onBlock", () => {
    const rendered = texts(render({ onBlock: () => {}, blockLabel: "Block Sam" }));
    expect(rendered).toContain("Block Sam");
  });

  it("keeps the block row inert while a submit is in flight too", () => {
    const onBlock = jest.fn();
    const tree = render({ onBlock, blockLabel: "Block Sam", submitting: true });
    pressAll(tree);
    expect(onBlock).not.toHaveBeenCalled();
  });
});
