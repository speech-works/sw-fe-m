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
import ModernImageUploader from "../../../../components/ModernImageUploader";
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
      `Device: ${Platform.OS === "ios" ? "iOS" : "Android"} ${
        Platform.Version
      }`,
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
    onReportSubmit();
  };

  const isFormValid = selectedIssue && issueDesc.length > 0;

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.container}>
        {/* 1. Issue Type Chips */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="tag" size={14} color="#EA580C" />
            <Text style={styles.sectionTitle}>What's the issue?</Text>
          </View>
          <View style={styles.chipsContainer}>
            {reportOptions.map((option) => {
              const isSelected = selectedIssue?.id === option.id;
              return (
                <TouchableOpacity
                  key={option.id}
                  onPress={() => setSelectedIssue(option)}
                  activeOpacity={0.7}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                >
                  <Icon
                    name={option.icon}
                    size={12}
                    color={isSelected ? "#FFF" : "#64748B"}
                    style={{ marginRight: 8 }}
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

        {/* 2. Description */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="align-left" size={14} color="#EA580C" />
            <Text style={styles.sectionTitle}>Details</Text>
          </View>
          <View style={styles.inputWrapper}>
            <TextInput
              value={issueDesc}
              onChangeText={setIssueDesc}
              placeholder="Please describe exactly what happened..."
              placeholderTextColor={theme.colors.text.disabled}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              style={styles.input}
            />
          </View>
        </View>

        {/* 3. Device Info Badge */}
        <View style={styles.deviceInfoContainer}>
          <View style={styles.deviceIconBox}>
            <Icon name="mobile-alt" size={14} color="#475569" />
          </View>
          <Text style={styles.deviceInfoText}>Auto-detected: {deviceInfo}</Text>
          <Icon name="check-circle" size={14} color="#10B981" solid />
        </View>

        {/* 4. Screenshots (Optional) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="image" size={14} color="#64748B" />
            <Text
              style={[
                styles.sectionTitle,
                { color: theme.colors.text.default },
              ]}
            >
              Screenshots (Optional)
            </Text>
          </View>
          {/* Using the new Modern Uploader */}
          <ModernImageUploader images={screenshots} onChange={setScreenshots} />
        </View>

        {/* Standard Gradient Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleReportSubmit}
          disabled={!isFormValid}
          style={[styles.saveButtonContainer, !isFormValid && { opacity: 0.6 }]}
        >
          <LinearGradient
            colors={
              isFormValid ? ["#fb923c", "#ea580c"] : ["#E2E8F0", "#CBD5E1"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveButton}
          >
            <Text
              style={[
                styles.saveButtonText,
                !isFormValid && { color: "#94A3B8" },
              ]}
            >
              Submit Report
            </Text>
            {isFormValid && <Icon name="paper-plane" size={16} color="white" />}
          </LinearGradient>
        </TouchableOpacity>

        {/* Bottom Spacer */}
        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );
};

export default ReportProblem;

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
  },
  container: {
    gap: 32,
    paddingTop: 8,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
    paddingLeft: 4,
  },
  sectionTitle: {
    ...parseTextStyle(theme.typography.BodySmall),
    fontWeight: "700",
    color: theme.colors.text.title,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  // Chips
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  chipSelected: {
    backgroundColor: "#EA580C", // Primary Orange
    borderColor: "#EA580C",
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  chipText: {
    ...parseTextStyle(theme.typography.Body),
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },
  chipTextSelected: {
    color: "#FFFFFF",
  },

  // Input
  inputWrapper: {
    backgroundColor: theme.colors.surface.default,
    borderRadius: 20,
    ...parseShadowStyle(theme.shadow.elevation1),
    borderWidth: 1,
    borderColor: "#F1F5F9",
    overflow: "hidden",
  },
  input: {
    backgroundColor: theme.colors.surface.elevated,
    padding: 20,
    minHeight: 120,
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
    ...Platform.select({
      android: { textAlignVertical: "top" },
    }),
  },

  // Device Info
  deviceInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F0FDF4", // Light green tint
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  deviceIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  deviceInfoText: {
    flex: 1,
    ...parseTextStyle(theme.typography.BodySmall),
    fontSize: 13,
    fontWeight: "600",
    color: "#166534", // Green 800
  },

  // Uniform Button Style
  saveButtonContainer: {
    borderRadius: 30, // Fully rounded
    marginTop: 16,
    ...parseShadowStyle(theme.shadow.elevation2),
    backgroundColor: theme.colors.surface.default,
  },
  saveButton: {
    borderRadius: 30,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  saveButtonText: {
    ...parseTextStyle(theme.typography.Button),
    color: "#ffffff",
    letterSpacing: 0.5,
  },
});
