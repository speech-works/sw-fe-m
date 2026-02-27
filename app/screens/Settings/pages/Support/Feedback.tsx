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

  const handleAnonymousChange = () => {
    setSubmitEmail((old) => !old);
  };

  const isFormValid =
    features.length > 0 || frustrations.length > 0 || otherThoughts.length > 0;

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.wrapper}>
        {/* 1. Features */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconBox, { backgroundColor: "#EFF6FF" }]}>
              <Icon name="magic" size={14} color="#2563EB" />
            </View>
            <Text style={styles.label}>Feature Requests</Text>
          </View>
          <View style={styles.inputWrapper}>
            <TextInput
              value={features}
              onChangeText={setFeatures}
              placeholder="I wish the app could..."
              placeholderTextColor={theme.colors.text.disabled}
              multiline
              numberOfLines={4}
              style={styles.input}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* 2. Frustrations */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconBox, { backgroundColor: "#FEF2F2" }]}>
              <Icon name="frown" size={14} color="#DC2626" />
            </View>
            <Text style={styles.label}>Frustrations</Text>
          </View>
          <View style={styles.inputWrapper}>
            <TextInput
              value={frustrations}
              onChangeText={setFrustrations}
              placeholder="I find it difficult to..."
              placeholderTextColor={theme.colors.text.disabled}
              multiline
              numberOfLines={4}
              style={styles.input}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* 3. Other */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconBox, { backgroundColor: "#F0FDF4" }]}>
              <Icon name="comment-alt" size={14} color="#16A34A" />
            </View>
            <Text style={styles.label}>Other Thoughts</Text>
          </View>
          <View style={styles.inputWrapper}>
            <TextInput
              value={otherThoughts}
              onChangeText={setOtherThoughts}
              placeholder="Any other ideas or feelings..."
              placeholderTextColor={theme.colors.text.disabled}
              multiline
              numberOfLines={4}
              style={styles.input}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Email Toggle Card */}
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
              trackColor={{
                false: "#CBD5E1",
                true: "#fb923c",
              }}
              thumbColor={"#FFFFFF"}
              onValueChange={handleAnonymousChange}
            />
          </View>

          {submitEmail && (
            <View style={styles.emailBox}>
              <Icon name="envelope" size={14} color="#EA580C" />
              <Text style={styles.emailText}>{user?.email}</Text>
            </View>
          )}
        </View>

        {/* Standard Gradient Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleFeedbackSubmit}
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
              Send Feedback
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

export default Feedback;

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 32,
  },
  wrapper: {
    gap: 32,
    paddingTop: 8,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginLeft: 4,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  label: {
    ...parseTextStyle(theme.typography.Body),
    fontWeight: "700",
    color: theme.colors.text.title,
    letterSpacing: 0.3,
  },
  inputWrapper: {
    backgroundColor: theme.colors.surface.default,
    borderRadius: 20,
    ...parseShadowStyle(theme.shadow.elevation1),
    borderWidth: 1,
    borderColor: "#F1F5F9",
    overflow: "hidden",
  },
  input: {
    backgroundColor: "#fff",
    padding: 20,
    minHeight: 120,
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
    ...Platform.select({
      android: { textAlignVertical: "top" },
    }),
  },

  // Toggle Card
  toggleCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    padding: 20,
    gap: 16,
    ...parseShadowStyle(theme.shadow.elevation1),
    marginTop: 8,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggleLabel: {
    ...parseTextStyle(theme.typography.Body),
    fontWeight: "600",
    color: theme.colors.text.title,
  },
  toggleSub: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
    marginTop: 2,
  },
  emailBox: {
    backgroundColor: "#FFF7ED", // Orange 50
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#FFEDD5",
  },
  emailText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "#EA580C", // Primary Orange
    fontWeight: "600",
  },

  // Uniform Button Style
  saveButtonContainer: {
    borderRadius: 30,
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
