import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import React from "react";
import { theme } from "../../../../../Theme/tokens";
import { parseTextStyle } from "../../../../../util/functions/parseStyles";

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

const FILTERS: FilterType[] = [
  "ALL",
  "Foundation",
  "Build",
  "Deep Practice",
  "Free",
];

const LibraryFilterBar = ({
  currentFilter,
  onSelectFilter,
}: LibraryFilterBarProps) => {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {FILTERS.map((filter) => {
          const isSelected = currentFilter === filter;
          return (
            <TouchableOpacity
              key={filter}
              onPress={() => onSelectFilter(filter)}
              style={[
                styles.chip,
                isSelected ? styles.chipSelected : styles.chipUnselected,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  isSelected
                    ? styles.chipTextSelected
                    : styles.chipTextUnselected,
                ]}
              >
                {filter === "ALL" ? "All" : filter}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

export default LibraryFilterBar;

const styles = StyleSheet.create({
  container: {
    // Faux glass handled by parent or transparent here
    paddingVertical: 12,
    marginTop: -4, // Pull up slightly
  },
  scrollContent: {
    paddingHorizontal: 24,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: theme.colors.library.gray[400],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  chipSelected: {
    backgroundColor: theme.colors.library.orange[100],
    borderColor: theme.colors.library.orange[300], // Slightly stronger border
  },
  chipUnselected: {
    backgroundColor: "rgba(255, 255, 255, 0.8)", // Semi transparent
    borderColor: "rgba(0,0,0,0.05)",
  },
  chipText: {
    ...parseTextStyle(theme.typography.BodyDetails),
    fontWeight: "600",
  },
  chipTextSelected: {
    color: theme.colors.library.orange[700],
  },
  chipTextUnselected: {
    color: theme.colors.text.default,
  },
});
