import {
  APPLE_CANCEL_HELP_URL,
  STORE_SUBSCRIPTIONS_URL,
  deleteAccountRenewalNotice,
  deviceStoreFor,
  freeDaysLine,
  paywallView,
  purchaseConfirmed,
  type PaywallViewInput,
} from "../paywallView";
import type { User } from "../../../api/users";

type M = NonNullable<User["membership"]>;

const view = (
  membership: Partial<M> | null,
  extra: Partial<PaywallViewInput> = {},
) =>
  paywallView({
    membership: membership as M | null,
    platformOS: "ios",
    picked: null,
    monthlyLabel: "$2.99",
    annualLabel: "$34.99",
    monthlyKnown: true,
    annualKnown: true,
    endDateText: "December 7, 2026",
    ...extra,
  });

const free: Partial<M> = {
  active: false,
  until: null,
  daysRemaining: null,
  willRenew: false,
  plan: null,
  source: null,
  store: null,
  freeUntil: null,
  billingIssue: false,
  actions: { pick: ["monthly", "annual"], primary: "buy" },
};

const packBonus: Partial<M> = {
  active: true,
  until: "2026-12-07T00:00:00Z",
  daysRemaining: 12,
  willRenew: false,
  plan: null,
  source: "pack_bonus",
  store: null,
  freeUntil: "2026-12-07T00:00:00Z",
  billingIssue: false,
  actions: { pick: ["monthly", "annual"], primary: "buy" },
};

const monthlyApple: Partial<M> = {
  active: true,
  until: "2026-12-07T00:00:00Z",
  daysRemaining: 30,
  willRenew: true,
  plan: "monthly",
  source: "purchase",
  store: "app_store",
  freeUntil: null,
  billingIssue: false,
  actions: { pick: ["annual"], primary: "upgrade" },
};

const annualApple: Partial<M> = {
  ...monthlyApple,
  plan: "annual",
  actions: { pick: [], primary: "manage" },
};

