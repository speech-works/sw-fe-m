import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Icon from "react-native-vector-icons/Feather";
import FaIcon from "react-native-vector-icons/FontAwesome5";
import {
  ExploreStackNavigationProp,
  ExploreStackParamList,
} from "../../../navigators/stacks/ExploreStack/types";
import { useMoodCheckStore } from "../../../stores/mood";



interface Props {
  style?: any;
}

const MoodCheckBanner = ({ style }: Props) => {
  const { hasRecordedToday } = useMoodCheckStore();
  const exploreNavigation =
    useNavigation<ExploreStackNavigationProp<keyof ExploreStackParamList>>();

  if (hasRecordedToday) return null;

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
          // @ts-expect-error — nested navigator param types aren't propagated to this screen's nav prop
          exploreNavigation.navigate("ExploreStack", {
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
              <Icon name="smile" size={12} color="white" />
              <Text style={styles.chipText}>Mood Check</Text>
            </View>

            <View style={styles.textContainer}>
              <Text style={styles.title}>How are you feeling?</Text>
              <Text style={styles.subtitle}>
                Track your mood to unlock insights
              </Text>
            </View>
          </View>

          {/* Action Button (Pill Style) */}
          <View style={styles.actionButton}>
            <FaIcon name="play" size={12} color="#7C3AED" />
            <Text style={styles.actionText}>Check In</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

export default React.memo(MoodCheckBanner);

const styles = StyleSheet.create({
  container: {
    marginBottom: 0,
    borderRadius: 24,
    // Premium SaaS Shadow
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 10,
    overflow: "hidden",
  },
  gradient: {
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 24,
    height: 280,
    justifyContent: "space-between",
    position: "relative",
  },
  // Decorative Bubbles
  bubbleTopRight: {
    position: "absolute",
    top: -80,
    right: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  bubbleBottomLeft: {
    position: "absolute",
    bottom: -60,
    left: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  watermarkContainer: {
    position: "absolute",
    right: -60,
    top: -20,
    zIndex: 0,
    transform: [{ rotate: "-15deg" }, { scaleX: -1 }],
  },
  content: {
    gap: 16,
    zIndex: 1,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: "flex-start",
    gap: 6,
  },
  chipText: {
    color: "white",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  textContainer: {
    gap: 4,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "900",
    color: "white",
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.85)",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: "flex-start",
    gap: 8,
    zIndex: 2,
    marginTop: 4, // Tighter margin
    shadowColor: "rgba(0, 0, 0, 0.1)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  actionText: {
    fontSize: 14,
    color: "#7C3AED",
    fontWeight: "900",
    letterSpacing: 0.5,
  },
});
