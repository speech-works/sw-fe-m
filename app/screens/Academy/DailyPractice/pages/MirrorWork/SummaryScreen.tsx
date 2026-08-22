import React, { useState, useEffect } from 'react';
import {
  spacing, size, withAlpha, radius, makeStyles, useTheme, mix,
  type SemanticColors,
} from "../../../../../design-system";
import {
  View, StyleSheet, ScrollView, TouchableOpacity, Modal, ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MirrorWorkFeedbackModal } from './components/MirrorWorkFeedbackModal';
import { FaceRegion } from './types';
import { NOT_A_DIAGNOSIS } from './copy';
import { completeMirrorWorkActivity, getMirrorWorkComparison } from '../../../../../api/practiceActivities';
import { useUserStore } from '../../../../../stores/user';
import { useRegisterNativeModal } from '../../../../../stores/nativeModal';
import DonePractice from '../../components/DonePractice';
import { Gradient, Text } from '../../../../../design-system';
import {
  buildReflection, ReflectionView, RenderedInsight, ReflectionTone, Tier,
} from './util/mirrorReflection';
import { loadRotationState, saveRotationState } from './util/mirrorReflection/rotationStorage';
import { useConfirmOnExit } from '../../../../../hooks/useConfirmOnExit';
import { markMirrorWorkCompleted, wasMirrorWorkCompleted } from './util/mirrorCompletionGuard';
import { showErrorBottomSheet } from '../../../../../util/functions/bottomSheet';

// Scheme-locked dark camera flow — this summary keeps its intentional
// light-pastel HUD/reflection palette (raw hexes stay; see MirrorWork siblings).
// Brand orange values match the DS palette (orange 100/200/400/500).
/**
 * ── Hero tint per overall tone ──────────────────────────────────────────────
 *
 * NO ALARMING RED, AND THAT SURVIVES THEMING. The heaviest tone is a DEEPER
 * AMBER, never `danger` — a red "you were very tense" verdict on someone's own
 * face reads as the app grading them, which is the one thing this feature must
 * not do. `more` therefore reuses the warning hue at a heavier mix rather than
 * changing hue, so the three steps stay legible as a ramp.
 *
 * Mixed against the live card instead of hardcoded, so the same expression
 * produces the authored pastels on paper and a deep tinted card on ink.
 */
const toneStyle = (
  c: SemanticColors,
): Record<ReflectionTone, { tint: string; gradient: readonly [string, string] }> => ({
  calm: {
    tint: c.accentText.success,
    gradient: [mix(c.surface.default, c.accent.success, 0.14), mix(c.surface.default, c.accent.success, 0.26)],
  },
  some: {
    tint: c.accentText.warning,
    gradient: [mix(c.surface.default, c.accent.warning, 0.14), mix(c.surface.default, c.accent.warning, 0.26)],
  },
  more: {
    tint: c.accentText.warning,
    gradient: [mix(c.surface.default, c.accent.warning, 0.30), mix(c.surface.default, c.accent.warning, 0.46)],
  },
});

// ── Hero face per tone — a gentle gradient that attunes to the session without
// judging. Deliberately stops at a calm/neutral face for the heaviest tone; a
// frown or sad face would read as the app grading the user (not NSA-safe). ──
const TONE_FACE: Record<ReflectionTone, string> = {
  calm: 'emoticon-happy-outline',   // clear, warm smile
  some: 'emoticon-outline',          // soft smile
  more: 'emoticon-neutral-outline',  // calm + present, acknowledging the tension
};

/**
 * ── Confidence-tier tints for region observations ───────────────────────────
 * WHICH tier a signal lands in is still pending the clinical weight table —
 * this only changes how a tier is PAINTED, never which one a signal gets.
 * `accentTint`/`accentText` are per-scheme, so both cuts come out AA.
 */
const tierTint = (c: SemanticColors): Record<Tier, { bg: string; fg: string }> => ({
  A: { bg: c.action.primaryTint, fg: c.text.accent },      // firm / high confidence
  B: { bg: c.accentTint.warning, fg: c.accentText.warning }, // softer / lower confidence
  C: { bg: c.accentTint.purple, fg: c.accentText.purple },   // informational (head/gaze)
});

const REGION_ICON: Record<FaceRegion, string> = {
  [FaceRegion.MOUTH]: 'happy-outline',
  [FaceRegion.EYES]: 'eye-outline',
  [FaceRegion.BROW]: 'contract-outline',
  [FaceRegion.CHEEKS]: 'ellipse-outline',
  [FaceRegion.NOSE]: 'ellipse-outline',
  [FaceRegion.HEAD]: 'sync-outline',
};

