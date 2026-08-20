import Constants from "expo-constants";
import { useEffect, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { createReportedIssue } from "../../../../api/settings/helpSupport";
import { useUserStore } from "../../../../stores/user";
import { useNavigation } from "@react-navigation/native";
import {
  size,
  radius,
  useTheme,
  accentEdge,
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
      deviceInfo,
    });
    setShowSuccess(true);
  };

  const isFormValid = !!selectedIssue && issueDesc.length > 0;

  return (
    <>
      <Page
        title="Report a problem"
        onBack={() => navigation.goBack()}
        keyboardAvoiding
        contentGap={space.sectionGap}
      >
          {/* Issue Type */}
          <View style={styles.section}>
            <Text variant="eyebrow" color="tertiary">
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
            <Text variant="eyebrow" color="tertiary">
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

          {/* There was a screenshot picker here, and it never uploaded
              anything. UniversalImageUploader (now deleted) ran a
              `simulateUpload` timer,
              fills a progress bar, and hands back the LOCAL device path from
              the image picker. That path was stored verbatim and means nothing
              to anybody but the phone it came from, so a person attached a
              screenshot, watched it "upload", and sent nothing.

              It could not have worked well even if it uploaded. The picker
              reads the photo library, so the person must already have taken a
              screenshot BEFORE walking to Settings > Support > Report, by which
              point the broken screen is long gone.

              Removed rather than fixed: when this comes back, the app should
              capture the screen ITSELF at the moment the person says something
              is wrong, from wherever they are. Asking them to go and find a
              picture is the app's job pushed onto the user at the one moment
              they cannot do it. `screenshotUrls` stays on the API and the table
              for that future, and is simply not sent. */}

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
                { backgroundColor: colors.accentTint.success },
              ]}
            >
              <View
                style={[
                  styles.innerCheckmarkCircle,
                  { backgroundColor: colors.accent.success },
                  accentEdge(colors, "success"),
                ]}
              >
                <Icon name="check" size={size.iconXl} color={colors.accentOn.success} />
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
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing["2xl"],
  },
  innerCheckmarkCircle: {
    width: 60,
    height: 60,
    borderRadius: radius.full,
    justifyContent: "center",
    alignItems: "center",
  },
});
