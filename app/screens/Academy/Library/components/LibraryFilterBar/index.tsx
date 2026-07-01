import React, { useRef } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Chip, IconName, space, spacing } from "../../../../../design-system";

export type FilterType =
  | "ALL"
  | "Foundation"
  | "Build"
  | "Deep Practice"
  | "Free";

interface LibraryFilterBarProps {
  currentFilter: FilterType;
  onSelectFilter: (filter: FilterType) => void;
}

// Registry-safe (Fluent-mapped) glyphs; kept in the semantic vocabulary.
const FILTERS: { type: FilterType; label: string; icon: IconName }[] = [
  { type: "ALL", label: "All", icon: "layout-grid" },
  { type: "Foundation", label: "Foundation", icon: "sprout" },
  { type: "Build", label: "Build", icon: "layers" },
  { type: "Deep Practice", label: "Deep Practice", icon: "target" },
  { type: "Free", label: "Free", icon: "gift" },
];

const LibraryFilterBar = ({
  currentFilter,
  onSelectFilter,
}: LibraryFilterBarProps) => {
  const scrollViewRef = useRef<ScrollView>(null);

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
      >
        {FILTERS.map((item) => (
          <Chip
            key={item.type}
            label={item.label}
            icon={item.icon}
            selected={currentFilter === item.type}
            onPress={() => onSelectFilter(item.type)}
          />
        ))}
      </ScrollView>
    </View>
  );
};

export default LibraryFilterBar;

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
  },
  scrollContent: {
    paddingHorizontal: space.screenX,
    gap: spacing.sm,
    alignItems: "center",
  },
});
