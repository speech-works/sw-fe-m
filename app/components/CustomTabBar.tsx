import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "../design-system";
import { ROUTE_NAMES } from "../constants/routes";
import { useUIStore } from "../stores/ui";
import { useInboxStore } from "../stores/inbox";

const CustomTabBar = ({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) => {
  const { colors } = useTheme();
  const { isTabBarVisible } = useUIStore();
  const unreadCount = useInboxStore((s) => s.unreadCount);
  const hasBuddy = useInboxStore((s) => s.hasBuddy);

  const focusedRoute = state.routes[state.index];
  const focusedDescriptor = descriptors[focusedRoute.key];
  const focusedOptions = focusedDescriptor.options;

  if ((focusedOptions.tabBarStyle as any)?.display === "none") {
    return null;
  }

  if (!isTabBarVisible) return null;

  return (
    <View style={styles.container}>
      <View style={[styles.tabBar, { backgroundColor: colors.surface.elevated, shadowColor: colors.shadow }]}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!event.defaultPrevented) {
              let rootScreen;
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

          const onLongPress = () => {
            navigation.emit({
              type: "tabLongPress",
              target: route.key,
            });
          };

          // Icon mapping
          let iconName: any = "circle";
          const routeName = route.name;

          if (routeName === ROUTE_NAMES.HOME || routeName === "Stats")
            iconName = "home-variant";
          else if (routeName === ROUTE_NAMES.EXPLORE)
            iconName = "view-grid-outline";
          else if (routeName === ROUTE_NAMES.COMMUNITY)
            iconName = hasBuddy === false ? "account-plus" : "account-group";
          else if (routeName === ROUTE_NAMES.SETTINGS) iconName = "cog";

          const badge = routeName === ROUTE_NAMES.COMMUNITY ? unreadCount : 0;
          return (
            <TabItem
              key={route.key}
              isFocused={isFocused}
              label={(options.tabBarLabel as string) || route.name}
              iconName={iconName}
              onPress={onPress}
              onLongPress={onLongPress}
              badge={badge}
            />
          );
        })}
      </View>
    </View>
  );
};

const TabItem = ({
  isFocused,
  label,
  iconName,
  onPress,
  onLongPress,
  badge = 0,
}: any) => {
  const { colors } = useTheme();
  // Re-theme to nav tokens (colors only — animation/layout unchanged).
  const activeColor = colors.nav.activePill; // orange pill
  const activeContentColor = colors.nav.onActive; // dark-on-orange (AA)
  const inactiveColor = colors.nav.inactive; // muted icon when not selected
  const capsuleColor = colors.surface.elevated; // the bar behind the badge
  const badgeBg = colors.nav.badge;
  const badgeText = colors.accentOn.danger;

  const focusedValue = useDerivedValue(() => {
    return withTiming(isFocused ? 1 : 0, {
      duration: 100,
      easing: Easing.out(Easing.quad),
    });
  }, [isFocused]);

  const getLabelWidth = (text: string) => {
    switch (text) {
      case "Home":
        return 42;
      case "Stats":
        return 42;
      case "Explore":
        return 58;
      case "Community":
        return 82;
      case "Settings":
        return 65;
      default:
        return 60;
    }
  };
  const labelWidth = getLabelWidth(label);

  const containerStyle = useAnimatedStyle(() => {
    return {
      flex: interpolate(focusedValue.value, [0, 1], [1, 2.5]),
    };
  });

  const pillStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      focusedValue.value,
      [0, 1],
      ["transparent", activeColor],
    );
    return {
      backgroundColor,
      borderRadius: 100,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      height: 48,
      alignSelf: "center",
      paddingHorizontal: interpolate(focusedValue.value, [0, 1], [0, 18]),
      borderWidth: 0,
      borderColor: "transparent",
    };
  });

  const textWrapperStyle = useAnimatedStyle(() => {
    return {
      width: interpolate(focusedValue.value, [0, 1], [0, labelWidth]),
      marginLeft: interpolate(focusedValue.value, [0, 1], [0, 8]),
      overflow: "hidden",
      opacity: focusedValue.value,
      justifyContent: "center",
      alignItems: "center",
    };
  });

  const textStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: interpolate(focusedValue.value, [0, 1], [0.85, 1]) },
      ],
    };
  });

  const inactiveIconStyle = useAnimatedStyle(() => ({
    position: "absolute",
    opacity: 1 - focusedValue.value,
  }));

  const activeIconStyle = useAnimatedStyle(() => ({
    opacity: focusedValue.value,
  }));

  const badgeAnimatedStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(
      focusedValue.value,
      [0, 1],
      [capsuleColor, activeColor]
    );
    return {
      borderColor,
    };
  });

  return (
    <Animated.View style={[styles.tabItemContainer, containerStyle]}>
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.7}
        style={styles.touchable}
        accessibilityRole="tab"
        accessibilityState={{ selected: isFocused }}
        accessibilityLabel={badge > 0 ? `${label}, ${badge} unread` : label}
      >
        <Animated.View style={pillStyle}>
          <View
            style={{
              width: 24,
              height: 24,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Animated.View style={inactiveIconStyle}>
              <MaterialCommunityIcons
                name={iconName}
                size={24}
                color={inactiveColor}
              />
            </Animated.View>
            <Animated.View style={[activeIconStyle, { position: "absolute" }]}>
              <MaterialCommunityIcons
                name={iconName}
                size={24}
                color={activeContentColor}
              />
            </Animated.View>
            {badge > 0 ? (
              <Animated.View style={[styles.badge, { backgroundColor: badgeBg }, badgeAnimatedStyle]}>
                <Text style={[styles.badgeText, { color: badgeText }]} numberOfLines={1}>
                  {badge > 9 ? "9+" : badge}
                </Text>
              </Animated.View>
            ) : null}
          </View>

          <Animated.View style={textWrapperStyle}>
            <Animated.Text
              style={[styles.label, textStyle, { color: activeContentColor }]}
              numberOfLines={1}
            >
              {label}
            </Animated.Text>
          </Animated.View>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
    alignItems: "center",
  },
  tabBar: {
    // backgroundColor + shadowColor are themed inline (surface.elevated / shadow).
    flexDirection: "row",
    borderRadius: 35,
    height: 70,
    padding: 8,
    width: "100%",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
    justifyContent: "space-between",
  },
  tabItemContainer: {
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 30,
  },
  touchable: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  label: {
    // color themed inline (nav.onActive)
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  badge: {
    // backgroundColor + borderColor themed inline (nav.badge / capsule→pill)
    position: "absolute",
    top: -5,
    right: -8,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  badgeText: { fontSize: 10, fontWeight: "800" },
});

export default CustomTabBar;
