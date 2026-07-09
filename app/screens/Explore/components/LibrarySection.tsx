import { useNavigation } from "@react-navigation/native";
import React from "react";
import { StyleSheet, View } from "react-native";
import {
  useTheme,
  spacing,
  space,
  radius,
  Text,
  Icon,
  icons,
} from "../../../design-system";
import PressableScale from "../../../components/PressableScale";

interface LibrarySectionProps {
  onLayoutCapture?: (event: any) => void;
}

const LibrarySection: React.FC<LibrarySectionProps> = ({ onLayoutCapture }) => {
  const navigation = useNavigation<any>();
  const { colors, elevation } = useTheme();
  // Solid vivid accent card (Community pattern). Dark ink reads on the fill.
  const ink = colors.accentOn.success;

  return (
    <View
      onLayout={(event) => {
        if (onLayoutCapture) onLayoutCapture(event);
      }}
      style={styles.container}
    >
      <Text variant="h3">Library</Text>

      <PressableScale
        style={[styles.cardContainer, elevation.e2]}
        scaleTo={0.98}
        onPress={() =>
          navigation.navigate("LibraryStack", {
            screen: "Library",
            params: { from: "EXPLORE" },
          })
        }
      >
        <View style={[styles.gradient, { backgroundColor: colors.accent.success }]}>
          {/* Decorative ink bubbles (dark-on-bright texture) */}
          <View
            style={[
              styles.bubble,
              { backgroundColor: ink, width: 100, height: 100, top: -20, right: -20, opacity: 0.18 },
            ]}
          />
          <View
            style={[
              styles.bubble,
              { backgroundColor: ink, width: 60, height: 60, bottom: 10, left: 10, opacity: 0.13 },
            ]}
          />
          <View
            style={[
              styles.bubble,
              { backgroundColor: ink, width: 40, height: 40, top: 20, right: 80, opacity: 0.1 },
            ]}
          />

          <View>
            <Text variant="h2" color={ink} style={styles.title}>
              Video Tutorials
            </Text>
            <Text variant="body" color={ink}>
              Master speech techniques with our curated video collection.
            </Text>
          </View>

          <View style={styles.actions}>
            {/* Primary action = a solid dark island on the bright fill. */}
            <View style={[styles.cta, { backgroundColor: colors.action.secondary }]}>
              <Icon name={icons.play} size={14} color={colors.action.onSecondary} />
              <Text variant="title" color={colors.action.onSecondary}>
                Recorded Lessons
              </Text>
            </View>
          </View>
        </View>
      </PressableScale>
    </View>
  );
};

export default React.memo(LibrarySection);

const styles = StyleSheet.create({
  container: {
    gap: space.groupGap,
  },
  cardContainer: {
    width: "100%",
    height: 200,
    borderRadius: radius.card,
    overflow: "hidden", // Clips the gradient and bubbles
  },
  gradient: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing["3xl"],
    justifyContent: "space-between",
    position: "relative",
  },
  bubble: {
    position: "absolute",
    borderRadius: radius.full,
  },
  title: {
    marginBottom: space.titleSub,
  },
  actions: {
    gap: space.groupGap,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: space.inlineGap,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
});
