import { apiErrorMessage, isClientError } from "../apiError";

/**
 * The bug worth pinning: the API serialises errors as `{ error: message }`,
 * and screens were reading `data.message`. A wrong key is indistinguishable
 * from a server that sent nothing — the UI just showed its generic fallback
 * and nobody noticed the specific reason had been thrown away.
 */
const axiosError = (status: number, data: unknown) => ({ response: { status, data } });

describe("apiErrorMessage", () => {
  it("reads the `error` key the API actually sends", () => {
    expect(
      apiErrorMessage(axiosError(400, { error: "You can't use your own code." }), "fallback"),
    ).toBe("You can't use your own code.");
  });

  it("still reads `message`, since the app talks to more than one shape", () => {
    expect(apiErrorMessage(axiosError(400, { message: "Nope." }), "fallback")).toBe("Nope.");
  });

  it("prefers `error` when a body carries both", () => {
    expect(
      apiErrorMessage(axiosError(400, { error: "specific", message: "vague" }), "fallback"),
    ).toBe("specific");
  });

  it("does not surface 5xx text — that is an internal string, not an explanation", () => {
    expect(
      apiErrorMessage(axiosError(500, { error: "Internal server error" }), "fallback"),
    ).toBe("fallback");
  });

  it("falls back on an empty or blank message rather than showing a blank alert", () => {
    expect(apiErrorMessage(axiosError(400, { error: "   " }), "fallback")).toBe("fallback");
    expect(apiErrorMessage(axiosError(400, {}), "fallback")).toBe("fallback");
  });

  it("falls back on a non-string body, and on no response at all", () => {
    expect(apiErrorMessage(axiosError(400, { error: { nested: true } }), "fallback")).toBe(
      "fallback",
    );
    expect(apiErrorMessage(new Error("Network Error"), "fallback")).toBe("fallback");
    expect(apiErrorMessage(undefined, "fallback")).toBe("fallback");
  });
});

describe("isClientError", () => {
  it("treats 4xx as a rejection the caller will surface", () => {
    expect(isClientError(axiosError(400, {}))).toBe(true);
    expect(isClientError(axiosError(404, {}))).toBe(true);
  });

  it("treats 5xx and network failures as faults worth logging", () => {
    expect(isClientError(axiosError(500, {}))).toBe(false);
    expect(isClientError(new Error("Network Error"))).toBe(false);
  });
});