const emerald = (c: SemanticColors) => ({
  bg: c.accentTint.success,
  fg: c.accentText.success,
});

/** Icon + tint for an insight row. Region rows use the confidence tier; the
 *  narrative rows use a warm/positive accent. */
function insightVisual(
  insight: RenderedInsight,
  c: SemanticColors,
): { icon: string; bg: string; fg: string } {
  const warm = { bg: c.action.primaryTint, fg: c.text.accent };
  switch (insight.kind) {
    case 'regionObservation': {
      const tint = tierTint(c)[insight.tier];
      return { icon: insight.region ? REGION_ICON[insight.region] : 'ellipse-outline', ...tint };
    }
    case 'milestone':
      return { icon: 'trophy-outline', ...emerald(c) };
    case 'progress':
      return { icon: 'trending-up-outline', ...emerald(c) };
    case 'arc':
      return { icon: 'pulse-outline', ...warm };
    case 'calm':
      return { icon: 'leaf-outline', ...emerald(c) };
    case 'opening':
    default:
      return { icon: 'sparkles-outline', ...warm };
  }
}

export const SummaryScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useStyles();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();

  const {
    scores, promptsAttempted, nudgeMode, sessionDurationSeconds,
    signalCounts, reflectionText, practiceActivityId, weightTableVersion, packContext,
  } = route.params || {};

  const { user, fetchUser } = useUserStore();
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  useRegisterNativeModal(showFeedbackModal);
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
          encouragement: 'Noticing is the whole game, and you showed up today.',
          caveat: NOT_A_DIAGNOSIS,
        });
      }
    })();
    return () => { cancelled = true; };
    // Route params are stable for this screen's lifetime — build once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleComplete = () => setShowFeedbackModal(true);

  const submitFinalData = async (feedback: { detectionAccuracyRating: number }) => {
    setShowFeedbackModal(false);
    setIsSubmitting(true);
    // Mark completed synchronously (before the await) so the post-completion
    // stack-unwind doesn't re-trigger the confirm-on-exit prompt on Session/Reflection.
    if (practiceActivityId) markMirrorWorkCompleted(practiceActivityId);

    const mirrorWorkPayload = {
      detectedSignals: signalCounts || {},
      awarenessScores: scores || { gazeMaintained: 100, jawEase: 100, lipEase: 100, overallEaseScore: 100 },
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
        showErrorBottomSheet(
          'Could not save your session',
          "Your session has ended. We'll try to sync your data next time.",
        );
      }
    }

    setIsSubmitting(false);
    setIsDone(true);
  };

  // Confirm-on-exit: leaving before submitting feedback prompts to save (opens
  // the feedback modal → completes) or discard. Skips once completed.
  const { exitSheet } = useConfirmOnExit({
    navigation,
    activityId: practiceActivityId,
    isCompleted: () =>
      isDone || showFeedbackModal || wasMirrorWorkCompleted(practiceActivityId),
    onSave: handleComplete,
    family: 'Cognitive',
    packContext,
  });

  if (isDone) {
    return <DonePractice practiceName="Mirror Work" />;
  }

  const formatDuration = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const tones = toneStyle(colors);
  const tone = reflection ? tones[reflection.tone] : tones.calm;

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={[colors.surface.default, mix(colors.surface.default, colors.action.primary, 0.06), colors.background.canvas]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Background Watermark */}
      <View style={styles.watermarkContainer} pointerEvents="none">
        <Icon
          name="sparkles-outline"
          size={320}
          color={withAlpha(colors.action.primary, 0.35)}
          style={{ opacity: 0.15, transform: [{ rotate: "-15deg" }] }}
        />
      </View>

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Icon name="chevron-back" size={size.icon} color={colors.text.secondary} />
        </TouchableOpacity>
        <Text variant="h3" color={colors.text.primary}>Session Summary</Text>
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
              <Text variant="eyebrow" color={colors.text.secondary} style={styles.heroEyebrow}>
                HOW IT FELT
              </Text>
              <Text variant="h1" color={colors.text.primary} style={styles.heroTitle}>
                {reflection ? reflection.moodLabel : 'Reflecting…'}
              </Text>
              {reflection ? (
                <Text variant="body" color={colors.text.primary} style={styles.heroSubtitle}>
                  {reflection.encouragement}
                </Text>
              ) : null}
            </View>
            <View style={[styles.heroRingPlaceholder, { borderColor: tone.tint }]}>
              <MaterialCommunityIcons
                name={reflection ? TONE_FACE[reflection.tone] : TONE_FACE.calm}
                size={44}
                color={tone.tint}
              />
            </View>
          </LinearGradient>
        </View>

        {/* Session line — a quiet, non-clinical anchor. Progress lives in the
            reflection below, where the engine owns the (reviewed) wording. */}
        <View style={styles.metaRow}>
          <Icon name="time-outline" size={size.iconSm} color={colors.text.accent} />
          <Text variant="title" color={colors.text.primary}>
            {formatDuration(sessionDurationSeconds || 0)}
          </Text>
          <Text variant="bodySm" color={colors.text.secondary}>in the mirror</Text>
        </View>

        {/* Reflection (insights) */}
        <View style={styles.card}>
          <Text variant="h3" color={colors.text.primary}>What we noticed</Text>
          {!reflection ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={colors.action.primary} />
              <Text variant="bodySm" color={colors.text.secondary} style={styles.loadingText}>
                Putting your reflection together…
              </Text>
            </View>
          ) : (
            <View style={styles.signalList}>
              {reflection.insights.map((insight, idx) => {
                const v = insightVisual(insight, colors);
                return (
                  <View key={`${insight.kind}-${idx}`} style={styles.signalRow}>
                    <View style={[styles.signalIconWrap, { backgroundColor: v.bg }]}>
                      <Icon name={v.icon} size={size.iconSm} color={v.fg} />
                    </View>
                    <Text variant="body" color={colors.text.primary} style={styles.signalLabel}>
                      {insight.text}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Footnote (rotated caveat — always NSA-safe) */}
        <Text variant="bodySm" color={colors.text.tertiary} style={styles.footnote}>
          {reflection
            ? reflection.caveat
            : NOT_A_DIAGNOSIS}
        </Text>

        <TouchableOpacity
          style={styles.primaryButtonShadow}
          activeOpacity={0.9}
          onPress={handleComplete}
          disabled={isSubmitting}
        >
          <Gradient
            token="brand"
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primaryButtonGradient}
          >
            {/* Dark ink on the orange fill (7.71:1). White here is 2.2:1 — the
                same dark-on-bright rule the rest of the app follows. */}
            <Text variant="h3" color={colors.action.onPrimary}>
              {isSubmitting ? 'Saving…' : 'Continue'}
            </Text>
          </Gradient>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showFeedbackModal} animationType="slide" transparent>
        <MirrorWorkFeedbackModal
          onSubmit={submitFinalData}
          onClose={() => setShowFeedbackModal(false)}
        />
      </Modal>

      {exitSheet}
    </View>
  );
};

