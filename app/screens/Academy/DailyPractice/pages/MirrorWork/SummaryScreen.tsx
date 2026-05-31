import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MirrorWorkFeedbackModal } from './components/MirrorWorkFeedbackModal';
import { MirrorBehaviorSignal } from './types';
import { completeMirrorWorkActivity } from '../../../../../api/practiceActivities';
import { useUserStore } from '../../../../../stores/user';
import DonePractice from '../../components/DonePractice';

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
    overallEase >= 80 ? { label: 'Mostly at ease', tint: '#10B981', bg: '#ECFDF5' }
    : overallEase >= 60 ? { label: 'Some tension', tint: '#F59E0B', bg: '#FFFBEB' }
    : { label: 'Quite a lot to notice', tint: '#EF4444', bg: '#FEF2F2' };

  const signalEntries = Object.entries(signalCounts || {}) as Array<[MirrorBehaviorSignal, { eventCount: number }]>;
  const sortedSignals = signalEntries.sort((a, b) => b[1].eventCount - a[1].eventCount);

  return (
    <View style={styles.screen}>
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
        <View style={[styles.heroCard, { backgroundColor: easeMood.bg }]}>
          <View style={styles.heroLeft}>
            <Text style={styles.heroEyebrow}>OVERALL EASE</Text>
            <Text style={[styles.heroScore, { color: easeMood.tint }]}>{overallEase}<Text style={styles.heroScoreUnit}>%</Text></Text>
            <Text style={styles.heroLabel}>{easeMood.label}</Text>
          </View>
          <View style={[styles.heroRingPlaceholder, { borderColor: easeMood.tint }]}>
            <Icon name="happy-outline" size={42} color={easeMood.tint} />
          </View>
        </View>

        {/* Quick stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Icon name="time-outline" size={20} color="#6B7280" />
            <Text style={styles.statValue}>{formatDuration(sessionDurationSeconds || 0)}</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
          <View style={styles.statBox}>
            <Icon name="chatbubbles-outline" size={20} color="#6B7280" />
            <Text style={styles.statValue}>{promptsAttempted || 0}</Text>
            <Text style={styles.statLabel}>Prompts</Text>
          </View>
          <View style={styles.statBox}>
            <Icon name={nudgeMode === 'OFF' ? 'volume-mute-outline' : 'bulb-outline'} size={20} color="#6B7280" />
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
              <Icon name="leaf-outline" size={32} color="#10B981" />
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
                      <Icon name={iconName} size={18} color="#F97316" />
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
          style={styles.primaryButton}
          onPress={handleComplete}
          disabled={isSubmitting}
        >
          <Text style={styles.primaryButtonText}>{isSubmitting ? 'Saving…' : 'Continue'}</Text>
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
  const color = score > 75 ? '#10B981' : score > 50 ? '#F59E0B' : '#EF4444';
  return (
    <View style={barStyles.row}>
      <View style={barStyles.labelRow}>
        <Text style={barStyles.label}>{label}</Text>
        <Text style={[barStyles.score, { color }]}>{score}%</Text>
      </View>
      <View style={barStyles.track}>
        <View style={[barStyles.fill, { width: `${score}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 32,
  },

  // ── Hero ──
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 28,
    padding: 24,
    marginBottom: 20,
    overflow: 'hidden',
  },
  heroLeft: { flex: 1 },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  heroScore: {
    fontSize: 56,
    fontWeight: '700',
    letterSpacing: -2,
    lineHeight: 60,
  },
  heroScoreUnit: {
    fontSize: 22,
    fontWeight: '600',
  },
  heroLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 2,
  },
  heroRingPlaceholder: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.55)',
  },

  // ── Stats row ──
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 6,
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },

  // ── Cards ──
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontSize: 13.5,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 18,
    lineHeight: 19,
  },
  barsGroup: { gap: 16 },

  // ── Signal list ──
  signalList: { marginTop: 14 },
  signalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  signalIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF1E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  signalLabel: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '500',
  },
  signalCount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 10,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },

  footnote: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 20,
    lineHeight: 18,
    paddingHorizontal: 12,
  },

  primaryButton: {
    backgroundColor: '#F97316',
    paddingVertical: 17,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

const barStyles = StyleSheet.create({
  row: {},
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  score: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  track: {
    height: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 5,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 5,
  },
});
