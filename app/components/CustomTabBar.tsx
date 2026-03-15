import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import React from "react";
import { Dimensions, StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
} from "react-native-reanimated";
import { theme } from "../Theme/tokens";
import { ROUTE_NAMES } from "../constants/routes";
import { useUIStore } from "../stores/ui";

const AnimatedIcon = Animated.createAnimatedComponent(MaterialCommunityIcons);
const { width } = Dimensions.get("window");

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
      <View
        style={[
          styles.tabBar,
          focusedRoute.name === ROUTE_NAMES.COMMUNITY && {
            backgroundColor: "#0A0A0B",
            borderColor: "rgba(255, 255, 255, 0.1)",
            borderWidth: 1,
            shadowColor: "#000000",
          },
        ]}
      >
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
          if (routeName === ROUTE_NAMES.COMMUNITY) {
            activeColor = "#D4AF37";
          }

          return (
            <TabItem
              key={route.key}
              isFocused={isFocused}
              label={(options.tabBarLabel as string) || route.name}
              iconName={iconName}
              activeColor={activeColor}
              onPress={onPress}
              onLongPress={onLongPress}
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
}: any) => {
  // Animation Values - Using useDerivedValue instead of useEffect
  // This triggers the spring synchronously during the commit phase
  // instead of waiting for useEffect (which gets blocked by the new screen's heavy JS render)
  const focusedValue = useDerivedValue(() => {
    return withSpring(isFocused ? 1 : 0, {
      stiffness: 450,
      damping: 24,
      mass: 0.5,
      restDisplacementThreshold: 0.01,
      restSpeedThreshold: 2,
    });
  }, [isFocused]);

  // Animated Styles
  const containerStyle = useAnimatedStyle(() => {
    return {
      flex: interpolate(focusedValue.value, [0, 1], [1, 2.5]), // Fluid width
    };
  });

  const pillStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      focusedValue.value,
      [0, 1],
      ["transparent", activeColor], // Transparent -> Dynamic Active Color
    );
    return {
      backgroundColor,
      borderRadius: 100, // Maximum rounding
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      height: 48, // Fixed height keeps padding predictable
      alignSelf: "center", // Center vertically inside tabBar cell
      paddingHorizontal: interpolate(focusedValue.value, [0, 1], [0, 18]), // Perfect inner bubble padding
    };
  });

  // Wraps the text so the layout expands left-to-right perfectly
  const textWrapperStyle = useAnimatedStyle(() => {
    return {
      width: interpolate(focusedValue.value, [0, 1], [0, 85]), // Reveal text space
      marginLeft: interpolate(focusedValue.value, [0, 1], [0, 2]), // Reduce gap
      overflow: "hidden", // Never bleed
      opacity: focusedValue.value, // Fade in alongside expansion
      justifyContent: "center",
      alignItems: "center",
    };
  });

  const textStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: interpolate(focusedValue.value, [0, 1], [0.85, 1]) }, // Slight pop up effect
      ],
    };
  });

  // Icon Cross-fade Animation Styles
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
          {/* Cross-fading icons for reliable Reanimated color transition */}
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
                color="#FFFFFF"
              />
            </Animated.View>
          </View>

          {/* Wrapper dictates layout shift precisely */}
          <Animated.View style={textWrapperStyle}>
            <Animated.Text style={[styles.label, textStyle]} numberOfLines={1}>
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
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF", // White text inside Orange Pill
    textAlign: "center",
  },
});

export default CustomTabBar;
