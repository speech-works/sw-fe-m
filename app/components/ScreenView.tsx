import React from "react";
import { StyleProp, StyleSheet, ViewStyle } from "react-native";
import BgWrapper from "../util/components/BgWrapper";

interface ScreenViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const ScreenView = ({ children, style }: ScreenViewProps) => {
  return <BgWrapper style={[styles.container, style]}>{children}</BgWrapper>;
};

export default ScreenView;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 32,
    display: "flex",
  },
});
