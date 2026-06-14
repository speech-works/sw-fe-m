import React, { useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { theme } from "../Theme/tokens";
import { parseShadowStyle } from "../util/functions/parseStyles";

interface AnimatedToggleProps {
  value: boolean;
  onValueChange: () => void;
  disabled?: boolean;
  activeColor?: string;
  inactiveColor?: string;
}

const AnimatedToggle: React.FC<AnimatedToggleProps> = ({
  value,
  onValueChange,
  disabled = false,
  activeColor = theme.colors.actionPrimary.default,
  inactiveColor = "#E2E8F0",
}) => {
  const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: value ? 1 : 0,
      duration: 200,
      useNativeDriver: false, // backgroundColor and layout don't support native driver
    }).start();
  }, [value]);

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 22], // adjust based on container and thumb size
  });

  const backgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [inactiveColor, activeColor],
  });

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled}
      onPress={onValueChange}
    >
      <Animated.View
        style={[
          styles.container,
          { backgroundColor },
          disabled && { opacity: 0.5 },
        ]}
      >
        <Animated.View
          style={[
            styles.thumb,
            { transform: [{ translateX }] },
          ]}
        />
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: "center",
  },
  thumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    ...parseShadowStyle(theme.shadow.elevation1),
  },
});

export default AnimatedToggle;
