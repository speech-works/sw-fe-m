import React, { useRef, useState, useEffect } from 'react';
import { View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  Page,
  Button,
  Surface,
  Text,
  Icon,
  useTheme,
  makeStyles,
  spacing,
  space,
  radius,
} from '../../../../../design-system';
import { MirrorWorkData } from './types';
import { selectSessionPrompts } from './util/promptSelection';
import { loadSeenOpeners, recordSeenOpener } from './util/promptSelectionStorage';
import { useMarkActivityStart } from '../../../../../hooks/useMarkActivityStart';
import { getCognitivePracticeByType } from '../../../../../api/dailyPractice';
import { CognitivePracticeType } from '../../../../../api/dailyPractice/types';
import { PracticeActivityContentType } from '../../../../../api/practiceActivities/types';

/**
 * Confidence-cue colours. These MUST mirror the in-session `AwarenessOverlay`
 * (a protected zone, still on literals): this legend explains those exact
 * on-screen colours, so tokenising them here would make the legend lie. Migrate
 * the two together when the session overlay moves to the design system.
 */
const CUE_LEGEND = [
  {
    key: 'firm',
    label: 'Firm observation',
    desc:
      "High-confidence cues like lip pressing or jaw tension. We're quite sure we saw it.",
    fill: 'rgba(255, 122, 51, 0.25)',
    border: 'rgba(255, 122, 51, 0.80)',
    dashed: false,
  },
  {
    key: 'soft',
    label: 'Soft observation',
    desc:
      "Subtler cues — brow tension, cheek puffing. We'll phrase these gently because they're harder to detect precisely.",
    fill: 'rgba(230, 180, 80, 0.15)',
    border: 'rgba(230, 180, 80, 0.60)',
    dashed: true,
  },
  {
    key: 'head',
    label: 'Head movement',
    desc:
      "Gaze shifts and head movements. These are informational — they don't affect your overall score.",
    fill: 'rgba(147, 112, 219, 0.20)',
    border: 'rgba(147, 112, 219, 0.70)',
    dashed: false,
  },
] as const;

export const PrepScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();
  const styles = useStyles();
  // Mirror Work = the "success" (green) accent from the Cognitive Practice list.
  const accentColor = colors.accent.success;
  const onAccentColor = colors.accentOn.success;

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
    <Page
      title={practiceData.name || 'Mirror Work'}
      onBack={() => navigation.goBack()}
      description={
        practiceData.description ||
        'Speak to your camera and notice what your body does. No scores, no performance — just observation.'
      }
      footer={
        <Button
          label="Start practice"
          variant="primary"
          onPress={handleStart}
          accentColor={accentColor}
          onAccentColor={onAccentColor}
        />
      }
    >
      {/* Two-up bento: privacy + gentle-notes reassurance. */}
      <View style={styles.bentoGrid}>
        <Surface level="elevated" rounded="card" padded={spacing.xl} style={styles.bentoCard}>
          <View style={styles.watermark} pointerEvents="none">
            <Icon name="shield" size={80} color={colors.accent.success} />
          </View>
          <Text variant="title" color="primary">100% Private</Text>
          <Text variant="bodySm" color="secondary" style={styles.bentoDesc}>
            On-device only. No video is recorded or sent.
          </Text>
        </Surface>

        <Surface level="elevated" rounded="card" padded={spacing.xl} style={styles.bentoCard}>
          <View style={styles.watermark} pointerEvents="none">
            <Icon name="lightbulb" size={80} color={colors.accent.info} />
          </View>
          <Text variant="title" color="primary">Gentle Notes</Text>
          <Text variant="bodySm" color="secondary" style={styles.bentoDesc}>
            Non-intrusive feedback as it happens.
          </Text>
        </Surface>
      </View>

      {/* What to expect — timeline of gentle framing. */}
      <View style={styles.section}>
        <Text variant="h2" color="primary" style={styles.sectionHeader}>
          What to expect
        </Text>
        <View style={styles.timeline}>
          {mirrorWorkData.tips.map((tip, index) => (
            <View key={index} style={styles.timelineItem}>
              <View style={styles.timelineTrack}>
                <View style={styles.timelineDot} />
                {index !== mirrorWorkData.tips.length - 1 && (
                  <View style={styles.timelineLine} />
                )}
              </View>
              <View style={styles.timelineContent}>
                <Text variant="body" color="secondary">{tip}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Confidence legend (spec §5.4) — swatch colours mirror AwarenessOverlay. */}
      <View style={styles.section}>
        <Text variant="h2" color="primary" style={styles.sectionHeader}>
          How notes work
        </Text>
        <Text variant="body" color="secondary" style={styles.legendIntro}>
          When we notice something, a gentle note appears on screen. Different
          colors tell you how sure we are:
        </Text>

        {CUE_LEGEND.map((row) => (
          <View key={row.key} style={styles.legendRow}>
            <View
              style={[
                styles.legendSwatch,
                {
                  backgroundColor: row.fill,
                  borderColor: row.border,
                  borderStyle: row.dashed ? 'dashed' : 'solid',
                },
              ]}
            />
            <View style={styles.legendTextGroup}>
              <Text variant="title" color="primary">{row.label}</Text>
              <Text variant="bodySm" color="secondary">{row.desc}</Text>
            </View>
          </View>
        ))}

        <Text variant="caption" color="tertiary" center style={styles.legendFootnote}>
          None of this is a diagnosis. It's just a mirror with a memory.
        </Text>
      </View>
    </Page>
  );
};

const useStyles = makeStyles((c) => ({
  bentoGrid: {
    flexDirection: 'row',
    gap: space.groupGap,
    marginTop: space.sectionGap,
  },
  bentoCard: {
    flex: 1,
    overflow: 'hidden',
  },
  watermark: {
    position: 'absolute',
    right: -spacing.lg,
    top: -spacing.lg,
    opacity: 0.16,
    transform: [{ rotate: '15deg' }],
  },
  bentoDesc: {
    marginTop: spacing.xs,
  },
  section: {
    marginTop: space.sectionGap,
  },
  sectionHeader: {
    marginBottom: space.groupGap,
  },
  timeline: {
    paddingLeft: spacing.xs,
  },
  timelineItem: {
    flexDirection: 'row',
  },
  timelineTrack: {
    alignItems: 'center',
    width: spacing.xl,
    marginRight: space.iconText,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: c.accent.success,
    marginTop: spacing.sm,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: c.border.default,
    marginTop: spacing.xs,
    marginBottom: -spacing.xs,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: spacing['3xl'],
  },
  legendIntro: {
    marginBottom: space.groupGap,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: space.groupGap,
  },
  legendSwatch: {
    width: spacing.xl,
    height: spacing.xl,
    borderRadius: radius.sm,
    marginTop: spacing.xxs,
    marginRight: spacing.md,
    borderWidth: 2,
  },
  legendTextGroup: {
    flex: 1,
    gap: space.titleSub,
  },
  legendFootnote: {
    marginTop: spacing.sm,
  },
}));

export default PrepScreen;
