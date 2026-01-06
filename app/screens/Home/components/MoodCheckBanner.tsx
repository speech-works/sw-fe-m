import React from "react";
import { StyleSheet, Text, View, TouchableOpacity, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../util/functions/parseStyles";
import { useMoodCheckStore } from "../../../stores/mood";
import { useNavigation } from "@react-navigation/native";
import {
  AcademyStackNavigationProp,
  AcademyStackParamList,
} from "../../../navigators/stacks/AcademyStack/types";
import Icon from "react-native-vector-icons/Feather";

const MoodCheckBanner = () => {
  const { hasRecordedToday } = useMoodCheckStore();
  const academyNavigation =
    useNavigation<AcademyStackNavigationProp<keyof AcademyStackParamList>>();

  if (hasRecordedToday) return null;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
          // @ts-ignore
          academyNavigation.navigate("AcademyStack", {
            screen: "MoodCheckStack",
            params: {
              screen: "CheckIn",
            },
          });
        }}
      >
        <LinearGradient
          // Violet/Indigo Gradient
          colors={["#A78BFA", "#818CF8"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {/* Decorative Bubbles */}
          <View style={styles.bubbleTopRight} />
          <View style={styles.bubbleBottomLeft} />

          {/* Watermark Icon */}
          <View style={styles.watermarkContainer}>
            <Icon
              name="smile"
              size={120}
              color="#FFFFFF"
              style={{ opacity: 0.15 }}
            />
          </View>

          {/* Header Section */}
          <View style={styles.content}>
            <View style={styles.chip}>
              <Icon name="clock" size={12} color="white" />
              <Text style={styles.chipText}>Daily Check-in</Text>
            </View>

            <View style={styles.textContainer}>
              <Text style={styles.title}>How are you feeling?</Text>
              <Text style={styles.subtitle}>
                Track your mood to unlock insights
              </Text>
            </View>
          </View>

          {/* Action Button (Glass) */}
          <View style={styles.actionButton}>
            <Text style={styles.actionText}>Start Check-in</Text>
            <Icon
              name="chevron-right"
              size={16}
              color={theme.colors.text.title}
            />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

export default MoodCheckBanner;

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
    borderRadius: 24,
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
    overflow: "hidden",
  },
  gradient: {
    borderRadius: 24,
    padding: 24,
    minHeight: 180,
    justifyContent: "space-between",
    position: "relative",
  },
  // Decorative Bubbles
  bubbleTopRight: {
    position: "absolute",
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  bubbleBottomLeft: {
    position: "absolute",
    bottom: -30,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  watermarkContainer: {
    position: "absolute",
    right: -20,
    top: 20,
    transform: [{ rotate: "15deg" }],
  },
  content: {
    gap: 12,
    zIndex: 1,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start",
    gap: 6,
  },
  chipText: {
    color: "white",
    fontSize: 12,
    fontWeight: "700",
  },
  textContainer: {
    gap: 4,
  },
  title: {
    ...parseTextStyle(theme.typography.Heading2),
    color: "white",
    fontSize: 24,
  },
  subtitle: {
    ...parseTextStyle(theme.typography.Body),
    color: "rgba(255, 255, 255, 0.9)",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginTop: 16,
    alignSelf: "flex-start",
    gap: 12,
    zIndex: 1,
  },
  actionText: {
    ...parseTextStyle(theme.typography.Button),
    color: theme.colors.text.title,
    fontWeight: "700",
  },
});
