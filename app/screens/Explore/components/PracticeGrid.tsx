import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from "react-native";
import React from "react";
import { theme } from "../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../util/functions/parseStyles";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient"; // Import Gradient
import ReaderFace from "../../../assets/mood-check/ReaderFace";
import MovieFace from "../../../assets/sw-faces/MovieFace";
import BreathingFace from "../../../assets/sw-faces/BreathingFace";
import WarriorFace from "../../../assets/mood-check/WarriorFace";

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

const PracticeGrid = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const practices = [
    {
      name: "Reading",
      subtitle: "Fluency",
      icon: <ReaderFace size={64} />,
      route: "ReadingPracticeStack",
      // Modern Vibrant Gradient: Orange/Peach
      colors: ["#FFD8B5", "#FFAB76"],
      shadowColor: "#FFAB76",
    },
    {
      name: "Fun",
      subtitle: "Expression",
      icon: <MovieFace size={64} />,
      route: "FunPracticeStack",
      // Modern Vibrant Gradient: Teal/Mint
      colors: ["#Cbf0f0", "#98E6E6"], // Soft Aqua
      shadowColor: "#98E6E6",
    },
    {
      name: "Cognitive",
      subtitle: "Focus",
      icon: <BreathingFace size={64} />,
      route: "CognitivePracticeStack",
      // Modern Vibrant Gradient: Lavender/Purple
      colors: ["#EBCBF5", "#D8A7F0"],
      shadowColor: "#D8A7F0",
    },
    {
      name: "Exposure",
      subtitle: "Courage",
      icon: <WarriorFace size={64} />,
      route: "ExposureStack",
      // Modern Vibrant Gradient: Soft Red/Pink
      colors: ["#FFC8C8", "#FF9E9E"],
      shadowColor: "#FF9E9E",
    },
  ];

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
                <Text style={styles.cardSubtitle}>{p.subtitle}</Text>
                <Text style={styles.cardTitle}>{p.name}</Text>
              </View>
              <View style={styles.iconWrapper}>{p.icon}</View>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

export default PracticeGrid;

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
});
