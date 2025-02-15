import React from "react";
import { ScrollView, StyleProp, ViewStyle } from "react-native";
import { theme } from "../Theme/tokens";

const useScrollWrapper = () => {
  const scrollContent: StyleProp<ViewStyle> = {
    flexGrow: 1, // Allows ScrollView to take up available space
    paddingBottom: 10, // Makes content visible past bottom navigator
  };

  const ScrollWrapper: React.FC<{ children: React.ReactNode }> = ({
    children,
  }) => {
    return (
      <ScrollView
        //bounces={false} // Disable bounce effect on iOS
        //overScrollMode="never" // Disable overscroll effect on Android
        contentContainerStyle={scrollContent}
        style={{ backgroundColor: theme.colors.neutral.white }}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    );
  };

  return ScrollWrapper;
};

export default useScrollWrapper;
