import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert, ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MirrorWorkFeedbackModal } from './components/MirrorWorkFeedbackModal';
import { FaceRegion } from './types';
import { completeMirrorWorkActivity, getMirrorWorkComparison } from '../../../../../api/practiceActivities';
import { useUserStore } from '../../../../../stores/user';
import DonePractice from '../../components/DonePractice';
import { theme } from '../../../../../Theme/tokens';
import { parseTextStyle, parseShadowStyle } from '../../../../../util/functions/parseStyles';
import {
  buildReflection, ReflectionView, RenderedInsight, ReflectionTone, Tier,
} from './util/mirrorReflection';
import { loadRotationState, saveRotationState } from './util/mirrorReflection/rotationStorage';

// ── Hero tint per overall tone (no alarming red — deepest is a warm amber) ──
const TONE_STYLE: Record<ReflectionTone, { tint: string; gradient: readonly [string, string] }> = {
  calm: { tint: '#10B981', gradient: ['#D1FAE5', '#A7F3D0'] },
  some: { tint: '#F59E0B', gradient: ['#FEF3C7', '#FDE68A'] },
  more: { tint: '#D97706', gradient: ['#FED7AA', '#FDBA74'] },
};

// ── Confidence-tier tints for region observations (light theme) ──
const TIER_TINT: Record<Tier, { bg: string; fg: string }> = {
  A: { bg: '#FFEDD5', fg: '#EA580C' }, // firm / high confidence
  B: { bg: '#FEF9C3', fg: '#CA8A04' }, // softer / lower confidence
  C: { bg: '#EDE9FE', fg: '#7C3AED' }, // informational (head/gaze)
};

const REGION_ICON: Record<FaceRegion, string> = {
  [FaceRegion.MOUTH]: 'happy-outline',
  [FaceRegion.EYES]: 'eye-outline',
  [FaceRegion.BROW]: 'contract-outline',
  [FaceRegion.CHEEKS]: 'ellipse-outline',
  [FaceRegion.NOSE]: 'ellipse-outline',
  [FaceRegion.HEAD]: 'sync-outline',
};

const EMERALD = { bg: '#D1FAE5', fg: '#059669' };

/** Icon + tint for an insight row. Region rows use the confidence tier; the
 *  narrative rows use a warm/positive accent. */
function insightVisual(insight: RenderedInsight): { icon: string; bg: string; fg: string } {
  switch (insight.kind) {
    case 'regionObservation': {
      const tint = TIER_TINT[insight.tier];
      return { icon: insight.region ? REGION_ICON[insight.region] : 'ellipse-outline', ...tint };
    }
    case 'milestone':
      return { icon: 'trophy-outline', ...EMERALD };
    case 'progress':
      return { icon: 'trending-up-outline', ...EMERALD };
    case 'arc':
      return { icon: 'pulse-outline', bg: theme.colors.library.orange[100], fg: theme.colors.library.orange[500] };
    case 'calm':
      return { icon: 'leaf-outline', ...EMERALD };
    case 'opening':
    default:
      return { icon: 'sparkles-outline', bg: theme.colors.library.orange[100], fg: theme.colors.library.orange[500] };
  }
}

/** Colour for a within-session segment by its tension fraction (no red). */
function arcSegmentColor(fraction: number, observedMs: number): string {
  if (observedMs < 3000) return '#E5E7EB';   // insufficient data → neutral grey
  if (fraction <= 0.1) return '#34D399';      // calm
  if (fraction <= 0.3) return '#FBBF24';      // some
  return '#FB923C';                           // more (warm amber)
}

const ARC_SEGMENT_LABELS = ['Start', 'Middle', 'End'];

