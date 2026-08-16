import { apiErrorMessage, isClientError, isNotFound } from "../apiError";

const withStatus = (status: number, data?: unknown) => ({ response: { status, data } });

describe("apiErrorMessage", () => {
  it("reads the server's own key, which is `error` and not `message`", () => {
    expect(apiErrorMessage(withStatus(400, { error: "You already have a buddy." }), "nope")).toBe(
      "You already have a buddy.",
    );
  });

  it("still reads `message`, because the app talks to more than one shape", () => {
    expect(apiErrorMessage(withStatus(400, { message: "Bad code." }), "nope")).toBe("Bad code.");
  });

  it("never surfaces a 5xx body", () => {
    // An internal failure string is noise at best and a leak at worst.
    expect(apiErrorMessage(withStatus(500, { error: "ECONNREFUSED at pg pool" }), "fallback")).toBe(
      "fallback",
    );
  });

  it("falls back when there is no response at all", () => {
    expect(apiErrorMessage(new Error("offline"), "fallback")).toBe("fallback");
  });
});

describe("isClientError", () => {
  it("is true for 4xx and false for 5xx", () => {
    expect(isClientError(withStatus(404))).toBe(true);
    expect(isClientError(withStatus(500))).toBe(false);
  });
});

/**
 * The distinction that let a decline throw an error modal at somebody who had
 * successfully declined.
 *
 * Two callers could commit the same held decline — the grace timer and the
 * unmount handler — and the second one got a 404 for a request the first had
 * already declined. The double-call is guarded at the call site now, but a 404
 * on a destructive action is ALSO not a failure: the request is gone, which is
 * what was asked for.
 */
describe("isNotFound", () => {
  it("is true only for 404", () => {
    expect(isNotFound(withStatus(404))).toBe(true);
    expect(isNotFound(withStatus(400))).toBe(false);
    expect(isNotFound(withStatus(409))).toBe(false);
    expect(isNotFound(withStatus(500))).toBe(false);
  });

  it("is false when there is no response, so a network drop is never mistaken for gone", () => {
    // The request may well still be live; we simply could not reach the server.
    expect(isNotFound(new Error("Network Error"))).toBe(false);
    expect(isNotFound(undefined)).toBe(false);
    expect(isNotFound(null)).toBe(false);
  });
});
