import React from "react";
import { TabDock, TabDockItem, icons, haptics } from "../../design-system";
import { useProgramsDock, type ProgramsView } from "../../stores/programsDock";

/**
 * ============================================================================
 * THE SHOP'S BOTTOM DOCK
 * ----------------------------------------------------------------------------
 * Menu / Browse / Yours, in the same capsule the global nav uses, in the same
 * place. Community morphs the global `CustomTabBar` for its own switcher; this
 * one cannot, and the reason is worth writing down because it is not obvious:
 *
 *     `AppNavigator` registers `ExploreStack` as a ROOT screen as well as
 *     mounting it inside the bottom tabs. Home's "See more" navigates to the
 *     root one, so the shop opened from Home lives OUTSIDE the tab navigator
 *     entirely, and `CustomTabBar` is not rendered anywhere in that tree.
 *
 * A dock owned by the tab bar therefore appeared on one route into the shop
 * and silently vanished on the other. So the SCREEN owns it, which is true on
 * every route in, and `CustomTabBar` stands down while `active` is set. Still
 * one dock, just a different owner.
 *
 * It is absolutely positioned by TabDock itself, so it needs no space in the
 * layout — only a parent that fills the screen. `Page` reserves the clearance
 * under the content with `tabBarSafe`.
 * ============================================================================
 */
const ProgramsDock: React.FC = () => {
  const active = useProgramsDock((s) => s.active);
  const view = useProgramsDock((s) => s.view);
  const setView = useProgramsDock((s) => s.setView);
  const ownedCount = useProgramsDock((s) => s.ownedCount);
  const onMenu = useProgramsDock((s) => s.onMenu);

  // Gated on `active` rather than on being mounted, so the dock is gone the
  // instant the shop is pushed over (a program's detail page has its own buy
  // dock, and two capsules at the bottom of one screen is how this app has
  // frozen its own touch handling before).
  if (!active) return null;

  const items: TabDockItem[] = [
    { key: "menu", label: "Menu", icon: icons.menu },
    // The catalogue grid, which is the same glyph the "All" filter chip on this
    // screen already uses for the same idea.
    { key: "browse", label: "Browse", icon: icons.explore },
    // `count`, not `badge`. The number of programs somebody owns is the SUBJECT
    // of the tab, not an unread notification about it, and red would read as
    // something being wrong with a shelf of things they bought.
    { key: "yours", label: "Yours", icon: icons.journey, count: ownedCount },
  ];

  return (
    <TabDock
      items={items}
      activeKey={view}
      onSelect={(key) => {
        haptics.selection();
        // Menu leaves the shop, rather than restoring the nav dock in place.
        // Community can do the latter because its tabs are also reachable from
        // an in-page switcher; here, a dock in nav mode would leave no way to
        // reach either half of the screen it is sitting on.
        if (key === "menu") {
          onMenu?.();
          return;
        }
        setView(key as ProgramsView);
      }}
      fitContent
      accessibilityLabel="Programs page tabs"
    />
  );
};

export default ProgramsDock;
