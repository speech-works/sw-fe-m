import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
} from "react-native";
import React, { useState } from "react";
import BottomSheetModal from "../../../../../../components/BottomSheetModal";
import VoiceRecorder from "../../../VoiceRecorder";
import { theme } from "../../../../../../Theme/tokens";
import { parseTextStyle } from "../../../../../../util/functions/parseStyles";
import { logMood } from "../../../../../../api/moodCheck";
import { MoodType } from "../../../../../../api/moodCheck/types";
import { useUserStore } from "../../../../../../stores/user";

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

  const [writtenText, setWrittenText] = useState("");

  const handleSubmit = async () => {
    if (!user) return;
    if (expressionType === EXPRESSION_TYPE_ENUM.WRITE) {
      await logMood({
        userId: user.id,
        mood: moodType,
        textNote: writtenText,
      });
    } else if (expressionType === EXPRESSION_TYPE_ENUM.TALK) {
      await logMood({
        userId: user.id,
        mood: moodType,
        voiceNoteUrl: "",
      });
      console.log("Submitted voice recording");
    }
    onSubmit();
    onClose();
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
              style={styles.submitButton}
              onPress={handleSubmit}
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
            <VoiceRecorder />
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
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
  submitText: {
    color: "#fff",
    ...parseTextStyle(theme.typography.Body),
    fontWeight: "700",
  },
});
