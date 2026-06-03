import axios from "axios";
import { LinearGradient } from "expo-linear-gradient";
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

// Polished palette aligned with the app's modern screens (Summary / Dashboard).
const C = {
  ink: "#1F2937",
  body: "#4B5563",
  muted: "#9CA3AF",
  border: "#F1F5F9",
  track: "#EEF0F3",
  card: "#FFFFFF",
  orange: "#FF9040",
  orangeDeep: "#FF6B00",
  chipBg: "#FFF0E5",
  chipText: "#BF5000",
  emerald: "#10B981",
  amber: "#F59E0B",
  blue: "#3B82F6",
  slate: "#64748B",
};

const cardShadow = {
  shadowColor: "#64748B",
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.06,
  shadowRadius: 16,
  elevation: 3,
} as const;

const scoreColor = (v: number) =>
  v >= 4 ? C.emerald : v >= 3 ? C.amber : C.orangeDeep;

const ScoreMeter = ({ label, value }: { label: string; value?: number }) => {
  const v = typeof value === "number" ? value : 0;
  const color = scoreColor(v);
  return (
    <View style={styles.scoreCard}>
      <Text style={[styles.scoreValue, { color }]}>
        {typeof value === "number" ? value : "–"}
        <Text style={styles.scoreMax}>/5</Text>
      </Text>
      <View style={styles.segs}>
        {[0, 1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={[
              styles.seg,
              { backgroundColor: i < Math.round(v) ? color : C.track },
            ]}
          />
        ))}
      </View>
      <Text style={styles.scoreLabel}>{label}</Text>
    </View>
  );
};

const SectionCard = ({
  icon,
  title,
  accent,
  tint,
  children,
}: {
  icon: string;
  title: string;
  accent: string;
  tint: string;
  children: React.ReactNode;
}) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <View style={[styles.iconCircle, { backgroundColor: tint }]}>
        <Icon name={icon} size={14} color={accent} solid />
      </View>
      <Text style={styles.cardTitle}>{title}</Text>
    </View>
    {children}
  </View>
);

/**
 * Post-call feedback report shown inline after an AI phone-call practice
 * completes — styled to match the app's modern visual language.
 */
