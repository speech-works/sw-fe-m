// app/components/ScreenWrapper.tsx

import React from "react";
import {
    StatusBar,
    StyleProp,
    StyleSheet,
    View,
    ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../design-system";

interface BgWrapperProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  edges?: ("top" | "bottom" | "left" | "right")[]; // default to all edges
}

const BgWrapper: React.FC<BgWrapperProps> = ({
  children,
  style,
  edges = ["left", "right"],
}) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background.canvas }]}>
      {/* Edge-to-edge translucent status bar over the dark app canvas. */}
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Safe area view for content */}
      <SafeAreaView style={[styles.content, style]} edges={edges}>
        {children}
      </SafeAreaView>
    </View>
  );
};

export default BgWrapper;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
