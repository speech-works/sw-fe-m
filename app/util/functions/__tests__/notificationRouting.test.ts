import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";

import {
  notificationResponseKey,
  setupNotificationHandlers,
} from "../notifications";
import { navigate } from "../navigation";
import { useUserStore } from "../../../stores/user";
import { ROUTE_NAMES } from "../../../constants/routes";

/**
 * Where a notification tap sends you — the one piece of this file that is a
 * decision rather than plumbing, and the piece that had no coverage when it
 * broke.
 *
 * "TAP" IS OPTIMISTIC, and that is the whole reason these tests exist. Android
 * hands the launching Intent back to a recreated Activity, so a single tap is
 * replayed as a fresh response on every relaunch from the Recents list. The
 * listener therefore has to be safe to fire on a plain cold start.
 *
 * THE BUG THIS PINS DOWN: the logged-out branch used to `navigate("Auth")`.
 * Inert when the signed-out half of the app was a single login screen;
 * destructive the moment Act 1 moved in front of it — a stranger opened on the
 * welcome screen and was pulled onto the login wall half a second later.
 */

jest.mock("../navigation", () => ({ navigate: jest.fn() }));

// Network layer — startup registration is not what is under test here.
jest.mock("../../../api/devices", () => ({
  registerPushToken: jest.fn(),
  removePushToken: jest.fn(),
}));

// Mocked rather than driven through the real store: the genuine one drags in
// PostHog, RevenueCat and SecureStore at import time, none of which have an
// opinion about routing.
jest.mock("../../../stores/user", () => ({
  useUserStore: { getState: jest.fn(() => ({ user: null })) },
}));

jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({
    remove: jest.fn(),
  })),
  AndroidImportance: { HIGH: 4 },
  IosAuthorizationStatus: { PROVISIONAL: 3 },
  SchedulableTriggerInputTypes: { CALENDAR: "calendar" },
}));

/** Drain pending promise jobs without advancing fake timers. */
const flush = async () => {
  for (let i = 0; i < 5; i += 1) await Promise.resolve();
};

/**
 * A response as the native side hands it over. `identifier` and `date` together
 * name one DELIVERY — see `notificationResponseKey` for why both are needed.
 */
const buildResponse = (
  data: Record<string, unknown>,
  { identifier = "req_1", date = 1_754_000_000_000 } = {},
) => ({
  notification: { date, request: { identifier, content: { data } } },
});

/** The listener the module registered, invoked with a response of our making. */
const fireResponse = async (
  data: Record<string, unknown>,
  options?: { identifier?: string; date?: number },
) => {
  const listener = (
    Notifications.addNotificationResponseReceivedListener as jest.Mock
  ).mock.calls[0][0];
  listener(buildResponse(data, options));
  // Routing defers by 500ms so the app can finish foregrounding.
  jest.advanceTimersByTime(500);
  // The routing itself awaits AsyncStorage, so let those microtasks drain.
  await flush();
};

const setSignedIn = (signedIn: boolean) =>
  (useUserStore.getState as jest.Mock).mockReturnValue({
    user: signedIn ? { id: "u_1" } : null,
  });

