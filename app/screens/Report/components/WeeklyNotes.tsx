import { StyleSheet, Text, TextInput, View } from "react-native";
import React, { useState } from "react";
import { parseTextStyle } from "../../../util/functions/parseFont";
import { theme } from "../../../Theme/tokens";
import Button from "../../../components/Button";

const WeeklyNotes = () => {
  const [newNote, setNewNote] = useState("");
  const [notes, setNotes] = useState([
    "Just getting started. Feeling a bit anxious...",
    "Focus on pronunciation",
    "Excellent consistency",
    "Great progress so far",
  ]);
  return (
    <View style={styles.wrapper}>
      <Text style={styles.titleText}>WeeklyNotes</Text>
      {notes.map((note, index) => (
        <View
          key={index}
          style={[
            styles.subTextWrapper,
            index === notes.length - 1 && styles.lastSubTextWrapper,
          ]}
        >
          <Text style={styles.subText}>{`Week ${index + 1}: ${note}`}</Text>
        </View>
      ))}
      <View style={styles.actionWrapper}>
        <View style={styles.inputWrapper}>
          <TextInput
            placeholder="Add a note..."
            multiline={true}
            value={newNote}
            onChangeText={setNewNote}
          />
        </View>

        <Button
          size="medium"
          onPress={() => {
            setNotes([...notes, newNote]);
            setNewNote("");
          }}
        >
          <Text>Add</Text>
        </Button>
      </View>
    </View>
  );
};

export default WeeklyNotes;

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 8,
    boxShadow: "0 1.25 4 0 rgba(0, 0, 0, 0.25)",
    flexGrow: 1,
  },
  titleText: {
    ...parseTextStyle(theme.typography.f6.heavy_0),
    marginBottom: 12,
  },
  subText: {
    ...parseTextStyle(theme.typography.paragraphSmall.heavy),
    color: theme.colors.neutral[3],
  },
  subTextWrapper: {
    borderWidth: 1,
    borderColor: theme.colors.neutral.white,
    borderBottomColor: theme.colors.neutral[7],
    paddingVertical: 8,
  },
  lastSubTextWrapper: {
    borderBottomColor: theme.colors.neutral.white,
  },
  actionWrapper: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
  },
  inputWrapper: {
    borderWidth: 1,
    borderColor: theme.colors.neutral[5],
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexGrow: 1,
  },
});
