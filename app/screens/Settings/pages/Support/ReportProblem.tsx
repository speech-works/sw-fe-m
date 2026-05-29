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
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ScreenView from "../../../../components/ScreenView";

const reportOptions = [
  { id: "bug", label: "Bug", icon: "bug" },
  { id: "crash", label: "Crash", icon: "bomb" },
  { id: "login", label: "Login", icon: "sign-in-alt" },
  { id: "payment", label: "Payment", icon: "credit-card" },
  { id: "av", label: "A/V Issue", icon: "video" },
  { id: "other", label: "Other", icon: "question-circle" },
];

type ReportOptionType = (typeof reportOptions)[number];

const ReportProblem = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useUserStore();
  const [issueDesc, setIssueDesc] = useState("");
  const [selectedIssue, setSelectedIssue] = useState<ReportOptionType | null>(
    null,
  );
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [deviceInfo, setDeviceInfo] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const HEADER_HEIGHT = 60;

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
    setShowSuccess(true);
  };

  const isFormValid = selectedIssue && issueDesc.length > 0;

  return (
    <ScreenView style={styles.screenView}>
      {/* Aurora Background */}
      <View style={StyleSheet.absoluteFillObject}>
        <LinearGradient
          colors={["#FFF7ED", "#FFF", "#FFF"] as const}
          locations={[0, 0.4, 1]}
          style={{ flex: 1 }}
        />
      </View>

      {/* Header */}
      <BlurView
        intensity={80}
        tint="light"
        style={[
          styles.header,
          { paddingTop: insets.top + 10, height: HEADER_HEIGHT + insets.top },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="chevron-left" size={16} color={theme.colors.text.title} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report A Problem</Text>
        <View style={{ width: 32 }} />
      </BlurView>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: HEADER_HEIGHT + insets.top + 20 },
        ]}
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

      {/* Success View overlay */}
      {showSuccess && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "#FFF", zIndex: 1000 }]}>
          <View style={styles.successContainer}>
            <View style={styles.successIconBox}>
              <LinearGradient
                colors={["#10B981", "#059669"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.innerCheckmarkCircle}
              >
                <Icon name="check" size={32} color="#FFFFFF" />
              </LinearGradient>
            </View>
            <Text style={styles.successTitle}>Thank You!</Text>
            <Text style={styles.successDesc}>
              Your report has been received. Our team will look into it.
            </Text>
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScreenView>
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
  screenView: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.6)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  headerTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
    marginTop: 2,
  },

  // Success View Styles
  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  successIconBox: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  innerCheckmarkCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  successTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
    marginBottom: 8,
  },
  successDesc: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    textAlign: "center",
    marginBottom: 32,
  },
  doneButton: {
    backgroundColor: theme.colors.actionPrimary.default,
    borderRadius: 30,
    paddingVertical: 16,
    paddingHorizontal: 48,
    width: "100%",
    alignItems: "center",
    ...parseShadowStyle(theme.shadow.elevation2),
  },
  doneButtonText: {
    ...parseTextStyle(theme.typography.Button),
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
