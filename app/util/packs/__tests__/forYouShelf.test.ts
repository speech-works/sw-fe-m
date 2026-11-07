import {
  allFinishedTitle,
  buildShelf,
  NEXT_PROGRAM_EYEBROW,
  otherProgramsTitle,
  ownerPickSubtitle,
  shownOffers,
  type ShelfInput,
  type ShelfView,
} from "../forYouShelf";
import type { OfferItem, Offers } from "../../../api/users";
import type { ActiveProgram } from "../../../components/Dashboard/useActiveProgram";

const offer = (key: string, extra: Partial<OfferItem> = {}): OfferItem =>
  ({
    key,
    title: key,
    shelf: "regular",
    tierProductId: `sw.tier.${key}`,
    priceInr: 999,
    priceUsd: 12,
    anchorPriceInr: 1999,
    anchorPriceUsd: 24,
    anchorTierProductId: null,
    owned: false,
    packId: `pack-${key}`,
    match: null,
    ...extra,
  }) as OfferItem;

const offers = (items: OfferItem[], extra: Partial<Offers> = {}): Offers =>
  ({ signalLevel: "intent", items, ...extra }) as Offers;

const program = (extra: Partial<ActiveProgram> = {}): ActiveProgram => ({
  packId: "pack-p",
  title: "Phone Calls",
  description: null,
  isRefresher: false,
  icon: null,
  catalogKey: "phone_calls",
  coverImage: null,
  nextModule: { id: "m2", orderIndex: 2, title: "Day 2" },
  moduleOrder: 2,
  totalModules: 7,
  percentComplete: 0.14,
  dayStarted: false,
  packStarted: true,
  nextModuleLocked: false,
  nextModuleDay: 2,
  currentDay: 2,
  nextDayOpensAt: null,
  ...extra,
});

const crisisSupport = {
  countryCode: "GB",
  helplineName: "Samaritans",
  phone: "116123",
  description: "Call 116 123, free from any phone, 24/7.",
};

const settled = { loading: false, program: null, allComplete: false };

const build = (partial: Partial<ShelfInput>): ShelfView =>
  buildShelf({
    offers: null,
    offersLoading: false,
    active: settled,
    ...partial,
  });

const ten = (owned: (i: number) => boolean = () => false) =>
  Array.from({ length: 10 }, (_, i) => offer(`p${i}`, { owned: owned(i) }));

const kinds = (v: ShelfView) =>
  v.kind === "carousel"
    ? v.slides.map((s) =>
        s.kind === "offer"
          ? `offer:${s.item.key}`
          : s.kind === "more"
            ? `more:${s.variant}`
            : s.kind,
      )
    : [];

