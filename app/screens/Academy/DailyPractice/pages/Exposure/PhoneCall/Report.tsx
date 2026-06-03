import axios from "axios";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/FontAwesome5";

import {
  getPhoneCallReport,
  PhoneCallReportData,
} from "../../../../../../api/practiceActivities";
import ErrorStateCard from "../../../../../../components/Dashboard/ErrorStateCard";
import LoadingScreen from "../../../../../../components/Loading";
import { theme } from "../../../../../../Theme/tokens";
import { parseTextStyle } from "../../../../../../util/functions/parseStyles";

interface Props {
  practiceActivityId: string;
  onContinue: () => void;
}

const ScoreBox = ({ label, value }: { label: string; value?: number }) => (
  <View style={styles.scoreBox}>
    <Text style={styles.scoreValue}>
      {typeof value === "number" ? value : "–"}
      <Text style={styles.scoreMax}>/5</Text>
    </Text>
    <Text style={styles.scoreLabel}>{label}</Text>
  </View>
);

/**
 * Post-call feedback report shown inline after an AI phone-call practice
 * completes. Calls the backend (which generates the report from the saved
 * transcript via Gemini/Groq) and renders it. "Continue" hands back to the
 * existing done-flow.
 */
const PhoneCallReport: React.FC<Props> = ({
  practiceActivityId,
  onContinue,
}) => {
  const insets = useSafeAreaInsets();
  const [report, setReport] = useState<PhoneCallReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Keep the latest onContinue without making it a dep of load() (which would
  // re-trigger the fetch effect every render).
  const onContinueRef = useRef(onContinue);
  onContinueRef.current = onContinue;

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    // The transcript is persisted when the call socket closes; if the app gets
    // here a moment early, the endpoint returns 400 ("not ready"). Briefly retry
    // on 400 so the report appears smoothly.
    const MAX_ATTEMPTS = 4;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const data = await getPhoneCallReport(practiceActivityId);
        if (!data) {
          // No report for this call (e.g. Groq provider, or nothing to report)
          // → skip straight to the done flow rather than showing anything.
          onContinueRef.current();
          return;
        }
        setReport(data);
        setLoading(false);
        return;
      } catch (e) {
        const status = axios.isAxiosError(e) ? e.response?.status : undefined;
        if (status === 400) {
          if (attempt < MAX_ATTEMPTS) {
            await new Promise((r) => setTimeout(r, 1500));
            continue;
          }
          // Still no transcript after retries → trivial/empty call, nothing to
          // report → skip to done instead of showing an error.
          onContinueRef.current();
          return;
        }
        // Genuine failure (500 / network) → show the error card.
        setError(true);
        setLoading(false);
        return;
      }
    }
  }, [practiceActivityId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <LoadingScreen message="Crafting your feedback…" />;
  }

  if (error || !report) {
    return (
      <View style={styles.errorWrap}>
        <ErrorStateCard
          title="Report unavailable"
          message={"We couldn't build your report.\nTry again, or skip for now."}
          onRetry={load}
          variant="light"
        />
        <TouchableOpacity style={styles.skipBtn} onPress={onContinue}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>YOUR PRACTICE REPORT</Text>
        <Text style={styles.headline}>{report.headline}</Text>
        <Text style={styles.summary}>{report.summary}</Text>

        {report.scores && (
          <View style={styles.scoreRow}>
            <ScoreBox label="Confidence" value={report.scores.confidence} />
            <ScoreBox label="Clarity" value={report.scores.clarity} />
            <ScoreBox label="Engagement" value={report.scores.engagement} />
          </View>
        )}

        {report.what_went_well?.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Icon
                name="check-circle"
                size={16}
                color={theme.colors.feedback.success}
                solid
              />
              <Text style={styles.cardTitle}>What went well</Text>
            </View>
            {report.what_went_well.map((item, i) => (
              <View key={i} style={styles.bulletRow}>
                <Icon
                  name="check"
                  size={12}
                  color={theme.colors.feedback.success}
                  style={styles.bulletIcon}
                />
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {report.areas_to_improve?.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Icon
                name="lightbulb"
                size={16}
                color={theme.colors.feedback.warning}
                solid
              />
              <Text style={styles.cardTitle}>Areas to grow</Text>
            </View>
            {report.areas_to_improve.map((item, i) => (
              <View key={i} style={styles.bulletRow}>
                <Icon
                  name="arrow-up"
                  size={12}
                  color={theme.colors.feedback.warning}
                  style={styles.bulletIcon}
                />
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {!!report.handled_pressure && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Icon
                name="bolt"
                size={16}
                color={theme.colors.feedback.info}
                solid
              />
              <Text style={styles.cardTitle}>Under pressure</Text>
            </View>
            <Text style={styles.bodyText}>{report.handled_pressure}</Text>
          </View>
        )}

        {!!report.suggested_next_practice && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Icon
                name="forward"
                size={16}
                color={theme.colors.actionPrimary.default}
                solid
              />
              <Text style={styles.cardTitle}>Try this next</Text>
            </View>
            <Text style={styles.bodyText}>
              {report.suggested_next_practice}
            </Text>
          </View>
        )}

        <View style={styles.encouragementCard}>
          <Text style={styles.encouragementText}>{report.encouragement}</Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={styles.continueBtn}
          onPress={onContinue}
          activeOpacity={0.85}
        >
          <Text style={styles.continueText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background.default },
  scroll: { paddingHorizontal: 20 },
  eyebrow: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: theme.colors.text.disabled,
    letterSpacing: 1,
    marginBottom: 6,
  },
  headline: {
    ...parseTextStyle(theme.typography.Heading1),
    color: theme.colors.text.title,
    marginBottom: 10,
  },
  summary: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    marginBottom: 18,
  },
  scoreRow: { flexDirection: "row", gap: 10, marginBottom: 18 },
  scoreBox: {
    flex: 1,
    backgroundColor: theme.colors.surface.elevated,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E7EB",
  },
  scoreValue: {
    ...parseTextStyle(theme.typography.Heading2),
    color: theme.colors.actionPrimary.default,
  },
  scoreMax: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.disabled,
  },
  scoreLabel: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: theme.colors.text.default,
    marginTop: 4,
  },
  card: {
    backgroundColor: theme.colors.surface.elevated,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E7EB",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  cardTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
    gap: 8,
  },
  bulletIcon: { marginTop: 3 },
  bulletText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    flex: 1,
  },
  bodyText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
  },
  encouragementCard: {
    backgroundColor: theme.colors.actionPrimary.default,
    borderRadius: 20,
    padding: 18,
    marginTop: 4,
  },
  encouragementText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.onDark,
    textAlign: "center",
    fontWeight: "600",
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: theme.colors.background.default,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E7EB",
  },
  continueBtn: {
    backgroundColor: theme.colors.actionPrimary.default,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  continueText: {
    ...parseTextStyle(theme.typography.Button),
    color: theme.colors.text.onDark,
  },
  errorWrap: {
    flex: 1,
    backgroundColor: theme.colors.background.default,
    justifyContent: "center",
    padding: 20,
  },
  skipBtn: { marginTop: 20, alignItems: "center", padding: 12 },
  skipText: {
    ...parseTextStyle(theme.typography.Button),
    color: theme.colors.text.default,
  },
});

export default PhoneCallReport;
