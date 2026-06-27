import Constants from "expo-constants";
import { useEffect, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { createReportedIssue } from "../../../../api/settings/helpSupport";
import UniversalImageUploader from "../../../../components/UniversalImageUploader";
import { useUserStore } from "../../../../stores/user";
import { useNavigation } from "@react-navigation/native";
import {
  useTheme,
  spacing,
  space,
  Text,
  Button,
  Chip,
  TextField,
  Page,
  Icon,
  IconName,
} from "../../../../design-system";

const reportOptions: { id: string; label: string; icon: IconName }[] = [
  { id: "bug", label: "Bug", icon: "alert-circle" },
  { id: "crash", label: "Crash", icon: "zap" },
  { id: "login", label: "Login", icon: "log-in" },
  { id: "payment", label: "Payment", icon: "credit-card" },
  { id: "av", label: "A/V Issue", icon: "video" },
  { id: "other", label: "Other", icon: "help-circle" },
];

type ReportOptionType = (typeof reportOptions)[number];

const ReportProblem = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { user } = useUserStore();
  const [issueDesc, setIssueDesc] = useState("");
  const [selectedIssue, setSelectedIssue] = useState<ReportOptionType | null>(
    null,
  );
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [deviceInfo, setDeviceInfo] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const config = Constants.expoConfig;
    const manifest = (Constants.manifest as any) ?? {};
    const appVer =
      config?.version ??
      (manifest.version as string) ??
      Constants.nativeAppVersion ??
      "";
    const info = [
      `Device: ${Platform.OS === "ios" ? "iOS" : "Android"} ${Platform.Version}`,
      `App v${appVer}`,
    ]
      .filter(Boolean)
      .join(" • ");
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
    setShowSuccess(true);
  };

  const isFormValid = !!selectedIssue && issueDesc.length > 0;

  return (
    <>
      <Page
        title="Report A Problem"
        onBack={() => navigation.goBack()}
        keyboardAvoiding
        contentGap={space.sectionGap}
      >
          {/* Issue Type */}
          <View style={styles.section}>
            <Text variant="label" color="tertiary">
              WHAT'S THE ISSUE?
            </Text>
            <View style={styles.chipsContainer}>
              {reportOptions.map((option) => (
                <Chip
                  key={option.id}
                  label={option.label}
                  icon={option.icon}
                  selected={selectedIssue?.id === option.id}
                  onPress={() => setSelectedIssue(option)}
                />
              ))}
            </View>
          </View>

          {/* Details */}
          <View style={styles.section}>
            <Text variant="label" color="tertiary">
              DETAILS
            </Text>
            <TextField
              value={issueDesc}
              onChangeText={setIssueDesc}
              placeholder="Please describe exactly what happened..."
              multiline
              numberOfLines={6}
            />
          </View>

          {/* Screenshots */}
          <UniversalImageUploader
            images={screenshots}
            onChange={setScreenshots}
            label="screenshots (optional)"
          />

          {/* CTA */}
          <Button
            label="Submit Report"
            onPress={handleReportSubmit}
            disabled={!isFormValid}
            rightIcon="send"
          />
      </Page>

      {/* Success overlay */}
      {showSuccess && (
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: colors.background.canvas, zIndex: 1000 },
          ]}
        >
          <View style={styles.successContainer}>
            <View
              style={[
                styles.successIconBox,
                { backgroundColor: colors.accent.success + "22" },
              ]}
            >
              <View
                style={[
                  styles.innerCheckmarkCircle,
                  { backgroundColor: colors.accent.success },
                ]}
              >
                <Icon name="check" size={32} color={colors.accentOn.success} />
              </View>
            </View>
            <Text variant="h2" center>
              Thank You!
            </Text>
            <Text
              variant="body"
              color="secondary"
              center
              style={{ marginTop: 8, marginBottom: 32 }}
            >
              Your report has been received. Our team will look into it.
            </Text>
            <Button label="Done" onPress={() => navigation.goBack()} />
          </View>
        </View>
      )}
    </>
  );
};

export default ReportProblem;

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing["2xl"],
  },
  successIconBox: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing["2xl"],
  },
  innerCheckmarkCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
});
