import { View, Text, StyleSheet } from "react-native";
import Dropdown from "../../../../components/Dropdown";
import { parseTextStyle } from "../../../../util/functions/parseStyles";
import { theme } from "../../../../Theme/tokens";
import TextArea from "../../../../components/TextArea";
import { useState } from "react";
import ImageUploader from "../../../../components/ImageUploader";
import Button from "../../../../components/Button";

const reportOptions = [
  { id: "bug", label: "Bug" },
  { id: "crash", label: "App Crash" },
  { id: "login", label: "Login Issue" },
  { id: "payment", label: "Payment Issue" },
  { id: "av", label: "Audio/Video Problem" },
  { id: "other", label: "Other" },
];

type ReportOptionType = (typeof reportOptions)[number];

interface ReportProblemProps {
  onReportSubmit: () => void;
}

const ReportProblem = ({ onReportSubmit }: ReportProblemProps) => {
  const [issueDesc, setIssueDesc] = useState("");
  const [selectedIssue, setSelectedIssue] = useState<ReportOptionType | null>(
    null
  );
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const deviceInfo = "";

  const handleReportSubmit = () => {
    onReportSubmit();
  };

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.label}>What seems to be an issue?</Text>
        <Dropdown
          data={reportOptions}
          keyExtractor={(item) => item.id}
          labelExtractor={(item) => item.label}
          selected={selectedIssue}
          onSelect={setSelectedIssue}
          placeholder="Select issue"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Description</Text>
        <TextArea
          value={issueDesc}
          onChangeText={setIssueDesc}
          placeholder="Please add a small description to help us understand the issue better..."
          numberOfLines={5}
          containerStyle={styles.textAreaContainer}
          inputStyle={styles.textAreaInput}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Screenshots (optional)</Text>
        <ImageUploader images={screenshots} onChange={setScreenshots} />
      </View>

      <Button
        text="Submit Report"
        onPress={handleReportSubmit}
        disabled={!selectedIssue || !issueDesc}
      />
    </View>
  );
};

export default ReportProblem;

const styles = StyleSheet.create({
  container: {
    gap: 20,
  },
  section: {
    gap: 8,
  },
  label: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
  },
  textAreaContainer: {
    backgroundColor: theme.colors.background.default,
    minHeight: 150,
    borderRadius: 12,
  },
  textAreaInput: {
    height: "100%",
    backgroundColor: theme.colors.background.default,
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
  },
});
