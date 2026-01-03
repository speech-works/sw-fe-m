import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React from "react";
import { theme } from "../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../util/functions/parseStyles";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import ReaderFace from "../../../assets/mood-check/ReaderFace";
import MovieFace from "../../../assets/sw-faces/MovieFace";
import BreathingFace from "../../../assets/sw-faces/BreathingFace";
import WarriorFace from "../../../assets/mood-check/WarriorFace";

// We need to navigate deep into DailyPracticeStack
// The structure is Explore -> DailyPracticeStack -> [SpecificStack]
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
      icon: <ReaderFace size={56} />,
      route: "ReadingPracticeStack",
    },
    {
      name: "Fun",
      icon: <MovieFace size={56} />,
      route: "FunPracticeStack",
    },
    {
      name: "Cognitive",
      icon: <BreathingFace size={56} />,
      route: "CognitivePracticeStack",
    },
    {
      name: "Exposure",
      icon: <WarriorFace size={56} />,
      route: "ExposureStack",
    },
  ];

  const handlePress = (route: string) => {
    // @ts-ignore - Simple navigation wrapper
    navigation.navigate("DailyPracticeStack", { screen: route });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Quick Practice</Text>
      <View style={styles.grid}>
        {practices.map((p, i) => (
          <TouchableOpacity
            key={i}
            style={styles.card}
            onPress={() => handlePress(p.route)}
            activeOpacity={0.7}
          >
            {p.icon}
            <Text style={styles.cardTitle}>{p.name}</Text>
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
  },
  sectionTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  card: {
    flexBasis: "48%", // Roughly half width
    backgroundColor: theme.colors.surface.elevated,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    ...parseShadowStyle(theme.shadow.elevation1),
    // Ensure height consistency
    height: 110,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: {
    ...parseTextStyle(theme.typography.Body),
    fontWeight: "600",
    color: theme.colors.text.title,
  },
});
