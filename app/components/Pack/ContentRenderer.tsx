import { useNavigation } from "@react-navigation/native";
import { track } from "../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../util/analytics/analyticsEvents";
import React, { useState } from "react";
import { Alert, View } from "react-native";
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
import {
    Text,
    Icon,
    icons,
    Spinner,
    useTheme,
    makeStyles,
    withAlpha,
    spacing,
    space,
    radius,
} from "../../design-system";
import { SimpleMarkdown } from "./SimpleMarkdown";

import { useActivityStore } from "../../stores/activity";
import { useUserStore } from "../../stores/user";
import { showErrorBottomSheet } from "../../util/functions/bottomSheet";
import {
  classifyPackError,
  packErrorMessage,
} from "../../util/packs/packErrors";
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

/**
 * A finished ACTIVITY/FORM block. Done work should recede, not shout — so it's a
 * calm `surface.elevated` card with a solid success badge, matching how completed
 * items read elsewhere (e.g. PracticeGrid's corner badge), NOT a bright gradient
 * hero (which stays reserved for the active call-to-action).
 */
const CompletedCard: React.FC<{ title: string; children?: React.ReactNode }> = ({
  title,
  children,
}) => {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.completedCard}>
      <View style={styles.completedChip}>
        <Icon name={icons.success} size={14} color={colors.accentOn.success} />
        <Text variant="label" color={colors.accentOn.success}>
          Completed
        </Text>
      </View>
      <View style={styles.textContainer}>
        <Text variant="h2" color="primary">
          {title}
        </Text>
        {children}
      </View>
    </View>
  );
};

