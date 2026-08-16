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
  const people = useCommunityDock((s) => s.people);
  const setPeople = useCommunityDock((s) => s.setPeople);

  const focusedRoute = state.routes[state.index];
  const focusedOptions = descriptors[focusedRoute.key].options;

  if ((focusedOptions.tabBarStyle as any)?.display === "none") {
    return null;
  }
  if (!isTabBarVisible) return null;

  const onCommunity = focusedRoute.name === ROUTE_NAMES.COMMUNITY;
  // Only morph when Community is focused AND paired (the invite screen has no tabs).
  const communityOwnsDock = dockActive && dockEnabled && onCommunity;
  // The People morph is NOT gated on pairing — that page exists mostly for
  // people who have no buddy yet, which is exactly when `dockEnabled` is false.
  const onPeople = dockActive && onCommunity && people !== null;

  // ── PEOPLE mode: the same capsule, now the Waiting/Discover switcher. ──
  //
  // Structurally identical to the Us/Timeline dock below it, because it is the
  // same idea applied to a different pair: a hamburger back to the global nav,
  // then the two halves of the page you are on. It is checked FIRST because
  // that dock is gated on `dockEnabled` (paired) and this page is mostly for
  // people who are not.
  //
  // Reached by scrolling the in-page switcher off the top, the same cue that
  // hands over Us/Timeline — see `handleScrollY` in Community.
  if (onPeople && dockMode === "tabs") {
    const peopleItems: TabDockItem[] = [
      { key: "menu", label: "Menu", icon: icons.menu },
      {
        key: "waiting",
        label: "Waiting",
        icon: icons.addPerson,
        count: pendingRequestCount,
      },
      { key: "discover", label: "Discover", icon: icons.find },
    ];
    return (
      <TabDock
        items={peopleItems}
        activeKey={people ?? "waiting"}
        onSelect={(key) => {
          haptics.selection();
          // The hamburger returns the DOCK to nav; it does not leave the page.
          // Leaving is the back arrow at the top and the system gesture, both
          // of which already work because `leave()` clears the axis on blur.
          if (key === "menu") {
            setDockMode("nav");
            return;
          }
          setPeople(key as "waiting" | "discover");
        }}
        onLongPress={() => {
          haptics.selection();
          setDockMode("nav");
        }}
        fitContent
        accessibilityLabel="People page tabs"
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

    // THE PILL NO LONGER CHANGES ITS NAME.
    //
    // It used to read "Waiting · 3" and a second tap opened the queue. Three
    // problems with that, and they compounded: nothing announced the re-tap, so
    // the only route to a time-sensitive obligation was a gesture with no
    // affordance; the label change took the destination's name away, so muscle
    // memory broke; and it only existed on Community, so anyone living on Home
    // never learned it was there. Underneath all three, navigation chrome was
    // being asked to carry content.
    //
    // The Buddy screen now says it in the content — a count on the empty seat
    // and a button that reads "See who's waiting" — so this is free to go back
    // to being a nav item that means one thing.
    //
    // THE DOT STAYS. It is the only part that worked: it marks the tab from
    // every other screen, which is exactly the reach the pill never had.
    const waiting =
      routeName === ROUTE_NAMES.COMMUNITY && hasBuddy !== true
        ? pendingRequestCount
        : 0;

    return {
      key: route.key,
      label: (options.tabBarLabel as string) || route.name,
      icon,
      badge,
      // Notifications are off at the OS level and the user hasn't waved it away:
      // mark Settings, because that is where the fix lives. Only on the global
      // nav dock — the Community tabs dock is a different context.
      //
      // Community also marks an unanswered buddy request. A DOT, not the number,
      // even though the number is now free to draw: this is the global nav, four
      // destinations wide, and its job is to say which tab wants you rather than
      // how much. The count belongs on the People page, where you have arrived
      // to act on it. `count` is deliberately not set here.
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
    // ONE meaning again: morph to Us/Timeline. It briefly had a second (open
    // the requests, by priority) and that is gone — the Buddy screen carries a
    // button for it now, which is a thing you can see rather than a gesture you
    // have to be told about.
    const reTappedCommunity =
      dockActive && route.key === focusedRoute.key && route.name === ROUTE_NAMES.COMMUNITY;

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
