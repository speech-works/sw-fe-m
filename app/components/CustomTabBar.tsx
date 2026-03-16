import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import React from "react";
import {
  Dimensions,
  StyleSheet,
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
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");
const GOLD_GRADIENT = ["#D4AF37", "#996515"] as const;

const CustomTabBar = ({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) => {
  const { isTabBarVisible } = useUIStore();

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

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
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

          if (routeName === ROUTE_NAMES.COMMUNITY) {
            activeColor = "#d8b02cff"; // Dark background from image
            activeContentColor = "#fff"; // Gold content from image
          }

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

  const isCommunity = routeName === ROUTE_NAMES.COMMUNITY;

  const pillStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      focusedValue.value,
      [0, 1],
      ["transparent", isCommunity ? "transparent" : activeColor],
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
      overflow: "hidden",
    };
  });

  const gradientStyle = useAnimatedStyle(() => {
    return {
      opacity: focusedValue.value,
    };
  });

  const textWrapperStyle = useAnimatedStyle(() => {
    return {
      width: interpolate(focusedValue.value, [0, 1], [0, 85]),
      marginLeft: interpolate(focusedValue.value, [0, 1], [0, 2]),
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

  return (
    <Animated.View style={[styles.tabItemContainer, containerStyle]}>
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.7}
        style={styles.touchable}
      >
        <Animated.View style={pillStyle}>
          {isCommunity && (
            <Animated.View style={[StyleSheet.absoluteFill, gradientStyle]}>
              <LinearGradient
                colors={GOLD_GRADIENT}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          )}
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
});

export default CustomTabBar;
