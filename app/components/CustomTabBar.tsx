import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import React from "react";
import { TabDock, TabDockItem, icons, type IconName, haptics } from "../design-system";
import { ROUTE_NAMES } from "../constants/routes";
import { useUIStore } from "../stores/ui";
import { useInboxStore } from "../stores/inbox";
import { useCommunityDock } from "../stores/communityDock";

const CustomTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  const { isTabBarVisible } = useUIStore();
  const unreadCount = useInboxStore((s) => s.unreadCount);
  const hasBuddy = useInboxStore((s) => s.hasBuddy);

  // Community owns this dock while focused — it morphs into the Us/Timeline switcher.
  const dockActive = useCommunityDock((s) => s.active);
  const dockEnabled = useCommunityDock((s) => s.enabled);
  const dockMode = useCommunityDock((s) => s.mode);
  const dockView = useCommunityDock((s) => s.view);
  const setDockMode = useCommunityDock((s) => s.setMode);
  const setDockView = useCommunityDock((s) => s.setView);

  const focusedRoute = state.routes[state.index];
  const focusedOptions = descriptors[focusedRoute.key].options;

  if ((focusedOptions.tabBarStyle as any)?.display === "none") {
    return null;
  }
  if (!isTabBarVisible) return null;

  const onCommunity = focusedRoute.name === ROUTE_NAMES.COMMUNITY;
  // Only morph when Community is focused AND paired (the invite screen has no tabs).
  const communityOwnsDock = dockActive && dockEnabled && onCommunity;

  // ── TABS mode: the same capsule, now the Us/Timeline switcher. ──
  if (communityOwnsDock && dockMode === "tabs") {
    const tabItems: TabDockItem[] = [
      { key: "menu", label: "Menu", icon: icons.menu },
      { key: "us", label: "Us", icon: icons.community },
      { key: "timeline", label: "Timeline", icon: icons.timeline, badge: unreadCount },
    ];
    const onSelectTab = (key: string) => {
      haptics.selection();
      if (key === "menu") {
        setDockMode("nav");
        return;
      }
      setDockView(key as "us" | "timeline");
    };
    return (
      <TabDock
        items={tabItems}
        activeKey={dockView}
        onSelect={onSelectTab}
        onLongPress={() => {
          haptics.selection();
          setDockMode("nav");
        }}
        fitContent
        accessibilityLabel="Community page tabs"
      />
    );
  }

  // ── NAV mode: the standard global menu dock (re-tap Community / scroll to morph). ──
  const items: TabDockItem[] = state.routes.map((route) => {
    const { options } = descriptors[route.key];
    const routeName = route.name;

    let icon: IconName = "circle";
    if (routeName === ROUTE_NAMES.HOME || routeName === "Stats") icon = icons.home;
    else if (routeName === ROUTE_NAMES.EXPLORE) icon = icons.explore;
    else if (routeName === ROUTE_NAMES.COMMUNITY)
      icon = hasBuddy === false ? icons.addPerson : icons.community;
    else if (routeName === ROUTE_NAMES.SETTINGS) icon = icons.settings;

    const badge = routeName === ROUTE_NAMES.COMMUNITY ? unreadCount : 0;

    return {
      key: route.key,
      label: (options.tabBarLabel as string) || route.name,
      icon,
      badge,
    };
  });

  const onSelect = (key: string) => {
    const route = state.routes.find((r) => r.key === key);
    if (!route) return;

    // Re-tap the active Community pill (while Community owns the dock) → morph to tabs.
    if (communityOwnsDock && route.key === focusedRoute.key && route.name === ROUTE_NAMES.COMMUNITY) {
      haptics.selection();
      setDockMode("tabs");
      return;
    }

    const event = navigation.emit({
      type: "tabPress",
      target: route.key,
      canPreventDefault: true,
    });

    if (!event.defaultPrevented) {
      let rootScreen: string | undefined;
      if (route.name === ROUTE_NAMES.SETTINGS) rootScreen = "Settings";
      if (route.name === ROUTE_NAMES.HOME) rootScreen = "Home";
      if (route.name === ROUTE_NAMES.EXPLORE) rootScreen = "Explore";

      if (rootScreen) {
        navigation.navigate(route.name, { screen: rootScreen });
      } else {
        navigation.navigate(route.name);
      }
    }
  };

  const onLongPress = (key: string) => {
    navigation.emit({ type: "tabLongPress", target: key });
  };

  return (
    <TabDock
      items={items}
      activeKey={focusedRoute.key}
      onSelect={onSelect}
      onLongPress={onLongPress}
      accessibilityLabel="Main navigation"
    />
  );
};

export default CustomTabBar;