describe("paywallView", () => {
  describe("H2a: cards follow actions.pick", () => {
    it("a free user can pick both, and annual is picked first", () => {
      const v = view(free);
      expect(v.cards.monthly.enabled).toBe(true);
      expect(v.cards.annual.enabled).toBe(true);
      expect(v.selectedPlan).toBe("annual");
      expect(v.memberLayout).toBe(false);
      expect(v.cta).toMatchObject({
        kind: "buy",
        plan: "annual",
        label: "Start membership",
        enabled: true,
      });
    });

    it("the tapped card is kept; the button has no price (the plan row shows it)", () => {
      const v = view(free, { picked: "monthly" });
      expect(v.selectedPlan).toBe("monthly");
      expect(v.cta).toMatchObject({ label: "Start membership", plan: "monthly" });
    });

    it("a member on free days can pick both (they used to be disabled)", () => {
      const v = view(packBonus);
      expect(v.memberLayout).toBe(true);
      expect(v.cards.monthly.enabled).toBe(true);
      expect(v.cards.annual.enabled).toBe(true);
      expect(v.cards.annual.selected).toBe(true);
      expect(v.cta.kind).toBe("buy");
    });

    it("a monthly member can pick only annual, and the button upgrades", () => {
      const v = view(monthlyApple);
      expect(v.cards.monthly).toMatchObject({ enabled: false, current: true });
      expect(v.cards.annual).toMatchObject({ enabled: true, selected: true });
      expect(v.cta).toMatchObject({ kind: "upgrade", label: "Switch to yearly" });
      expect(v.showManageLink).toBe(true);
    });

    it("a monthly member cannot select a disabled card by tapping it", () => {
      const v = view(monthlyApple, { picked: "monthly" });
      expect(v.selectedPlan).toBe("annual");
    });

    it("an annual member manages, with no card to pick", () => {
      const v = view(annualApple);
      expect(v.cards.monthly.enabled).toBe(false);
      expect(v.cards.annual).toMatchObject({ enabled: false, current: true, selected: true });
      expect(v.cta).toMatchObject({ kind: "manage", label: "Manage Subscription" });
      expect(v.disclosure).toBe("current");
    });

    it("primary none shows no button and says there is no end date", () => {
      const v = view({
        active: true,
        plan: null,
        source: "unlimited",
        actions: { pick: [], primary: "none" },
      });
      expect(v.cta.kind).toBe("none");
      expect(v.notices).toEqual(["Your membership has no end date."]);
      expect(v.disclosure).toBeNull();
    });

    it("says Pricing unavailable rather than a dash price", () => {
      const v = view(free, { annualKnown: false });
      expect(v.cta).toMatchObject({ label: "Pricing unavailable", enabled: false });
    });

    it("the current plan footnote says Renews when it renews", () => {
      expect(view(monthlyApple).cards.monthly.endFootnote).toBe("Renews December 7, 2026");
    });
  });

  describe("H2a fallback: an older server sends no actions", () => {
    it("a free user can pick both", () => {
      const v = view({ active: false, until: null, daysRemaining: null });
      expect(v.cards.monthly.enabled && v.cards.annual.enabled).toBe(true);
      expect(v.cta.kind).toBe("buy");
    });

    it("a member with no plan (free days) can pick both", () => {
      const v = view({ active: true, until: "x", daysRemaining: 3, willRenew: false, plan: null });
      expect(v.cards.monthly.enabled && v.cards.annual.enabled).toBe(true);
      expect(v.selectedPlan).toBe("annual");
    });

    it("a monthly member on this device's store gets both cards disabled and the upgrade", () => {
      const v = view({ active: true, until: "x", daysRemaining: 3, willRenew: true, plan: "monthly", store: "app_store" });
      expect(v.cards.monthly.enabled || v.cards.annual.enabled).toBe(false);
      expect(v.cta.kind).toBe("upgrade");
    });

    // R3: the server answers {pick: [], primary: "manage"} for these, and the
    // fallback has to agree. An upgrade here would be a second plan on this
    // device's store beside the one they already pay for.
    it.each([
      ["missing", undefined],
      ["null", null],
      ["unknown", "unknown"],
      ["stripe", "stripe"],
    ] as const)("a monthly member whose store is %s gets Manage, never the upgrade", (_, store) => {
      const v = view({ active: true, until: "x", daysRemaining: 3, willRenew: true, plan: "monthly", store });
      expect(v.cta.kind).toBe("manage");
      expect(v.cards.monthly.enabled || v.cards.annual.enabled).toBe(false);
      expect(v.showManageLink).toBe(false);
      // No "switch to yearly" promise the button cannot keep.
      expect(view({ active: true, until: "x", daysRemaining: 3, willRenew: true, plan: "monthly", store }, { annualSavingsPct: 40 }).guarantee).toBe(
        "You are on the monthly plan.",
      );
    });

    it.each([null, "unknown", "stripe"] as const)(
      "an annual member whose store is %s gets Manage",
      (store) => {
        const v = view({ active: true, until: "x", daysRemaining: 3, willRenew: true, plan: "annual", store });
        expect(v.cta.kind).toBe("manage");
        expect(v.cards.monthly.enabled || v.cards.annual.enabled).toBe(false);
      },
    );

    it("on Android, a monthly Play plan still gets the upgrade", () => {
      const v = view(
        { active: true, until: "x", daysRemaining: 3, willRenew: true, plan: "monthly", store: "play_store" },
        { platformOS: "android" },
      );
      expect(v.cta.kind).toBe("upgrade");
    });

    it("an inactive plan with no store is still a buyer", () => {
      const v = view({ active: false, until: null, daysRemaining: null, plan: "monthly", store: "unknown" });
      expect(v.cta.kind).toBe("buy");
    });

    it("an annual member gets Manage", () => {
      const v = view({ active: true, until: "x", daysRemaining: 3, willRenew: true, plan: "annual" });
      expect(v.cta.kind).toBe("manage");
    });

    it("no membership at all is a buyer", () => {
      expect(view(null).cta.kind).toBe("buy");
    });
  });

  describe("H2b: free days end when the plan starts", () => {
    // M3 (founder-approved wording, 9 Nov 2026).
    const now = new Date("2026-11-09T12:00:00Z");
    const dec7 = new Date("2026-12-07T00:00:00Z").toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
    });

    it("shows the line above the button when they can buy, with the free-days end", () => {
      expect(view(packBonus, { now }).notices).toEqual([
        `Enjoy your free days until ${dec7}. If you buy now, your plan starts today.`,
      ]);
    });

    it("shows it for an upgrade too", () => {
      const v = view(
        { ...packBonus, actions: { pick: ["annual"], primary: "upgrade" } },
        { now },
      );
      expect(v.notices[0]).toMatch(/^Enjoy your free days until .+\. If you buy now, your plan starts today\.$/);
    });

    it("says nothing about free days when they cannot buy", () => {
      const v = view({ ...packBonus, actions: { pick: [], primary: "none" } });
      expect(v.notices).toEqual(["Your membership has no end date."]);
    });

    it("says nothing about free days when they have none", () => {
      expect(view(free).notices).toEqual([]);
    });
  });

  describe("H2c: a plan that will not renew", () => {
    const ending: Partial<M> = { ...monthlyApple, willRenew: false };

    it("the card says Ends, not Renews", () => {
      expect(view(ending).cards.monthly.endFootnote).toBe("Ends December 7, 2026");
    });

    it("the line under the button says it ends and will not renew", () => {
      expect(view(ending).guarantee).toBe(
        "Your plan ends on December 7, 2026. To keep it, turn renewal back on in the App Store.",
      );
    });

    it("a renewing monthly plan names the yearly saving", () => {
      expect(view(monthlyApple, { annualSavingsPct: 42 }).guarantee).toBe(
        "You are on the monthly plan. Switch to yearly and save 42%.",
      );
    });

    it("claims no saving it cannot price", () => {
      expect(view(monthlyApple).guarantee).toBe("You are on the monthly plan.");
    });
  });

  describe("H2e: the plan is on the other store", () => {
    it("on iPhone with a Google Play plan, offers only Google Play", () => {
      const v = view({ ...monthlyApple, store: "play_store" });
      expect(v.cards.monthly.enabled || v.cards.annual.enabled).toBe(false);
      expect(v.cta).toMatchObject({
        kind: "openStore",
        label: "Open Google Play",
        url: "https://play.google.com/store/account/subscriptions",
      });
      expect(v.notices[0]).toBe("You bought your plan on Google Play. Change or cancel it there.");
      expect(v.showManageLink).toBe(false);
      expect(v.disclosure).toBeNull();
    });

    it("on Android with an App Store plan, sends them to Apple's own steps", () => {
      // Apple does not let us cancel for them, and the App Store web address
      // does nothing on an Android phone.
      const v = view(annualApple, { platformOS: "android" });
      expect(v.cta).toMatchObject({
        kind: "openStore",
        label: "Open Apple's steps",
        url: "https://support.apple.com/118428",
      });
      expect(v.notices[0]).toBe(
        "You pay for your plan through Apple. To change or cancel it without an iPhone, follow Apple's steps.",
      );
      expect(v.cards.monthly.enabled || v.cards.annual.enabled).toBe(false);
    });

    it("a failed Apple payment seen on Android points to Apple, not the App Store", () => {
      const v = view({ ...annualApple, billingIssue: true }, { platformOS: "android" });
      expect(v.notices).toContain(
        "Your last payment did not go through. To keep your membership, update your payment details with Apple.",
      );
    });

    it("the same store behaves normally", () => {
      expect(view(monthlyApple, { platformOS: "ios" }).cta.kind).toBe("upgrade");
    });

    it("never offers free-days buying on the other store", () => {
      const v = view({ ...packBonus, store: "play_store" });
      expect(v.cta.kind).toBe("openStore");
      expect(v.notices.some((n) => n.includes("free day"))).toBe(false);
    });

    it("a store it cannot name falls back to the server's actions", () => {
      expect(view({ ...monthlyApple, store: "stripe" }).cta.kind).toBe("upgrade");
    });
  });

  describe("billing issue", () => {
    it("names the store that bills them, above the button", () => {
      const v = view({ ...monthlyApple, billingIssue: true });
      expect(v.notices).toContain(
        "Your last payment did not go through. To keep your membership, update your payment details in the App Store.",
      );
      expect(v.cta).toMatchObject({
        kind: "openStore",
        label: "Update payment",
        url: "https://apps.apple.com/account/subscriptions",
      });
      expect(v.guarantee).toBe("You are on the monthly plan.");
      expect(v.cards.annual.enabled).toBe(false);
      expect(v.cards.annual.selected).toBe(false);
    });

    it("names Google Play for a Play plan", () => {
      const v = view(
        { ...monthlyApple, store: "play_store", billingIssue: true },
        { platformOS: "android" },
      );
      expect(v.notices).toEqual([
        "Your last payment did not go through. To keep your membership, update your payment details in Google Play.",
      ]);
    });
  });

  describe("store billing retry (willRenew stays true)", () => {
    it("shows the billing notice and Renews, not Ends", () => {
      const v = view({ ...monthlyApple, billingIssue: true, willRenew: true });
      expect(v.notices).toContain(
        "Your last payment did not go through. To keep your membership, update your payment details in the App Store.",
      );
      expect(v.cards.monthly.endFootnote).toBe("Renews December 7, 2026");
      expect(v.cta).toMatchObject({ kind: "openStore", label: "Update payment" });
    });

    it("an older server that sends willRenew false still reads Ends", () => {
      const v = view({ ...monthlyApple, billingIssue: true, willRenew: false });
      expect(v.cards.monthly.endFootnote).toBe("Ends December 7, 2026");
    });
  });

  it("no notice line uses an em dash", () => {
    const all = [
      view(packBonus),
      view({ ...monthlyApple, billingIssue: true, willRenew: false }),
      view({ ...monthlyApple, store: "play_store" }),
    ].flatMap((v) => [...v.notices, v.guarantee]);
    expect(all.join(" ")).not.toMatch(/—/);
  });
});

