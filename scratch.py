import sys

content = """import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MirrorWorkFeedbackModal } from './components/MirrorWorkFeedbackModal';
import { MirrorBehaviorSignal } from './types';
import { completeMirrorWorkActivity } from '../../../../../api/practiceActivities';
import { useUserStore } from '../../../../../stores/user';
import DonePractice from '../../components/DonePractice';
import { theme } from '../../../../../Theme/tokens';
import { parseTextStyle, parseShadowStyle } from '../../../../../util/functions/parseStyles';

// Friendlier signal labels for the user
const SIGNAL_LABELS: Partial<Record<MirrorBehaviorSignal, string>> = {
  [MirrorBehaviorSignal.JAW_TENSION]:           'Jaw tension',
  [MirrorBehaviorSignal.OPEN_MOUTH_HOLD]:       'Open-mouth hold',
  [MirrorBehaviorSignal.LIP_PURSING]:           'Lip pursing',
  [MirrorBehaviorSignal.EYE_BLINKING_STRUGGLE]: 'Eye blinking',
  [MirrorBehaviorSignal.BROW_TENSION]:          'Brow tension',
  [MirrorBehaviorSignal.GAZE_AVERSION]:         'Gaze aversion',
  [MirrorBehaviorSignal.NOSTRIL_FLARE]:         'Nostril flare',
  [MirrorBehaviorSignal.CHEEK_PUFFING]:         'Cheek puffing',
  [MirrorBehaviorSignal.HEAD_JERKING]:          'Head movement',
  [MirrorBehaviorSignal.FACIAL_GRIMACING]:      'Facial strain',
  [MirrorBehaviorSignal.FACIAL_TENSION_COMPOSITE]: 'Multiple cues',
};

const SIGNAL_ICONS: Partial<Record<MirrorBehaviorSignal, string>> = {
  [MirrorBehaviorSignal.JAW_TENSION]:           'happy-outline',
  [MirrorBehaviorSignal.OPEN_MOUTH_HOLD]:       'happy-outline',
  [MirrorBehaviorSignal.LIP_PURSING]:           'happy-outline',
  [MirrorBehaviorSignal.EYE_BLINKING_STRUGGLE]: 'eye-outline',
  [MirrorBehaviorSignal.BROW_TENSION]:          'eye-outline',
  [MirrorBehaviorSignal.GAZE_AVERSION]:         'eye-outline',
  [MirrorBehaviorSignal.NOSTRIL_FLARE]:         'happy-outline',
  [MirrorBehaviorSignal.CHEEK_PUFFING]:         'happy-outline',
  [MirrorBehaviorSignal.HEAD_JERKING]:          'sync-outline',
  [MirrorBehaviorSignal.FACIAL_GRIMACING]:      'happy-outline',
  [MirrorBehaviorSignal.FACIAL_TENSION_COMPOSITE]: 'sparkles-outline',
};

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

  const overallEase = scores?.overallEaseScore ?? 100;
  const easeMood =
    overallEase >= 80 ? { label: 'Mostly at ease', tint: '#10B981', gradient: ['#D1FAE5', '#A7F3D0'] as const }
    : overallEase >= 60 ? { label: 'Some tension', tint: '#F59E0B', gradient: ['#FEF3C7', '#FDE68A'] as const }
    : { label: 'Quite a lot to notice', tint: '#EF4444', gradient: ['#FEE2E2', '#FECACA'] as const };

  const signalEntries = Object.entries(signalCounts || {}) as Array<[MirrorBehaviorSignal, { eventCount: number }]>;
  const sortedSignals = signalEntries.sort((a, b) => b[1].eventCount - a[1].eventCount);

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
        {/* Hero: overall ease mood */}
        <LinearGradient 
          colors={easeMood.gradient} 
          start={{ x: 0, y: 0 }} 
          end={{ x: 1, y: 1 }} 
          style={styles.heroCard}
        >
          <View style={styles.heroLeft}>
            <Text style={styles.heroEyebrow}>OVERALL EASE</Text>
            <Text style={[styles.heroScore, { color: easeMood.tint }]}>
              {overallEase}<Text style={styles.heroScoreUnit}>%</Text>
            </Text>
            <Text style={styles.heroLabel}>{easeMood.label}</Text>
          </View>
          <View style={[styles.heroRingPlaceholder, { borderColor: easeMood.tint }]}>
            <Icon name="happy-outline" size={42} color={easeMood.tint} />
          </View>
        </LinearGradient>

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

        {/* Body-region ease bars */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Where you held tension</Text>
          <Text style={styles.cardSubtitle}>How relaxed each area was, on average.</Text>
          <View style={styles.barsGroup}>
            <EaseBar label="Jaw" score={scores?.jawEase ?? 100} />
            <EaseBar label="Lips" score={scores?.lipEase ?? 100} />
            <EaseBar label="Gaze" score={scores?.gazeMaintained ?? 100} />
          </View>
        </View>

        {/* Observations */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>What we noticed</Text>
          {sortedSignals.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrap}>
                <Icon name="leaf-outline" size={32} color="#10B981" />
              </View>
              <Text style={styles.emptyTitle}>Nothing to note</Text>
              <Text style={styles.emptyText}>
                No tension patterns came up during this session.
              </Text>
            </View>
          ) : (
            <View style={styles.signalList}>
              {sortedSignals.map(([sig, info]) => {
                const label = SIGNAL_LABELS[sig] ?? sig.replace(/_/g, ' ').toLowerCase();
                const iconName = SIGNAL_ICONS[sig] ?? 'ellipse-outline';
                return (
                  <View key={sig} style={styles.signalRow}>
                    <View style={styles.signalIconWrap}>
                      <Icon name={iconName} size={18} color={theme.colors.library.orange[500]} />
                    </View>
                    <Text style={styles.signalLabel}>{label}</Text>
                    <Text style={styles.signalCount}>{info.eventCount}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Footnote */}
        <Text style={styles.footnote}>
          None of this is a diagnosis. It's a mirror with a memory — and noticing is the start of change.
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

const EaseBar: React.FC<{ label: string; score: number }> = ({ label, score }) => {
  const gradient = score > 75 
    ? ['#34D399', '#059669'] as const // Emerald
    : score > 50 
      ? ['#FBBF24', '#D97706'] as const // Amber
      : ['#F87171', '#DC2626'] as const; // Red

  const color = score > 75 ? '#10B981' : score > 50 ? '#F59E0B' : '#EF4444';

  return (
    <View style={barStyles.row}>
      <View style={barStyles.labelRow}>
        <Text style={barStyles.label}>{label}</Text>
        <Text style={[barStyles.score, { color }]}>{score}%</Text>
      </View>
      <View style={barStyles.track}>
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[barStyles.fill, { width: `${score}%` }]}
        />
      </View>
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
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 28,
    padding: 24,
    marginBottom: 20,
    ...parseShadowStyle(theme.shadow.elevation1),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  heroLeft: { flex: 1 },
  heroEyebrow: {
    ...parseTextStyle(theme.typography.BodySmall),
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  heroScore: {
    fontSize: 56,
    fontWeight: '800',
    letterSpacing: -2,
    lineHeight: 60,
  },
  heroScoreUnit: {
    fontSize: 22,
    fontWeight: '700',
  },
  heroLabel: {
    ...parseTextStyle(theme.typography.Body),
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 2,
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
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    ...parseShadowStyle(theme.shadow.elevation1),
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
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 28,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    ...parseShadowStyle(theme.shadow.elevation1),
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
  barsGroup: { gap: 18 },

  // ── Signal list ──
  signalList: { marginTop: 14 },
  signalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
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
    fontWeight: '600',
  },
  signalCount: {
    ...parseTextStyle(theme.typography.Heading3),
    color: '#0F172A',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    color: '#0F172A',
    marginBottom: 6,
  },
  emptyText: {
    ...parseTextStyle(theme.typography.Body),
    color: '#6B7280',
    textAlign: 'center',
    maxWidth: 260,
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
    ...parseShadowStyle(theme.shadow.elevation2),
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

const barStyles = StyleSheet.create({
  row: {},
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    ...parseTextStyle(theme.typography.Body),
    color: '#374151',
    fontWeight: '600',
  },
  score: {
    ...parseTextStyle(theme.typography.Body),
    fontWeight: '700',
  },
  track: {
    height: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 6,
  },
});
"""

with open("/Users/mayankav/Documents/speechworks-2/sw-fe-m-2/app/screens/Academy/DailyPractice/pages/MirrorWork/SummaryScreen.tsx", "w") as f:
    f.write(content)

print("Done")
