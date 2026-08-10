import { useInboxStore } from "../inbox";

/**
 * The inbox store drives the Community tab badge.
 *
 * The contract worth pinning is that pending buddy requests are counted
 * SEPARATELY from unread thread activity. Folding them together is the obvious
 * shortcut and it is wrong twice over: viewing the timeline calls
 * `clearUnread()`, which would silently discard unanswered requests as a side
 * effect, and the badge's accessibility label reads "N unread", which is a
 * false description of a pairing request.
 */
describe("useInboxStore", () => {
  beforeEach(() => {
    useInboxStore.setState({
      unreadCount: 0,
      hasBuddy: null,
      pendingRequestCount: 0,
    });
  });

  it("starts with hasBuddy unknown, not false", () => {
    // `null` vs `false` is load-bearing: CustomTabBar swaps the Community icon
    // on `hasBuddy === false`, so a premature false flickers the wrong icon on
    // every cold start before the first load resolves.
    expect(useInboxStore.getState().hasBuddy).toBeNull();
  });

  it("clamps a negative or garbage unread count to zero", () => {
    useInboxStore.getState().setUnreadCount(-5);
    expect(useInboxStore.getState().unreadCount).toBe(0);
    useInboxStore.getState().setUnreadCount(NaN);
    expect(useInboxStore.getState().unreadCount).toBe(0);
  });

  it("clamps the pending request count the same way", () => {
    useInboxStore.getState().setPendingRequestCount(-1);
    expect(useInboxStore.getState().pendingRequestCount).toBe(0);
  });

  it("does NOT discard pending requests when the timeline is read", () => {
    // The exact regression the separate field exists to prevent.
    useInboxStore.getState().setUnreadCount(4);
    useInboxStore.getState().setPendingRequestCount(2);

    useInboxStore.getState().clearUnread();

    expect(useInboxStore.getState().unreadCount).toBe(0);
    expect(useInboxStore.getState().pendingRequestCount).toBe(2);
  });

  it("keeps the two counters independent in the other direction too", () => {
    useInboxStore.getState().setUnreadCount(3);
    useInboxStore.getState().setPendingRequestCount(0);
    expect(useInboxStore.getState().unreadCount).toBe(3);
  });
});