describe("deviceStoreFor", () => {
  it("maps the platform to its store", () => {
    expect(deviceStoreFor("ios")).toBe("app_store");
    expect(deviceStoreFor("android")).toBe("play_store");
    expect(deviceStoreFor("web")).toBeNull();
  });
});

describe("freeDaysLine (M3)", () => {
  const now = new Date("2026-11-09T12:00:00Z");
  const fmt = (iso: string, withYear = false) =>
    new Date(iso).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      ...(withYear ? { year: "numeric" as const } : {}),
    });

  it("names the end of the free days, from freeUntil", () => {
    expect(freeDaysLine({ freeUntil: "2026-12-08T00:00:00Z", until: null, source: "pack_bonus" }, now)).toBe(
      `Enjoy your free days until ${fmt("2026-12-08T00:00:00Z")}. If you buy now, your plan starts today.`,
    );
  });

  it("falls back to until for free-month or gift access", () => {
    for (const source of ["pack_bonus", "grant"] as const) {
      expect(freeDaysLine({ freeUntil: null, until: "2026-12-08T00:00:00Z", source }, now)).toBe(
        `Enjoy your free days until ${fmt("2026-12-08T00:00:00Z")}. If you buy now, your plan starts today.`,
      );
    }
  });

  it("never uses a store plan's until as the free-days end", () => {
    expect(freeDaysLine({ freeUntil: null, until: "2026-12-08T00:00:00Z", source: "purchase" }, now)).toBe(
      "Enjoy your free days. If you buy now, your plan starts today.",
    );
  });

  it("adds the year only when it is not this year", () => {
    expect(freeDaysLine({ freeUntil: "2027-01-05T00:00:00Z", until: null, source: "pack_bonus" }, now)).toBe(
      `Enjoy your free days until ${fmt("2027-01-05T00:00:00Z", true)}. If you buy now, your plan starts today.`,
    );
    expect(fmt("2027-01-05T00:00:00Z", true)).toMatch(/2027/);
    expect(fmt("2026-12-08T00:00:00Z")).not.toMatch(/2026/);
  });

  it("with no date: the line without one", () => {
    const line = "Enjoy your free days. If you buy now, your plan starts today.";
    expect(freeDaysLine(null, now)).toBe(line);
    expect(freeDaysLine({ freeUntil: "not a date", until: null, source: "pack_bonus" }, now)).toBe(line);
  });

  it("keeps house style", () => {
    expect(freeDaysLine(null, now)).not.toMatch(/—/);
  });
});