// Legacy `theme.shadow.elevation1/2` resolved values, inlined verbatim so the
// visuals stay identical while the app/Theme dependency dies.

const useStyles = makeStyles((c) => {
  // Same geometry as before; the colour now follows the scheme instead of
  // being pinned to the dark set.
  const legacyShadow1 = {
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  } as const;
  const legacyShadow2 = {
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  } as const;
  return {
  screen: {
    flex: 1,
    backgroundColor: c.background.canvas,
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
    paddingHorizontal: spacing.lg,
    paddingBottom: 12,
    zIndex: 10,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: c.surface.control,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: c.border.hairline,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 40,
    zIndex: 1,
  },

  // ── Hero ──
  heroCardShadow: {
    borderRadius: radius.sheet,
    marginBottom: 20,
    backgroundColor: c.surface.default,
    ...legacyShadow1,
    elevation: 2,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.sheet,
    padding: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: c.border.hairline,
  },
  heroLeft: { flex: 1, paddingRight: 12 },
  heroEyebrow: {
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 26,
    letterSpacing: -0.6,
    lineHeight: 32,
  },
  heroSubtitle: {
    marginTop: 8,
  },
  heroRingPlaceholder: {
    width: 84,
    height: 84,
    borderRadius: radius.full,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surface.control,
  },

  // ── Session line ──
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: c.surface.default,
    borderRadius: radius.chip,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: c.border.hairline,
    ...legacyShadow1,
    elevation: 2,
  },

  // ── Cards ──
  card: {
    backgroundColor: c.surface.default,
    borderRadius: radius.sheet,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: c.border.hairline,
    ...legacyShadow1,
    elevation: 2,
  },

  // ── Insight list ──
  signalList: { marginTop: 14 },
  signalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border.hairline,
  },
  signalIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: c.action.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  signalLabel: {
    flex: 1,
    fontWeight: '500',
    lineHeight: 22,
  },

  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  loadingText: {
    marginTop: 12,
  },

  footnote: {
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 24,
    paddingHorizontal: spacing.lg,
  },

  primaryButtonShadow: {
    width: "100%",
    borderRadius: radius.chip,
    backgroundColor: c.surface.default,
    ...legacyShadow2,
    elevation: 4,
  },
  primaryButtonGradient: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 18,
    borderRadius: radius.chip,
  },
  };
});
