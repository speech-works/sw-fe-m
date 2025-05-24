// app/components/ScreenWrapper.tsx

import React from "react";
import {
  View,
  StyleSheet,
  StyleProp,
  ViewStyle,
  Platform,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "../../Theme/tokens";

interface BgWrapperrProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  edges?: ("top" | "bottom" | "left" | "right")[]; // default to all edges
}

const BgWrapper: React.FC<BgWrapperrProps> = ({
  children,
  style,
  edges = ["left", "right"],
}) => {
  return (
    <View style={styles.container}>
      {/* Background gradient behind everything */}
      <LinearGradient
        colors={[
          theme.colors.background.light,
          theme.colors.background.default,
        ]}
        style={StyleSheet.absoluteFill}
      />

      {/* Optional: set background for iOS overscroll */}
      {Platform.OS === "ios" && (
        <StatusBar
          backgroundColor={theme.colors.background.default}
          barStyle="dark-content"
        />
      )}

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
    backgroundColor: theme.colors.background.default, // fallback color
  },
  content: {
    flex: 1,
  },
});
