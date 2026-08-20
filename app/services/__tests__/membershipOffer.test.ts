import {
  MEMBERSHIP_BENEFITS,
  leadBenefitFor,
  orderBenefitsFor,
  HEADLINE_FOR,
  PROGRAMS_NOTE,
} from "../membershipOffer";
import { EVENT_NAMES } from "../../stores/events/constants";

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
