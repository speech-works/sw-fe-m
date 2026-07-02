import axios from "axios";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  getPhoneCallReport,
  PhoneCallReportData,
} from "../../../../../../api/practiceActivities";
import ErrorStateCard from "../../../../../../components/Dashboard/ErrorStateCard";
import {
  useTheme,
  spacing,
  radius,
  borderWidth,
  Text,
  Icon,
  icons,
  Button,
  Gradient,
  Spinner,
} from "../../../../../../design-system";
import type { SemanticColors } from "../../../../../../design-system";

interface Props {
  practiceActivityId: string;
  onContinue: () => void;
}

// Score → color. On the dark canvas colored text uses the lighter
// `feedback.*Text` variants; the bright meter segments use the accent/primary base.
const scoreTextColor = (v: number, colors: SemanticColors) =>
  v >= 4
    ? colors.feedback.successText
    : v >= 3
      ? colors.feedback.warningText
      : colors.action.primary;

const scoreFillColor = (v: number, colors: SemanticColors) =>
  v >= 4
    ? colors.accent.success
    : v >= 3
      ? colors.accent.warning
      : colors.action.primary;

const ScoreMeter = ({ label, value }: { label: string; value?: number }) => {
  const { colors } = useTheme();
  const v = typeof value === "number" ? value : 0;
  const textColor = scoreTextColor(v, colors);
  const fill = scoreFillColor(v, colors);
  return (
    <View style={[styles.scoreCard, { backgroundColor: colors.surface.default, borderColor: colors.border.default }]}>
      <Text variant="display" color={textColor} style={styles.scoreValue}>
        {typeof value === "number" ? value : "–"}
        <Text variant="bodySm" color="tertiary">
          /5
        </Text>
      </Text>
      <View style={styles.segs}>
        {[0, 1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={[
              styles.seg,
              { backgroundColor: i < Math.round(v) ? fill : colors.surface.control },
            ]}
          />
        ))}
      </View>
      <Text variant="label" color="tertiary" style={styles.scoreLabel}>
        {label}
      </Text>
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
  icon: (typeof icons)[keyof typeof icons];
  title: string;
  accent: string;
  tint: string;
  children: React.ReactNode;
}) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface.default, borderColor: colors.border.default }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconCircle, { backgroundColor: tint }]}>
          <Icon name={icon} size={14} color={accent} />
        </View>
        <Text variant="h3" color="primary">
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
};

/**
 * Post-call feedback report shown inline after an AI phone-call practice
 * completes — dark "Vivid" surfaces with orange/accent highlights.
 */
