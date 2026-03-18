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
import { BlurView } from "expo-blur";
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
        {/* Background Decorative Patterns */}
        <View style={styles.bgBubble} pointerEvents="none" />
        <View style={styles.bgBubbleSmall} pointerEvents="none" />

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
                  activeOpacity={0.7}
                  style={[
                    styles.chip,
                    isSelected && styles.chipSelected,
                    isSelected && { shadowColor: "#EA580C" },
                  ]}
                >
                  <View
                    style={[
                      styles.chipIconBox,
                      isSelected && {
                        backgroundColor: "rgba(255,255,255,0.3)",
                      },
                    ]}
                  >
                    <Icon
                      name={option.icon}
                      size={10}
                      color={isSelected ? "#FFF" : "#64748B"}
                    />
                  </View>
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
            <BlurView
              intensity={20}
              tint="light"
              style={StyleSheet.absoluteFill}
            />
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

        {/* Screenshots */}
        <UniversalImageUploader
          images={screenshots}
          onChange={setScreenshots}
          label="screenshots (optional)"
        />

        {/* Device Info Card (Restyled to match Feedback Toggle) */}
        <View style={styles.deviceCard}>
          <View style={styles.deviceRow}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.deviceLabel}>{deviceInfo}</Text>
              <Text style={styles.deviceSub}>
                System Diagnostics Verified
              </Text>
            </View>
            <View style={styles.verifiedBadge}>
              <Icon name="check-circle" size={18} color="#10B981" solid />
            </View>
          </View>
          
          <View style={styles.deviceIconBox}>
            <Icon name="mobile-alt" size={13} color="#64748B" />
            <Text style={styles.deviceIconText}>Hardware info logged</Text>
          </View>
        </View>

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

  // Background Patterns
  bgBubble: {
    position: "absolute",
    top: 40,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255, 126, 0, 0.03)", // Very subtle orange
  },
  bgBubbleSmall: {
    position: "absolute",
    top: 300,
    left: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(0, 102, 255, 0.03)", // Very subtle blue
  },

  // Chips
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    ...parseShadowStyle(theme.shadow.elevation1),
    shadowOpacity: 0.05,
  },
  chipSelected: {
    backgroundColor: "#EA580C",
    borderColor: "#EA580C",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  chipIconBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
  },
  chipTextSelected: {
    color: "#FFFFFF",
  },

  // Input
  inputCard: {
    backgroundColor: "#FFFFFF", // Changed from rgba(255,255,255,0.8)
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.05)",
    ...parseShadowStyle(theme.shadow.elevation2),
    overflow: "hidden",
  },
  input: {
    padding: 16,
    minHeight: 120,
    fontSize: 15,
    color: theme.colors.text.title,
    lineHeight: 22,
    ...Platform.select({ android: { textAlignVertical: "top" } }),
    zIndex: 1,
  },

  // Device Info Card (Matched with Feedback toggleCard)
  deviceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.05)",
    padding: 20,
    gap: 16,
    ...parseShadowStyle(theme.shadow.elevation2),
  },
  deviceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  deviceLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.text.title,
  },
  deviceSub: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
    marginTop: 2,
  },
  verifiedBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
  },
  deviceIconBox: {
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  deviceIconText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
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
