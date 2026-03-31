import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import {
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";

import ConfettiAnimation from "../../../../../components/ConfettiAnimation";
import { ROUTE_NAMES } from "../../../../../constants/routes";
import { theme } from "../../../../../Theme/tokens";
import {
    parseShadowStyle,
    parseTextStyle,
} from "../../../../../util/functions/parseStyles";
import Reminder from "../Reminder";

const { width } = Dimensions.get("window");

interface DonePracticeProps {
  practiceName?: string;
  onDone?: () => void;
  isAborted?: boolean;
}

const DonePractice = ({
  practiceName = "practice",
  onDone,
  isAborted = false,
}: DonePracticeProps) => {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.container}>
      {/* Confetti Animation (Only if completed) */}
      {!isAborted && <ConfettiAnimation />}

      {/* Immersive Gradient Background */}
      <View style={StyleSheet.absoluteFillObject}>
        <LinearGradient
          colors={
            isAborted
              ? ["#F8FAFC", "#F1F5F9", "#E2E8F0"] // Soft slate blues for aborted
              : ["#FFF7ED", "#FFEDD5", "#FFF"] // Warm peach for completed
          }
          locations={[0, 0.5, 1]}
          style={{ flex: 1 }}
        />
      </View>

      <View style={styles.content}>
        {/* Checkmark or Pause/Leaf Icon */}
        <View style={styles.checkmarkContainer}>
          <LinearGradient
            colors={
              isAborted ? ["#94A3B8", "#64748B"] : ["#10B981", "#059669"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.checkmarkCircle}
          >
            <Icon 
              name={isAborted ? "leaf" : "check"} 
              size={isAborted ? 50 : 60} 
              color="#FFFFFF" 
            />
          </LinearGradient>
        </View>

        {/* Success / Encouraging Text */}
        <View style={styles.textContainer}>
          <Text style={styles.titleText}>
            {isAborted ? "That's okay." : "Great Job!"}
          </Text>
          <Text style={styles.descText}>
            {isAborted 
              ? `Every effort is a step forward. You can always return to your ${practiceName} when you feel ready.` 
              : `You've completed your daily ${practiceName}. Keep up the momentum!`}
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actionContainer}>
          {onDone ? (
            <TouchableOpacity
              style={styles.exploreButton}
              activeOpacity={0.9}
              onPress={onDone}
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
                <Text style={styles.exploreText}>Done</Text>
                <Icon
                  name="check"
                  size={80}
                  color="#FFF"
                  style={styles.exploreWatermark}
                />
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.exploreButton}
              activeOpacity={0.9}
              onPress={() => {
                navigation.navigate("Root", {
                  screen: ROUTE_NAMES.EXPLORE,
                  params: { screen: "Explore", params: { scrollToJumpIn: true } },
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
          )}

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
    </View>
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
  checkmarkContainer: {
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  checkmarkCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
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
