import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Linking,
  Dimensions,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  ModuleContentBlock,
  ContentBlockType,
  TextBlockContent,
  VideoBlockContent,
  AudioBlockContent,
  ReferenceBlockContent,
} from "../../api/packs/types";
import { theme } from "../../Theme/tokens";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SimpleMarkdown } from "./SimpleMarkdown";
import { LinearGradient } from "expo-linear-gradient";
import { getGuidedActivity } from "../../api";
import { navigateToPackActivity } from "../../utils/packActivityNavigation";
import { parseShadowStyle } from "../../util/functions/parseStyles";
import { TactileTouchableOpacity } from "../TactileTouchableOpacity";

interface ContentRendererProps {
  block: ModuleContentBlock;
  packId?: string;
  moduleId?: string;
}

const { width } = Dimensions.get("window");

export const ContentRenderer: React.FC<ContentRendererProps> = ({
  block,
  packId,
  moduleId,
}) => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);

  switch (block.type) {
    case ContentBlockType.TEXT: {
      const textContent = block.content as TextBlockContent;
      return (
        <View style={styles.textBlock}>
          <SimpleMarkdown content={textContent.markdown} />
        </View>
      );
    }
    case ContentBlockType.VIDEO: {
      // Placeholder for Video - in real app use expo-video or WebView
      const videoContent = block.content as VideoBlockContent;
      return (
        <View style={styles.mediaContainer}>
          <View style={styles.videoPlaceholder}>
            <MaterialCommunityIcons
              name="play-circle"
              size={48}
              color="white"
            />
            <Text style={styles.mediaText}>Video: {videoContent.videoId}</Text>
          </View>
        </View>
      );
    }
    case ContentBlockType.AUDIO: {
      const audioContent = block.content as AudioBlockContent;
      return (
        <View style={styles.audioContainer}>
          <MaterialCommunityIcons
            name="headphones"
            size={24}
            color={theme.colors.actionPrimary.default}
          />
          <Text style={styles.audioText}>Audio Track</Text>
          <TactileTouchableOpacity style={styles.playButton}>
            <MaterialCommunityIcons name="play" size={20} color="white" />
          </TactileTouchableOpacity>
        </View>
      );
    }

    case ContentBlockType.ACTIVITY: {
      const content = block.content as ReferenceBlockContent;

      const handleStartActivity = async () => {
        // console.log("Full Content Block:", JSON.stringify(content, null, 2));
        if (!packId || !moduleId) {
          Alert.alert("Error", "Pack context missing");
          return;
        }

        try {
          setLoading(true);
          let activity: any; // GuidedActivity

          // OPTIMIZATION: Check if content is already hydrated
          if (content.activityType && content.configuration) {
            console.log("Using hydrated activity data");

            // Helper to infer type if missing
            const inferType = (config: any, category: string) => {
              if (config.type) return config.type;

              if (category === "COGNITIVE_PRACTICE") {
                if (config.affirmations) return "POSITIVE_AFFIRMATIONS";
                if (config.scenarios) return "REFRAMING_THOUGHTS";
                if (config.audioUrlKey || config.bgMusicUrl)
                  return "GUIDED_MEDITATION";
                if (config.tips && config.durationMinutes)
                  return "GUIDED_BREATHING";
                if (config.realLifeChallengeData) return "REAL_LIFE_CHALLENGE";
              }
              // Add other categories if needed (Exposure, Fun, etc)
              return undefined;
            };

            const inferredType = inferType(
              content.configuration,
              content.activityType!,
            );
            const configWithType = {
              ...content.configuration,
              type: inferredType,
            };

            // Construct GuidedActivity from hydrated fields
            activity = {
              id: content.refId,
              contentType: content.activityType,
              createdAt: new Date().toISOString(), // Serializable date
              updatedAt: new Date().toISOString(), // Serializable date
              // Map configuration to specific practice type field
              cognitivePractice:
                content.activityType === "COGNITIVE_PRACTICE"
                  ? configWithType
                  : undefined,
              exposurePractice:
                content.activityType === "EXPOSURE_PRACTICE"
                  ? configWithType
                  : undefined,
              funPractice:
                content.activityType === "FUN_PRACTICE"
                  ? configWithType
                  : undefined,
              readingPractice:
                content.activityType === "READING_PRACTICE"
                  ? configWithType
                  : undefined,
            };
          } else {
            // Fallback to fetching
            console.log("Fetching activity from API");
            activity = await getGuidedActivity(content.refId);
          }

          navigateToPackActivity(navigation, activity, {
            blockId: block.id,
            moduleId,
            packId,
          });
        } catch (error: any) {
          console.error("Failed to load activity:", error);
          if (error.response) {
            console.error("Error status:", error.response.status);
            console.error("Error data:", error.response.data);
            Alert.alert(
              "Error",
              `Could not load practice activity (${error.response.status}).\n${JSON.stringify(error.response.data)}\nPlease try again.`,
              [{ text: "OK", style: "cancel" }],
            );
          } else {
            Alert.alert(
              "Error",
              "Could not load practice activity. Please try again.",
              [{ text: "OK", style: "cancel" }],
            );
          }
        } finally {
          setLoading(false);
        }
      };

      return (
        <View style={styles.activityCard}>
          <TactileTouchableOpacity
            activeOpacity={0.9}
            hapticFeedback={true}
            onPress={handleStartActivity}
            disabled={loading}
          >
            <LinearGradient
              colors={["#F97316", "#EA580C"]} // Orange 500 -> Orange 600
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardGradient}
            >
              {/* Decorative Bubbles */}
              <View style={styles.bubbleTopRight} />
              <View style={styles.bubbleBottomLeft} />

              <View style={styles.cardContent}>
                {/* Header with Chip */}
                <View style={styles.chip}>
                  <MaterialCommunityIcons
                    name="lightning-bolt"
                    size={14}
                    color="white"
                  />
                  <Text style={styles.chipText}>PRACTICE ACTIVITY</Text>
                </View>

                {/* Title and Description */}
                <View style={styles.textContainer}>
                  <Text style={styles.activityTitle}>
                    {content.titleOverride || "Practice Activity"}
                  </Text>
                  <Text style={styles.activityInstructions}>
                    {content.descriptionOverride ||
                      "Complete this activity to move forward."}
                  </Text>
                </View>

                {/* Action Button */}
                <View style={styles.actionButton}>
                  {loading ? (
                    <ActivityIndicator
                      color={theme.colors.library.orange[600]}
                      size="small"
                    />
                  ) : (
                    <>
                      <MaterialCommunityIcons
                        name="play"
                        size={16}
                        color={theme.colors.library.orange[600]}
                      />
                      <Text style={styles.actionButtonText}>
                        Start Practice
                      </Text>
                    </>
                  )}
                </View>
              </View>
            </LinearGradient>
          </TactileTouchableOpacity>
        </View>
      );
    }

    // ... handle other types
    default:
      return <Text>Unsupported block type: {block.type}</Text>;
  }
};

