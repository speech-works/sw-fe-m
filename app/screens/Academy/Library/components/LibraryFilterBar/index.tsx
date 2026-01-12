import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
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

// Animated Filter Chip Component
const FilterChip = ({
  item,
  isSelected,
  onPress,
}: {
  item: { type: FilterType; label: string; icon: string };
  isSelected: boolean;
  onPress: () => void;
}) => {
  const scaleAnim = useRef(new Animated.Value(isSelected ? 1 : 0.95)).current;
  const opacityAnim = useRef(new Animated.Value(isSelected ? 1 : 0.7)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: isSelected ? 1.05 : 1,
        friction: 6,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: isSelected ? 1 : 0.85,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isSelected]);

  const activeColors = ["#F97316", "#EA580C"] as const;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={styles.chipTouchable}
    >
      <Animated.View
        style={[
          styles.chipWrapper,
          isSelected && styles.chipWrapperSelected,
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
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
              color="#6B7280"
              style={{ marginRight: 6, opacity: 0.7 }}
            />
            <Text style={styles.chipTextUnselected}>{item.label}</Text>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

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
          <FilterChip
            key={item.type}
            item={item}
            isSelected={currentFilter === item.type}
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
    paddingVertical: 12,
    marginBottom: 4,
  },
  scrollContent: {
    paddingHorizontal: 24,
    gap: 10,
    alignItems: "center",
  },
  chipTouchable: {
    // Wrapper for touch handling
  },
  chipWrapper: {
    borderRadius: 24,
    shadowColor: theme.colors.library.orange[400],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0,
    shadowRadius: 8,
    elevation: 0,
  },
  chipWrapperSelected: {
    shadowOpacity: 0.25,
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
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "transparent",
  },
  chipTextSelected: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  chipTextUnselected: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: "#6B7280",
    fontWeight: "500",
    fontSize: 14,
  },
});