describe("purchaseConfirmed for the exhaustion sheet's monthly purchase", () => {
  it("does not confirm on free days, which already carry the membership entitlement", () => {
    expect(purchaseConfirmed(packBonus as M, "monthly")).toBe(false);
  });

  it("confirms once the server shows a store plan", () => {
    expect(purchaseConfirmed(monthlyApple as M, "monthly")).toBe(true);
    expect(
      purchaseConfirmed({ ...packBonus, source: "purchase" } as M, "monthly"),
    ).toBe(true);
  });
});

describe("purchaseConfirmed", () => {
  it("does not end the wait on free days alone", () => {
    expect(purchaseConfirmed(packBonus as M, "annual")).toBe(false);
    expect(purchaseConfirmed(packBonus as M, "monthly")).toBe(false);
  });

  it("ends when the server shows the plan", () => {
    expect(purchaseConfirmed({ ...packBonus, plan: "annual" } as M, "annual")).toBe(true);
    expect(purchaseConfirmed({ ...packBonus, plan: "monthly" } as M, "monthly")).toBe(true);
    expect(purchaseConfirmed({ ...packBonus, source: "purchase" } as M, "monthly")).toBe(true);
  });

  it("an upgrade waits for annual, not the monthly plan they had", () => {
    expect(purchaseConfirmed(monthlyApple as M, "annual")).toBe(false);
    expect(purchaseConfirmed(annualApple as M, "annual")).toBe(true);
  });

  it("an inactive membership is never confirmed", () => {
    expect(purchaseConfirmed({ ...free, plan: "annual" } as M, "annual")).toBe(false);
    expect(purchaseConfirmed(null, "annual")).toBe(false);
  });
});

