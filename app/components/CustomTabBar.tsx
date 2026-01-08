import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
} from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  useSharedValue,
  interpolate,
  interpolateColor,
  Extrapolation,
} from "react-native-reanimated";
import { FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "../Theme/tokens";
import { ROUTE_NAMES } from "../constants/routes";
import { useUIStore } from "../stores/ui";

const { width } = Dimensions.get("window");

const CustomTabBar = ({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) => {
  const { isTabBarVisible } = useUIStore();

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

          return (
            <TabItem
              key={route.key}
              isFocused={isFocused}
              label={(options.tabBarLabel as string) || route.name}
              iconName={iconName}
              onPress={onPress}
              onLongPress={onLongPress}
            />
          );
        })}
      </View>
    </View>
  );
};

const TabItem = ({ isFocused, label, iconName, onPress, onLongPress }: any) => {
  // Animation Values
  const focusedValue = useSharedValue(isFocused ? 1 : 0);

  React.useEffect(() => {
    focusedValue.value = withSpring(isFocused ? 1 : 0, {
      damping: 15,
      stiffness: 120,
    });
  }, [isFocused]);

  // Animated Styles
  const containerStyle = useAnimatedStyle(() => {
    return {
      flex: isFocused ? 2.5 : 1, // Flex grows for active tab
    };
  });

  const pillStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      focusedValue.value,
      [0, 1],
      ["transparent", theme.colors.library.orange[400]] // Transparent -> Orange 400 Pill
    );
    return {
      backgroundColor,
      borderRadius: 30,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      height: "100%",
      width: "100%",
      paddingHorizontal: isFocused ? 16 : 0,
    };
  });

  const textStyle = useAnimatedStyle(() => {
    return {
      opacity: focusedValue.value,
      transform: [
        { translateX: interpolate(focusedValue.value, [0, 1], [20, 0]) },
      ],
      display: isFocused ? "flex" : "none",
    };
  });

  // Icon Color
  const iconColor = isFocused ? "#FFFFFF" : "#94A3B8";

  return (
    <Animated.View style={[styles.tabItemContainer, containerStyle]}>
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        style={styles.touchable}
        activeOpacity={0.8}
      >
        <Animated.View style={pillStyle}>
          {/* Icon - Using MaterialCommunityIcons for cleaner look */}
          <MaterialCommunityIcons name={iconName} size={22} color={iconColor} />

          {/* Label */}
          {isFocused && (
            <Animated.Text style={[styles.label, textStyle]} numberOfLines={1}>
              {label}
            </Animated.Text>
          )}
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 30, // Floating from bottom
    left: 20,
    right: 20,
    alignItems: "center",
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF", // White Bar
    borderRadius: 35,
    height: 70,
    padding: 8,
    width: "100%",
    // Shadow
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
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF", // White text inside Orange Pill
  },
});

export default CustomTabBar;
