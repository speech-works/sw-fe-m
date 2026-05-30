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
  const [calibrationStarted, setCalibrationStarted] = useState(false);

  // Session timer (elapsed seconds)
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const speech = useSpeechDetection();
  const { state: detectionState, frameProcessor } = useFaceDetectionV2(
    isCameraActive,
    // When muted, treat as always silent (skip speech gating entirely)
    isMuted ? () => true : speech.isSilent,
    calibrationStarted,
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
  // Whether the user has already tapped "I'm Ready" (calibration phase started or done)
  const isPreCalibration = !calibrationStarted;

  const handleReadyToCalibrate = useCallback(() => {
    setCalibrationStarted(true);
  }, []);

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
        pixelFormat="yuv"
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

          {/* Out-of-frame / lighting warning — shown in all phases */}
          {(!detectionState.faceInFrame || detectionState.lightingWarning) && (
            <FaceFrameGuard
              faceInFrame={detectionState.faceInFrame}
              lightingWarning={detectionState.lightingWarning}
            />
          )}

          {/* PRE-CALIBRATION: camera is live but user hasn't tapped Ready yet */}
          {isPreCalibration && detectionState.faceInFrame && (
            <View style={styles.preCalibCard}>
              <Text style={styles.preCalibEmoji}>🪞</Text>
              <Text style={styles.preCalibTitle}>Ready to begin?</Text>
              <Text style={styles.preCalibBody}>
                Look straight at the camera with a relaxed expression.{"\n"}We'll spend 15 seconds learning your baseline.
              </Text>
            </View>
          )}

          {/* CALIBRATION: user tapped Ready, progress ring running */}
          {calibrationStarted && isCalibrating && detectionState.faceInFrame && (
            <CalibrationOverlay
              progress={detectionState.calibrationProgress}
              durationSeconds={CALIBRATION_DURATION_S}
              faceInFrame={detectionState.faceInFrame}
            />
          )}

          {/* Calibration overlay when face leaves frame during calibration */}
          {calibrationStarted && isCalibrating && !detectionState.faceInFrame && (
            <CalibrationOverlay
              progress={detectionState.calibrationProgress}
              durationSeconds={CALIBRATION_DURATION_S}
              faceInFrame={false}
            />
          )}

          {/* ACTIVE SESSION: prompt card */}
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

        {/* ── BOTTOM SECTION ── */}
        {/* PRE-CALIBRATION: Big "I'm Ready" CTA */}
        {isPreCalibration && (
          <View style={styles.readyContainer}>
            <TouchableOpacity
              style={[
                styles.readyButton,
                !detectionState.faceInFrame && styles.readyButtonDisabled,
              ]}
              onPress={handleReadyToCalibrate}
              disabled={!detectionState.faceInFrame}
              accessibilityLabel="I'm ready to calibrate"
            >
              <Text style={styles.readyButtonText}>
                {detectionState.faceInFrame ? "I'm Ready" : "Move into frame first"}
              </Text>
            </TouchableOpacity>
            <Text style={styles.readySubtext}>Keep a neutral expression during calibration</Text>
          </View>
        )}

        {/* CALIBRATION: no bottom controls, just let the ring do its thing */}

        {/* ACTIVE SESSION: control bar */}
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
  // ── Pre-calibration ──
  preCalibCard: {
    backgroundColor: 'rgba(15, 15, 20, 0.82)',
    borderRadius: 28,
    paddingVertical: 28,
    paddingHorizontal: 24,
    marginHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 20,
  },
  preCalibEmoji: {
    fontSize: 44,
    marginBottom: 14,
  },
  preCalibTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 10,
    letterSpacing: -0.4,
  },
  preCalibBody: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    lineHeight: 21,
  },
  readyContainer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    alignItems: 'center',
  },
  readyButton: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 20,
    backgroundColor: '#34D399',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#34D399',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
  readyButtonDisabled: {
    backgroundColor: 'rgba(100,100,120,0.6)',
    shadowOpacity: 0,
    elevation: 0,
  },
  readyButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
    letterSpacing: 0.1,
  },
  readySubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
    marginTop: 10,
    letterSpacing: 0.2,
  },
});
