import {
  ROUTE_NAMES,
  STACK_ROOT_ROUTE_NAMES,
  isTabRootRoute,
} from "../routes";

/**
 * ============================================================================
 * A TAB ROOT IS NOT ALWAYS SPELLED LIKE ITS TAB
 * ----------------------------------------------------------------------------
 * `navigationRef.getCurrentRoute()` returns the DEEPEST active route, so the
 * name a tab reports depends on how that tab is built:
 *
 *   Home / Explore / Settings → stack navigators → "Home" / "Explore" / ...
 *   Community                 → a bare screen    → "COMMUNITY"
 *
 * GlobalStaminaController hand-wrote that list and spelled the last one
 * "Community". It matched nothing. A queued low-stamina modal would sit
 * armed while the user was on the buddy tab and only appear once they wandered
 * to one of the other three — the other three working purely by coincidence,
 * because their stacks' inner root screens happen to be title-case.
 *
 * The list is derived from the navigators now, and these assertions pin the
 * two halves of the distinction so the title-case spelling cannot come back.
 * ============================================================================
 */
describe("isTabRootRoute", () => {
  it("accepts the Community tab under the name navigation actually reports", () => {
    // The bug: this is "COMMUNITY", not "Community".
    expect(isTabRootRoute(ROUTE_NAMES.COMMUNITY)).toBe(true);
    expect(isTabRootRoute("Community")).toBe(false);
  });

  it("accepts the inner root screen of each stack-backed tab", () => {
    expect(isTabRootRoute(STACK_ROOT_ROUTE_NAMES.HOME)).toBe(true);
    expect(isTabRootRoute(STACK_ROOT_ROUTE_NAMES.EXPLORE)).toBe(true);
    expect(isTabRootRoute(STACK_ROOT_ROUTE_NAMES.SETTINGS)).toBe(true);
  });

  it("rejects the tab names of stack-backed tabs, which never surface", () => {
    // A stack-backed tab reports its inner root, never the tab name, so these
    // would be dead entries hiding a missing one.
    expect(isTabRootRoute(ROUTE_NAMES.HOME)).toBe(false);
    expect(isTabRootRoute(ROUTE_NAMES.EXPLORE)).toBe(false);
    expect(isTabRootRoute(ROUTE_NAMES.SETTINGS)).toBe(false);
  });

  it("rejects activity screens and nothing at all", () => {
    expect(isTabRootRoute("PhoneCall")).toBe(false);
    expect(isTabRootRoute("PackModule")).toBe(false);
    expect(isTabRootRoute("RoleplayChat")).toBe(false);
    expect(isTabRootRoute(undefined)).toBe(false);
    expect(isTabRootRoute("")).toBe(false);
  });
});