export const SummaryScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();

  const {
    scores, promptsAttempted, nudgeMode, sessionDurationSeconds,
    signalCounts, reflectionText, practiceActivityId, weightTableVersion,
  } = route.params || {};

  const { user, fetchUser } = useUserStore();
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // The rendered reflection (built once after the cross-session comparison loads).
  const [reflection, setReflection] = useState<ReflectionView | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [rotationState, comparison] = await Promise.all([
        loadRotationState(),
        user?.id && scores
          ? getMirrorWorkComparison(
              user.id,
              { overallEaseScore: scores.overallEaseScore, regionEase: scores.regionEase },
              sessionDurationSeconds || 0,
            )
          : Promise.resolve(null),
      ]);
      if (cancelled) return;
      try {
        const { view, rotation } = buildReflection(
          {
            regionEase: scores?.regionEase ?? {},
            withinSession: scores?.withinSession,
            signalCounts: signalCounts ?? {},
            comparison,
          },
          rotationState,
        );
        setReflection(view);
        saveRotationState(rotation).catch(() => {});
      } catch (e) {
        // The engine is defensive, but never leave the user stuck on the spinner.
        console.warn('[SummaryScreen] reflection build failed:', e);
        setReflection({
          moodLabel: 'Session complete',
          tone: 'calm',
          insights: [{
            kind: 'calm',
            tier: 'A',
            text: 'Your session is saved. Nothing else to flag this time.',
          }],
          encouragement: 'Noticing is the whole game — and you showed up today.',
          caveat: "None of this is a diagnosis. It's a mirror with a memory — and noticing is the start of change.",
        });
      }
    })();
    return () => { cancelled = true; };
    // Route params are stable for this screen's lifetime — build once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleComplete = () => setShowFeedbackModal(true);

  const submitFinalData = async (feedback: { effortScore: number; autonomyScore: number; detectionAccuracyRating: number }) => {
    setShowFeedbackModal(false);
    setIsSubmitting(true);

    const mirrorWorkPayload = {
      detectedSignals: signalCounts || {},
      awarenessScores: scores || { gazeMaintained: 100, jawEase: 100, lipEase: 100, overallEaseScore: 100 },
      vitals: {
        effortScore: feedback.effortScore,
        autonomyScore: feedback.autonomyScore,
      },
      detectionAccuracyRating: feedback.detectionAccuracyRating,
      reflectionText: reflectionText || '',
      promptsAttempted: promptsAttempted || 0,
      nudgeMode: nudgeMode || 'ON',
      sessionDurationSeconds: sessionDurationSeconds || 0,
      weightTableVersion: weightTableVersion || undefined,
    };

    if (practiceActivityId && user?.id) {
      try {
        await completeMirrorWorkActivity(practiceActivityId, user.id, mirrorWorkPayload);
        fetchUser?.().catch((e: Error) => console.warn('[SummaryScreen] fetchUser failed:', e));
      } catch (err) {
        console.error('[SummaryScreen] completeMirrorWorkActivity failed:', err);
        Alert.alert(
          'Could not save your session',
          "Your session has ended. We'll try to sync your data next time.",
          [{ text: 'OK' }],
        );
      }
    }

    setIsSubmitting(false);
    setIsDone(true);
  };

  if (isDone) {
    return <DonePractice practiceName="Mirror Work" />;
  }

  const formatDuration = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const tone = reflection ? TONE_STYLE[reflection.tone] : TONE_STYLE.calm;
  const arcThirds = scores?.withinSession?.thirds;
  const showArc =
    !!scores?.withinSession &&
    scores.withinSession.arc !== 'insufficient' &&
    Array.isArray(arcThirds) &&
    arcThirds.length === 3;

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={["#FFFCF9", "#FFF7ED", "#F5F7FA"]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Background Watermark */}
      <View style={styles.watermarkContainer} pointerEvents="none">
        <Icon
          name="sparkles-outline"
          size={320}
          color={theme.colors.library.orange[200]}
          style={{ opacity: 0.15, transform: [{ rotate: "-15deg" }] }}
        />
      </View>

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
          <Icon name="chevron-back" size={20} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Session Summary</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero: overall mood (qualitative — no severity numbers) */}
        <View style={styles.heroCardShadow}>
          <LinearGradient
            colors={tone.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroLeft}>
              <Text style={styles.heroEyebrow}>HOW IT FELT</Text>
              <Text style={[styles.heroTitle, { color: '#1F2937' }]}>
                {reflection ? reflection.moodLabel : 'Reflecting…'}
              </Text>
              {reflection ? (
                <Text style={styles.heroSubtitle}>{reflection.encouragement}</Text>
              ) : null}
            </View>
            <View style={[styles.heroRingPlaceholder, { borderColor: tone.tint }]}>
              <Icon name="happy-outline" size={42} color={tone.tint} />
            </View>
          </LinearGradient>
        </View>

        {/* Quick stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Icon name="time-outline" size={22} color={theme.colors.actionPrimary.default} />
            <Text style={styles.statValue}>{formatDuration(sessionDurationSeconds || 0)}</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
          <View style={styles.statBox}>
            <Icon name="chatbubbles-outline" size={22} color={theme.colors.actionPrimary.default} />
            <Text style={styles.statValue}>{promptsAttempted || 0}</Text>
            <Text style={styles.statLabel}>Prompts</Text>
          </View>
          <View style={styles.statBox}>
            <Icon name={nudgeMode === 'OFF' ? 'volume-mute-outline' : 'bulb-outline'} size={22} color={theme.colors.actionPrimary.default} />
            <Text style={styles.statValue}>{nudgeMode === 'OFF' ? 'Quiet' : 'Notes'}</Text>
            <Text style={styles.statLabel}>Mode</Text>
          </View>
        </View>

        {/* Within-session arc */}
        {showArc ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>How the session flowed</Text>
            <Text style={styles.cardSubtitle}>Tension across the start, middle, and end.</Text>
            <View style={styles.arcRow}>
              {arcThirds!.map((t, i) => (
                <View key={i} style={styles.arcSegmentWrap}>
                  <View
                    style={[
                      styles.arcSegment,
                      { backgroundColor: arcSegmentColor(t.tensionFraction, t.observedMs) },
                    ]}
                  />
                  <Text style={styles.arcSegmentLabel}>{ARC_SEGMENT_LABELS[i]}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Reflection (insights) */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>What we noticed</Text>
          {!reflection ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={theme.colors.library.orange[500]} />
              <Text style={styles.loadingText}>Putting your reflection together…</Text>
            </View>
          ) : (
            <View style={styles.signalList}>
              {reflection.insights.map((insight, idx) => {
                const v = insightVisual(insight);
                return (
                  <View key={`${insight.kind}-${idx}`} style={styles.signalRow}>
                    <View style={[styles.signalIconWrap, { backgroundColor: v.bg }]}>
                      <Icon name={v.icon} size={18} color={v.fg} />
                    </View>
                    <Text style={styles.signalLabel}>{insight.text}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Footnote (rotated caveat — always NSA-safe) */}
        <Text style={styles.footnote}>
          {reflection
            ? reflection.caveat
            : "None of this is a diagnosis. It's a mirror with a memory — and noticing is the start of change."}
        </Text>

        <TouchableOpacity
          style={styles.primaryButtonShadow}
          activeOpacity={0.9}
          onPress={handleComplete}
          disabled={isSubmitting}
        >
          <LinearGradient
            colors={[
              theme.colors.library.orange[400],
              theme.colors.library.orange[500],
            ]}
            style={styles.primaryButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.primaryButtonText}>{isSubmitting ? 'Saving…' : 'Continue'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showFeedbackModal} animationType="slide" transparent>
        <MirrorWorkFeedbackModal
          onSubmit={submitFinalData}
          onClose={() => setShowFeedbackModal(false)}
        />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  watermarkContainer: {
    position: 'absolute',
    right: -80,
    top: -50,
    zIndex: 0,
  },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 10,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  headerTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    color: '#0F172A',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 40,
    zIndex: 1,
  },

  // ── Hero ──
  heroCardShadow: {
    borderRadius: 28,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    ...parseShadowStyle(theme.shadow.elevation1),
    elevation: 2,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 28,
    padding: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  heroLeft: { flex: 1, paddingRight: 12 },
  heroEyebrow: {
    ...parseTextStyle(theme.typography.BodySmall),
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 1.4,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.6,
    lineHeight: 32,
  },
  heroSubtitle: {
    ...parseTextStyle(theme.typography.Body),
    color: '#1F2937',
    marginTop: 8,
  },
  heroRingPlaceholder: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
  },

  // ── Stats row ──
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
    ...parseShadowStyle(theme.shadow.elevation1),
    elevation: 2,
  },
  statValue: {
    ...parseTextStyle(theme.typography.Heading3),
    color: '#0F172A',
    marginTop: 8,
    marginBottom: 2,
  },
  statLabel: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: '#6B7280',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ── Cards ──
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
    ...parseShadowStyle(theme.shadow.elevation1),
    elevation: 2,
  },
  cardTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    color: '#0F172A',
  },
  cardSubtitle: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: '#6B7280',
    marginTop: 6,
    marginBottom: 20,
  },

  // ── Within-session arc ──
  arcRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  arcSegmentWrap: {
    flex: 1,
    alignItems: 'center',
  },
  arcSegment: {
    width: '100%',
    height: 12,
    borderRadius: 6,
  },
  arcSegmentLabel: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: '#6B7280',
    fontWeight: '600',
    marginTop: 8,
  },

  // ── Insight list ──
  signalList: { marginTop: 14 },
  signalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  signalIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.library.orange[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  signalLabel: {
    flex: 1,
    ...parseTextStyle(theme.typography.Body),
    color: '#1F2937',
    fontWeight: '500',
    lineHeight: 22,
  },

  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  loadingText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: '#6B7280',
    marginTop: 12,
  },

  footnote: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: '#9CA3AF',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 24,
    paddingHorizontal: 16,
  },

  primaryButtonShadow: {
    width: "100%",
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    ...parseShadowStyle(theme.shadow.elevation2),
    elevation: 4,
  },
  primaryButtonGradient: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 18,
    borderRadius: 20,
  },
  primaryButtonText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: "#FFFFFF",
  },
});
