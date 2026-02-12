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
        if (!packId || !moduleId) {
          Alert.alert("Error", "Pack context missing");
          return;
        }

        try {
          setLoading(true);
          const activity = await getGuidedActivity(content.refId);

          navigateToPackActivity(navigation, activity, {
            blockId: block.id,
            moduleId,
            packId,
          });
        } catch (error) {
          console.error("Failed to load activity:", error);
          Alert.alert(
            "Error",
            "Could not load practice activity. Please try again.",
            [{ text: "OK", style: "cancel" }],
          );
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