const PhoneCallReport: React.FC<Props> = ({
  practiceActivityId,
  onContinue,
}) => {
  const { colors } = useTheme();
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
    return (
      <View style={[styles.center, { backgroundColor: colors.background.canvas }]}>
        <Spinner label="Crafting your feedback…" />
      </View>
    );
  }

  if (error || !report) {
    return (
      <View style={[styles.errorWrap, { backgroundColor: colors.background.canvas }]}>
        <ErrorStateCard
          title={rateLimited ? "Taking a moment" : "Report unavailable"}
          message={
            rateLimited
              ? "Reports are in high demand right now.\nTap retry in a moment, or skip."
              : "We couldn't build your report.\nTry again, or skip for now."
          }
          onRetry={load}
          variant="dark"
        />
        <TouchableOpacity style={styles.skipBtn} onPress={onContinue}>
          <Text variant="title" color="secondary">
            Skip for now
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background.canvas }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + 130 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={[styles.heroBadge, { backgroundColor: colors.action.primary }]}>
            <Icon name={icons.call} size={26} color={colors.action.onPrimary} />
          </View>
          <View style={[styles.chip, { backgroundColor: colors.action.primaryTint }]}>
            <Text variant="label" color={colors.action.primary} style={styles.chipText}>
              PRACTICE REPORT
            </Text>
          </View>
          <Text variant="h1" color="primary" center style={styles.headline}>
            {report.headline}
          </Text>
          <Text variant="body" color="secondary" center style={styles.summary}>
            {report.summary}
          </Text>
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
            icon={icons.tip}
            title="Why these scores"
            accent={colors.feedback.infoText}
            tint={colors.accentTint.info}
          >
            {(["confidence", "clarity", "engagement"] as const).map((k) => (
              <View key={k} style={styles.rationaleRow}>
                <Text variant="label" color="tertiary" style={styles.rationaleLabel}>
                  {k}
                </Text>
                <Text variant="body" color="secondary">
                  {report.score_rationale?.[k]}
                </Text>
              </View>
            ))}
            <Text variant="bodySm" color="tertiary" style={styles.caveat}>
              AI-assessed from your transcript — a guide, not a verdict.
            </Text>
          </SectionCard>
        )}

        {report.what_went_well?.length > 0 && (
          <SectionCard
            icon={icons.success}
            title="What went well"
            accent={colors.feedback.successText}
            tint={colors.accentTint.success}
          >
            {report.what_went_well.map((item, i) => (
              <View key={i} style={styles.bulletRow}>
                <Icon
                  name={icons.success}
                  size={12}
                  color={colors.feedback.successText}
                  style={styles.bulletIcon}
                />
                <Text variant="body" color="secondary" style={styles.bulletText}>
                  {item}
                </Text>
              </View>
            ))}
          </SectionCard>
        )}

        {report.areas_to_improve?.length > 0 && (
          <SectionCard
            icon={icons.growthSeed}
            title="Areas to grow"
            accent={colors.feedback.warningText}
            tint={colors.accentTint.warning}
          >
            {report.areas_to_improve.map((item, i) => (
              <View key={i} style={styles.bulletRow}>
                <Icon
                  name={icons.levelUp}
                  size={12}
                  color={colors.feedback.warningText}
                  style={styles.bulletIcon}
                />
                <Text variant="body" color="secondary" style={styles.bulletText}>
                  {item}
                </Text>
              </View>
            ))}
          </SectionCard>
        )}

        {!!report.handled_pressure && (
          <SectionCard
            icon={icons.energy}
            title="Under pressure"
            accent={colors.feedback.infoText}
            tint={colors.accentTint.info}
          >
            <Text variant="body" color="secondary">
              {report.handled_pressure}
            </Text>
          </SectionCard>
        )}

        {report.disfluency_moments && report.disfluency_moments.length > 0 && (
          <SectionCard
            icon={icons.spokeUp}
            title="In your own words"
            accent={colors.text.secondary}
            tint={colors.surface.control}
          >
            {report.disfluency_moments.map((m, i) => (
              <View key={i} style={styles.momentRow}>
                <View style={[styles.momentAccent, { backgroundColor: colors.border.strong }]} />
                <View style={styles.momentBody}>
                  <Text variant="body" color="primary" style={styles.momentQuote}>
                    “{m.quote}”
                  </Text>
                  {!!m.note && (
                    <Text variant="bodySm" color="tertiary" style={styles.momentNote}>
                      {m.note}
                    </Text>
                  )}
                </View>
              </View>
            ))}
            <Text variant="bodySm" color="tertiary" style={styles.caveat}>
              Stuttering is a natural way of talking — these are shown for
              transparency, not as something to change. (From the transcript
              text, not audio.)
            </Text>
          </SectionCard>
        )}

        {!!report.suggested_next_practice && (
          <SectionCard
            icon={icons.forward}
            title="Try this next"
            accent={colors.action.primary}
            tint={colors.action.primaryTint}
          >
            <Text variant="body" color="secondary">
              {report.suggested_next_practice}
            </Text>
          </SectionCard>
        )}

        {/* Encouragement — the one bright orange identity surface (dark ink on the fill). */}
        <View style={[styles.encourageCard, { backgroundColor: colors.action.primary }]}>
          <Icon
            name={icons.heart}
            size={104}
            color={colors.action.onPrimary}
            style={styles.encourageWatermark}
          />
          <Text variant="body" color={colors.action.onPrimary} center style={styles.encourageText}>
            {report.encouragement}
          </Text>
        </View>

        {/* Transcript */}
        {!!report.transcript && (
          <View style={styles.transcriptWrap}>
            <TouchableOpacity
              onPress={() => setShowTranscript((v) => !v)}
              style={styles.transcriptToggle}
              activeOpacity={0.7}
            >
              <Text variant="label" color="secondary">
                {showTranscript ? "Hide transcript" : "Show full transcript"}
              </Text>
              <Icon
                name={showTranscript ? icons.chevronUp : icons.chevronDown}
                size={12}
                color={colors.text.secondary}
              />
            </TouchableOpacity>
            {showTranscript && (
              <View style={[styles.transcriptBox, { backgroundColor: colors.surface.default, borderColor: colors.border.default }]}>
                {report.transcript.split("\n").map((line, i) => {
                  const isUser = line.startsWith("[User]");
                  const text = line.replace(/^\[(User|Interviewer)\]\s?/, "");
                  if (!text) return null;
                  return (
                    <Text key={i} variant="bodySm" color="secondary" style={styles.transcriptLine}>
                      <Text
                        variant="bodySm"
                        color={isUser ? colors.action.primary : colors.text.primary}
                        style={styles.transcriptSpeaker}
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

      {/* Bottom fade — content dissolves into the canvas before the floating CTA
          (matches the Page footer + recorder dock). */}
      <View
        pointerEvents="none"
        style={[styles.footerScrim, { height: insets.bottom + 130 }]}
      >
        <Gradient token="scrimDown" style={StyleSheet.absoluteFill} />
      </View>

      {/* Sticky CTA — floats over the faded content. */}
      <View
        pointerEvents="box-none"
        style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}
      >
        <Button
          variant="primary"
          label="Continue"
          rightIcon={icons.forward}
          onPress={onContinue}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: spacing.xl },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },

  // Hero
  hero: { alignItems: "center", marginBottom: spacing["2xl"] },
  heroBadge: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  chip: {
    marginTop: spacing.lg,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  chipText: {
    letterSpacing: 1.4,
  },
  headline: {
    marginTop: spacing.md,
  },
  summary: {
    marginTop: spacing.sm,
  },

  // Scores
  scoreRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg },
  scoreCard: {
    flex: 1,
    borderRadius: radius.chip,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    borderWidth: borderWidth.thin,
  },
  scoreValue: {
    fontSize: 30,
    letterSpacing: -1,
  },
  segs: { flexDirection: "row", gap: 3, marginTop: spacing.sm, alignSelf: "stretch" },
  seg: { flex: 1, height: 5, borderRadius: 3 },
  scoreLabel: {
    marginTop: spacing.sm,
  },

  // Cards
  card: {
    borderRadius: radius.card,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: borderWidth.thin,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },

  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  bulletIcon: { marginTop: 4 },
  bulletText: {
    flex: 1,
  },

  // Rationale
  rationaleRow: { marginBottom: spacing.md },
  rationaleLabel: {
    textTransform: "uppercase",
    marginBottom: spacing.xxs,
  },
  caveat: {
    fontStyle: "italic",
    marginTop: spacing.xs,
  },

  // Moments
  momentRow: { flexDirection: "row", marginBottom: spacing.md, gap: spacing.md },
  momentAccent: {
    width: 3,
    borderRadius: 2,
  },
  momentBody: { flex: 1 },
  momentQuote: {
    fontStyle: "italic",
  },
  momentNote: {
    marginTop: spacing.xxs,
  },

  // Encouragement
  encourageCard: {
    borderRadius: radius.card,
    overflow: "hidden",
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    padding: spacing.xl,
  },
  encourageWatermark: {
    position: "absolute",
    right: -16,
    bottom: -22,
    opacity: 0.16,
    transform: [{ rotate: "-12deg" }],
  },
  encourageText: {
    fontWeight: "600",
  },

  // Transcript
  transcriptWrap: { marginTop: spacing.sm },
  transcriptToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  transcriptBox: {
    borderRadius: radius.input,
    padding: spacing.lg,
    borderWidth: borderWidth.thin,
  },
  transcriptLine: {
    marginBottom: spacing.sm,
  },
  transcriptSpeaker: { fontWeight: "800" },

  // CTA
  footerScrim: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },

  // Error
  errorWrap: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.xl,
  },
  skipBtn: { marginTop: spacing.xl, alignItems: "center", padding: spacing.md },
});

export default PhoneCallReport;
