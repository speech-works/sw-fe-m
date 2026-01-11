import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import React, { useEffect, useRef } from "react";
import { theme } from "../../../../../Theme/tokens";
import { parseTextStyle } from "../../../../../util/functions/parseStyles";
import { LinearGradient } from "expo-linear-gradient";
import Icon from "react-native-vector-icons/FontAwesome5";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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

const FILTERS: { type: FilterType; label: string; icon: string }[] = [
  { type: "ALL", label: "All", icon: "th-large" },
  { type: "Foundation", label: "Foundation", icon: "seedling" },
  { type: "Build", label: "Build", icon: "hammer" },
  { type: "Deep Practice", label: "Deep Practice", icon: "brain" },
  { type: "Free", label: "Free", icon: "gift" },
];

const LibraryFilterBar = ({
  currentFilter,
  onSelectFilter,
}: LibraryFilterBarProps) => {
  const scrollViewRef = useRef<ScrollView>(null);

  const handlePress = (filter: FilterType) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onSelectFilter(filter);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
      >
        {FILTERS.map((item) => {
          const isSelected = currentFilter === item.type;

          // Active Gradient Colors
          // Using a warm orange/coral gradient for active state
          const activeColors = ["#F97316", "#EA580C"] as const; // Orange 500 -> 600

          return (
            <TouchableOpacity
              key={item.type}
              onPress={() => handlePress(item.type)}
              activeOpacity={0.8}
              style={[
                styles.chipWrapper,
                isSelected && styles.chipWrapperSelected,
              ]}
            >
              {isSelected ? (
                <LinearGradient
                  colors={activeColors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.chipGradient}
                >
                  <Icon
                    name={item.icon}
                    size={14}
                    color="#FFFFFF"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.chipTextSelected}>{item.label}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.chipInactive}>
                  <Icon
                    name={item.icon}
                    size={14}
                    color="#6B7280" // Muted gray
                    style={{ marginRight: 6, opacity: 0.7 }}
                  />
                  <Text style={styles.chipTextUnselected}>{item.label}</Text>
                </View>
              )}
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
    paddingVertical: 12,
    marginBottom: 4,
  },
  scrollContent: {
    paddingHorizontal: 24,
    gap: 10,
    alignItems: "center",
  },
  chipWrapper: {
    borderRadius: 24,
    // Add shadow to wrapper if needed, but usually inner content or gradient handles it
    shadowColor: theme.colors.library.orange[400],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0, // Hidden by default
    shadowRadius: 8,
    elevation: 0,
  },
  chipWrapperSelected: {
    shadowOpacity: 0.25, // Show shadow when selected
    elevation: 4,
  },
  chipGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
  },
  chipInactive: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: "#F3F4F6", // Light gray background
    borderWidth: 1,
    borderColor: "transparent", // Or subtle border if preferred
  },
  chipTextSelected: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  chipTextUnselected: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: "#6B7280", // Muted gray text
    fontWeight: "500",
    fontSize: 14,
  },
});
