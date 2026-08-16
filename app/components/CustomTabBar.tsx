import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import React from "react";
import { TabDock, TabDockItem, icons, type IconName, haptics } from "../design-system";
import { ROUTE_NAMES } from "../constants/routes";
import { useUIStore } from "../stores/ui";
import { useInboxStore } from "../stores/inbox";
import { useCommunityDock } from "../stores/communityDock";
import {
  useNotificationPermissionStore,
  selectNotificationsNeedAttention,
} from "../stores/notificationPermission";

const CustomTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  const { isTabBarVisible } = useUIStore();
  const unreadCount = useInboxStore((s) => s.unreadCount);
  const hasBuddy = useInboxStore((s) => s.hasBuddy);
  const pendingRequestCount = useInboxStore((s) => s.pendingRequestCount);
  const notificationsNeedAttention = useNotificationPermissionStore(
    selectNotificationsNeedAttention,
  );

  // Community owns this dock while focused — it morphs into the Us/Timeline switcher.
  const dockActive = useCommunityDock((s) => s.active);
  const dockEnabled = useCommunityDock((s) => s.enabled);
  const dockMode = useCommunityDock((s) => s.mode);
  const dockView = useCommunityDock((s) => s.view);
  const setDockMode = useCommunityDock((s) => s.setMode);
  const setDockView = useCommunityDock((s) => s.setView);
  const requestsOpen = useCommunityDock((s) => s.requestsOpen);
  const openRequests = useCommunityDock((s) => s.openRequests);
  const closeRequests = useCommunityDock((s) => s.closeRequests);

  const focusedRoute = state.routes[state.index];
  const focusedOptions = descriptors[focusedRoute.key].options;

  if ((focusedOptions.tabBarStyle as any)?.display === "none") {
    return null;
  }
  if (!isTabBarVisible) return null;

  const onCommunity = focusedRoute.name === ROUTE_NAMES.COMMUNITY;
  // Only morph when Community is focused AND paired (the invite screen has no tabs).
  const communityOwnsDock = dockActive && dockEnabled && onCommunity;
  // The requests morph is NOT gated on pairing — it exists mostly for people who
  // have no buddy yet.
  const onRequests = dockActive && onCommunity && requestsOpen;

  // ── REQUESTS mode: the same capsule, holding the list you are looking at. ──
  //
  // The other three tabs are simply absent from the array, so `TabDock`'s
  // LinearTransition resizes the capsule around what is left while the removed
  // items fade out. `fitContent` is deliberately NOT set: keeping the bar at
  // full width means the capsule itself never changes size, and the whole
  // transition is its CONTENTS rearranging. A dock that also shrinks reads as a
  // different object arriving.
  //
  // The left slot is a plain chevron, not a hamburger labelled "Menu". It sits
  // where the three tabs were, so the way back is the space they left behind.
  if (onRequests) {
    const requestItems: TabDockItem[] = [
      { key: "back", label: "Back", icon: icons.back },
      {
        key: "requests",
        label: "Requests",
        icon: icons.addPerson,
        pillCount: pendingRequestCount,
      },
    ];
    return (
      <TabDock
        items={requestItems}
        activeKey="requests"
        onSelect={(key) => {
          haptics.selection();
          if (key === "back") closeRequests();
        }}
        // Long-press anywhere on the dock also gets you out, matching the
        // Us/Timeline dock's escape hatch.
        onLongPress={() => {
          haptics.selection();
          closeRequests();
        }}
        accessibilityLabel="Buddy requests"
      />
    );
  }

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
        accessibilityLabel="Buddy page tabs"
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

    // WHY THE LABEL CHANGES.
    //
    // Re-tapping the active Community pill already meant something (morph to
    // Us/Timeline); now it can also mean "open the requests". A pill that does
    // two different things has to say which one it is about to do, and the
    // label is the only part of it with room to. "Waiting · 3" is the promise;
    // "Buddy" is the ordinary pill with the ordinary re-tap behind it.
    //
    // Only while unpaired-and-asked. Once you have a buddy the requests are on
    // hold and cannot be accepted, so advertising them would be a nag about
    // something you are not allowed to do.
    const waiting =
      routeName === ROUTE_NAMES.COMMUNITY && hasBuddy !== true
        ? pendingRequestCount
        : 0;

    return {
      key: route.key,
      label: waiting > 0 ? "Waiting" : (options.tabBarLabel as string) || route.name,
      icon,
      badge,
      pillCount: waiting,
      // Notifications are off at the OS level and the user hasn't waved it away:
      // mark Settings, because that is where the fix lives. Only on the global
      // nav dock — the Community tabs dock is a different context.
      //
      // Community also dots for an unanswered buddy request. A dot, not a
      // count, because "needs attention" is what a request is — and TabDock
      // suppresses the dot whenever `badge > 0`, which is exactly right here:
      // an unpaired user has no thread and so no unread count to compete with.
      //
      // The dot and `pillCount` are set TOGETHER on purpose and never both
      // show: the chip lives inside the expanded pill, so it exists only while
      // Community is the focused tab, and the dot covers every other screen.
      // TabDock drops whichever would be the second copy.
      badgeDot:
        (routeName === ROUTE_NAMES.SETTINGS && notificationsNeedAttention) ||
        (routeName === ROUTE_NAMES.COMMUNITY && waiting > 0),
    };
  });

  const onSelect = (key: string) => {
    const route = state.routes.find((r) => r.key === key);
    if (!route) return;

    // ── Re-tapping the active Community pill ──
    //
    // Two meanings, resolved by priority rather than by a submenu: a person
    // waiting on an answer outranks a view switcher. The pill has already said
    // which one it will do (it reads "Waiting" rather than "Buddy"), and the
    // ambiguity is temporary by construction — answer them and the ordinary
    // behaviour comes straight back.
    //
    // Not gated on `communityOwnsDock`, unlike the morph below it: that flag
    // includes `dockEnabled`, which means paired, and requests are mostly an
    // unpaired concern.
    const reTappedCommunity =
      dockActive && route.key === focusedRoute.key && route.name === ROUTE_NAMES.COMMUNITY;

    if (reTappedCommunity && hasBuddy !== true && pendingRequestCount > 0) {
      haptics.selection();
      openRequests();
      return;
    }

    if (communityOwnsDock && reTappedCommunity) {
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
