import { View, Text, StyleSheet, Platform } from "react-native";
import Constants from "expo-constants";
import Dropdown from "../../../../components/Dropdown";
import { parseTextStyle } from "../../../../util/functions/parseStyles";
import { theme } from "../../../../Theme/tokens";
import TextArea from "../../../../components/TextArea";
import { useEffect, useState } from "react";
import ImageUploader from "../../../../components/ImageUploader";
import Button from "../../../../components/Button";
import { createReportedIssue } from "../../../../api/settings/helpSupport";
import { useUserStore } from "../../../../stores/user";

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
  const { user } = useUserStore();
  const [issueDesc, setIssueDesc] = useState("");
  const [selectedIssue, setSelectedIssue] = useState<ReportOptionType | null>(
    null
  );
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [deviceInfo, setDeviceInfo] = useState("");

  useEffect(() => {
    // Try expoConfig first (applies in prod and custom dev client)
    const config = Constants.expoConfig;
    // Fallback to the old manifest in Expo Go (cast to any to bypass typings)
    const manifest = (Constants.manifest as any) ?? {};

    const appName = config?.name ?? manifest.name ?? Constants.name;
    const appVer =
      config?.version ??
      (manifest.version as string) ??
      Constants.nativeAppVersion ??
      "";
    const sdkVer = config?.sdkVersion ?? manifest.sdkVersion ?? "";

    const info = [
      `OS: ${Platform.OS} ${Platform.Version}`,
      `App: ${appName} v${appVer}`,
      sdkVer ? `SDK: ${sdkVer}` : "",
    ]
      .filter(Boolean)
      .join(" | ");

    setDeviceInfo(info);
  }, []);

  const handleReportSubmit = async () => {
    if (!user || !selectedIssue) return;
    await createReportedIssue({
      userId: user.id,
      userEmail: user.email,
      issueType: selectedIssue.id,
      description: issueDesc,
      screenshotUrls: screenshots,
      deviceInfo,
    });
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

      {/* (Optional) display collected device info */}
      <Text style={styles.deviceInfo}>{deviceInfo}</Text>

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
    padding: 16,
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
  deviceInfo: {
    marginTop: 12,
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default + "99",
  },
});
