import {
  useDiscoveryPromptStore,
  shouldOfferDiscovery,
} from "../discoveryPrompt";

/**
 * When we offer to list someone in buddy discovery.
 *
 * The rule this encodes: ask ONCE, at the moment the person has said they want
 * to find someone — not on arrival. Asking on arrival is what the notification
 * permission ask had to be moved away from ("ask at a moment worth spending"):
 * it fired before the person had seen what the app does, and got a reflex
 * rather than a decision. Being findable in a stuttering-support app is itself
 * a disclosure, so a reflex is the wrong answer to have on file.
 *
 * The store deliberately holds NO entitlement — whether someone IS discoverable
 * is the server's answer, and these tests pin that the server always wins.
 */
describe("useDiscoveryPromptStore", () => {
  beforeEach(() => {
    useDiscoveryPromptStore.setState({ offeredAt: null });
  });

  it("has made no offer until one is made", () => {
    expect(useDiscoveryPromptStore.getState().offeredAt).toBeNull();
  });

  it("records when the offer was made", () => {
    useDiscoveryPromptStore.getState().markOffered();
    expect(useDiscoveryPromptStore.getState().offeredAt).toEqual(expect.any(Number));
  });

  it("does not move the timestamp on a second call", () => {
    // Idempotent: the record is of the FIRST offer. Letting a later screen
    // push it forward would make the ask look recent and, once a "re-offer
    // after N months" policy exists, reset that clock every time.
    useDiscoveryPromptStore.getState().markOffered();
    const first = useDiscoveryPromptStore.getState().offeredAt;
    useDiscoveryPromptStore.getState().markOffered();
    expect(useDiscoveryPromptStore.getState().offeredAt).toBe(first);
  });
});

describe("shouldOfferDiscovery", () => {
  it("makes the full offer to someone who has never been asked", () => {
    expect(shouldOfferDiscovery(false, null)).toBe(true);
  });

  it("falls back to the quiet row once they have been asked", () => {
    // Declining is answered once and then left alone — the quiet row keeps the
    // door open without a second interrupt.
    expect(shouldOfferDiscovery(false, 1_700_000_000_000)).toBe(false);
  });

  it("never offers to somebody already listed", () => {
    expect(shouldOfferDiscovery(true, null)).toBe(false);
  });

  it("lets the SERVER's answer win over anything recorded locally", () => {
    // The store holds no entitlement. Someone who turned listing on from
    // Settings on another device must not be re-offered here just because this
    // device has no record of asking.
    expect(shouldOfferDiscovery(true, null)).toBe(false);
    expect(shouldOfferDiscovery(true, 1_700_000_000_000)).toBe(false);
  });
});
