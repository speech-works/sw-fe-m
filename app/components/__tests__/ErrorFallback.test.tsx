import React from "react";

import { ErrorFallback } from "../ErrorFallback";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const TestRenderer = require("react-test-renderer");

/**
 * This component is the LAST line of defence — it renders only when something
 * else has already thrown. If it throws while reporting a throw, the user gets
 * a white screen and the crash reports nothing at all, so its contract is
 * "renders for any input, always".
 *
 * The dev diagnostics block added alongside these tests is what makes that
 * non-trivial: it formats an arbitrary thrown value, and JS lets you throw
 * anything — a string, null, an object with a circular reference, an Error with
 * no stack.
 */
const flatten = (tree: any): string => JSON.stringify(tree);

function render(props: any) {
  let tree: any;
  TestRenderer.act(() => {
    tree = TestRenderer.create(<ErrorFallback {...props} />);
  });
  const json = tree.toJSON();
  TestRenderer.act(() => tree.unmount());
  return flatten(json);
}

describe("ErrorFallback", () => {
  const noop = () => {};

  // The component mirrors the error to console.error on purpose (so it reaches
  // the Metro terminal). Silence it here — these tests feed it deliberately
  // broken values, and the real reports would bury the results.
  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  it("always renders the user-facing copy", () => {
    const out = render({ resetError: noop });
    expect(out).toContain("Something went wrong");
    expect(out).toContain("Try again");
  });

  it("shows the message of a thrown Error", () => {
    const out = render({
      resetError: noop,
      error: new Error("Maximum update depth exceeded"),
    });
    expect(out).toContain("Maximum update depth exceeded");
  });

  it.each([
    ["a string", "boom"],
    ["null", null],
    ["undefined-ish object", {}],
    ["a number", 42],
    ["an Error with no message", new Error()],
  ])("does not throw when the thrown value is %s", (_label, value) => {
    expect(() => render({ resetError: noop, error: value })).not.toThrow();
  });

  it("does not throw on a circular thrown value", () => {
    const circular: any = { a: 1 };
    circular.self = circular;
    expect(() => render({ resetError: noop, error: circular })).not.toThrow();
  });

  it("renders no diagnostics block when no error is supplied", () => {
    const out = render({ resetError: noop });
    expect(out).not.toContain("DEV ONLY");
  });
});
