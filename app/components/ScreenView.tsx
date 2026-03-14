import { useIsFocused } from "@react-navigation/native";
import React from "react";
import { StyleProp, StyleSheet, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import BgWrapper from "../util/components/BgWrapper";

interface ScreenViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const ScreenView = ({ children, style }: ScreenViewProps) => {
  const isFocused = useIsFocused();

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: withSpring(isFocused ? 1 : 0, {
        stiffness: 100,
        damping: 20,
      }),
      transform: [
        {
          translateY: withSpring(isFocused ? 0 : 20, {
            stiffness: 100,
            damping: 20,
          }),
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
