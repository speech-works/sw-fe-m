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
import {
  createPracticeActivityFromPack,
  PracticeActivityContentType,
} from "../../api";

import { navigateToPackActivity } from "../../utils/packActivityNavigation";
import { parseShadowStyle } from "../../util/functions/parseStyles";
import { triggerToast } from "../../util/functions/toast";
import { TactileTouchableOpacity } from "../TactileTouchableOpacity";
import { VideoPlayer } from "../VideoPlayer";

interface ContentRendererProps {
  block: ModuleContentBlock;
  packId?: string;
  moduleId?: string;
  isMandatory?: boolean;
  isCompleted?: boolean;
  onActivityCreated?: (blockId: string, activityId: string) => void;
}

const { width } = Dimensions.get("window");

export const ContentRenderer: React.FC<ContentRendererProps> = ({
  block,
  packId,
  moduleId,
  isMandatory,
  isCompleted,
  onActivityCreated,
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
      const videoContent = block.content as VideoBlockContent;
      return (
        <View style={styles.mediaContainer}>
          <VideoPlayer
            uri={videoContent.videoId}
            poster={videoContent.thumbnailUrl}
            title={block.content.titleOverride || "Video Lesson"}
            style={{ width: "100%" }}
          />
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
        console.log("Full Content Block:", JSON.stringify(content, null, 2));
        if (!packId || !moduleId) {
          Alert.alert("Error", "Pack context missing");
          return;
        }

        try {
          console.log("handleStartActivity triggered for block:", block.id);
          setLoading(true);

          // Fallback if activityType is undefined (it might be content.contentType)
          const contentType =
            content.activityType || (content as any).contentType;

          if (!contentType) {
            console.error("Missing contentType in block content", content);
            throw new Error("Content type is missing");
          }

          // NEW WORKFLOW: Always use POST /practice-activities to create a unique record
          console.log(
            ">> Pack: Creating activity via POST /practice-activities",
            {
              packId,
              moduleId,
              contentType,
              contentId: content.refId,
            },
          );
          const activity = await createPracticeActivityFromPack({
            packId,
            moduleId,
            contentType: contentType as PracticeActivityContentType,

            contentId: content.refId,
          });
          console.log("<< Pack: Activity created successfully", activity.id);

          // Notify parent that activity was created
          onActivityCreated?.(block.id, activity.id);

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
          }

          triggerToast(
            "error",
            "Something went wrong",
            "We had trouble loading that activity. Please try again.",
          );
        } finally {
          setLoading(false);
        }
      };

      return (
        <TactileTouchableOpacity
          style={styles.activityCard}
          onPress={handleStartActivity}
          disabled={loading || isCompleted}
          activeOpacity={isCompleted ? 1 : 0.9}
        >
          <LinearGradient
            colors={
              isCompleted
                ? ["#10B981", "#059669"] // Green for completed
                : ["#F97316", "#EA580C"] // Orange for active
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradient}
          >
            {/* Decorative Bubbles */}
            <View style={styles.bubbleTopRight} />
            <View style={styles.bubbleBottomLeft} />

            <View style={styles.cardContent}>
              {/* Header with Badge */}
              <View
                style={[
                  styles.chip,
                  isCompleted
                    ? styles.completedChip
                    : isMandatory
                      ? styles.recommendedChip
                      : styles.optionalChip,
                ]}
              >
                <MaterialCommunityIcons
                  name={
                    isCompleted
                      ? "check-bold"
                      : isMandatory
                        ? "star"
                        : "star-outline"
                  }
                  size={14}
                  color="white"
                />
                <Text style={styles.chipText}>
                  {isCompleted
                    ? "COMPLETED"
                    : isMandatory
                      ? "RECOMMENDED"
                      : "OPTIONAL"}
                </Text>
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

              {/* Action Button - Only show if not completed */}
              {!isCompleted && (
                <View style={styles.actionButtonContainer}>
                  <View style={styles.actionButton}>
                    {loading && (
                      <ActivityIndicator
                        color={theme.colors.library.orange[600]}
                        size="small"
                        style={StyleSheet.absoluteFill}
                      />
                    )}
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        opacity: loading ? 0 : 1,
                      }}
                    >
                      <MaterialCommunityIcons
                        name="play"
                        size={20}
                        color={theme.colors.library.orange[600]}
                      />
                      <Text style={styles.actionButtonText}>
                        Start Practice
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          </LinearGradient>
        </TactileTouchableOpacity>
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
  chipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  recommendedChip: {
    backgroundColor: "rgba(251, 191, 36, 0.3)", // Amber with transparency
  },
  optionalChip: {
    backgroundColor: "rgba(148, 163, 184, 0.3)", // Slate with transparency
  },
  completedChip: {
    backgroundColor: "rgba(255, 255, 255, 0.25)", // Use white transparency for better visibility on green
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
  actionButtonContainer: {
    alignSelf: "flex-start",
    borderRadius: 24,
    ...parseShadowStyle(theme.shadow.elevation1),
    backgroundColor: "white",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  actionButtonText: {
    color: theme.colors.library.orange[600],
    fontWeight: "700",
    fontSize: 15,
  },
});
