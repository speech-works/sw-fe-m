import {
  MEMBERSHIP_BENEFITS,
  leadBenefitFor,
  orderBenefitsFor,
  HEADLINE_FOR,
  PROGRAMS_NOTE,
  CALL_LENGTH_FIGURE,
} from "../membershipOffer";
import { EVENT_NAMES } from "../../stores/events/constants";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * ===========================================================================
 * THE SCREEN THAT TAKES MONEY MUST NOT PROMISE WHAT WE DO NOT SELL
 * ---------------------------------------------------------------------------
 * The previous copy sold "Guided programs: Every program in the library, start
 * to finish." Membership grants NO programs: PackAccessService.resolveAccess
 * only ever asks whether the user holds `pack:<catalogKey>`. Somebody paid for
 * the library and got none of it.
 *
 * These tests are not about wording. They are about the two mistakes that cost
 * real money: promising a benefit we do not deliver, and leading with the one
 * number where the free tier beats the paid one.
 * ===========================================================================
 */
describe("What membership promises", () => {
  const everything = JSON.stringify(MEMBERSHIP_BENEFITS).toLowerCase();

  it("never claims programs, in any benefit", () => {
    expect(everything).not.toContain("program");
    expect(everything).not.toContain("pack");
  });

  /**
   * "24 techniques" needs an app release every time a technique is added, and
   * a stale count on a paid screen is the same class of mistake as the program
   * claim: a number the product has quietly outgrown.
   */
  it("never counts techniques or programs", () => {
    for (const benefit of MEMBERSHIP_BENEFITS) {
      expect(benefit.label).not.toMatch(/\d+\s*(techniques?|programs?|packs?)/i);
      expect(benefit.desc).not.toMatch(/\d+\s*(techniques?|programs?|packs?)/i);
    }
  });

  /**
   * Free users get a weekly taster whenever their balance hits zero, so they
   * end up with slightly MORE calls than a member: about 4.3 against 4. The old
   * copy led with "4 a month", advertising our one losing column.
   */
  it("never sells on the number of calls a month", () => {
    const calls = MEMBERSHIP_BENEFITS.find((b) => b.id === "calls")!;
    expect(calls.label).not.toMatch(/\d+\s*(calls?|a month|per month)/i);
    // The count may still be MENTIONED as detail; it must not be the claim.
    expect(calls.label.toLowerCase()).toContain("ten minutes");
  });

  /** The 3 minute cap belongs to the free weekly taster, not to all free calls. */
  it("describes the three minute cap precisely", () => {
    const calls = MEMBERSHIP_BENEFITS.find((b) => b.id === "calls")!;
    expect(calls.desc.toLowerCase()).toContain("weekly");
    expect(calls.desc).toContain("three minutes");
  });

  it("says programs are sold separately", () => {
    expect(PROGRAMS_NOTE.toLowerCase()).toContain("separately");
  });

  it("offers exactly the three things membership actually grants", () => {
    expect(MEMBERSHIP_BENEFITS.map((b) => b.id).sort()).toEqual([
      "calls",
      "library",
      "practice",
    ]);
  });
});

/**
 * =========================================================================
 * THE SHEET LEADS WITH WHAT THE PERSON JUST HIT
 * -------------------------------------------------------------------------
 * The sheet always received a reason and then sorted a carousel nobody swiped
 * — and two of that sort's three branches named benefit ids ("unrestricted",
 * "stamina") that had not existed for some time, so they did nothing at all.
 * =========================================================================
 */
describe("Which benefit leads", () => {
  it("leads with practice when they ran out of practice", () => {
    expect(leadBenefitFor(EVENT_NAMES.SHOW_STAMINA_UPSELL)).toBe("practice");
  });

  it("leads with the library when they hit a locked technique", () => {
    expect(leadBenefitFor(EVENT_NAMES.SHOW_LIBRARY_UPSELL)).toBe("library");
  });

  /** No context: lead with the only benefit that wins by a wide margin. */
  it("leads with calls otherwise", () => {
    expect(leadBenefitFor(EVENT_NAMES.SHOW_PREMIUM_UPSELL)).toBe("calls");
    expect(leadBenefitFor("something.unknown")).toBe("calls");
  });

  it("puts the lead first and keeps every other benefit", () => {
    for (const event of [
      EVENT_NAMES.SHOW_STAMINA_UPSELL,
      EVENT_NAMES.SHOW_LIBRARY_UPSELL,
      EVENT_NAMES.SHOW_PREMIUM_UPSELL,
    ]) {
      const ordered = orderBenefitsFor(event);
      expect(ordered[0].id).toBe(leadBenefitFor(event));
      // Nothing is dropped by leading with one of them. The old carousel could
      // hide two thirds of the offer behind a swipe; this must never hide any.
      expect(ordered).toHaveLength(MEMBERSHIP_BENEFITS.length);
      expect(new Set(ordered.map((b) => b.id)).size).toBe(MEMBERSHIP_BENEFITS.length);
    }
  });

  it("has a headline for every benefit, and none of them claims a program", () => {
    for (const benefit of MEMBERSHIP_BENEFITS) {
      const headline = HEADLINE_FOR[benefit.id];
      expect(headline.title.length).toBeGreaterThan(10);
      expect(`${headline.title} ${headline.message}`.toLowerCase()).not.toContain("program");
    }
  });
});

