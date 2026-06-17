import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '../../../../../components/Button';
import { theme } from '../../../../../Theme/tokens';
import { parseTextStyle, parseShadowStyle } from '../../../../../util/functions/parseStyles';
import { MirrorWorkData } from './types';
import { selectSessionPrompts } from './util/promptSelection';
import { loadSeenOpeners, recordSeenOpener } from './util/promptSelectionStorage';
import { useMarkActivityStart } from '../../../../../hooks/useMarkActivityStart';
import { getCognitivePracticeByType } from '../../../../../api/dailyPractice';
import { CognitivePracticeType } from '../../../../../api/dailyPractice/types';
import { PracticeActivityContentType } from '../../../../../api/practiceActivities/types';

export const PrepScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = 60;
  
  const practiceData = route.params?.practiceData || {};
  const mirrorWorkData: MirrorWorkData = practiceData.mirrorWorkData || {
    tips: [
      "This isn't a performance. There's no audience, no score, no right answer.",
      "If you see a gentle note appear on screen, it's pointing out something your body is doing. You don't have to act on it — just notice it.",
      "Speak at whatever pace feels right. Silences are fine. There's no timer pushing you forward."
    ],
    cognitivePrompts: [
      { id: '1', category: 'Reflection', text: 'What is one thing you are looking forward to today?' },
      { id: '2', category: 'Reflection', text: 'If you could talk to your younger self, what would you say?' },
      { id: '3', category: 'Awareness', text: 'Describe a moment this week when you felt most like yourself.' },
      { id: '4', category: 'Awareness', text: 'What is something small you are proud of recently?' },
      { id: '5', category: 'Reflection', text: 'What does a good day look like for you?' },
    ],
    focusAreas: []
  };


  const packContext = route.params?.packContext;
  const initialActivity = route.params?.practiceActivity;

  // The MIRROR_WORK cognitive-practice content id — used ONLY as the activity's
  // contentId for create/start. The prep copy + prompts above stay unchanged.
  const [cognitivePracticeId, setCognitivePracticeId] = useState<string | null>(
    initialActivity?.cognitivePractice?.id ??
      practiceData?.cognitivePractice?.id ??
      null,
  );
  const [currentActivityId, setCurrentActivityId] = useState<string | null>(
    initialActivity?.id ?? null,
  );

  // Standalone: resolve the contentId from the server (single seeded row),
  // honoring a recommendation override. Pack: the id already came in via the
  // pre-started activity, so skip the fetch.
  useEffect(() => {
    if (packContext || cognitivePracticeId) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await getCognitivePracticeByType(
          CognitivePracticeType.MIRROR_WORK,
        );
        if (cancelled) return;
        const recommendedId = (route.params as any)?.id;
        const target =
          (recommendedId && list.find((c) => c.id === recommendedId)) || list[0];
        setCognitivePracticeId(target?.id ?? null);
      } catch (e) {
        // Non-fatal: Start gracefully degrades (session opens without XP).
        console.warn('[MirrorWorkPrep] content fetch failed:', e);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markActivityStart = useMarkActivityStart({
    contentType: PracticeActivityContentType.COGNITIVE_PRACTICE,
    contentId: cognitivePracticeId ?? undefined,
    initialActivity,
    packContext,
    currentActivityId,
    setActivityId: setCurrentActivityId,
    navigation,
    logTag: 'MirrorWorkPrep',
    trackStart: true,
    // Caller branches on the thrown error (stamina upsell); preserve throw.
    rethrowErrors: true,
  });

  // Guards against a double-tap firing two navigations during the async load.
  const startingRef = useRef(false);
  const handleStart = async () => {
    if (startingRef.current) return;
    startingRef.current = true;
    try {
      // Reserve the activity (free-task/stamina) and get its id. On a stamina
      // block we stop here (the API layer already showed the upsell). On ANY
      // other failure we still open the session without gamification, so Mirror
      // Work is never less functional than before this wiring existed.
      let activityId: string | null = null;
      try {
        activityId = await markActivityStart();
      } catch (e: any) {
        if (e?.response?.data?.errorCode === 'INSUFFICIENT_STAMINA') return;
        console.warn('[MirrorWorkPrep] start failed; opening session ungamified:', e);
      }

      // Pick a fresh opener + theme-varied prompts so the session isn't the same
      // every time. Falls back to the raw list if selection yields nothing.
      const seen = await loadSeenOpeners();
      const { prompts, openerId } = selectSessionPrompts(
        mirrorWorkData.cognitivePrompts,
        seen,
      );
      recordSeenOpener(openerId).catch(() => {});
      navigation.navigate('MirrorWorkSession', {
        prompts: prompts.length ? prompts : mirrorWorkData.cognitivePrompts,
        practiceActivityId: activityId ?? undefined,
        packContext,
      });
    } finally {
      // Re-enable after a beat so a failed navigation can be retried, while
      // rapid double-taps during the await are dropped.
      setTimeout(() => { startingRef.current = false; }, 1000);
    }
  };

  return (
    <View style={styles.screenView}>
      <BlurView
        intensity={80}
        tint="light"
        style={[
          styles.headerBar,
          { paddingTop: insets.top + 10, height: HEADER_HEIGHT + insets.top },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="chevron-left" size={16} color={theme.colors.text.title} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{practiceData.name || "Mirror Work"}</Text>
        <View style={{ width: 32 }} />
      </BlurView>

      <ScrollView 
        style={styles.container} 
        contentContainerStyle={[
          styles.content,
          { paddingTop: HEADER_HEIGHT + insets.top + 20 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>{practiceData.name || "Mirror Work"}</Text>
          <Text style={styles.heroDescription}>
            {practiceData.description || "Speak to your camera and notice what your body does. No scores, no performance — just observation."}
          </Text>
        </View>

        <View style={styles.bentoGrid}>
          <View style={[styles.bentoCard, styles.bentoCardLeft]}>
            <View style={styles.bentoWatermark} pointerEvents="none">
              <Icon name="shield-alt" size={80} color="#10B981" />
            </View>
            <View style={styles.bentoContent}>
              <Text style={styles.bentoTitle}>100% Private</Text>
              <Text style={styles.bentoDesc}>On-device only. No video is recorded or sent.</Text>
            </View>
          </View>

          <View style={[styles.bentoCard, styles.bentoCardRight]}>
            <View style={styles.bentoWatermark} pointerEvents="none">
              <Icon name="lightbulb" size={80} color="#3B82F6" />
            </View>
            <View style={styles.bentoContent}>
              <Text style={styles.bentoTitle}>Gentle Notes</Text>
              <Text style={styles.bentoDesc}>Non-intrusive feedback as it happens.</Text>
            </View>
          </View>
        </View>

        <View style={styles.timelineSection}>
          <Text style={styles.sectionHeader}>What to expect</Text>
          <View style={styles.timelineContainer}>
            {mirrorWorkData.tips.map((tip, index) => (
              <View key={index} style={styles.timelineItem}>
                <View style={styles.timelineTrack}>
                  <View style={styles.timelineDot} />
                  {index !== mirrorWorkData.tips.length - 1 && (
                    <View style={styles.timelineLine} />
                  )}
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineText}>{tip}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ── Confidence legend (spec §5.4) ── */}
        <View style={styles.legendSection}>
          <Text style={styles.sectionHeader}>How notes work</Text>
          <Text style={styles.legendIntro}>
            When we notice something, a gentle note appears on screen. Different colors tell you how sure we are:
          </Text>

          <View style={styles.legendRow}>
            <View style={[styles.legendSwatch, styles.legendSwatchHigh]} />
            <View style={styles.legendTextGroup}>
              <Text style={styles.legendLabel}>Firm observation</Text>
              <Text style={styles.legendDesc}>
                High-confidence cues like lip pressing or jaw tension. We&apos;re quite sure we saw it.
              </Text>
            </View>
          </View>

          <View style={styles.legendRow}>
            <View style={[styles.legendSwatch, styles.legendSwatchSoft]} />
            <View style={styles.legendTextGroup}>
              <Text style={styles.legendLabel}>Soft observation</Text>
              <Text style={styles.legendDesc}>
                Subtler cues — brow tension, cheek puffing. We&apos;ll phrase these gently because they&apos;re harder to detect precisely.
              </Text>
            </View>
          </View>

          <View style={styles.legendRow}>
            <View style={[styles.legendSwatch, styles.legendSwatchHead]} />
            <View style={styles.legendTextGroup}>
              <Text style={styles.legendLabel}>Head movement</Text>
              <Text style={styles.legendDesc}>
                Gaze shifts and head movements. These are informational — they don&apos;t affect your overall score.
              </Text>
            </View>
          </View>

          <Text style={styles.legendFootnote}>
            None of this is a diagnosis. It&apos;s just a mirror with a memory.
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <Button text="Start practice" onPress={handleStart} style={styles.startButton} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screenView: {
    flex: 1,
    backgroundColor: '#FAFAFA', // Soft off-white for a cleaner look
  },
  headerBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.6)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  headerTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
    marginTop: 2,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  heroSection: {
    marginBottom: 40,
  },
  heroTitle: {
    ...parseTextStyle(theme.typography.Heading1),
    fontSize: 34,
    color: '#111827', // Gray 900
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  heroDescription: {
    ...parseTextStyle(theme.typography.Body),
    fontSize: 17,
    color: '#4B5563', // Gray 600
    lineHeight: 26,
  },
  bentoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  bentoCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB', // Gray 200
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
    overflow: 'hidden',
  },
  bentoCardLeft: {
    marginRight: 8,
  },
  bentoCardRight: {
    marginLeft: 8,
  },
  bentoWatermark: {
    position: 'absolute',
    right: -15,
    top: -15,
    opacity: 0.1,
    transform: [{ rotate: "15deg" }],
    zIndex: 0,
  },
  bentoContent: {
    zIndex: 1,
  },
  bentoTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    fontSize: 16,
    color: '#111827',
    marginBottom: 6,
  },
  bentoDesc: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: '#6B7280',
    lineHeight: 20,
  },
  timelineSection: {
    marginBottom: 16,
  },
  sectionHeader: {
    ...parseTextStyle(theme.typography.Heading2),
    fontSize: 22,
    color: '#111827',
    marginBottom: 24,
  },
  timelineContainer: {
    paddingLeft: 4,
  },
  timelineItem: {
    flexDirection: 'row',
  },
  timelineTrack: {
    alignItems: 'center',
    width: 20,
    marginRight: 16,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3B82F6',
    marginTop: 7,
    zIndex: 2,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E5E7EB',
    marginTop: 4,
    marginBottom: -4,
    zIndex: 1,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 32,
  },
  timelineText: {
    ...parseTextStyle(theme.typography.Body),
    fontSize: 16,
    color: '#374151', // Gray 700
    lineHeight: 24,
  },
  // ── Confidence legend ──
  legendSection: {
    marginBottom: 16,
  },
  legendIntro: {
    ...parseTextStyle(theme.typography.Body),
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
    marginBottom: 20,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  legendSwatch: {
    width: 20,
    height: 20,
    borderRadius: 6,
    marginTop: 2,
    marginRight: 14,
    borderWidth: 2,
  },
  legendSwatchHigh: {
    backgroundColor: 'rgba(255, 122, 51, 0.25)',
    borderColor: 'rgba(255, 122, 51, 0.80)',
  },
  legendSwatchSoft: {
    backgroundColor: 'rgba(230, 180, 80, 0.15)',
    borderColor: 'rgba(230, 180, 80, 0.60)',
    borderStyle: 'dashed',
  },
  legendSwatchHead: {
    backgroundColor: 'rgba(147, 112, 219, 0.20)',
    borderColor: 'rgba(147, 112, 219, 0.70)',
  },
  legendTextGroup: {
    flex: 1,
  },
  legendLabel: {
    ...parseTextStyle(theme.typography.Heading3),
    fontSize: 15,
    color: '#111827',
    marginBottom: 2,
  },
  legendDesc: {
    ...parseTextStyle(theme.typography.BodySmall),
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  legendFootnote: {
    ...parseTextStyle(theme.typography.BodySmall),
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },
  footer: {
    padding: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
  },
  startButton: {
    borderRadius: 20,
    ...parseShadowStyle(theme.shadow.elevation1),
  },
});

