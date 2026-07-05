// components/LoadingScreen.tsx
import React from "react";
import { ActivityIndicator, View } from "react-native";
import { makeStyles, Text, useTheme } from "../design-system";

interface LoadingScreenProps {
  message?: string;
  isNested?: boolean;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = "Loading…",
  isNested = false,
}) => {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={[styles.container, isNested && styles.nestedContainer]}>
      <ActivityIndicator size="large" color={colors.action.primary} />

      <Text
        variant="body"
        center
        color={isNested ? "primary" : "secondary"}
        style={isNested ? styles.nestedText : undefined}
      >
        {message}
      </Text>
    </View>
  );
};

export default LoadingScreen;

const useStyles = makeStyles((c, t) => ({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: t.spacing["2xl"],
    backgroundColor: c.background.canvas,
    gap: t.spacing.lg,
  },
  nestedContainer: {
    flex: 0,
    backgroundColor: "transparent",
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  nestedText: {
    marginTop: t.spacing.sm,
  },
}));