describe("buildShelf", () => {
  describe("H1a: owns nothing, no signal", () => {
    const view = build({ offers: offers(ten(), { signalLevel: "none" }) });

    it("shows three real programs in server order, then See all", () => {
      expect(kinds(view)).toEqual([
        "offer:p0",
        "offer:p1",
        "offer:p2",
        "more:seeAll",
      ]);
    });

    it("titles the shelf Programs, never For you, and highlights nothing", () => {
      if (view.kind !== "carousel") throw new Error(view.kind);
      expect(view.heading).toBe("Programs");
      expect(view.highlightFirst).toBe(false);
      expect(view.headerAction?.label).toBe("See all");
      expect(view.variant).toBe("programs_no_signal");
    });

    it("drops any match the server sent, so no badge can appear", () => {
      const items = ten();
      items[0] = offer("p0", { match: { level: "top", reason: "You said…" } });
      const v = build({ offers: offers(items, { signalLevel: "none" }) });
      expect(shownOffers(v)[0].match).toBeNull();
    });

    it("keeps the browse card when nothing is openable", () => {
      const v = build({
        offers: offers([offer("ghost", { packId: null })], { signalLevel: "none" }),
      });
      expect(v.kind).toBe("browse");
    });

    it("keeps the browse card when the fetch failed", () => {
      expect(build({ offers: null }).kind).toBe("browse");
    });

    it("shows no See all tile when every program is already on the shelf", () => {
      const v = build({
        offers: offers([offer("a"), offer("b")], { signalLevel: "none" }),
      });
      expect(kinds(v)).toEqual(["offer:a", "offer:b"]);
    });
  });

  describe("H1b: owns nothing, with signal (unchanged)", () => {
    it("shows For you, the top three and See more", () => {
      const items = ten();
      items[0] = offer("p0", { match: { level: "top", reason: "x" } });
      const v = build({ offers: offers(items) });
      if (v.kind !== "carousel") throw new Error(v.kind);
      expect(v.heading).toBe("For you");
      expect(v.highlightFirst).toBe(true);
      expect(v.variant).toBe("carousel");
      expect(kinds(v)).toEqual(["offer:p0", "offer:p1", "offer:p2", "more:more"]);
    });
  });

  describe("H1c: owns some, one in progress (unchanged)", () => {
    it("leads with the program, then the offers", () => {
      const items = ten((i) => i === 9);
      const v = build({
        offers: offers(items),
        active: { ...settled, program: program() },
      });
      expect(kinds(v)).toEqual([
        "inProgress",
        "offer:p0",
        "offer:p1",
        "offer:p2",
        "more:more",
      ]);
    });

    it("with no signal, shows the program and the catalogue tile only", () => {
      const v = build({
        offers: offers(ten((i) => i === 9), { signalLevel: "none" }),
        active: { ...settled, program: program() },
      });
      expect(kinds(v)).toEqual(["inProgress", "more:all"]);
      if (v.kind !== "carousel") throw new Error(v.kind);
      expect(v.heading).toBe("For you");
      expect(v.variant).toBe("browse_fallback");
    });
  });

  describe("H1d: finished what they own, more to buy", () => {
    const finished = program({ isRefresher: true, title: "Phone Calls" });

    it("leads with the top offer, eyebrow TRY THIS NEXT, then the finished program", () => {
      const v = build({
        offers: offers(ten((i) => i === 9)),
        active: { ...settled, program: finished },
      });
      expect(kinds(v)).toEqual([
        "offer:p0",
        "inProgress",
        "offer:p1",
        "offer:p2",
        "more:more",
      ]);
      if (v.kind !== "carousel") throw new Error(v.kind);
      const first = v.slides[0];
      expect(first.kind === "offer" && first.eyebrow).toBe("TRY THIS NEXT");
      expect(first.kind === "offer" && first.offerIndex).toBe(0);
      expect(v.variant).toBe("next_after_finished");
    });

    it("keeps server order and ranks after the finished slide", () => {
      const v = build({
        offers: offers(ten((i) => i === 9)),
        active: { ...settled, program: finished },
      });
      if (v.kind !== "carousel") throw new Error(v.kind);
      const ranks = v.slides.flatMap((s) => (s.kind === "offer" ? [s.offerIndex] : []));
      expect(ranks).toEqual([0, 1, 2]);
    });

    it("works without signal too, under the Programs heading", () => {
      const v = build({
        offers: offers(ten((i) => i === 9), { signalLevel: "none" }),
        active: { ...settled, program: finished },
      });
      if (v.kind !== "carousel") throw new Error(v.kind);
      expect(v.heading).toBe("Programs");
      expect(v.highlightFirst).toBe(false);
      expect(kinds(v).slice(0, 2)).toEqual(["offer:p0", "inProgress"]);
    });

    it("when the server says ALL_COMPLETE but they do not own everything, offers lead", () => {
      const v = build({
        offers: offers(ten((i) => i < 3)),
        active: { ...settled, allComplete: true },
      });
      expect(kinds(v)).toEqual([
        "offer:p3",
        "allComplete",
        "offer:p4",
        "offer:p5",
        "more:more",
      ]);
      if (v.kind !== "carousel") throw new Error(v.kind);
      expect(v.variant).toBe("next_after_finished");
      const done = v.slides[1];
      expect(done.kind === "allComplete" && done.count).toBe(3);
    });
  });

  describe("H1e: owns every program, none started", () => {
    const allOwned = offers(ten(() => true));

    it("shows the owner card when the recommender returned no program", () => {
      const v = build({ offers: allOwned });
      expect(v).toEqual({ kind: "ownerPick", count: 10, variant: "owner_pick" });
    });

    it("shows the owner card when its top pick was never started", () => {
      const v = build({
        offers: allOwned,
        active: { ...settled, program: program({ packStarted: false }) },
      });
      expect(v.kind).toBe("ownerPick");
    });

    it("shows the owner card without signal as well", () => {
      const v = build({ offers: offers(ten(() => true), { signalLevel: "none" }) });
      expect(v.kind).toBe("ownerPick");
    });

    it("never blanks while the program is still loading", () => {
      const v = build({
        offers: allOwned,
        active: { loading: true, program: null, allComplete: false },
      });
      expect(v.kind).toBe("skeleton");
    });

    it("counts only openable owned programs", () => {
      const items = ten(() => true);
      items[9] = offer("ghost", { owned: true, packId: null });
      const v = build({ offers: offers(items) });
      expect(v.kind === "ownerPick" && v.count).toBe(9);
    });
  });

  describe("H1f: owns every program, one in progress", () => {
    it("adds a tile for the other programs", () => {
      const v = build({
        offers: offers(ten(() => true)),
        active: { ...settled, program: program() },
      });
      expect(kinds(v)).toEqual(["inProgress", "more:others"]);
      if (v.kind !== "carousel") throw new Error(v.kind);
      const tile = v.slides[1];
      expect(tile.kind === "more" && tile.count).toBe(9);
      expect(v.variant).toBe("owner_others");
    });

    it("an unknown start state still shows the program", () => {
      const v = build({
        offers: offers(ten(() => true)),
        active: { ...settled, program: program({ packStarted: null }) },
      });
      expect(kinds(v)).toEqual(["inProgress", "more:others"]);
    });

    it("a finished program with everything owned also gets the tile", () => {
      const v = build({
        offers: offers(ten(() => true)),
        active: { ...settled, program: program({ isRefresher: true, packStarted: true }) },
      });
      expect(kinds(v)).toEqual(["inProgress", "more:others"]);
    });
  });

  describe("H1g: owns every program and finished all", () => {
    it("shows the one card with the count", () => {
      const v = build({
        offers: offers(ten(() => true)),
        active: { ...settled, allComplete: true },
      });
      expect(v).toEqual({ kind: "allComplete", count: 10, variant: "all_finished" });
    });

    it("shows it when the server returns a refresher and says all are finished", () => {
      const v = build({
        offers: offers(ten(() => true)),
        active: {
          ...settled,
          allComplete: true,
          program: program({ isRefresher: true, packStarted: true }),
        },
      });
      expect(v).toEqual({ kind: "allComplete", count: 10, variant: "all_finished" });
    });

    it("still shows it when the offers fetch failed, with no number", () => {
      const v = build({ offers: null, active: { ...settled, allComplete: true } });
      expect(v).toEqual({ kind: "allComplete", count: null, variant: "all_finished" });
    });

    it("waits for the first offers fetch instead of guessing", () => {
      const v = build({
        offers: null,
        offersLoading: true,
        active: { ...settled, allComplete: true },
      });
      expect(v.kind).toBe("skeleton");
    });
  });

  describe("H1h: crisis and failed fetch (unchanged)", () => {
    it("crisis shows the support card, never a program", () => {
      const v = build({ offers: offers(ten(), { crisisSupport }) });
      expect(v.kind).toBe("crisis");
      expect(shownOffers(v)).toEqual([]);
    });

    it("crisis beats finished-everything", () => {
      const v = build({
        offers: offers(ten(() => true), { crisisSupport }),
        active: { ...settled, allComplete: true },
      });
      expect(v.kind).toBe("crisis");
    });

    it("crisis beats owning everything", () => {
      const v = build({ offers: offers(ten(() => true), { crisisSupport }) });
      expect(v.kind).toBe("crisis");
    });

    it("crisis with a finished program sells nothing", () => {
      const v = build({
        offers: offers(ten((i) => i === 9), { crisisSupport }),
        active: { ...settled, program: program({ isRefresher: true }) },
      });
      expect(shownOffers(v)).toEqual([]);
    });

    it("a failed fetch shows the browse card", () => {
      expect(build({ offers: null }).kind).toBe("browse");
    });

    it("the first load shows the skeleton", () => {
      expect(build({ offers: null, offersLoading: true }).kind).toBe("skeleton");
    });
  });

  it("never pads the server's list to reach three", () => {
    const v = build({ offers: offers([offer("only")]) });
    expect(kinds(v)).toEqual(["offer:only"]);
  });
});

describe("shelf copy", () => {
  it("formats every new string exactly", () => {
    expect(NEXT_PROGRAM_EYEBROW).toBe("TRY THIS NEXT");
    // No line names how many programs exist: the catalogue keeps growing.
    expect(ownerPickSubtitle(10)).toBe("Start any of your programs from day 1.");
    expect(otherProgramsTitle(9)).toBe("More programs you own");
    expect(otherProgramsTitle(1)).toBe("More programs you own");
    expect(allFinishedTitle(10)).toBe("You finished your programs.");
    expect(allFinishedTitle(null)).toBe("You finished your programs.");
  });
});
