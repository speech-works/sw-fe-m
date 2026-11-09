/**
 * Log Out must not wait on the network, and the server is told exactly once
 * (founder, 9 Nov 2026: about 2.5 s of nothing on a real phone, and POST
 * /auth/logout was sent twice).
 */
import { signOutNow, tellServerSignedOut, type SignOutDeps } from "../signOut";

const flush = async () => {
  for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0));
};
const never = () => new Promise<never>(() => {});

beforeEach(() => {
  jest.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

/** A fake phone: secrets live in `store` until clearSession wipes them. */
function phone(over: Partial<SignOutDeps> = {}) {
  const store = { appJwt: "jwt" as string | null, refreshToken: "rt" as string | null, pushToken: "push" as string | null };
  const order: string[] = [];
  const deps: SignOutDeps = {
    readSecrets: async () => {
      order.push("read");
      return { ...store };
    },
    clearSession: jest.fn(async () => {
      order.push("clear");
      store.appJwt = null;
      store.refreshToken = null;
      store.pushToken = null;
    }),
    removePushToken: jest.fn(async () => {
      order.push("removePush");
    }),
    revokeSession: jest.fn(async () => {
      order.push("revoke");
    }),
    ...over,
  };
  return { deps, order, store };
}

describe("signOutNow", () => {
  it("clears the session at once, even while the server never answers", async () => {
    const { deps } = phone({ removePushToken: jest.fn(never), revokeSession: jest.fn(never) });
    await signOutNow(deps); // resolves although both server calls hang
    expect(deps.clearSession).toHaveBeenCalledTimes(1);
  });

  it("reads the tokens before the clear deletes them, and tells the server once", async () => {
    const { deps, order } = phone();
    await signOutNow(deps);
    await flush();
    expect(order[0]).toBe("read");
    expect(order).toContain("clear");
    expect(deps.removePushToken).toHaveBeenCalledTimes(1);
    expect(deps.removePushToken).toHaveBeenCalledWith("push", "jwt");
    expect(deps.revokeSession).toHaveBeenCalledTimes(1);
    expect(deps.revokeSession).toHaveBeenCalledWith({ refreshToken: "rt", appJwt: "jwt" });
  });

  it("server failures are caught and logged, and never undo the sign-out", async () => {
    const { deps } = phone({
      removePushToken: jest.fn(async () => {
        throw new Error("offline");
      }),
      revokeSession: jest.fn(() => {
        throw new Error("boom"); // even a synchronous throw
      }),
    });
    await signOutNow(deps);
    await flush();
    expect(deps.clearSession).toHaveBeenCalledTimes(1);
    expect(deps.revokeSession).toHaveBeenCalledTimes(1); // still tried after the push failure
    expect(console.warn).toHaveBeenCalledTimes(2);
  });

  it("signs out with no server call when the secrets cannot be read", async () => {
    const { deps } = phone({
      readSecrets: async () => {
        throw new Error("keychain locked");
      },
    });
    await signOutNow(deps);
    await flush();
    expect(deps.clearSession).toHaveBeenCalledTimes(1);
    expect(deps.removePushToken).not.toHaveBeenCalled();
    expect(deps.revokeSession).not.toHaveBeenCalled();
  });
});

describe("tellServerSignedOut", () => {
  const deps = () => ({ removePushToken: jest.fn(async () => {}), revokeSession: jest.fn(async () => {}) });

  it("removes the push token first, then revokes the session", async () => {
    const order: string[] = [];
    await tellServerSignedOut(
      { appJwt: "jwt", refreshToken: "rt", pushToken: "push" },
      {
        removePushToken: async () => void order.push("push"),
        revokeSession: async () => void order.push("revoke"),
      },
    );
    expect(order).toEqual(["push", "revoke"]);
  });

  it("skips what it has no token for", async () => {
    const noPush = deps();
    await tellServerSignedOut({ appJwt: "jwt", refreshToken: "rt", pushToken: null }, noPush);
    expect(noPush.removePushToken).not.toHaveBeenCalled();
    expect(noPush.revokeSession).toHaveBeenCalledTimes(1);

    const noJwt = deps();
    await tellServerSignedOut({ appJwt: null, refreshToken: "rt", pushToken: "push" }, noJwt);
    expect(noJwt.removePushToken).not.toHaveBeenCalled();
    expect(noJwt.revokeSession).not.toHaveBeenCalled();
  });
});
