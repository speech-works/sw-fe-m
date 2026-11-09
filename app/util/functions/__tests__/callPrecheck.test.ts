/**
 * H1 (founder, 9 Nov 2026): with no calls left, "Out of calls" comes BEFORE
 * "Connect headphones to take this call". Only when it is certain; any doubt
 * keeps today's flow, where the 402 NO_CREDITS stays the source of truth.
 */
import * as fs from "fs";
import * as path from "path";
import {
  CALL_PRECHECK_TIMEOUT_MS,
  precheckCallAllowance,
  runBeforeCallGate,
  walletWithin,
} from "../callAllowance";
import type { Wallet } from "../../../api/users";

const wallet = (over: Partial<Wallet> = {}): Wallet => ({
  balance: 0,
  entitlements: [],
  founderCohort: false,
  freeCallAvailable: false,
  nextFreeCallAt: "2026-11-12T10:00:00.000Z",
  ...over,
});

/**
 * The widget's order, as startCall runs it: the pre-check, then the
 * headphones/volume gate. Records what was reached.
 */
async function tapCall(before: (() => Promise<boolean>) | undefined) {
  const reached: string[] = [];
  if (await runBeforeCallGate(before)) {
    reached.push("stopped");
    return reached;
  }
  reached.push("headphones_gate");
  return reached;
}

/** What the call screen passes (PhoneCall handleBeforeCallGate), with fakes. */
const screenPrecheck =
  (read: () => Promise<Wallet>, inProgram: boolean, role: string | undefined, sheet: jest.Mock) =>
  async () => {
    const w = await walletWithin(read, 50);
    if (precheckCallAllowance({ wallet: w, inProgram, role }) !== "no_calls") return false;
    sheet();
    return true;
  };

beforeEach(() => {
  jest.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe("precheckCallAllowance", () => {
  it("0 credits and no weekly free call: no calls", () => {
    expect(precheckCallAllowance({ wallet: wallet(), inProgram: false, role: "user" })).toBe("no_calls");
    // Role is not needed for a library call.
    expect(precheckCallAllowance({ wallet: wallet(), inProgram: false, role: undefined })).toBe("no_calls");
  });

  it("0 credits but the weekly free call is ready (library call): today's flow", () => {
    expect(
      precheckCallAllowance({
        wallet: wallet({ freeCallAvailable: true, nextFreeCallAt: null }),
        inProgram: false,
        role: "user",
      }),
    ).toBe("proceed");
  });

  it("credits left: today's flow", () => {
    expect(precheckCallAllowance({ wallet: wallet({ balance: 2 }), inProgram: false, role: "user" })).toBe("proceed");
    expect(precheckCallAllowance({ wallet: wallet({ balance: 1 }), inProgram: true, role: "user" })).toBe("proceed");
  });

  it("a program call: no calls only for a known non-reviewer", () => {
    // The weekly free call never runs a program's own call.
    const free = wallet({ freeCallAvailable: true, nextFreeCallAt: null });
    expect(precheckCallAllowance({ wallet: free, inProgram: true, role: "user" })).toBe("no_calls");
    expect(precheckCallAllowance({ wallet: wallet(), inProgram: true, role: "admin" })).toBe("no_calls");
  });

  it("a program call by a reviewer: today's flow (free review calls)", () => {
    expect(precheckCallAllowance({ wallet: wallet(), inProgram: true, role: "reviewer" })).toBe("proceed");
    expect(precheckCallAllowance({ wallet: wallet(), inProgram: false, role: "reviewer" })).toBe("proceed");
  });

  it("a program call with the role unknown: today's flow", () => {
    expect(precheckCallAllowance({ wallet: wallet(), inProgram: true, role: undefined })).toBe("proceed");
    expect(precheckCallAllowance({ wallet: wallet(), inProgram: true, role: null })).toBe("proceed");
    expect(precheckCallAllowance({ wallet: wallet(), inProgram: true, role: "" })).toBe("proceed");
  });

  it("a missing wallet or missing field: today's flow", () => {
    expect(precheckCallAllowance({ wallet: null, inProgram: false, role: "user" })).toBe("proceed");
    // An older server without freeCallAvailable.
    expect(
      precheckCallAllowance({
        wallet: { balance: 0 } as Wallet,
        inProgram: false,
        role: "user",
      }),
    ).toBe("proceed");
  });
});

describe("walletWithin", () => {
  it("answers the wallet when it comes in time", async () => {
    expect(await walletWithin(async () => wallet({ balance: 3 }), 50)).toMatchObject({ balance: 3 });
  });

  it("answers null on an error or a timeout", async () => {
    expect(await walletWithin(async () => Promise.reject(new Error("offline")), 50)).toBeNull();
    expect(await walletWithin(() => new Promise<Wallet>(() => {}), 20)).toBeNull();
    expect(CALL_PRECHECK_TIMEOUT_MS).toBe(3000);
  });
});

describe("the tap: pre-check, then the headphones gate", () => {
  it("0 credits + no weekly free call: the sheet, and the headphones gate is not reached", async () => {
    const sheet = jest.fn();
    expect(await tapCall(screenPrecheck(async () => wallet(), false, "user", sheet))).toEqual(["stopped"]);
    expect(sheet).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["weekly free call ready", wallet({ freeCallAvailable: true, nextFreeCallAt: null }), false, "user"],
    ["credits left", wallet({ balance: 1 }), false, "user"],
    ["program call by a reviewer", wallet(), true, "reviewer"],
    ["program call, role unknown", wallet(), true, undefined],
  ] as const)("%s: today's flow (headphones gate reached, no sheet)", async (_n, w, inProgram, role) => {
    const sheet = jest.fn();
    expect(await tapCall(screenPrecheck(async () => w, inProgram, role, sheet))).toEqual(["headphones_gate"]);
    expect(sheet).not.toHaveBeenCalled();
  });

  it("wallet error or timeout: today's flow", async () => {
    const sheet = jest.fn();
    expect(
      await tapCall(screenPrecheck(() => Promise.reject(new Error("offline")), false, "user", sheet)),
    ).toEqual(["headphones_gate"]);
    expect(await tapCall(screenPrecheck(() => new Promise<Wallet>(() => {}), false, "user", sheet))).toEqual([
      "headphones_gate",
    ]);
    expect(sheet).not.toHaveBeenCalled();
  });

  it("no pre-check, or one that throws: today's flow", async () => {
    expect(await tapCall(undefined)).toEqual(["headphones_gate"]);
    expect(
      await tapCall(async () => {
        throw new Error("boom");
      }),
    ).toEqual(["headphones_gate"]);
  });
});

describe("FirstCall is unchanged", () => {
  it("passes no pre-check to the call widget", () => {
    const src = fs.readFileSync(
      path.join(__dirname, "../../../screens/FirstCall/index.tsx"),
      "utf8",
    );
    expect(src).toContain("<CallingWidget");
    expect(src).not.toContain("onBeforeCallGate");
  });
});
