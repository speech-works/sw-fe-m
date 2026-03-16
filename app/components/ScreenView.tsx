import { useIsFocused } from "@react-navigation/native";
import React from "react";
import { StyleProp, StyleSheet, ViewStyle } from "react-native";
import Animated, { Easing, useAnimatedStyle, withTiming } from "react-native-reanimated";
import BgWrapper from "../util/components/BgWrapper";

interface ScreenViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const ScreenView = ({ children, style }: ScreenViewProps) => {
  const isFocused = useIsFocused();

  const animatedStyle = useAnimatedStyle(() => {
    const duration = 100;
    const easing = Easing.out(Easing.quad);

    return {
      opacity: withTiming(isFocused ? 1 : 0, { duration, easing }),
      transform: [
        {
          translateY: withTiming(isFocused ? 0 : 10, { duration, easing }),
        },
      ],
    };
  });

  return (
    <BgWrapper style={[styles.container, style]}>
      <Animated.View style={[{ flex: 1 }, animatedStyle]}>
        {children}
      </Animated.View>
    </BgWrapper>
  );
};

export default ScreenView;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    display: "flex",
    overflow: "visible",
  },
});
