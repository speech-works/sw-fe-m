import {
  useFocusEffect,
  useIsFocused,
  useNavigation,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient"; // Import Gradient
import React, { useCallback, useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import ReaderFace from "../../../assets/mood-check/ReaderFace";
import WarriorFace from "../../../assets/mood-check/WarriorFace";
import BreathingFace from "../../../assets/sw-faces/BreathingFace";
import MovieFace from "../../../assets/sw-faces/MovieFace";
import { usePracticeCategorySummaryStore } from "../../../stores/practiceCategorySummary";
import { useUserStore } from "../../../stores/user";
import { theme } from "../../../Theme/tokens";
import { parseTextStyle } from "../../../util/functions/parseStyles";

// We need to navigate deep into DailyPracticeStack
type RootStackParamList = {
  DailyPracticeStack: {
    screen:
      | "ReadingPracticeStack"
      | "FunPracticeStack"
      | "CognitivePracticeStack"
      | "ExposureStack";
  };
};

const PracticeGrid = ({ isScrolling = false }: { isScrolling?: boolean }) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();
  const { user } = useUserStore();
  const { categories, fetchSummary } = usePracticeCategorySummaryStore();

  useFocusEffect(
    React.useCallback(() => {
      if (!user?.id) {
        return;
      }

      fetchSummary(user.id).catch((error) => {
        console.error("PracticeGrid summary error:", error);
      });
    }, [fetchSummary, user?.id]),
  );

  const getCount = useCallback(
    (type: string) => {
      return (
        categories.find((category) => category.contentType === type)?.weekly
          .completedCount || 0
      );
    },
    [categories],
  );

  const practices = useMemo(
    () => [
      {
        name: "Reading",
        subtitle: "Read Aloud",
        weeklyCount: getCount("READING_PRACTICE"),
        faceType: "reader" as const,
        route: "ReadingPracticeStack",
        colors: ["#FFD8B5", "#FFAB76"],
        shadowColor: "#FFAB76",
      },
      {
        name: "Fun",
        subtitle: "Expression",
        weeklyCount: getCount("FUN_PRACTICE"),
        faceType: "movie" as const,
        route: "FunPracticeStack",
        colors: ["#Cbf0f0", "#98E6E6"], // Soft Aqua
        shadowColor: "#98E6E6",
      },
      {
        name: "Cognitive",
        subtitle: "Focus",
        weeklyCount: getCount("COGNITIVE_PRACTICE"),
        badge: "FREE",
        faceType: "breathing" as const,
        route: "CognitivePracticeStack",
        colors: ["#EBCBF5", "#D8A7F0"],
        shadowColor: "#D8A7F0",
      },
      {
        name: "Exposure",
        subtitle: "Courage",
        weeklyCount: getCount("EXPOSURE_PRACTICE"),
        faceType: "warrior" as const,
        route: "ExposureStack",
        colors: ["#FFC8C8", "#FF9E9E"],
        shadowColor: "#FF9E9E",
      },
    ],
    [getCount],
  );

  const shouldAnimate = isFocused && !isScrolling;

  const renderFace = (faceType: string) => {
    switch (faceType) {
      case "reader":
        return <ReaderFace size={64} shouldAnimate={shouldAnimate} loop />;
      case "movie":
        return <MovieFace size={64} shouldAnimate={shouldAnimate} loop />;
      case "breathing":
        return <BreathingFace size={64} shouldAnimate={shouldAnimate} loop />;
      case "warrior":
        return <WarriorFace size={64} shouldAnimate={shouldAnimate} loop />;
      default:
        return null;
    }
  };

  const handlePress = (route: string) => {
    // @ts-ignore - Simple navigation wrapper
    navigation.navigate("DailyPracticeStack", { screen: route });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Jump In</Text>
      <View style={styles.grid}>
        {practices.map((p, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => handlePress(p.route)}
            activeOpacity={0.8}
            style={[
              styles.cardWrapper,
              {
                shadowColor: p.shadowColor,
                shadowOpacity: 0.3,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 4 },
                backgroundColor: "#FFF",
              },
            ]}
          >
            <LinearGradient
              colors={p.colors as any}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardGradient}
            >
              <View style={styles.cardHeader}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text style={styles.cardSubtitle}>{p.subtitle}</Text>
                  {/* Small badge for count */}
                  <View style={styles.countBadge}>
                    <Text style={styles.countValue}>{p.weeklyCount}</Text>
                  </View>
                </View>
                <Text style={styles.cardTitle}>{p.name}</Text>
              </View>
              <View style={styles.iconWrapper} pointerEvents="none">
                {renderFace(p.faceType)}
              </View>
            </LinearGradient>

            {p.badge && (
              <View style={styles.cornerBadge}>
                <Text style={styles.cornerBadgeText}>{p.badge}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

export default React.memo(PracticeGrid);

const styles = StyleSheet.create({
  container: {
    gap: 16,
    marginVertical: 10,
  },
  sectionTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between", // Push to edges
    rowGap: 16, // Vertical gap
  },
  cardWrapper: {
    width: "48%", // Force 2 columns
    aspectRatio: 0.9, // Keep consistent shape (slightly taller than square)
    borderRadius: 24,
    // Shadow props applied inline for dynamic colors
  },
  cardGradient: {
    flex: 1,
    borderRadius: 24,
    padding: 16,
    justifyContent: "space-between",
    position: "relative",
    overflow: "hidden",
  },
  cardHeader: {
    zIndex: 2,
  },
  cardSubtitle: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: "rgba(0,0,0,0.5)",
    fontWeight: "600",
    textTransform: "uppercase",
    fontSize: 10,
    letterSpacing: 0.5,
  },
  cardTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    color: "rgba(0,0,0,0.8)",
    fontSize: 20,
    marginTop: 2,
  },
  iconWrapper: {
    alignSelf: "flex-end",
    marginTop: "auto",
    // Make icon pop out slightly
    transform: [{ scale: 1.1 }, { translateY: 5 }, { translateX: 5 }],
  },
  countBadge: {
    backgroundColor: "rgba(255,255,255,0.4)",
    minWidth: 24,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  countValue: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(0,0,0,0.6)",
  },
  cornerBadge: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#10B981", // Stylish green (Emerald 500)
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 10,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  cornerBadgeText: {
    color: "#FFF",
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
  },
});