const styles = StyleSheet.create({
  textBlock: {
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  text: {
    fontSize: 16,
    color: theme.colors.text.default,
    lineHeight: 26,
    letterSpacing: 0.2,
  },
  mediaContainer: {
    marginBottom: 24,
    borderRadius: 20,
    overflow: "hidden",
    ...parseShadowStyle(theme.shadow.elevation2),
    backgroundColor: "#F1F5F9",
  },
  videoPlaceholder: {
    width: "100%",
    height: 220,
    backgroundColor: "#1E293B",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  mediaText: {
    color: "white",
    fontWeight: "600",
    opacity: 0.9,
  },
  audioContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 20,
    marginBottom: 24,
    gap: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  audioText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text.title,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.actionPrimary.default,
    justifyContent: "center",
    alignItems: "center",
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  // New Activity Card Styles
  activityCard: {
    marginBottom: 24,
    borderRadius: 24,
    ...parseShadowStyle(theme.shadow.elevation2),
    // Shadow color to match the gradient
    shadowColor: "#EA580C",
    shadowOpacity: 0.25,
    backgroundColor: "white", // Fallback
  },
  cardGradient: {
    borderRadius: 24,
    padding: 24,
    minHeight: 220,
    position: "relative",
    overflow: "hidden",
    justifyContent: "space-between",
  },
  // Decorative Bubbles
  bubbleTopRight: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  bubbleBottomLeft: {
    position: "absolute",
    bottom: -20,
    left: -20,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  cardContent: {
    zIndex: 1,
    gap: 16,
    height: "100%",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  chipText: {
    color: "white",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  textContainer: {
    gap: 8,
    marginVertical: 12,
  },
  activityTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "white",
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  activityInstructions: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.9)",
    lineHeight: 22,
    maxWidth: "95%",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
    ...parseShadowStyle(theme.shadow.elevation1),
    alignSelf: "flex-start",
  },
  actionButtonText: {
    color: theme.colors.library.orange[600],
    fontWeight: "700",
    fontSize: 15,
  },
});
