import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import MaterialIcon from "react-native-vector-icons/MaterialCommunityIcons";
import BottomSheetModal from "../../../../../../components/BottomSheetModal";

import { logMood } from "../../../../../../api/moodCheck";
import { MoodType } from "../../../../../../api/moodCheck/types";
import { RecordingSourceType } from "../../../../../../api/recordings/types";
import { useRecordedVoice } from "../../../../../../hooks/useRecordedVoice";
import { useUserStore } from "../../../../../../stores/user";
import { theme } from "../../../../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../../util/functions/parseStyles";
import SmartRecorder from "../../../../DailyPractice/pages/ReadingPractice/StoryPractice/components/SmartRecorder";

export enum EXPRESSION_TYPE_ENUM {
  WRITE = "WRITE",
  TALK = "TALK",
}

interface ExpressYourselfProps {
  moodType: MoodType;
  expressionType: EXPRESSION_TYPE_ENUM | null;
  onClose: () => void;
  onSubmit: () => void;
}

const ExpressYourself = ({
  moodType,
  expressionType,
  onClose,
  onSubmit,
}: ExpressYourselfProps) => {
  const { user } = useUserStore();
  const { voiceRecordingUri, setVoiceRecordingUri, submitVoiceRecording } =
    useRecordedVoice(user?.id);
  const [writtenText, setWrittenText] = useState("");

  const handleSubmit = async () => {
    if (!user) return;
    if (!user?.id) {
      console.warn("❌ User ID is missing during mood submission");
      return;
    }

    try {
      if (expressionType === EXPRESSION_TYPE_ENUM.WRITE) {
        await logMood({
          userId: user.id,
          mood: moodType,
          textNote: writtenText,
        });
      } else if (
        expressionType === EXPRESSION_TYPE_ENUM.TALK &&
        voiceRecordingUri
      ) {
        const uploadedRecording = await submitVoiceRecording({
          recordingSource: RecordingSourceType.MOOD_CHECK,
        });
        if (!uploadedRecording) {
          throw new Error("Voice recording upload failed!");
        }
        await logMood({
          userId: user.id,
          mood: moodType,
          voiceNoteUrl: uploadedRecording.audioUrl,
        });
      }

      onSubmit();
      onClose();
    } catch (error) {
      console.error("❌ Failed to submit mood expression:", error);
    }
  };

  // Premium Light Configuration
  const getConfig = () => {
    if (expressionType === EXPRESSION_TYPE_ENUM.WRITE) {
      return {
        // Light Purple Gradient (Background)
        gradient: [
          theme.colors.library.purple[100],
          theme.colors.library.purple[200],
        ] as const,
        icon: "pencil",
        title: "Write it down",
        subtitle: "Clear your mind by putting thoughts into words.",
        // Vibrant Button
        buttonGradient: [
          theme.colors.library.purple[400],
          theme.colors.library.purple[600],
        ] as const,
        // Dark Text for Contrast
        titleColor: theme.colors.library.purple[800],
        iconColor: theme.colors.library.purple[400],
      };
    }
    return {
      // Light Orange Gradient (Background)
      gradient: [
        theme.colors.library.orange[100],
        theme.colors.library.orange[200],
      ] as const,
      icon: "microphone",
      title: "Talk it out",
      subtitle: "Speak freely to release tension and process emotions.",
      // Vibrant Button
      buttonGradient: [
        theme.colors.library.orange[400],
        theme.colors.library.red[400],
      ] as const,
      // Dark Text for Contrast
      titleColor: theme.colors.library.orange[800],
      iconColor: theme.colors.library.orange[400],
    };
  };

  const config = getConfig();

  return (
    <View>
      <BottomSheetModal
        visible={expressionType !== null}
        onClose={onClose}
        showCloseButton={true}
      >
        <LinearGradient
          colors={config.gradient}
          style={styles.container}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Decorative Bubbles (Subtle White) */}
          <View style={styles.bubbleTopRight} />
          <View style={styles.bubbleBottomLeft} />

          {/* Header Section */}
          <View style={styles.header}>
            <View style={styles.headerTextContainer}>
              <Text style={[styles.headerTitle, { color: config.titleColor }]}>
                {config.title}
              </Text>
              <Text style={styles.headerSubtitle}>{config.subtitle}</Text>
            </View>
            <View style={styles.iconContainer}>
              <MaterialIcon
                name={config.icon}
                size={32}
                color={config.iconColor}
                style={{ opacity: 0.2 }}
              />
            </View>
          </View>

          {/* Interaction Section */}
          {expressionType === EXPRESSION_TYPE_ENUM.WRITE ? (
            <View style={styles.card}>
              <TextInput
                style={styles.textInput}
                multiline
                placeholder="Start writing here..."
                placeholderTextColor={theme.colors.text.disabled}
                value={writtenText}
                onChangeText={setWrittenText}
              />
              {/* Action Button for Write mode */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleSubmit}
                disabled={writtenText.length < 1}
                style={[
                  styles.buttonContainer,
                  writtenText.length < 1 && styles.disabledButtonContainer,
                ]}
              >
                <LinearGradient
                  colors={config.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientButton}
                >
                  <Text style={styles.submitText}>Let it out</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.recorderSection}>
              <Text style={styles.recorderHint}>Ready to record</Text>
              <SmartRecorder
                onRecorded={(uri) => setVoiceRecordingUri(uri)}
                prevRecordingUri={voiceRecordingUri || undefined}
                onSubmit={handleSubmit}
                onDiscard={() => setVoiceRecordingUri(null)}
              />
            </View>
          )}
        </LinearGradient>
      </BottomSheetModal>
    </View>
  );
};

export default ExpressYourself;

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingBottom: 24,
    position: "relative",
    borderRadius: 24,
    overflow: "hidden",
  },
  bubbleTopRight: {
    position: "absolute",
    top: -50,
    right: -30,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255, 255, 255, 0.4)", // Substle white on light bg
  },
  bubbleBottomLeft: {
    position: "absolute",
    bottom: -20,
    left: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    zIndex: 1,
  },
  headerTextContainer: {
    flex: 1,
    paddingRight: 12,
  },
  headerTitle: {
    ...parseTextStyle(theme.typography.Heading2),
    fontSize: 22,
    marginBottom: 4,
  },
  headerSubtitle: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.library.gray[500],
    lineHeight: 20,
    fontSize: 14,
  },
  iconContainer: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    transform: [{ rotate: "-15deg" }],
    // No background, just the icon acting as watermark
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 32,
    padding: 24,
    ...parseShadowStyle(theme.shadow.elevation1),
    gap: 24,
    zIndex: 2,
  },
  textInput: {
    height: 140,
    textAlignVertical: "top",
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.library.gray[800],
    fontSize: 18,
  },
  recorderSection: {
    gap: 16,
    zIndex: 2,
    paddingBottom: 10,
  },
  recorderHint: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    textAlign: "center",
    opacity: 0.7,
  },
  buttonContainer: {
    borderRadius: 20,
    overflow: "hidden",
    marginTop: 8,
  },
  disabledButtonContainer: {
    opacity: 0.5,
  },
  gradientButton: {
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  submitText: {
    color: "#FFF",
    ...parseTextStyle(theme.typography.Body),
    fontWeight: "700",
    fontSize: 16,
  },
});