export const ContentRenderer: React.FC<ContentRendererProps> = ({
  block,
  packId,
  moduleId,
  isCompleted,
  blockIndex,
  onActivityCreated,
}) => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = useStyles();
  const [loading, setLoading] = useState(false);

  switch (block.type) {
    case ContentBlockType.TEXT: {
      const textContent = block.content as TextBlockContent;
      return (
        <View style={styles.textBlock}>
          {/* Reading copy sits directly on the dark canvas — light-on-dark. */}
          <SimpleMarkdown
            content={textContent.markdown}
            textColor={colors.text.primary}
          />
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

          // Classification and copy live in util/packs/packErrors so the same
          // decision cannot drift between this screen and PackModule — and so
          // it can be tested without rendering a React Native tree.
          const message = packErrorMessage(classifyPackError(error));
          if (message) {
            showErrorBottomSheet(message.title, message.body);
          }
        } finally {
          setLoading(false);
        }
      };

      const activityDescription =
        content.descriptionOverride ||
        "Use your techniques in this clinical challenge.";

      // Done → calm success card; active → solid action.primary CTA hero.
      if (isCompleted) {
        return (
          <CompletedCard title={content.titleOverride || "Practice Activity"}>
            <SimpleMarkdown
              content={activityDescription}
              textColor={colors.text.secondary}
            />
          </CompletedCard>
        );
      }

      const ink = colors.action.onPrimary;

      return (
        <TactileTouchableOpacity
          style={styles.card}
          onPress={handleStartActivity}
          disabled={loading}
          activeOpacity={0.9}
        >
          <View style={[styles.cardFill, { backgroundColor: colors.action.primary }]}>
            {/* Decorative bubbles — subtle ink wash on the bright fill. */}
            <View
              style={[styles.bubbleTopRight, { backgroundColor: withAlpha(ink, 0.1) }]}
              pointerEvents="none"
            />
            <View
              style={[styles.bubbleBottomLeft, { backgroundColor: withAlpha(ink, 0.1) }]}
              pointerEvents="none"
            />

            <View style={styles.cardContent}>
              {/* Title and Description — no eyebrow (matches home card language). */}
              <View style={styles.textContainer}>
                <Text variant="h2" color={ink}>
                  {content.titleOverride || "Practice Activity"}
                </Text>
                <SimpleMarkdown content={activityDescription} textColor={ink} />
              </View>

              {/* Action = solid dark island (matches home hero CTAs). */}
              <View style={[styles.cta, { backgroundColor: colors.action.secondary }]}>
                {loading ? (
                  <Spinner size="small" color={colors.action.onSecondary} />
                ) : (
                  <>
                    <Icon name={icons.play} size={16} color={colors.action.onSecondary} />
                    <Text variant="title" color={colors.action.onSecondary}>
                      Start Practice
                    </Text>
                  </>
                )}
              </View>
            </View>
          </View>
        </TactileTouchableOpacity>
      );
    }

    case ContentBlockType.FORM: {
      const formContent = block.content as FormBlockContent;
      const config = formContent?.configuration;
      const formTitle = formContent?.titleOverride || config?.title || "Reflection";

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
          // Reflection flow accent — keeps the form's inner controls in sync
          // with the purple reflection card that opened it.
          accentKey: "purple",
        });
      };

      // Done → calm success card; active → a solid purple hero (the app's
      // "reflect / write it down" accent), distinct from the orange practice
      // hero so the two block types read as different steps at a glance.
      if (isCompleted) {
        return (
          <CompletedCard title={formTitle}>
            {config?.description ? (
              <Text variant="body" color="secondary">
                {config.description}
              </Text>
            ) : null}
          </CompletedCard>
        );
      }

      const ink = colors.accentOn.purple;

      return (
        <TactileTouchableOpacity
          style={styles.card}
          onPress={handleStartForm}
          activeOpacity={0.9}
        >
          <View style={[styles.cardFill, { backgroundColor: colors.accent.purple }]}>
            <View
              style={[styles.bubbleTopRight, { backgroundColor: withAlpha(ink, 0.1) }]}
              pointerEvents="none"
            />
            <View
              style={[styles.bubbleBottomLeft, { backgroundColor: withAlpha(ink, 0.1) }]}
              pointerEvents="none"
            />

            <View style={styles.cardContent}>
              {/* Title and Description — no eyebrow (matches home card language). */}
              <View style={styles.textContainer}>
                <Text variant="h2" color={ink}>
                  {formTitle}
                </Text>
                {config?.description ? (
                  <Text variant="body" color={ink}>
                    {config.description}
                  </Text>
                ) : null}
              </View>

              {/* Action = solid dark island (matches home hero CTAs). */}
              <View style={[styles.cta, { backgroundColor: colors.action.secondary }]}>
                <Icon name={icons.play} size={16} color={colors.action.onSecondary} />
                <Text variant="title" color={colors.action.onSecondary}>
                  Start Reflection
                </Text>
              </View>
            </View>
          </View>
        </TactileTouchableOpacity>
      );
    }

    // ... handle other types
    default:
      return (
        <Text variant="body" color="secondary">
          Unsupported block type: {block.type}
        </Text>
      );
  }
};

const useStyles = makeStyles((c) => ({
  textBlock: {
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.xs,
  },
  mediaContainer: {
    marginBottom: spacing.xl,
    borderRadius: radius.card,
    overflow: "hidden",
    backgroundColor: c.surface.control,
  },
  // Solid vivid hero card (active ACTIVITY / FORM) — matches the home hero cards.
  card: {
    marginBottom: spacing.xl,
    borderRadius: radius.card,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  cardFill: {
    borderRadius: radius.card,
    padding: spacing.xl,
    overflow: "hidden",
    position: "relative",
  },
  bubbleTopRight: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  bubbleBottomLeft: {
    position: "absolute",
    bottom: -20,
    left: -20,
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  cardContent: {
    zIndex: 1,
    gap: space.groupGap,
    alignItems: "flex-start",
  },
  textContainer: {
    gap: space.titleSub,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: space.inlineGap,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    marginTop: spacing.xs,
  },
  // Completed card — calm surface, solid success badge (matches app convention)
  completedCard: {
    marginBottom: spacing.xl,
    borderRadius: radius.card,
    padding: spacing.xl,
    backgroundColor: c.surface.elevated,
    borderWidth: 1,
    borderColor: c.border.hairline,
    gap: space.groupGap,
    alignItems: "flex-start",
  },
  completedChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    gap: space.inlineGap,
    backgroundColor: c.accent.success,
  },
}));
