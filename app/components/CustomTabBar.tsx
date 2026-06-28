import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import React from "react";
import { TabDock, TabDockItem } from "../design-system";
import { ROUTE_NAMES } from "../constants/routes";
import { useUIStore } from "../stores/ui";
import { useInboxStore } from "../stores/inbox";

const CustomTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  const { isTabBarVisible } = useUIStore();
  const unreadCount = useInboxStore((s) => s.unreadCount);
  const hasBuddy = useInboxStore((s) => s.hasBuddy);

  const focusedRoute = state.routes[state.index];
  const focusedOptions = descriptors[focusedRoute.key].options;

  if ((focusedOptions.tabBarStyle as any)?.display === "none") {
    return null;
  }
  if (!isTabBarVisible) return null;

  const items: TabDockItem[] = state.routes.map((route) => {
    const { options } = descriptors[route.key];
    const routeName = route.name;

    let icon = "circle";
    if (routeName === ROUTE_NAMES.HOME || routeName === "Stats") icon = "home-variant";
    else if (routeName === ROUTE_NAMES.EXPLORE) icon = "view-grid-outline";
    else if (routeName === ROUTE_NAMES.COMMUNITY)
      icon = hasBuddy === false ? "account-plus" : "account-group";
    else if (routeName === ROUTE_NAMES.SETTINGS) icon = "cog";

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
    />
  );
};

export default CustomTabBar;
