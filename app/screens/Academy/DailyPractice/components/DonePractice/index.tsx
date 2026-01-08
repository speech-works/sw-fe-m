import React from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Icon from "react-native-vector-icons/FontAwesome5";
import { useNavigation } from "@react-navigation/native";

import { theme } from "../../../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../util/functions/parseStyles";
import { ROUTE_NAMES } from "../../../../../constants/routes";
import StorytellerFace from "../../../../../assets/sw-faces/StorytellerFace";
import Reminder from "../Reminder";
import ScreenView from "../../../../../components/ScreenView";

const { width } = Dimensions.get("window");

const DonePractice = () => {
  const navigation = useNavigation<any>();

  return (
    <ScreenView style={styles.container}>
      {/* Immersive Gradient Background */}
      <View style={StyleSheet.absoluteFillObject}>
        <LinearGradient
          colors={["#FFF7ED", "#FFEDD5", "#FFF"]} // Peach -> Warm -> White
          locations={[0, 0.5, 1]}
          style={{ flex: 1 }}
        />
      </View>

      <View style={styles.content}>
        {/* Animated Face */}
        <View style={styles.faceContainer}>
          {/* Subtle Glow behind the face */}
          <LinearGradient
            colors={["rgba(251, 146, 60, 0.2)", "transparent"]}
            style={styles.glow}
          />
          <StorytellerFace size={160} shouldAnimate loop />
        </View>

        {/* Success Text */}
        <View style={styles.textContainer}>
          <Text style={styles.titleText}>Great Job!</Text>
          <Text style={styles.descText}>
            You've completed your daily story practice. Keep up the momentum!
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.exploreButton}
            activeOpacity={0.9}
            onPress={() => {
              navigation.navigate(ROUTE_NAMES.EXPLORE, {
                screen: "Explore",
              });
            }}
          >
            <LinearGradient
              colors={[
                theme.colors.library.orange[400],
                theme.colors.library.orange[500],
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.exploreGradient}
            >
              <Text style={styles.exploreText}>Explore More</Text>
              {/* Compass Watermark */}
              <Icon
                name="compass"
                size={80}
                color="#FFF"
                style={styles.exploreWatermark}
              />
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.reminderWrapper}>
            <Reminder
              renderTrigger={(onOpen) => (
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={onOpen}
                  activeOpacity={0.7}
                >
                  <Text style={styles.secondaryButtonText}>Set Reminder</Text>
                  {/* Bell Watermark */}
                  <Icon
                    name="bell"
                    size={64}
                    color={theme.colors.text.default}
                    style={styles.secondaryWatermark}
                  />
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </View>
    </ScreenView>
  );
};

export default DonePractice;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 40,
  },
  faceContainer: {
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  glow: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    top: "50%",
    left: "50%",
    transform: [{ translateX: -100 }, { translateY: -100 }],
  },
  textContainer: {
    alignItems: "center",
    gap: 12,
  },
  titleText: {
    ...parseTextStyle(theme.typography.Heading1),
    color: theme.colors.text.title,
    fontSize: 32,
    letterSpacing: -0.5,
  },
  descText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    textAlign: "center",
    lineHeight: 24,
    opacity: 0.8,
  },
  actionContainer: {
    width: "100%",
    gap: 12,
    marginTop: 20,
  },
  reminderWrapper: {
    width: "100%",
  },
  exploreButton: {
    width: "100%",
    height: 56, // Fixed height for absolute positioning
    borderRadius: 28,
    overflow: "hidden", // Clip the watermark
    ...parseShadowStyle(theme.shadow.elevation2),
  },
  exploreGradient: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  exploreText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: "#FFF",
    fontSize: 18,
    zIndex: 2, // Text above watermark
  },
  exploreWatermark: {
    position: "absolute",
    right: -15,
    bottom: -15,
    opacity: 0.2,
    transform: [{ rotate: "-15deg" }],
  },
  secondaryButton: {
    width: "100%",
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    ...parseShadowStyle(theme.shadow.elevation1),
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    overflow: "hidden",
  },
  secondaryButtonText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    fontWeight: "600",
    zIndex: 2,
  },
  secondaryWatermark: {
    position: "absolute",
    right: -12,
    bottom: -12,
    opacity: 0.08,
    transform: [{ rotate: "10deg" }],
  },
});