describe("the shape every selling surface renders", () => {
  // BenefitRows reads all four of these directly. A benefit added without one
  // renders a blank second line or an uncoloured tile, and neither throws — it
  // just quietly ships a broken row on the screen that charges.
  it("every benefit carries a short line, an icon and an accent", () => {
    for (const b of MEMBERSHIP_BENEFITS) {
      expect(b.short.length).toBeGreaterThan(0);
      expect(b.iconKey.length).toBeGreaterThan(0);
      expect(["purple", "info", "warning"]).toContain(b.accentKey);
    }
  });

  it("gives the three rows three DIFFERENT accents", () => {
    const accents = new Set(MEMBERSHIP_BENEFITS.map((b) => b.accentKey));
    expect(accents.size).toBe(MEMBERSHIP_BENEFITS.length);
  });

  // A row is scanned, not read. Past roughly forty characters it wraps to a
  // third line on a small phone and the list stops being scannable.
  it("keeps the short lines short", () => {
    for (const b of MEMBERSHIP_BENEFITS) {
      expect(b.short.length).toBeLessThanOrEqual(40);
    }
  });

  // The em dash is banned in product copy, everywhere.
  it("uses no em dash anywhere in the offer copy", () => {
    const all = [
      ...MEMBERSHIP_BENEFITS.flatMap((b) => [b.label, b.short, b.desc]),
      ...Object.values(HEADLINE_FOR).flatMap((h) => [h.title, h.message]),
      PROGRAMS_NOTE,
      CALL_LENGTH_FIGURE.unit,
    ];
    for (const line of all) expect(line).not.toContain("\u2014");
  });
});

describe("the call-length figure", () => {
  // These are PhoneCallConfig's two limits. If somebody edits them here to
  // make the hero look better, the number on the paywall stops matching the
  // number the server enforces, and the buyer finds out mid-call.
  it("is the real three-to-ten, and an increase", () => {
    expect(CALL_LENGTH_FIGURE.from).toBe("3");
    expect(CALL_LENGTH_FIGURE.to).toBe("10");
    expect(Number(CALL_LENGTH_FIGURE.to)).toBeGreaterThan(
      Number(CALL_LENGTH_FIGURE.from),
    );
  });

  // Not a COUNT. Free users get slightly more calls than members, because the
  // weekly taster refires whenever the balance hits zero. A hero built on the
  // count would be advertising our weakest column.
  it("is measured in minutes, not calls", () => {
    expect(CALL_LENGTH_FIGURE.unit).toContain("minutes");
    expect(CALL_LENGTH_FIGURE.unit).not.toMatch(/\bcalls\b/);
  });
});

/**
 * ===========================================================================
 * THE PRODUCT HAS ONE NAME ON THE SURFACES THAT SELL IT
 * ---------------------------------------------------------------------------
 * It is "membership". The entitlement is `membership`, the benefits module is
 * membershipOffer, the day-28 sheet says "Keep my access".
 *
 * "Premium" kept leaking back in, twice in one pass: the buy button read "Get
 * Premium" long after the eyebrow above it said MEMBERSHIP, and the
 * store-unavailable line still read "Premium isn't available yet". A product
 * wearing two names on one screen reads as two products, and the screen where
 * that happens is the one taking the money.
 *
 * Only PROSE is checked. `PremiumModal` is a route, `colors.premium.gold` is a
 * token, `SHOW_PREMIUM_UPSELL` is an event — all fine, none of them is read by
 * a buyer.
 * ===========================================================================
 */
const SELLING_SURFACES = [
  "app/screens/Payments/index.tsx",
  "app/screens/Payments/PaywallPager.tsx",
  "app/components/UpsellModal.tsx",
  "app/components/MembershipDock.tsx",
  "app/components/ContinueMembershipSheet.tsx",
  "app/components/membership/BenefitRows.tsx",
  "app/components/membership/CallLengthHero.tsx",
  "app/components/membership/PlanPills.tsx",
  "app/components/membership/MarkedHeadline.tsx",
  // The locked-lesson overlay sells membership too, and it was the last
  // surface found still saying "Go Premium" — found by hand, which is the
  // reason it joins the guarded list.
  "app/components/VideoPlayer.tsx",
];

const repoRoot = join(__dirname, "..", "..", "..");

/** Source with comments stripped, so a note ABOUT the old copy is not a hit. */
const prose = (file: string): string =>
  readFileSync(join(repoRoot, file), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

/** Code identifiers that legitimately contain the word. */
const CODE_USES = /PremiumModal|colors\.premium|premium\.|PREMIUM_|SHOW_PREMIUM|premiumGold/;

describe("one name for the product", () => {
  it.each(SELLING_SURFACES)("%s never calls it Premium in prose", (file) => {
    const hits = prose(file)
      .split("\n")
      .filter((l) => /Premium/.test(l) && !CODE_USES.test(l));
    expect(hits).toEqual([]);
  });

  // "billed once" sat four lines above "Renews automatically unless cancelled"
  // and said the opposite of it. The annual plan is an auto-renewing
  // subscription; any wording implying a single charge is a refund waiting.
  it.each(SELLING_SURFACES)("%s never implies a one-off charge", (file) => {
    expect(prose(file)).not.toMatch(/billed once|one[- ]time payment|pay once/i);
  });

  // "You're in test mode. Payments are disabled while we finish the setup."
  // shipped on the store-unreachable sheet: internal language pointed at a
  // user, naming a mode they are not in and a setup that is not their business.
  it.each(SELLING_SURFACES)("%s never speaks internal language", (file) => {
    expect(prose(file)).not.toMatch(/test mode|we finish the setup|debug/i);
  });
});