const PhoneCallReport: React.FC<Props> = ({
  practiceActivityId,
  onContinue,
}) => {
  const insets = useSafeAreaInsets();
  const [report, setReport] = useState<PhoneCallReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  const onContinueRef = useRef(onContinue);
  onContinueRef.current = onContinue;

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    setRateLimited(false);
    const MAX_ATTEMPTS = 4;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const data = await getPhoneCallReport(practiceActivityId);
        if (!data) {
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
          onContinueRef.current();
          return;
        }
        if (status === 429) setRateLimited(true);
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
          title={rateLimited ? "Taking a moment" : "Report unavailable"}
          message={
            rateLimited
              ? "Reports are in high demand right now.\nTap retry in a moment, or skip."
              : "We couldn't build your report.\nTry again, or skip for now."
          }
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
      <LinearGradient
        colors={["#FFF7ED", "#FFEDD5", "#FFFFFF"]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 130 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <LinearGradient
            colors={[C.orange, C.orangeDeep]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroBadge}
          >
            <Icon name="comment-dots" size={26} color="#fff" solid />
          </LinearGradient>
          <View style={styles.chip}>
            <Text style={styles.chipText}>PRACTICE REPORT</Text>
          </View>
          <Text style={styles.headline}>{report.headline}</Text>
          <Text style={styles.summary}>{report.summary}</Text>
        </View>

        {/* Scores */}
        {report.scores && (
          <View style={styles.scoreRow}>
            <ScoreMeter label="Confidence" value={report.scores.confidence} />
            <ScoreMeter label="Clarity" value={report.scores.clarity} />
            <ScoreMeter label="Engagement" value={report.scores.engagement} />
          </View>
        )}

        {report.score_rationale && (
          <SectionCard
            icon="info-circle"
            title="Why these scores"
            accent={C.blue}
            tint="rgba(59,130,246,0.12)"
          >
            {(["confidence", "clarity", "engagement"] as const).map((k) => (
              <View key={k} style={styles.rationaleRow}>
                <Text style={styles.rationaleLabel}>{k}</Text>
                <Text style={styles.bodyText}>{report.score_rationale?.[k]}</Text>
              </View>
            ))}
            <Text style={styles.caveat}>
              AI-assessed from your transcript — a guide, not a verdict.
            </Text>
          </SectionCard>
        )}

        {report.what_went_well?.length > 0 && (
          <SectionCard
            icon="check-circle"
            title="What went well"
            accent={C.emerald}
            tint="rgba(16,185,129,0.12)"
          >
            {report.what_went_well.map((item, i) => (
              <View key={i} style={styles.bulletRow}>
                <Icon
                  name="check"
                  size={11}
                  color={C.emerald}
                  style={styles.bulletIcon}
                />
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
          </SectionCard>
        )}

        {report.areas_to_improve?.length > 0 && (
          <SectionCard
            icon="seedling"
            title="Areas to grow"
            accent={C.amber}
            tint="rgba(245,158,11,0.12)"
          >
            {report.areas_to_improve.map((item, i) => (
              <View key={i} style={styles.bulletRow}>
                <Icon
                  name="arrow-up"
                  size={11}
                  color={C.amber}
                  style={styles.bulletIcon}
                />
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
          </SectionCard>
        )}

        {!!report.handled_pressure && (
          <SectionCard
            icon="bolt"
            title="Under pressure"
            accent={C.blue}
            tint="rgba(59,130,246,0.12)"
          >
            <Text style={styles.bodyText}>{report.handled_pressure}</Text>
          </SectionCard>
        )}

        {report.disfluency_moments && report.disfluency_moments.length > 0 && (
          <SectionCard
            icon="comment-dots"
            title="In your own words"
            accent={C.slate}
            tint="rgba(100,116,139,0.12)"
          >
            {report.disfluency_moments.map((m, i) => (
              <View key={i} style={styles.momentRow}>
                <View style={styles.momentAccent} />
                <View style={styles.momentBody}>
                  <Text style={styles.momentQuote}>“{m.quote}”</Text>
                  {!!m.note && <Text style={styles.momentNote}>{m.note}</Text>}
                </View>
              </View>
            ))}
            <Text style={styles.caveat}>
              Stuttering is a natural way of talking — these are shown for
              transparency, not as something to change. (From the transcript
              text, not audio.)
            </Text>
          </SectionCard>
        )}

        {!!report.suggested_next_practice && (
          <SectionCard
            icon="arrow-right"
            title="Try this next"
            accent={C.orangeDeep}
            tint="rgba(255,107,0,0.12)"
          >
            <Text style={styles.bodyText}>{report.suggested_next_practice}</Text>
          </SectionCard>
        )}

        {/* Encouragement */}
        <View style={styles.encourageCard}>
          <LinearGradient
            colors={[C.orange, C.orangeDeep]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.encourageGradient}
          >
            <Icon
              name="heart"
              size={104}
              color="#fff"
              solid
              style={styles.encourageWatermark}
            />
            <Text style={styles.encourageText}>{report.encouragement}</Text>
          </LinearGradient>
        </View>

        {/* Transcript */}
        {!!report.transcript && (
          <View style={styles.transcriptWrap}>
            <TouchableOpacity
              onPress={() => setShowTranscript((v) => !v)}
              style={styles.transcriptToggle}
              activeOpacity={0.7}
            >
              <Text style={styles.transcriptToggleText}>
                {showTranscript ? "Hide transcript" : "Show full transcript"}
              </Text>
              <Icon
                name={showTranscript ? "chevron-up" : "chevron-down"}
                size={11}
                color={C.slate}
              />
            </TouchableOpacity>
            {showTranscript && (
              <View style={styles.transcriptBox}>
                {report.transcript.split("\n").map((line, i) => {
                  const isUser = line.startsWith("[User]");
                  const text = line.replace(/^\[(User|Interviewer)\]\s?/, "");
                  if (!text) return null;
                  return (
                    <Text key={i} style={styles.transcriptLine}>
                      <Text
                        style={[
                          styles.transcriptSpeaker,
                          { color: isUser ? C.orangeDeep : C.ink },
                        ]}
                      >
                        {isUser ? "You  " : "AI  "}
                      </Text>
                      {text}
                    </Text>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Sticky CTA */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
        <TouchableOpacity
          style={styles.continueBtn}
          onPress={onContinue}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={[C.orange, C.orangeDeep]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.continueGradient}
          >
            <Text style={styles.continueText}>Continue</Text>
            <Icon name="arrow-right" size={13} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF7ED" },
  scroll: { paddingHorizontal: 20 },

  // Hero
  hero: { alignItems: "center", marginBottom: 22 },
  heroBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: C.orangeDeep,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 16,
    elevation: 8,
  },
  chip: {
    marginTop: 16,
    backgroundColor: C.chipBg,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  chipText: {
    ...parseTextStyle(theme.typography.LabelSmall),
    color: C.chipText,
    fontWeight: "800",
    letterSpacing: 1.4,
    fontSize: 10,
  },
  headline: {
    ...parseTextStyle(theme.typography.Heading1),
    color: C.ink,
    textAlign: "center",
    marginTop: 12,
  },
  summary: {
    ...parseTextStyle(theme.typography.BodyLarge),
    color: C.body,
    textAlign: "center",
    marginTop: 10,
  },

  // Scores
  scoreRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  scoreCard: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
    ...cardShadow,
  },
  scoreValue: {
    ...parseTextStyle(theme.typography.Heading1),
    fontSize: 30,
    letterSpacing: -1,
  },
  scoreMax: { ...parseTextStyle(theme.typography.BodySmall), color: C.muted },
  segs: { flexDirection: "row", gap: 3, marginTop: 8, alignSelf: "stretch" },
  seg: { flex: 1, height: 5, borderRadius: 3 },
  scoreLabel: {
    ...parseTextStyle(theme.typography.LabelSmall),
    color: C.muted,
    marginTop: 10,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  // Cards
  card: {
    backgroundColor: C.card,
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.border,
    ...cardShadow,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    color: C.ink,
    fontSize: 16,
  },

  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 9,
    gap: 10,
  },
  bulletIcon: { marginTop: 4 },
  bulletText: {
    ...parseTextStyle(theme.typography.Body),
    color: C.body,
    flex: 1,
  },
  bodyText: { ...parseTextStyle(theme.typography.Body), color: C.body },

  // Rationale
  rationaleRow: { marginBottom: 12 },
  rationaleLabel: {
    ...parseTextStyle(theme.typography.LabelSmall),
    color: C.slate,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  caveat: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: C.muted,
    fontStyle: "italic",
    marginTop: 6,
  },

  // Moments
  momentRow: { flexDirection: "row", marginBottom: 14, gap: 12 },
  momentAccent: {
    width: 3,
    borderRadius: 2,
    backgroundColor: C.slate,
    opacity: 0.4,
  },
  momentBody: { flex: 1 },
  momentQuote: {
    ...parseTextStyle(theme.typography.Body),
    color: C.ink,
    fontStyle: "italic",
  },
  momentNote: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: C.muted,
    marginTop: 3,
  },

  // Encouragement
  encourageCard: {
    borderRadius: 24,
    overflow: "hidden",
    marginTop: 4,
    marginBottom: 4,
    shadowColor: C.orangeDeep,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 8,
  },
  encourageGradient: { padding: 22, overflow: "hidden" },
  encourageWatermark: {
    position: "absolute",
    right: -16,
    bottom: -22,
    opacity: 0.16,
    transform: [{ rotate: "-12deg" }],
  },
  encourageText: {
    ...parseTextStyle(theme.typography.BodyLarge),
    color: "#fff",
    fontWeight: "600",
    textAlign: "center",
  },

  // Transcript
  transcriptWrap: { marginTop: 10 },
  transcriptToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
  },
  transcriptToggleText: {
    ...parseTextStyle(theme.typography.Label),
    color: C.slate,
  },
  transcriptBox: {
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    ...cardShadow,
  },
  transcriptLine: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: C.body,
    marginBottom: 10,
  },
  transcriptSpeaker: { fontWeight: "800" },

  // CTA
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  continueBtn: {
    borderRadius: 999,
    overflow: "hidden",
    shadowColor: C.orangeDeep,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  continueGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 17,
  },
  continueText: {
    ...parseTextStyle(theme.typography.Button),
    color: "#fff",
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  // Error
  errorWrap: {
    flex: 1,
    backgroundColor: "#FFF7ED",
    justifyContent: "center",
    padding: 20,
  },
  skipBtn: { marginTop: 20, alignItems: "center", padding: 12 },
  skipText: { ...parseTextStyle(theme.typography.Button), color: C.slate },
});

export default PhoneCallReport;
