import React from "react";
import { StatusBar, StatusBarProps } from "react-native";
import { useTheme } from "../useTheme";

/**
 * StatusBar whose glyph style follows the active scheme (light glyphs on the
 * dark canvas, dark glyphs on paper). For custom-layout screens that render
 * their own status bar — screens built on `Page` get this for free and must
 * NOT render a second one. Screens that are dark BY DESIGN (camera, imagery
 * heroes) keep a literal `barStyle="light-content"` instead.
 */
export const SchemeStatusBar: React.FC<Omit<StatusBarProps, "barStyle">> = (props) => {
  const { scheme } = useTheme();
  return (
    <StatusBar
      barStyle={scheme === "dark" ? "light-content" : "dark-content"}
      {...props}
    />
  );
};
