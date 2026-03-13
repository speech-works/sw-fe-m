import Constants from "expo-constants";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import { createReportedIssue } from "../../../../api/settings/helpSupport";
import UniversalImageUploader from "../../../../components/UniversalImageUploader";
import { useUserStore } from "../../../../stores/user";
import { theme } from "../../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../util/functions/parseStyles";

const reportOptions = [
  { id: "bug", label: "Bug", icon: "bug" },
  { id: "crash", label: "Crash", icon: "bomb" },
  { id: "login", label: "Login", icon: "sign-in-alt" },
  { id: "payment", label: "Payment", icon: "credit-card" },
  { id: "av", label: "A/V Issue", icon: "video" },
  { id: "other", label: "Other", icon: "question-circle" },
];

type ReportOptionType = (typeof reportOptions)[number];

interface ReportProblemProps {
  onReportSubmit: () => void;
}

const ReportProblem = ({ onReportSubmit }: ReportProblemProps) => {
  const { user } = useUserStore();
  const [issueDesc, setIssueDesc] = useState("");
  const [selectedIssue, setSelectedIssue] = useState<ReportOptionType | null>(
    null,
  );
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [deviceInfo, setDeviceInfo] = useState("");

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
      .join(" \u2022 ");
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

  const isFormValid = selectedIssue && issueDesc.length > 0;

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.container}>
        {/* Issue Type */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>WHAT'S THE ISSUE?</Text>
          <View style={styles.chipsContainer}>
            {reportOptions.map((option) => {
              const isSelected = selectedIssue?.id === option.id;
              return (
                <TouchableOpacity
                  key={option.id}
                  onPress={() => setSelectedIssue(option)}
                  activeOpacity={0.75}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                >
                  <Icon
                    name={option.icon}
                    size={12}
                    color={isSelected ? "#FFF" : "#64748B"}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.chipText,
                      isSelected && styles.chipTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Details */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>DETAILS</Text>
          <View style={styles.inputCard}>
            <TextInput
              value={issueDesc}
              onChangeText={setIssueDesc}
              placeholder="Please describe exactly what happened..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              style={styles.input}
            />
          </View>
        </View>

        {/* Device Info */}
        <View style={styles.deviceInfoContainer}>
          <Icon name="mobile-alt" size={14} color="#475569" />
          <Text style={styles.deviceInfoText}>{deviceInfo}</Text>
          <Icon name="check-circle" size={14} color="#10B981" solid />
        </View>

        {/* Screenshots Optional */}
        <UniversalImageUploader
          images={screenshots}
          onChange={setScreenshots}
          label="screenshots"
        />

        {/* CTA */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleReportSubmit}
          disabled={!isFormValid}
          style={[styles.ctaWrapper, !isFormValid && { opacity: 0.5 }]}
        >
          <LinearGradient
            colors={
              isFormValid ? ["#fb923c", "#ea580c"] : ["#E2E8F0", "#CBD5E1"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaButton}
          >
            <Text
              style={[styles.ctaText, !isFormValid && { color: "#94A3B8" }]}
            >
              Submit Report
            </Text>
            {isFormValid && <Icon name="paper-plane" size={16} color="white" />}
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 48 }} />
      </View>
    </ScrollView>
  );
};

export default ReportProblem;

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  container: {
    gap: 32,
  },
  section: {
    gap: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: theme.colors.text.default,
    letterSpacing: 0.5,
  },
  optionalTag: {
    fontSize: 10,
    fontWeight: "500",
    color: "#94A3B8",
  },

  // Chips
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  chipSelected: {
    backgroundColor: "#EA580C",
    borderColor: "#EA580C",
  },
  chipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },
  chipTextSelected: {
    color: "#FFFFFF",
  },

  // Input
  inputCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...parseShadowStyle(theme.shadow.elevation1),
    overflow: "hidden",
  },
  input: {
    padding: 16,
    minHeight: 120,
    fontSize: 15,
    color: theme.colors.text.title,
    lineHeight: 22,
    ...Platform.select({ android: { textAlignVertical: "top" } }),
  },

  // Device Info
  deviceInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F0FDF4",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  deviceInfoText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#166534",
  },

  // CTA
  ctaWrapper: {
    borderRadius: 16,
    marginTop: 4,
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  ctaButton: {
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },
});
