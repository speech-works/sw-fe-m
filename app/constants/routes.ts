export const ROUTE_NAMES = {
  HOME: "HOME",
  EXPLORE: "EXPLORE",
  COMMUNITY: "COMMUNITY",
  THERAPY: "THERAPY",
  SETTINGS: "SETTINGS",
};

/**
 * The root screen INSIDE each tab that hosts a nested stack.
 *
 * These are deliberately not the tab names above. `getCurrentRoute()` resolves
 * to the deepest active route, so a tab backed by a stack reports its inner
 * root ("Home"), while a tab whose component is a bare screen reports the tab
 * name itself (the Community tab → "COMMUNITY"). The stack navigators import
 * these for their root `<Stack.Screen name>`, so the two cannot drift apart.
 */
export const STACK_ROOT_ROUTE_NAMES = {
  HOME: "Home",
  EXPLORE: "Explore",
  SETTINGS: "Settings",
} as const;

/**
 * Every route name that means "the user is sitting at a tab root", i.e. has
 * left any activity. Derived from the two maps above rather than written out
 * by hand — the hand-written version listed "Community", which never matched
 * anything, because that tab has no stack and so reports "COMMUNITY".
 */
const TAB_ROOT_ROUTE_NAMES = new Set<string>([
  STACK_ROOT_ROUTE_NAMES.HOME,
  STACK_ROOT_ROUTE_NAMES.EXPLORE,
  STACK_ROOT_ROUTE_NAMES.SETTINGS,
  ROUTE_NAMES.COMMUNITY,
]);

/**
 * True when `navigationRef.getCurrentRoute()?.name` is a tab root. Anything
 * that waits for the user to be out of an activity should ask this rather
 * than keep its own list of screen names.
 */
export const isTabRootRoute = (routeName: string | undefined): boolean =>
  routeName !== undefined && TAB_ROOT_ROUTE_NAMES.has(routeName);
