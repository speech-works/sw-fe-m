import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { track } from "../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../util/analytics/analyticsEvents";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    StyleSheet,
    Text,
    View,
} from "react-native";
import {
    createPracticeActivityFromPack,
    PracticeActivityContentType,
} from "../../api";
import {
    startPracticeActivity,
} from "../../api/practiceActivities";
import {
    ContentBlockType,
    FormBlockContent,
    ModuleContentBlock,
    ReferenceBlockContent,
    TextBlockContent,
    VideoBlockContent,
} from "../../api/packs/types";
import { theme } from "../../Theme/tokens";
import { SimpleMarkdown } from "./SimpleMarkdown";

import { useActivityStore } from "../../stores/activity";
import { useUserStore } from "../../stores/user";
import { parseShadowStyle } from "../../util/functions/parseStyles";
import { showErrorBottomSheet } from "../../util/functions/bottomSheet";
import { navigateToPackActivity } from "../../utils/packActivityNavigation";
import { TactileTouchableOpacity } from "../TactileTouchableOpacity";
import { VideoPlayer } from "../VideoPlayer";

interface ContentRendererProps {
  block: ModuleContentBlock;
  packId?: string;
  moduleId?: string;
  isMandatory?: boolean;
  isCompleted?: boolean;
  blockIndex?: number;
  onActivityCreated?: (blockId: string, activityId: string) => void;
  onFormCompleted?: (blockId: string) => void;
}

const { width } = Dimensions.get("window");

export const ContentRenderer: React.FC<ContentRendererProps> = ({
  block,
  packId,
  moduleId,
  isMandatory,
  isCompleted,
  blockIndex,
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
      const videoUri = videoContent.videoUrl || videoContent.videoId;
      console.log(
        "[ContentRenderer] Video URI:",
        videoUri,
        "| thumbnailUrl:",
        videoContent.thumbnailUrl,
      );
      return (
        <View style={styles.mediaContainer}>
          <VideoPlayer
            uri={videoUri}
            poster={videoContent.thumbnailUrl}
            title={block.content.titleOverride || "Video Lesson"}
            style={{ width: "100%" }}
            autoPlay={true}
            isLocked={videoContent.isLocked}
            onPressGoPremium={() =>
              (navigation as any).navigate("PremiumModal")
            }
          />
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

          // Step 1: Create the activity record
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

          // Step 2: Start the activity (stamina check happens here)
          // If stamina is exhausted, this throws and the GlobalModal shows the upsell.
          // Navigation is blocked because we are still in the try block.
          const userId = useUserStore.getState().user?.id;
          if (!userId) {
            throw new Error("User not authenticated");
          }
          console.log(">> Pack: Starting activity (stamina check)", activity.id);
          const startedActivity = await startPracticeActivity({
            id: activity.id,
            userId,
          });
          console.log("<< Pack: Activity started successfully (stamina OK)", startedActivity.id);

          // Notify parent that activity was created
          onActivityCreated?.(block.id, activity.id);

          // Add to store so completion updates work (use the started version)
          useActivityStore.getState().addActivity(startedActivity);

          // Step 3: Navigate ONLY after stamina check passes
          track(ANALYTICS_EVENTS.ACTIVITY_STARTED, {
            packId,
            moduleId,
            activityId: startedActivity.id,
            contentType,
            contentId: content.refId,
            title: content.titleOverride || "Practice Activity"
          });

          navigateToPackActivity(navigation, startedActivity, {
            blockId: block.id,
            moduleId,
            packId,
            blockIndex,
            alreadyStarted: true, // Tell the activity screen to skip its own start call
          });
        } catch (error: any) {
          console.error("Failed to start activity:", error);
          if (error.response) {
            console.error("Error status:", error.response.status);
            console.error("Error data:", error.response.data);
          }

          // Only show toast for non-stamina errors (stamina errors are handled by GlobalModal)
          const errorCode = error?.response?.data?.errorCode;
          if (errorCode !== "INSUFFICIENT_STAMINA") {
            showErrorBottomSheet(
              "Something went wrong",
              "We had trouble loading that activity. Please try again.",
            );
          }
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
                <SimpleMarkdown
                  content={
                    content.descriptionOverride ||
                    (block.type === ContentBlockType.ACTIVITY
                      ? "Use your techniques in this clinical challenge."
                      : "Complete this task to move forward.")
                  }
                  textColor="rgba(255, 255, 255, 0.9)"
                />
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

    case ContentBlockType.FORM: {
      const formContent = block.content as FormBlockContent;
      const config = formContent?.configuration;

      const handleStartForm = () => {
        if (!packId || !moduleId) {
          Alert.alert("Error", "Pack context missing");
          return;
        }
        if (!config) {
          Alert.alert("Error", "Form configuration is missing");
          return;
        }
        (navigation as any).navigate("PackForm", {
          configuration: config,
          formId: formContent.formId,
          packId,
          moduleId,
          blockId: block.id,
        });
      };

      return (
        <TactileTouchableOpacity
          style={styles.formCard}
          onPress={handleStartForm}
          disabled={isCompleted}
          activeOpacity={isCompleted ? 1 : 0.9}
        >
          <LinearGradient
            colors={
              isCompleted ? ["#10B981", "#059669"] : ["#6366F1", "#8B5CF6"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradient}
          >
            <View style={styles.bubbleTopRight} />
            <View style={styles.bubbleBottomLeft} />

            <View style={styles.cardContent}>
              <View
                style={[
                  styles.chip,
                  isCompleted
                    ? styles.completedChip
                    : { backgroundColor: "rgba(255, 255, 255, 0.2)" },
                ]}
              >
                <MaterialCommunityIcons
                  name={isCompleted ? "check-bold" : "clipboard-text-outline"}
                  size={14}
                  color="white"
                />
                <Text style={styles.chipText}>
                  {isCompleted ? "COMPLETED" : "REFLECTION"}
                </Text>
              </View>

              <View style={styles.textContainer}>
                <Text style={styles.activityTitle}>
                  {formContent?.titleOverride || config?.title || "Reflection"}
                </Text>
                {config?.description ? (
                  <Text style={styles.activityInstructions}>
                    {config.description}
                  </Text>
                ) : null}
              </View>

              {!isCompleted && (
                <View style={styles.actionButtonContainer}>
                  <View style={styles.actionButton}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <MaterialCommunityIcons
                        name="pencil-outline"
                        size={20}
                        color="#6366F1"
                      />
                      <Text
                        style={[styles.actionButtonText, { color: "#6366F1" }]}
                      >
                        Start Reflection
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
  formCard: {
    marginBottom: 24,
    borderRadius: 24,
    ...parseShadowStyle(theme.shadow.elevation2),
    shadowColor: "#6366F1",
    shadowOpacity: 0.25,
    backgroundColor: "white",
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
    fontSize: 20,
    fontWeight: "600",
    color: "white",
    letterSpacing: -0.5,
    lineHeight: 26,
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
