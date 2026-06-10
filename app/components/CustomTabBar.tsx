import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import React from "react";
import {
  Dimensions,
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
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { theme } from "../Theme/tokens";
import { ROUTE_NAMES } from "../constants/routes";
import { useUIStore } from "../stores/ui";
import { useInboxStore } from "../stores/inbox";
const { width } = Dimensions.get("window");

const CustomTabBar = ({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) => {
  const { isTabBarVisible } = useUIStore();
  const unreadCount = useInboxStore((s) => s.unreadCount);

  const focusedRoute = state.routes[state.index];
  const focusedDescriptor = descriptors[focusedRoute.key];
  const focusedOptions = focusedDescriptor.options;

  // @ts-ignore
  if ((focusedOptions.tabBarStyle as any)?.display === "none") {
    return null;
  }

  if (!isTabBarVisible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
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
            iconName = "account-group";
          else if (routeName === ROUTE_NAMES.SETTINGS) iconName = "cog";

          // Color mapping
          let activeColor = theme.colors.library.orange[400];
          let activeContentColor = "#FFFFFF";

          const badge = routeName === ROUTE_NAMES.COMMUNITY ? unreadCount : 0;

          return (
            <TabItem
              key={route.key}
              isFocused={isFocused}
              label={(options.tabBarLabel as string) || route.name}
              iconName={iconName}
              activeColor={activeColor}
              activeContentColor={activeContentColor}
              onPress={onPress}
              onLongPress={onLongPress}
              routeName={routeName}
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
  activeColor,
  activeContentColor,
  routeName,
  badge = 0,
}: any) => {
  const focusedValue = useDerivedValue(() => {
    return withTiming(isFocused ? 1 : 0, {
      duration: 100,
      easing: Easing.out(Easing.quad),
    });
  }, [isFocused]);

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

  const gradientStyle = useAnimatedStyle(() => {
    return {
      opacity: focusedValue.value,
    };
  });

  const textWrapperStyle = useAnimatedStyle(() => {
    return {
      width: interpolate(focusedValue.value, [0, 1], [0, 95]),
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
      ["#FFFFFF", activeColor]
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
                color="#94A3B8"
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
              <Animated.View style={[styles.badge, badgeAnimatedStyle]}>
                <Text style={styles.badgeText} numberOfLines={1}>
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
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 35,
    height: 70,
    padding: 8,
    width: "100%",
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
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
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },
  badge: {
    position: "absolute",
    top: -5,
    right: -8,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: "#FF3B30",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  badgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },
});

export default CustomTabBar;