describe("notification tap routing", () => {
  let cleanup: () => void;

  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.useFakeTimers();
    (navigate as jest.Mock).mockClear();
    cleanup = setupNotificationHandlers();
  });

  afterEach(() => {
    cleanup();
    jest.useRealTimers();
  });

  it("leaves a signed-out person exactly where the auth stack put them", async () => {
    setSignedIn(false);

    await fireResponse({ category: "CUSTOM" });

    // The regression: this used to navigate("Auth"), tearing a first-time user
    // off the pre-signup welcome screen. There is nothing to deep-link into
    // without an account, so the correct move is to do nothing at all.
    expect(navigate).not.toHaveBeenCalled();
  });

  it("still routes a signed-in person to Home for an uncategorised reminder", async () => {
    setSignedIn(true);

    await fireResponse({ category: "CUSTOM" });

    expect(navigate).toHaveBeenCalledWith("Root", {
      screen: ROUTE_NAMES.HOME,
    });
  });

  it("sends a buddy signal to the Community tab", async () => {
    setSignedIn(true);

    await fireResponse({ type: "reaction" });

    expect(navigate).toHaveBeenCalledWith("Root", {
      screen: ROUTE_NAMES.COMMUNITY,
    });
  });

  it("sends a buddy REQUEST to the Community tab, with no threadId to lean on", async () => {
    // Every other buddy push carries a threadId and would route on that alone.
    // A request has no thread — none exists until it is accepted — so this can
    // only work if the type itself is recognised.
    setSignedIn(true);

    await fireResponse({ type: "buddy_request", requestId: "r1" });

    expect(navigate).toHaveBeenCalledWith("Root", {
      screen: ROUTE_NAMES.COMMUNITY,
    });
  });

  it("sends an accepted-request push to the Community tab", async () => {
    setSignedIn(true);

    await fireResponse({ type: "buddy_request_accepted", threadId: "t1" });

    expect(navigate).toHaveBeenCalledWith("Root", {
      screen: ROUTE_NAMES.COMMUNITY,
    });
  });

  it("reads the session when it navigates, not when the tap arrives", async () => {
    // The store rehydrates from AsyncStorage asynchronously and this listener
    // fires at the very start of a cold launch, so a session read taken at
    // event time can report "logged out" for someone who is merely still on
    // disk — and silently drop their deep link.
    setSignedIn(false);

    const listener = (
      Notifications.addNotificationResponseReceivedListener as jest.Mock
    ).mock.calls[0][0];
    listener(buildResponse({}));

    setSignedIn(true);
    jest.advanceTimersByTime(500);
    await flush();

    expect(navigate).toHaveBeenCalledWith("Root", {
      screen: ROUTE_NAMES.HOME,
    });
  });

  describe("the replayed launch Intent", () => {
    it("acts on a delivery once, however many times it is re-delivered", async () => {
      setSignedIn(true);

      await fireResponse({ category: "CUSTOM" });
      expect(navigate).toHaveBeenCalledTimes(1);

      // Same identifier, same date — this is the SAME tap handed back by
      // Android on a later launch, not a new one.
      await fireResponse({ category: "CUSTOM" });
      await fireResponse({ category: "CUSTOM" });

      expect(navigate).toHaveBeenCalledTimes(1);
    });

    it("does not let a repeating reminder suppress its own next trigger", async () => {
      setSignedIn(true);

      // A reminder scheduled with `repeats: true` keeps ONE request identifier
      // for every trigger. Deduping on the identifier alone would mean Monday's
      // tap silently swallowed Tuesday's — which is why the date is in the key.
      await fireResponse({ category: "CUSTOM" }, { identifier: "weekly" });
      await fireResponse(
        { category: "CUSTOM" },
        { identifier: "weekly", date: 1_754_086_400_000 },
      );

      expect(navigate).toHaveBeenCalledTimes(2);
    });

    it("spends a response seen while signed out, so signing in cannot revive it", async () => {
      setSignedIn(false);
      await fireResponse({ category: "CUSTOM" });
      expect(navigate).not.toHaveBeenCalled();

      // They sign in, then relaunch from Recents and the same Intent replays.
      // Without claiming the response up front, this stale tap would teleport
      // them out of wherever the app opened.
      setSignedIn(true);
      await fireResponse({ category: "CUSTOM" });

      expect(navigate).not.toHaveBeenCalled();
    });

    it("routes normally when the response carries no usable identity", async () => {
      setSignedIn(true);

      // The Intent-extras path rebuilds a response from raw extras, where
      // anything that is not an FCM push arrives with a null identifier and a
      // zero date. Failing OPEN is deliberate: dropping a tap the user really
      // made is worse than the duplicate this guards against.
      await fireResponse({ category: "CUSTOM" }, { identifier: "", date: 0 });
      await fireResponse({ category: "CUSTOM" }, { identifier: "", date: 0 });

      expect(navigate).toHaveBeenCalledTimes(2);
    });
  });
});

describe("notificationResponseKey", () => {
  const key = (notification: unknown) =>
    notificationResponseKey({ notification } as never);

  it("names one delivery by identifier and date together", () => {
    expect(key({ date: 1_754_000_000_000, request: { identifier: "abc" } })).toBe(
      "abc:1754000000000",
    );
  });

  it("has no opinion when the identifier is missing", () => {
    // `google.message_id` is absent for anything that is not an FCM push.
    expect(key({ date: 1_754_000_000_000, request: { identifier: null } })).toBeNull();
  });

  it("has no opinion when the date is missing", () => {
    // `google.sent_time` reads back as 0 rather than as absent.
    expect(key({ date: 0, request: { identifier: "abc" } })).toBeNull();
  });
});
