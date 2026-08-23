import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { SECURE_KEYS_NAME } from "../../constants/secureStorageKeys";
import { EVENT_NAMES } from "../../stores/events/constants";
import { dispatchCustomEvent } from "../../util/functions/events";
import { resetAuthInterceptor } from "../axiosClient";

/**
 * The renewal branch of the response interceptor, which decides whether a
 * signed-in person keeps their session.
 *
 * It had two faults, and both ended the same way: local credentials wiped and
 * the login screen shown.
 *
 *   1. It read `token` off POST /auth/refresh. The server has always sent
 *      `appJwt` (asserted on the other side in sw-be-2 authRefresh.test.ts).
 *      So renewal never once worked, and roughly a day after signing in —
 *      whenever the app next made a request — every user was logged out.
 *   2. One catch covered the network call AND the parsing, so an offline
 *      moment or a timeout destroyed the session exactly like a rejected
 *      credential did.
 *
 * The point of these tests is the DISTINCTION: only a refusal from the server
 * may log anyone out.
 */

// A stand-in for the instance axios.create() returns. It is built INSIDE the
// factory and handed back on the module, because `jest.mock` is hoisted above
// every `const` in this file: an instance declared out here would still be
// undefined when axiosClient.ts calls create() at import time.
//
// It has to be callable, because the interceptor re-issues the original
// request through it.
jest.mock("axios", () => {
  const instance: any = jest.fn(() => Promise.resolve({ data: "retried" }));
  instance.interceptors = {
    request: { use: jest.fn() },
    response: { use: jest.fn() },
  };
  instance.defaults = { headers: { common: {} } };
  return {
    __esModule: true,
    default: { create: () => instance, post: jest.fn(), __instance: instance },
  };
});

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock("expo-localization", () => ({
  getCalendars: () => [{ timeZone: "UTC" }],
}));

jest.mock("../../util/functions/events", () => ({
  dispatchCustomEvent: jest.fn(),
}));

jest.mock("../../util/functions/authToken", () => ({
  getUpdateTokenFn: () => jest.fn(),
  setUpdateTokenFn: jest.fn(),
}));

const store = SecureStore as unknown as {
  getItemAsync: jest.Mock;
  setItemAsync: jest.Mock;
};
const post = (axios as unknown as { post: jest.Mock }).post;
const mockInstance = (axios as unknown as { __instance: any }).__instance;
const dispatched = dispatchCustomEvent as jest.Mock;

/**
 * The interceptor's rejection handler, captured at import time.
 *
 * Read here and not in `beforeEach`, because the config sets `clearMocks`,
 * which wipes the recorded `use(...)` call before every test.
 */
const onRejected: (error: any) => Promise<any> =
  mockInstance.interceptors.response.use.mock.calls[0][1];

const unauthorized = () => ({
  config: { headers: {} },
  response: { status: 401 },
});

const loggedOut = () =>
  dispatched.mock.calls.some((c) => c[0] === EVENT_NAMES.USER_LOGGED_OUT);

beforeEach(() => {
  jest.clearAllMocks();

  store.getItemAsync.mockImplementation(async (key: string) =>
    key === SECURE_KEYS_NAME.SW_APP_REFRESH_TOKEN_KEY ? "rt-1" : "old-jwt",
  );
  mockInstance.mockImplementation(() => Promise.resolve({ data: "retried" }));

  // One logout event is dispatched per dead session, so the module-level latch
  // has to be released between tests.
  resetAuthInterceptor();
});

describe("a 401 that the server can renew", () => {
  it("reads `appJwt`, not `token`", async () => {
    post.mockResolvedValue({ data: { appJwt: "fresh-jwt" } });

    await onRejected(unauthorized());

    expect(store.setItemAsync).toHaveBeenCalledWith(
      SECURE_KEYS_NAME.SW_APP_JWT_KEY,
      "fresh-jwt",
    );
    expect(loggedOut()).toBe(false);
  });

  it("retries the original request with the new token", async () => {
    post.mockResolvedValue({ data: { appJwt: "fresh-jwt" } });

    const result = await onRejected(unauthorized());

    expect(mockInstance).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: { Authorization: "Bearer fresh-jwt" },
      }),
    );
    expect(result).toEqual({ data: "retried" });
  });
});

describe("a failure that is NOT the server refusing the session", () => {
  // Each of these used to wipe the session. On a phone the first one is an
  // ordinary event, not an error.
  it("keeps the session when the network drops", async () => {
    post.mockRejectedValue(Object.assign(new Error("Network Error"), {}));

    await expect(onRejected(unauthorized())).rejects.toBeDefined();
    expect(loggedOut()).toBe(false);
  });

  it("keeps the session when the request times out", async () => {
    post.mockRejectedValue(
      Object.assign(new Error("timeout of 10000ms exceeded"), {
        code: "ECONNABORTED",
      }),
    );

    await expect(onRejected(unauthorized())).rejects.toBeDefined();
    expect(loggedOut()).toBe(false);
  });

  it("keeps the session when the server errors", async () => {
    post.mockRejectedValue({ response: { status: 500 } });

    await expect(onRejected(unauthorized())).rejects.toBeDefined();
    expect(loggedOut()).toBe(false);
  });

  it("keeps the session when the response field is renamed again", async () => {
    // The exact shape of the original bug. It must now surface as a failed
    // request, never as a lost session.
    post.mockResolvedValue({ data: { somethingElse: "fresh-jwt" } });

    await expect(onRejected(unauthorized())).rejects.toBeDefined();
    expect(loggedOut()).toBe(false);
  });
});

describe("a session that is genuinely over", () => {
  it("logs out when the server rejects the refresh token", async () => {
    post.mockRejectedValue({ response: { status: 401 } });

    await expect(onRejected(unauthorized())).rejects.toBeDefined();
    expect(loggedOut()).toBe(true);
  });

  it("logs out when the server answers 200 with an error", async () => {
    post.mockResolvedValue({ data: { error: "Invalid refresh token" } });

    await expect(onRejected(unauthorized())).rejects.toBeDefined();
    expect(loggedOut()).toBe(true);
  });

  it("logs out when there is no refresh token to send", async () => {
    store.getItemAsync.mockImplementation(async (key: string) =>
      key === SECURE_KEYS_NAME.SW_APP_REFRESH_TOKEN_KEY ? null : "old-jwt",
    );

    await expect(onRejected(unauthorized())).rejects.toBeDefined();
    expect(loggedOut()).toBe(true);
  });

  it("stays quiet when there is no session at all", async () => {
    store.getItemAsync.mockResolvedValue(null);

    await expect(onRejected(unauthorized())).rejects.toBeDefined();
    expect(loggedOut()).toBe(false);
  });
});
