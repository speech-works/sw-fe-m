import {
  classifyPackError,
  packErrorMessage,
} from "../packErrors";

const apiError = (status?: number, errorCode?: string) => ({
  response: { status, data: errorCode ? { errorCode } : {} },
});

/**
 * These are the branches that decide what someone sees when the server says no.
 * They were previously inline in two screens and both collapsed everything into
 * "Please try again" — advice that cannot work for a paywall.
 */
describe("classifyPackError", () => {
  it("reads the error CODE in preference to the status", () => {
    // 402 is deliberately reused for both "you haven't bought this" and
    // "you're out of credits", so the status alone cannot tell them apart.
    expect(classifyPackError(apiError(402, "PACK_NOT_OWNED"))).toBe("NOT_OWNED");
    expect(classifyPackError(apiError(402, "NO_CREDITS"))).toBe(
      "RESOURCE_EXHAUSTED",
    );
  });

  it("separates a day lock from a paywall — the user has already paid", () => {
    expect(classifyPackError(apiError(403, "PACK_DAY_LOCKED"))).toBe(
      "DAY_LOCKED",
    );
  });

  it("treats stamina as resource exhaustion, which the screen must stay silent about", () => {
    expect(classifyPackError(apiError(402, "INSUFFICIENT_STAMINA"))).toBe(
      "RESOURCE_EXHAUSTED",
    );
  });

  it("falls back to the status when no code is present", () => {
    expect(classifyPackError(apiError(403))).toBe("DAY_LOCKED");
    expect(classifyPackError(apiError(402))).toBe("NOT_OWNED");
  });

  it("classifies real failures as UNKNOWN rather than guessing a paywall", () => {
    expect(classifyPackError(apiError(500))).toBe("UNKNOWN");
    expect(classifyPackError(apiError(404))).toBe("UNKNOWN");
    expect(classifyPackError(new Error("network down"))).toBe("UNKNOWN");
    expect(classifyPackError(undefined)).toBe("UNKNOWN");
  });

  /**
   * ── THE REFUSAL THAT COULD NOT BE DETECTED ────────────────────────────────
   * PackModule tested this shape itself and got all three parts wrong: HTTP 400
   * instead of 409, a body field named `message` instead of `error`, and the
   * text "already complete" instead of the sentence the server actually sends.
   * So a person who reopened a day they had skipped on a finished program was
   * told to check their connection and try again, on a good connection, with no
   * tap that could ever work.
   */
  it("recognises the finished-program refusal by its code", () => {
    expect(classifyPackError(apiError(409, "PACK_COMPLETED"))).toBe(
      "PACK_COMPLETED",
    );
  });

  it("does not depend on the status, which is 409 and never was 400", () => {
    // The code is the contract. If the status is what we matched on, one change
    // to the mapping table silently breaks the branch again.
    expect(classifyPackError(apiError(400, "PACK_COMPLETED"))).toBe(
      "PACK_COMPLETED",
    );
    expect(classifyPackError(apiError(undefined, "PACK_COMPLETED"))).toBe(
      "PACK_COMPLETED",
    );
  });

  it("reads the same refusal from the `error` field when it carries no code", () => {
    // A pack with no arc refuses with a plain Error, so there is no errorCode
    // and no dependable status. `error` is the field BaseController.handleError
    // writes in every branch; `message` is the field that does not exist.
    expect(
      classifyPackError({
        response: {
          status: 500,
          data: {
            error:
              "This pack is already complete. Optional modules are not accessible after pack completion.",
          },
        },
      }),
    ).toBe("PACK_COMPLETED");
  });

  it("does not find that refusal in a `message` field, because the server sends none", () => {
    // Proves the old test could not have worked: with the body shaped the way
    // the old code expected, nothing classifies.
    expect(
      classifyPackError({
        response: { status: 400, data: { message: "already complete" } },
      }),
    ).toBe("UNKNOWN");
  });
});

describe("packErrorMessage", () => {
  it("stays silent for resource exhaustion so GlobalModal owns it", () => {
    // Two stacked native modals freeze touch handling on iOS, so this must
    // return null rather than open a second sheet.
    expect(packErrorMessage("RESOURCE_EXHAUSTED")).toBeNull();
  });

  it("never tells a blocked user to try again", () => {
    // The whole point. Retrying a paywall or a day lock cannot succeed.
    // PACK_COMPLETED belongs in this list for the same reason and is the case
    // that actually shipped the wrong advice.
    for (const kind of ["NOT_OWNED", "DAY_LOCKED", "PACK_COMPLETED"] as const) {
      const message = packErrorMessage(kind);
      expect(message).not.toBeNull();
      expect(message!.body.toLowerCase()).not.toContain("try again");
    }
  });

  it("does still say try again for a genuine failure, where it is true", () => {
    expect(packErrorMessage("UNKNOWN")!.body.toLowerCase()).toContain(
      "try again",
    );
  });

  it("names the real reason for a paywall", () => {
    expect(packErrorMessage("NOT_OWNED")!.title).toMatch(/paid program/i);
  });
});
