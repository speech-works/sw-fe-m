import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  Platform, StatusBar, Alert, Animated,
} from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useKeepAwake } from 'expo-keep-awake';
import { useFaceDetectionV2 } from './hooks/useFaceDetectionV2';
import { useMirrorSession } from './hooks/useMirrorSession';
import { useSpeechDetection } from './hooks/useSpeechDetection';
import { AwarenessOverlay } from './components/AwarenessOverlay';
import { FaceFrameGuard } from './components/FaceFrameGuard';
import { FacialOutlines } from './components/FacialOutlines';
import { CognitivePromptCard } from './components/CognitivePromptCard';
import { CalibrationOverlay } from './components/CalibrationOverlay';
import { MirrorWorkCognitivePrompt } from './types';

const CALIBRATION_DURATION_S = 15;

export const SessionScreen: React.FC = () => {
  useKeepAwake();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const prompts: MirrorWorkCognitivePrompt[] = route.params?.prompts || [
    { id: '1', category: 'Testing', text: 'If you could talk to your younger self, what would you say?' }
  ];
  const practiceActivityId: string | undefined = route.params?.practiceActivityId;

  const device = useCameraDevice('front');
  const { hasPermission, requestPermission } = useCameraPermission();
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [viewSize, setViewSize] = useState<{ width: number; height: number } | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  // Session timer (elapsed seconds)
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const speech = useSpeechDetection();
  const { state: detectionState, frameProcessor } = useFaceDetectionV2(
    isCameraActive,
    // When muted, treat as always silent (skip speech gating entirely)
    isMuted ? () => true : speech.isSilent
  );

  const session = useMirrorSession({ prompts });

  // ── Permissions ──
  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission, requestPermission]);

  // ── Start session when camera + permissions ready ──
  useEffect(() => {
    if (hasPermission && device && !session.isSessionActive) {
      session.startSession();
      setIsCameraActive(true);
      speech.startListening();
    }
  }, [hasPermission, device, session.isSessionActive]);

  // ── Session timer ──
  useEffect(() => {
    if (session.isSessionActive) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session.isSessionActive]);

  // ── Signal recording ──
  useEffect(() => {
    if (detectionState.newSignals.length > 0) {
      session.recordNewSignals(detectionState.newSignals);
    }
  }, [detectionState.newSignals, session.recordNewSignals]);

  useEffect(() => {
    session.recordActiveSignals(detectionState.activeSignals);
  }, [detectionState.activeSignals, session.recordActiveSignals]);

  // ── Mute toggle: wire to speech detection ──
  const handleMuteToggle = useCallback(() => {
    setIsMuted(prev => {
      const nextMuted = !prev;
      if (nextMuted) {
        speech.stopListening();
      } else {
        speech.startListening();
      }
      return nextMuted;
    });
  }, [speech]);

  // ── End session with confirmation ──
  const handleEndSession = useCallback(() => {
    Alert.alert(
      'End Session?',
      'Your progress so far will be saved.',
      [
        { text: 'Keep Going', style: 'cancel' },
        {
          text: 'End Session',
          style: 'destructive',
          onPress: () => {
            if (timerRef.current) clearInterval(timerRef.current);
            setIsCameraActive(false);
            speech.stopListening();
            session.endSession();
            const scores = session.getAwarenessScores();

            navigation.navigate('MirrorWorkReflection', {
              scores,
              promptsAttempted: session.currentPromptIndex + 1,
              nudgeMode: session.nudgeMode,
              sessionDurationSeconds: elapsedSeconds,
              signalCounts: session.signalCounts,
              practiceActivityId,
            });
          },
        },
      ]
    );
  }, [elapsedSeconds, session, speech, navigation, practiceActivityId]);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (!hasPermission) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.permissionText}>Camera permission is required.</Text>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.permissionText}>No front camera found.</Text>
      </View>
    );
  }

  const isCalibrating = detectionState.isCalibrating;

  return (
    <View
      style={styles.container}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setViewSize({ width, height });
      }}
    >
      <StatusBar barStyle="light-content" />

      {/* Full Screen Camera */}
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isCameraActive}
        frameProcessor={frameProcessor}
        pixelFormat={Platform.OS === 'android' ? 'rgb' : 'yuv'}
      />

      {/* Facial SVG mesh overlay (only after calibration) */}
      {!isCalibrating && detectionState.faceInFrame && viewSize && (
        <FacialOutlines
          landmarks={detectionState.latestLandmarks}
          viewSize={viewSize}
          activeSignals={detectionState.activeSignals}
        />
      )}

      {/* Dimming overlay when not in frame */}
      {!detectionState.faceInFrame && (
        <View style={styles.dimmingOverlay} />
      )}

      <SafeAreaView style={styles.safeArea}>

        {/* ── TOP SECTION ── */}
        <View style={styles.topContainer}>

          {/* Out-of-frame / lighting warning */}
          {(!detectionState.faceInFrame || detectionState.lightingWarning) && (
            <FaceFrameGuard
              faceInFrame={detectionState.faceInFrame}
              lightingWarning={detectionState.lightingWarning}
            />
          )}

          {/* Calibration overlay — replaces the old tiny badge */}
          {isCalibrating && detectionState.faceInFrame && (
            <CalibrationOverlay
              progress={detectionState.calibrationProgress}
              durationSeconds={CALIBRATION_DURATION_S}
              faceInFrame={detectionState.faceInFrame}
            />
          )}

          {/* Calibration overlay when face leaves frame during calibration */}
          {isCalibrating && !detectionState.faceInFrame && (
            <CalibrationOverlay
              progress={detectionState.calibrationProgress}
              durationSeconds={CALIBRATION_DURATION_S}
              faceInFrame={false}
            />
          )}

          {/* Active session: prompt card */}
          {!isCalibrating && detectionState.faceInFrame && session.currentPrompt && (
            <View style={styles.promptWrapper}>
              <CognitivePromptCard
                prompt={session.currentPrompt}
                currentIndex={session.currentPromptIndex}
                totalCount={prompts.length}
                onNext={session.nextPrompt}
              />
            </View>
          )}
        </View>

        {/* ── MIDDLE: Awareness nudges (not overlapping prompt) ── */}
        {!isCalibrating && detectionState.faceInFrame && (
          <AwarenessOverlay
            activeSignals={detectionState.activeSignals}
            newSignals={detectionState.newSignals}
            nudgeMode={session.nudgeMode}
          />
        )}

        {/* ── BOTTOM SECTION: Controls ── */}
        {!isCalibrating && (
          <View style={styles.bottomSection}>
            {/* Timer */}
            <View style={styles.timerRow}>
              <Icon name="ellipse" size={8} color="#34D399" style={styles.timerDot} />
              <Text style={styles.timerText}>{formatTimer(elapsedSeconds)}</Text>
            </View>

            {/* Control Bar */}
            <View style={styles.controlBar}>
              <TouchableOpacity
                style={[styles.controlButton, isMuted && styles.controlButtonActive]}
                onPress={handleMuteToggle}
                accessibilityLabel={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                <Icon name={isMuted ? 'mic-off' : 'mic'} size={24} color="#FFF" />
                <Text style={styles.controlLabel}>{isMuted ? 'Muted' : 'Mute'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.controlButton, session.nudgeMode === 'OFF' && styles.controlButtonActive]}
                onPress={session.toggleNudgeMode}
                accessibilityLabel={session.nudgeMode === 'ON' ? 'Turn off notes' : 'Turn on notes'}
              >
                <Icon name={session.nudgeMode === 'ON' ? 'bulb' : 'bulb-outline'} size={24} color="#FFF" />
                <Text style={styles.controlLabel}>
                  {session.nudgeMode === 'ON' ? 'Notes ON' : 'Notes OFF'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.controlButton}
                onPress={session.nextPrompt}
                accessibilityLabel="Next question"
              >
                <Icon name="chevron-forward" size={24} color="#FFF" />
                <Text style={styles.controlLabel}>Next Q</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.controlButton, styles.endButton]}
                onPress={handleEndSession}
                accessibilityLabel="End session"
              >
                <Icon name="stop" size={24} color="#FFF" />
                <Text style={styles.controlLabel}>End</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  permissionText: {
    color: '#FFF',
    fontSize: 16,
  },
  dimmingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  topContainer: {
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 10 : 30,
    zIndex: 50,
  },
  promptWrapper: {
    width: '100%',
  },
  bottomSection: {
    paddingBottom: 12,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  timerDot: {
    marginRight: 6,
  },
  timerText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
    fontVariant: ['tabular-nums'],
  },
  controlBar: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  controlButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(40, 40, 50, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  controlButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  endButton: {
    backgroundColor: '#DC2626',
  },
  controlLabel: {
    color: '#FFF',
    fontSize: 11,
    marginTop: 5,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