describe("deleteAccountRenewalNotice", () => {
  const renewing = (over: Partial<M> = {}): M =>
    ({
      active: true,
      until: "2026-12-07T00:00:00Z",
      daysRemaining: 30,
      plan: "monthly",
      source: "purchase",
      willRenew: true,
      store: "app_store",
      ...over,
    }) as M;

  it("says nothing when nothing renews", () => {
    expect(deleteAccountRenewalNotice(null, "ios")).toBeNull();
    expect(deleteAccountRenewalNotice(renewing({ active: false }), "ios")).toBeNull();
    expect(deleteAccountRenewalNotice(renewing({ willRenew: false }), "ios")).toBeNull();
    expect(deleteAccountRenewalNotice(renewing({ willRenew: undefined }), "ios")).toBeNull();
    expect(deleteAccountRenewalNotice(renewing({ source: "pack_bonus" }), "ios")).toBeNull();
    expect(deleteAccountRenewalNotice(renewing({ source: "grant" }), "ios")).toBeNull();
  });

  it("an App Store plan on an iPhone opens the native sheet", () => {
    expect(deleteAccountRenewalNotice(renewing(), "ios")).toEqual({
      line: "Your membership keeps renewing until you cancel it in the App Store.",
      manage: { kind: "native" },
    });
  });

  it("a Google Play plan on Android opens the native place", () => {
    expect(deleteAccountRenewalNotice(renewing({ store: "play_store" }), "android")).toEqual({
      line: "Your membership keeps renewing until you cancel it in Google Play.",
      manage: { kind: "native" },
    });
  });

  it("an Apple plan on Android says with Apple and opens Apple's steps", () => {
    expect(deleteAccountRenewalNotice(renewing(), "android")).toEqual({
      line: "Your membership keeps renewing until you cancel it with Apple.",
      manage: { kind: "url", url: APPLE_CANCEL_HELP_URL },
    });
  });

  it("a Google Play plan on an iPhone opens Google Play's page", () => {
    expect(deleteAccountRenewalNotice(renewing({ store: "play_store" }), "ios")).toEqual({
      line: "Your membership keeps renewing until you cancel it in Google Play.",
      manage: { kind: "url", url: STORE_SUBSCRIPTIONS_URL.play_store },
    });
  });

  it("an unknown store falls back to this device's store", () => {
    for (const store of [null, undefined, "unknown", "stripe"] as const) {
      expect(deleteAccountRenewalNotice(renewing({ store }), "android")).toEqual({
        line: "Your membership keeps renewing until you cancel it in Google Play.",
        manage: { kind: "native" },
      });
      expect(deleteAccountRenewalNotice(renewing({ store }), "ios")?.line).toBe(
        "Your membership keeps renewing until you cancel it in the App Store.",
      );
    }
  });

  it("says nothing with no store to name", () => {
    expect(deleteAccountRenewalNotice(renewing({ store: null }), "web")).toBeNull();
  });
});
