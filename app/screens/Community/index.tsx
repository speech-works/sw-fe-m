import React from "react";
import { StyleSheet, Text, View, Dimensions } from "react-native";
import { theme } from "../../Theme/tokens";
import { parseTextStyle } from "../../util/functions/parseStyles";
import DiverseCommunityFace from "../../assets/sw-faces/DiverseCommunityFace";

const { width } = Dimensions.get("window");
// Size the face to be 80% of screen width
const FACE_SIZE = width * 0.8;

const Community = () => {
  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        {/* Main Illustration */}
        <DiverseCommunityFace size={FACE_SIZE} shouldAnimate />

        {/* Text Content */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>
            We are bringing the community together
          </Text>
          <Text style={styles.subtitle}>
            Connect with fellow learners, share your breakthroughs, and find
            your voice in a supportive space.
          </Text>
        </View>

        {/* "Coming Soon" Badge */}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>COMING SOON</Text>
        </View>
      </View>
    </View>
  );
};

export default Community;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC", // Slate 50 background
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  contentContainer: {
    alignItems: "center",
    gap: 32,
  },
  textContainer: {
    alignItems: "center",
    gap: 12,
  },
  title: {
    ...parseTextStyle(theme.typography.Heading3),
    fontSize: 28,
    textAlign: "center",
    color: "#1E293B", // Slate 800
  },
  subtitle: {
    ...parseTextStyle(theme.typography.Body),
    textAlign: "center",
    color: "#64748B", // Slate 500
    maxWidth: "80%",
    lineHeight: 24,
  },
  badge: {
    backgroundColor: "#E0F2FE", // Sky 100
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 100,
    marginTop: 8,
  },
  badgeText: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: "#0369A1", // Sky 700
    fontWeight: "700",
    letterSpacing: 1,
  },
});
