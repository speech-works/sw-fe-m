import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { submitAppFeedback } from "../../../../api/settings/helpSupport";
import { useUserStore } from "../../../../stores/user";
import { useNavigation } from "@react-navigation/native";
import {
  useTheme,
  spacing,
  space,
  radius,
  Text,
  Button,
  Chip,
  TextField,
  Toggle,
  Page,
  Icon,
  IconName,
} from "../../../../design-system";

const FEATURE_OPTIONS: { id: string; label: string; icon: IconName }[] = [
  { id: "content", label: "More Content", icon: "book-open" },
  { id: "stats", label: "Advanced Stats", icon: "bar-chart-2" },
  { id: "community", label: "Community", icon: "users" },
  { id: "offline", label: "Offline Mode", icon: "cloud-off" },
  { id: "ui", label: "UI Themes", icon: "layout" },
];

const FRUSTRATION_OPTIONS: { id: string; label: string; icon: IconName }[] = [
  { id: "bugs", label: "Minor Bugs", icon: "alert-circle" },
  { id: "speed", label: "Slow Loading", icon: "clock" },
  { id: "ui_confusing", label: "UI Confusing", icon: "help-circle" },
  { id: "audio", label: "Audio Issues", icon: "volume-2" },
  { id: "other", label: "Something Else", icon: "more-horizontal" },
];

const Feedback = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const { user } = useUserStore();

  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [selectedFrustrations, setSelectedFrustrations] = useState<string[]>([]);
  const [otherThoughts, setOtherThoughts] = useState("");
  const [submitEmail, setSubmitEmail] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const toggleFeature = (id: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleFrustration = (id: string) => {
    setSelectedFrustrations((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleFeedbackSubmit = async () => {
    if (!user) return;
    await submitAppFeedback({
      userEmail: submitEmail ? user.email : undefined,
      suggestedFeatures: selectedFeatures.join(", "),
      reportedFrustration: selectedFrustrations.join(", "),
      otherThoughts: otherThoughts,
    });
    setShowSuccess(true);
  };

  const isFormValid =
    selectedFeatures.length > 0 ||
    selectedFrustrations.length > 0 ||
    otherThoughts.length > 0;

  return (
    <>
      <Page
        title="Feedback & Suggestions"
        onBack={() => navigation.goBack()}
        keyboardAvoiding
        contentGap={space.sectionGap}
      >
          {/* Feature Requests */}
          <View style={styles.section}>
            <Text variant="label" color="tertiary">
              WHAT DO YOU WANT TO SEE?
            </Text>
            <View style={styles.chipsContainer}>
              {FEATURE_OPTIONS.map((opt) => (
                <Chip
                  key={opt.id}
                  label={opt.label}
                  icon={opt.icon}
                  selected={selectedFeatures.includes(opt.id)}
                  onPress={() => toggleFeature(opt.id)}
                />
              ))}
            </View>
          </View>

          {/* Frustrations */}
          <View style={styles.section}>
            <Text variant="label" color="tertiary">
              WHAT COULD BE BETTER?
            </Text>
            <View style={styles.chipsContainer}>
              {FRUSTRATION_OPTIONS.map((opt) => (
                <Chip
                  key={opt.id}
                  label={opt.label}
                  icon={opt.icon}
                  selected={selectedFrustrations.includes(opt.id)}
                  onPress={() => toggleFrustration(opt.id)}
                />
              ))}
            </View>
          </View>

          {/* Other Thoughts */}
          <View style={styles.section}>
            <Text variant="label" color="tertiary">
              ANY OTHER THOUGHTS?
            </Text>
            <TextField
              value={otherThoughts}
              onChangeText={setOtherThoughts}
              placeholder="Tell us more about your experience..."
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Follow-up toggle */}
          <View style={[styles.card, { backgroundColor: colors.surface.default }]}>
            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text variant="title">Share your email?</Text>
                <Text variant="bodySm" color="secondary" style={{ marginTop: 2 }}>
                  Allow us to contact you about this feedback
                </Text>
              </View>
              <Toggle value={submitEmail} onChange={(v) => setSubmitEmail(v)} />
            </View>
            {submitEmail ? (
              <View style={[styles.emailChip, { backgroundColor: colors.surface.control }]}>
                <Icon name="mail" size={14} color={colors.text.secondary} />
                <Text variant="bodySm" color="secondary">
                  {user?.email}
                </Text>
              </View>
            ) : null}
          </View>

          {/* CTA */}
          <Button
            label="Send Feedback"
            onPress={handleFeedbackSubmit}
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
              Your feedback is invaluable. We truly appreciate your time!
            </Text>
            <Button label="Done" onPress={() => navigation.goBack()} />
          </View>
        </View>
      )}
    </>
  );
};

export default Feedback;

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  card: {
    borderRadius: radius.card,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  emailChip: {
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    alignSelf: "flex-start",
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
