import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import { theme } from "../../../../Theme/tokens";
import { submitAppFeedback } from "../../../../api/settings/helpSupport";
import { useUserStore } from "../../../../stores/user";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../util/functions/parseStyles";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import ScreenView from "../../../../components/ScreenView";

interface FeedbackProps {
  onFeedbackSubmit: () => void;
}

const Feedback = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = 60;
  const { user } = useUserStore();
  const [features, setFeatures] = useState("");
  const [frustrations, setFrustrations] = useState("");
  const [otherThoughts, setOtherThoughts] = useState("");
  const [submitEmail, setSubmitEmail] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleFeedbackSubmit = async () => {
    if (!user) return;
    await submitAppFeedback({
      userEmail: submitEmail ? user.email : undefined,
      suggestedFeatures: features,
      reportedFrustration: frustrations,
      otherThoughts: otherThoughts,
    });
    setShowSuccess(true);
  };

  const isFormValid =
    features.length > 0 || frustrations.length > 0 || otherThoughts.length > 0;

  return (
    <ScreenView style={styles.screenView}>
      {/* Aurora Background */}
      <View style={StyleSheet.absoluteFillObject}>
        <LinearGradient
          colors={["#FDF2F8", "#FFF", "#FFF"] as const}
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
        <Text style={styles.headerTitle}>Feedback & Suggestions</Text>
        <View style={{ width: 32 }} />
      </BlurView>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: HEADER_HEIGHT + insets.top + 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
      <View style={styles.wrapper}>
        {/* Background Decorative Patterns */}
        <View style={styles.bgBubble} pointerEvents="none" />
        <View style={styles.bgBubbleSmall} pointerEvents="none" />
        {/* Feature Requests */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>FEATURE REQUESTS</Text>
          <View style={styles.inputCard}>
            <TextInput
              value={features}
              onChangeText={setFeatures}
              placeholder="I wish the app could..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={4}
              style={styles.input}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Frustrations */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>FRUSTRATIONS</Text>
          <View style={styles.inputCard}>
            <TextInput
              value={frustrations}
              onChangeText={setFrustrations}
              placeholder="I find it difficult to..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={4}
              style={styles.input}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Other Thoughts */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>OTHER THOUGHTS</Text>
          <View style={styles.inputCard}>
            <TextInput
              value={otherThoughts}
              onChangeText={setOtherThoughts}
              placeholder="Any other ideas or feelings..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={4}
              style={styles.input}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Follow-up Toggle */}
        <View style={styles.toggleCard}>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.toggleLabel}>Follow up with me</Text>
              <Text style={styles.toggleSub}>
                Allow us to contact you about this feedback
              </Text>
            </View>
            <Switch
              value={submitEmail}
              trackColor={{ false: "#CBD5E1", true: "#fb923c" }}
              thumbColor={"#FFFFFF"}
              onValueChange={() => setSubmitEmail((v) => !v)}
            />
          </View>
          {submitEmail && (
            <View style={styles.emailBox}>
              <Icon name="envelope" size={13} color="#EA580C" />
              <Text style={styles.emailText}>{user?.email}</Text>
            </View>
          )}
        </View>

        {/* CTA */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleFeedbackSubmit}
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
              Send Feedback
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
              Your feedback is invaluable. We truly appreciate your time!
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

export default Feedback;

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  wrapper: {
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

  // Background Patterns
  bgBubble: {
    position: "absolute",
    top: 100,
    left: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(251, 146, 60, 0.03)", // Subtle orange
  },
  bgBubbleSmall: {
    position: "absolute",
    bottom: 100,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(219, 39, 119, 0.03)", // Subtle pink
  },

  // Input
  inputCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.05)",
    ...parseShadowStyle(theme.shadow.elevation2),
    overflow: "hidden",
  },
  input: {
    padding: 16,
    minHeight: 110,
    fontSize: 15,
    color: theme.colors.text.title,
    lineHeight: 22,
    ...Platform.select({ android: { textAlignVertical: "top" } }),
    zIndex: 1,
  },

  // Toggle
  toggleCard: {
    backgroundColor: "#FFFFFF", // Changed from rgba(255,255,255,0.8)
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.05)",
    padding: 20,
    gap: 16,
    ...parseShadowStyle(theme.shadow.elevation2),
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.text.title,
  },
  toggleSub: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
    marginTop: 2,
  },
  emailBox: {
    backgroundColor: "#FFF7ED",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#FFEDD5",
    marginTop: 4,
  },
  emailText: {
    fontSize: 13,
    color: "#EA580C",
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
