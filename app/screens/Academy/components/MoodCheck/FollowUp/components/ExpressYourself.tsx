import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { logMood } from "../../../../../../api/moodCheck";
import { MoodType } from "../../../../../../api/moodCheck/types";
import { RecordingSourceType } from "../../../../../../api/recordings/types";
import { useRecordedVoice } from "../../../../../../hooks/useRecordedVoice";
import { useMoodCheckStore } from "../../../../../../stores/mood";
import { useProgressReportStore } from "../../../../../../stores/progressReport";
import { useUserStore } from "../../../../../../stores/user";
import {
  useTheme,
  space,
  spacing,
  radius,
  size,
  gradients,
  Sheet,
  Text,
  Icon,
  Button,
  TextField,
  withAlpha,
} from "../../../../../../design-system";
import SmartRecorder from "../../../../DailyPractice/pages/ReadingPractice/StoryPractice/components/SmartRecorder";

export enum EXPRESSION_TYPE_ENUM {
  WRITE = "WRITE",
  TALK = "TALK",
}

interface ExpressYourselfProps {
  moodType: MoodType;
  expressionType: EXPRESSION_TYPE_ENUM | null;
  onClose: () => void;
  onAfterClose?: () => void;
  onSubmit: () => void;
  onError: (payload: {
    message: string;
    expressionType: EXPRESSION_TYPE_ENUM;
  }) => void;
}

const getMoodSubmitErrorMessage = (error: unknown) => {
  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    (error as any).response?.data?.error
  ) {
    return String((error as any).response.data.error);
  }

  if (error instanceof Error) {
    return error.message.replace(/^Error from backend:\s*/i, "");
  }

  if (typeof error === "string") {
    return error;
  }

  return "We couldn't save your mood right now. Please try again.";
};

const ExpressYourself = ({
  moodType,
  expressionType,
  onClose,
  onAfterClose,
  onSubmit,
  onError,
}: ExpressYourselfProps) => {
  const { colors } = useTheme();
  const { user } = useUserStore();
  const setMood = useMoodCheckStore((state) => state.setMood);
  const fetchReport = useProgressReportStore((state) => state.fetchReport);
  const {
    voiceRecordingUri,
    setVoiceRecordingUri,
    submitVoiceRecording,
    resetRecording,
  } =
    useRecordedVoice(user?.id);
  const [writtenText, setWrittenText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!expressionType) {
      setIsSubmitting(false);
      setWrittenText("");
      resetRecording();
    }
  }, [expressionType, resetRecording]);

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (!user) return;
    if (!user?.id) {
      console.warn("❌ User ID is missing during mood submission");
      return;
    }

    setIsSubmitting(true);

    try {
      if (expressionType === EXPRESSION_TYPE_ENUM.WRITE) {
        await logMood({
          userId: user.id,
          mood: moodType,
          textNote: writtenText,
        });
      } else if (expressionType === EXPRESSION_TYPE_ENUM.TALK) {
        let voiceNoteUrl: string | undefined;

        if (voiceRecordingUri) {
          const uploadedRecording = await submitVoiceRecording({
            recordingSource: RecordingSourceType.MOOD_CHECK,
          });
          if (!uploadedRecording) {
            throw new Error("Voice recording upload failed!");
          }
          voiceNoteUrl = uploadedRecording.audioUrl;
        }

        await logMood({
          userId: user.id,
          mood: moodType,
          ...(voiceNoteUrl ? { voiceNoteUrl } : {}),
        });
      } else {
        return;
      }

      setMood(moodType);
      await fetchReport(user.id, "weekly", true);
      onSubmit();
    } catch (error) {
      console.error("❌ Failed to submit mood expression:", error);
      if (expressionType) {
        onError({
          message: getMoodSubmitErrorMessage(error),
          expressionType,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Per-mode identity — the SAME fill as the parent action card (Talk = orange /
  // action.primary ≈ the sunrise card; Write = purple ≈ the aurora card), dark ink.
  const getConfig = () => {
    if (expressionType === EXPRESSION_TYPE_ENUM.WRITE) {
      return {
        gradientColors: gradients.aurora.colors, // matches the "Write it down" card
        fill: colors.accent.purple,
        ink: colors.accentOn.purple,
        icon: "edit-3" as const,
        title: "Write it down",
        subtitle: "Clear your mind by putting thoughts into words.",
      };
    }
    return {
      gradientColors: gradients.sunrise.colors, // matches the "Talk it out" card
      fill: colors.action.primary,
      ink: colors.accentOn.warning,
      icon: "mic" as const,
      title: "Talk it out",
      subtitle: "Speak freely to release tension and process emotions.",
    };
  };

  const config = getConfig();
  const fill = config.fill;
  const ink = config.ink;

  return (
    <Sheet
      visible={expressionType !== null}
      onClose={onClose}
      onDismissed={onAfterClose}
      gradientColors={config.gradientColors}
    >
      <View style={styles.body}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text variant="h2" color={ink}>
              {config.title}
            </Text>
            <Text variant="body" color={ink}>
              {config.subtitle}
            </Text>
          </View>
          <View style={styles.iconContainer}>
            <Icon name={config.icon} size={32} color={withAlpha(ink, 0.25)} />
          </View>
        </View>

        {/* Interaction Section */}
        {expressionType === EXPRESSION_TYPE_ENUM.WRITE ? (
          <View
            style={[styles.card, { backgroundColor: colors.surface.default }]}
            pointerEvents={isSubmitting ? "none" : "auto"}
          >
            <TextField
              multiline
              numberOfLines={6}
              placeholder="Start writing here..."
              value={writtenText}
              onChangeText={setWrittenText}
            />
            {/* Action Button for Write mode */}
            <Button
              label={isSubmitting ? "Saving..." : "Let it out"}
              onPress={handleSubmit}
              disabled={writtenText.length < 1 || isSubmitting}
              accentColor={fill}
              onAccentColor={ink}
            />
          </View>
        ) : (
          <View
            style={styles.recorderSection}
            pointerEvents={isSubmitting ? "none" : "auto"}
          >
            <Text variant="body" color={ink} center>
              {isSubmitting ? "Saving your mood..." : "Ready to record"}
            </Text>
            <SmartRecorder
              onRecorded={(uri) => setVoiceRecordingUri(uri)}
              prevRecordingUri={voiceRecordingUri || undefined}
              onSubmit={handleSubmit}
              onDiscard={() => setVoiceRecordingUri(null)}
            />
          </View>
        )}
      </View>
    </Sheet>
  );
};

export default ExpressYourself;

const styles = StyleSheet.create({
  body: {
    gap: space.groupGap,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: space.groupGap,
    gap: space.iconText,
    zIndex: 1,
  },
  headerTextContainer: {
    flex: 1,
    gap: space.titleSub,
  },
  iconContainer: {
    width: size.backBtn,
    height: size.backBtn,
    justifyContent: "center",
    alignItems: "center",
    transform: [{ rotate: "-15deg" }],
  },
  card: {
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.lg,
    zIndex: 2,
    marginTop: spacing["2xl"], // sit the interaction a bit below the header
  },
  recorderSection: {
    gap: space.groupGap,
    zIndex: 2,
    paddingTop: spacing["3xl"], // drop the recorder down from the header copy
    paddingBottom: spacing.lg,
  },
});
