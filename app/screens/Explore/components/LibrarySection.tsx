import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import { theme } from "../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../util/functions/parseStyles";

interface LibrarySectionProps {
  onLayoutCapture?: (event: any) => void;
}

const LibrarySection: React.FC<LibrarySectionProps> = ({ onLayoutCapture }) => {
  const navigation = useNavigation<any>();

  return (
    <View
      onLayout={(event) => {
        if (onLayoutCapture) onLayoutCapture(event);
      }}
      style={styles.container}
    >
      <Text style={styles.sectionTitle}>Library</Text>

      <TouchableOpacity
        style={styles.cardContainer}
        onPress={() =>
          navigation.navigate("LibraryStack", {
            screen: "Library",
            params: { from: "EXPLORE" },
          })
        }
        activeOpacity={0.9}
      >
        <LinearGradient
          // Premium Purple-Pink-Orange Gradient
          // Warm Orange-Pink Gradient
          colors={[
            theme.colors.library.orange[400],
            theme.colors.library.orange[500],
            "#DB2777",
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {/* Decorative Bubbles */}
          <View
            style={[
              styles.bubble,
              { width: 100, height: 100, top: -20, right: -20, opacity: 0.2 },
            ]}
          />
          <View
            style={[
              styles.bubble,
              { width: 60, height: 60, bottom: 10, left: 10, opacity: 0.15 },
            ]}
          />
          <View
            style={[
              styles.bubble,
              { width: 40, height: 40, top: 20, right: 80, opacity: 0.1 },
            ]}
          />

          <View style={styles.content}>
            <View style={styles.textContainer}>
              <Text style={styles.cardTitle}>Video Tutorials</Text>
              <Text style={styles.cardSubtitle}>
                Master speech techniques with our curated video collection.
              </Text>
            </View>

            <View style={styles.iconCircle}>
              <Icon
                name="play"
                size={24}
                color={theme.colors.library.orange[500]}
                style={{ marginLeft: 4 }}
              />
            </View>
          </View>

          {/* Tag / Badge */}
          <View style={styles.badge}>
            <Icon name="video" size={12} color="#FFFFFF" />
            <Text style={styles.badgeText}>Recorded Lessons</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

export default React.memo(LibrarySection);

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  sectionTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },
  cardContainer: {
    width: "100%",
    height: 160,
    borderRadius: 24,
    ...parseShadowStyle(theme.shadow.elevation2),
    overflow: "hidden", // Clips the gradient and bubbles
    backgroundColor: "#FFF",
  },
  gradient: {
    flex: 1,
    padding: 24,
    justifyContent: "space-between",
    position: "relative",
  },
  bubble: {
    position: "absolute",
    backgroundColor: "white",
    borderRadius: 999,
  },
  content: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  textContainer: {
    flex: 1,
    paddingRight: 16,
    gap: 4,
  },
  cardTitle: {
    ...parseTextStyle(theme.typography.Heading2),
    color: "#FFFFFF",
    fontSize: 22,
  },
  cardSubtitle: {
    ...parseTextStyle(theme.typography.Body),
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  badge: {
    flexDirection: "row",
    alignSelf: "flex-start",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    marginTop: 12,
  },
  badgeText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
