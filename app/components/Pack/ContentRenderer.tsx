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
          <TouchableOpacity style={styles.playButton}>
            <MaterialCommunityIcons name="play" size={20} color="white" />
          </TouchableOpacity>
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
          <LinearGradient
            colors={[theme.colors.background.light, "#FDF2F8"]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.activityHeader}>
            <View
              style={[
                styles.activityIconBox,
                { backgroundColor: theme.colors.library.purple[100] },
              ]}
            >
              <MaterialCommunityIcons
                name="lightning-bolt"
                size={24}
                color={theme.colors.library.purple[500]}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.activityLabel}>PRACTICE ACTIVITY</Text>
              <Text style={styles.activityTitle}>
                {content.titleOverride || "Practice Activity"}
              </Text>
            </View>
          </View>

          <Text style={styles.activityInstructions}>
            {content.descriptionOverride ||
              "Complete this activity to move forward."}
          </Text>

          <TouchableOpacity
            style={[styles.startActivityButton, loading && { opacity: 0.6 }]}
            onPress={handleStartActivity}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <Text style={styles.startActivityButtonText}>
                  Start Practice
                </Text>
                <MaterialCommunityIcons
                  name="arrow-right"
                  size={16}
                  color="white"
                />
              </>
            )}
          </TouchableOpacity>
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
    marginBottom: 16,
  },
  text: {
    fontSize: 16,
    color: theme.colors.text.default,
    lineHeight: 24,
  },
  mediaContainer: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  videoPlaceholder: {
    width: "100%",
    height: 200,
    backgroundColor: "#1E293B",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  mediaText: {
    color: "white",
    fontWeight: "600",
  },
  audioContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.background.default,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  audioText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text.title,
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.actionPrimary.default,
    justifyContent: "center",
    alignItems: "center",
  },
  activityCard: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    marginBottom: 16,
    padding: 20,
    backgroundColor: "white",
  },
  activityHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 16,
  },
  activityIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  activityLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: theme.colors.text.disabled,
    letterSpacing: 1,
    marginBottom: 4,
  },
  activityTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text.title,
  },
  activityInstructions: {
    fontSize: 14,
    color: theme.colors.text.default,
    lineHeight: 22,
    marginBottom: 20,
  },
  startActivityButton: {
    flexDirection: "row",
    backgroundColor: theme.colors.text.title,
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  startActivityButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
});
