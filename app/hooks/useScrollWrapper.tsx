import React from "react";
import { ScrollView, StyleProp, ViewStyle } from "react-native";
import { useTheme } from "../design-system";

const useScrollWrapper = () => {
  const { colors } = useTheme();

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
        style={{ backgroundColor: colors.background.canvas }}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    );
  };

  return ScrollWrapper;
};

export default useScrollWrapper;
