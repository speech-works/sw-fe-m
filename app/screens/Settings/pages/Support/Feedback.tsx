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
import { BlurView } from "expo-blur";
import { submitAppFeedback } from "../../../../api/settings/helpSupport";
import { useUserStore } from "../../../../stores/user";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../util/functions/parseStyles";

interface FeedbackProps {
  onFeedbackSubmit: () => void;
}

const Feedback = ({ onFeedbackSubmit }: FeedbackProps) => {
  const { user } = useUserStore();
  const [features, setFeatures] = useState("");
  const [frustrations, setFrustrations] = useState("");
  const [otherThoughts, setOtherThoughts] = useState("");
  const [submitEmail, setSubmitEmail] = useState(false);

  const handleFeedbackSubmit = async () => {
    if (!user) return;
    await submitAppFeedback({
      userEmail: submitEmail ? user.email : undefined,
      suggestedFeatures: features,
      reportedFrustration: frustrations,
      otherThoughts: otherThoughts,
    });
    onFeedbackSubmit();
  };

  const isFormValid =
    features.length > 0 || frustrations.length > 0 || otherThoughts.length > 0;

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
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
            <BlurView
              intensity={10}
              tint="light"
              style={StyleSheet.absoluteFill}
            />
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
            <BlurView
              intensity={10}
              tint="light"
              style={StyleSheet.absoluteFill}
            />
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
            <BlurView
              intensity={10}
              tint="light"
              style={StyleSheet.absoluteFill}
            />
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
    backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.8)",
    ...parseShadowStyle(theme.shadow.elevation1),
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
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.9)",
    padding: 20,
    gap: 16,
    ...parseShadowStyle(theme.shadow.elevation1),
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
});
