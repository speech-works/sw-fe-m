import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
} from "react-native";
import React, { useState } from "react";
import BottomSheetModal from "../../../../../../components/BottomSheetModal";

import { theme } from "../../../../../../Theme/tokens";
import { parseTextStyle } from "../../../../../../util/functions/parseStyles";
import { logMood } from "../../../../../../api/moodCheck";
import { MoodType } from "../../../../../../api/moodCheck/types";
import { useUserStore } from "../../../../../../stores/user";
import VoiceRecorder from "../../../../Library/TechniquePage/components/VoiceRecorder";
import { RecordingSourceType } from "../../../../../../api/recordings/types";
import { useRecordedVoice } from "../../../../../../hooks/useRecordedVoice";

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
          voiceNoteUrl: uploadedRecording.audioUrl, // ✅ Use actual S3 key
        });

        console.log("🎤 Voice mood entry logged:", uploadedRecording.audioUrl);
      }

      onSubmit();
      onClose();
    } catch (error) {
      console.error("❌ Failed to submit mood expression:", error);
      // Optionally show a toast or alert
    }
  };

  return (
    <View>
      <BottomSheetModal visible={expressionType !== null} onClose={onClose}>
        {expressionType === EXPRESSION_TYPE_ENUM.WRITE ? (
          <View style={styles.container}>
            <View style={styles.innerContainer}>
              <Text style={styles.title}>Express Your Thoughts</Text>
              <Text style={styles.description}>
                Putting it into words helps. Write down anything you’re feeling.
              </Text>
            </View>

            <TextInput
              style={styles.textInput}
              multiline
              placeholder="Start writing..."
              value={writtenText}
              onChangeText={setWrittenText}
            />
            <TouchableOpacity
              style={[
                styles.submitButton,
                writtenText.length < 1 ? styles.disabledButton : null,
              ]}
              onPress={handleSubmit}
              disabled={writtenText.length < 1}
            >
              <Text style={styles.submitText}>Let it out</Text>
            </TouchableOpacity>
          </View>
        ) : expressionType === EXPRESSION_TYPE_ENUM.TALK ? (
          <View style={styles.container}>
            <Text style={styles.title}>Record Your Voice</Text>
            <Text style={styles.description}>
              Speak your mind. Recording your thoughts can help process
              emotions.
            </Text>

            <VoiceRecorder
              onRecorded={(uri) => setVoiceRecordingUri(uri)}
              prevRecordingUri={voiceRecordingUri || undefined}
            />
            <TouchableOpacity
              style={[
                styles.submitButton,
                !voiceRecordingUri ? styles.disabledButton : null,
              ]}
              onPress={handleSubmit}
              disabled={!voiceRecordingUri}
            >
              <Text style={styles.submitText}>Let it out</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </BottomSheetModal>
    </View>
  );
};

export default ExpressYourself;

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
  },
  innerContainer: {
    gap: 8,
  },
  title: {
    color: theme.colors.text.title,
    ...parseTextStyle(theme.typography.Heading2),
  },
  description: {
    color: theme.colors.text.default,
    ...parseTextStyle(theme.typography.BodySmall),
  },
  textInput: {
    height: 150,
    borderColor: theme.colors.border.default,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    textAlignVertical: "top",
    backgroundColor: theme.colors.background.light,
  },
  submitButton: {
    backgroundColor: theme.colors.actionPrimary.default,
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: theme.colors.actionPrimary.disabled,
  },
  submitText: {
    color: "#fff",
    ...parseTextStyle(theme.typography.Body),
    fontWeight: "700",
  },
});
