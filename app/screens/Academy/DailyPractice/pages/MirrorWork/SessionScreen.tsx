import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  Platform, StatusBar, Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
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
import { FaceGuide } from './components/FaceGuide';
import { CognitivePromptCard } from './components/CognitivePromptCard';
import { CalibrationOverlay } from './components/CalibrationOverlay';
import { DetectionHUD } from './components/DetectionHUD';
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
  // Dev-only detection HUD (live blendshape values vs thresholds).
  const [showHUD, setShowHUD] = useState(false);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const speech = useSpeechDetection();
  const { state: detectionState, frameProcessor, retryCalibration } = useFaceDetectionV2(
    isCameraActive,
    isMuted ? () => true : speech.isSilent,
    calibrationStarted,
    showHUD,
  );

  const session = useMirrorSession({ prompts });

  // IMPORTANT: All useCallback hooks must be declared BEFORE any conditional returns
  // to avoid a rules-of-hooks violation. (Previously handleReadyToCalibrate was
  // declared after early returns, which crashed when permission/device state flipped.)

  const handleReadyToCalibrate = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCalibrationStarted(true);
  }, []);

  const handleRetryCalibration = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    retryCalibration();
    setCalibrationStarted(false);
    // Re-arm calibration on next tick so the useEffect re-fires
    setTimeout(() => {
      setCalibrationStarted(true);
    }, 50);
  }, [retryCalibration]);

  const handleMuteToggle = useCallback(() => {
    setIsMuted(prev => {
      const nextMuted = !prev;
      if (nextMuted) speech.stopListening();
      else speech.startListening();
      return nextMuted;
    });
  }, [speech]);

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
              weightTableVersion: session.weightTableVersion,
            });
          },
        },
      ]
    );
  }, [elapsedSeconds, session, speech, navigation, practiceActivityId]);

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

  // ── Haptic on calibration complete ──
  const prevIsCalibrating = useRef(true);
  useEffect(() => {
    if (prevIsCalibrating.current && !detectionState.isCalibrating) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    prevIsCalibrating.current = detectionState.isCalibrating;
  }, [detectionState.isCalibrating]);

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

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // ── Early returns (all hooks are declared above) ──

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

  // Detection unavailable = iOS build missing the native frame processor.
  if (detectionState.detectionUnavailable) {
    return (
      <View style={styles.centerContainer}>
        <Icon name="alert-circle-outline" size={48} color="#F59E0B" />
        <Text style={[styles.permissionText, { marginTop: 16, textAlign: 'center', paddingHorizontal: 32 }]}>
          Face detection is not available on this build.{'\n'}
          Run `expo run:ios` on a physical device to enable it.
        </Text>
      </View>
    );
  }

  const isCalibrating = detectionState.isCalibrating;
  const isPreCalibration = !calibrationStarted;

  return (
    <View
      style={styles.container}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setViewSize({ width, height });
      }}
    >
      <StatusBar barStyle="light-content" />

      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isCameraActive}
        frameProcessor={frameProcessor}
        pixelFormat="yuv"
      />

      {/* Face positioning guide — shown during pre-calibration AND calibration.
          Hidden during the active session so it doesn't distract while speaking. */}
      {isCalibrating && viewSize && !detectionState.needsRecalibration && (
        <FaceGuide
          landmarks={detectionState.latestLandmarks}
          imageSize={detectionState.imageSize}
          viewSize={viewSize}
          centerYRatio={0.60}
        />
      )}

      {/* Facial SVG mesh overlay (only after calibration) */}
      {!isCalibrating && detectionState.faceInFrame && viewSize && (
        <FacialOutlines
          landmarks={detectionState.latestLandmarks}
          imageSize={detectionState.imageSize}
          viewSize={viewSize}
          activeSignals={detectionState.activeSignals}
          signalTiers={detectionState.signalTiers}
        />
      )}

      {/* Top + bottom gradient veils for control-bar legibility on bright cameras */}
      {!isCalibrating && (
        <>
          <View style={styles.topGradient} pointerEvents="none" />
          <View style={styles.bottomGradient} pointerEvents="none" />
        </>
      )}

      {!detectionState.faceInFrame && (
        <View style={styles.dimmingOverlay} />
      )}

      {/* ── Dev-only detection HUD + toggle ── */}
      {__DEV__ && (
        <TouchableOpacity
          style={[styles.hudToggle, showHUD && styles.hudToggleActive]}
          onPress={() => setShowHUD((v) => !v)}
          accessibilityLabel="Toggle detection HUD"
        >
          <Icon name="bug" size={16} color={showHUD ? '#22D3EE' : 'rgba(255,255,255,0.6)'} />
        </TouchableOpacity>
      )}
      {__DEV__ && showHUD && !isCalibrating && (
        <DetectionHUD debug={detectionState.debug} />
      )}

      <SafeAreaView style={styles.safeArea}>

        {/* ── TOP SECTION ── */}
        <View style={styles.topContainer}>

          {/* FaceFrameGuard is only shown during the active session — during
              pre-calibration and calibration the FaceGuide oval already gives
              live positioning feedback, so the banner would be redundant. */}
          {!isCalibrating && (!detectionState.faceInFrame || detectionState.lightingWarning) && (
            <FaceFrameGuard
              faceInFrame={detectionState.faceInFrame}
              lightingWarning={detectionState.lightingWarning}
            />
          )}

          {/* PRE-CALIBRATION — always shown during pre-cal so the user has a
              stable reference while moving into position. */}
          {isPreCalibration && (
            <View style={styles.preCalibWrapper}>
              <BlurView intensity={Platform.OS === 'ios' ? 70 : 100} tint="dark" style={styles.preCalibBlur}>
                {/* Decorative watermark */}
                <View style={styles.preCalibWatermark} pointerEvents="none">
                  <Icon name="sparkles" size={140} color="#FFE9A0" />
                </View>

                <View style={styles.preCalibInner}>
                  <View style={styles.preCalibIconCircle}>
                    <Icon name="sparkles-outline" size={26} color="#FFE9A0" />
                  </View>
                  <Text style={styles.preCalibTitle}>Ready to begin?</Text>
                  <Text style={styles.preCalibBody}>
                    Relax your face, look at the camera, and we'll spend 15 seconds learning your baseline.
                  </Text>
                </View>
              </BlurView>
            </View>
          )}

          {/* CALIBRATION IN PROGRESS */}
          {calibrationStarted && isCalibrating && !detectionState.needsRecalibration && (
            <CalibrationOverlay
              progress={detectionState.calibrationProgress}
              durationSeconds={CALIBRATION_DURATION_S}
              faceInFrame={detectionState.faceInFrame}
            />
          )}

          {/* CALIBRATION FAILED — too few face frames collected */}
          {detectionState.needsRecalibration && (
            <View style={styles.recalibWrapper}>
              <BlurView intensity={Platform.OS === 'ios' ? 70 : 100} tint="dark" style={styles.recalibBlur}>
                {/* Decorative watermark */}
                <View style={styles.recalibWatermark} pointerEvents="none">
                  <Icon name="refresh-circle" size={150} color="#FCD34D" />
                </View>

                <View style={styles.recalibInner}>
                  <View style={styles.recalibIconCircle}>
                    <Icon name="refresh-outline" size={26} color="#FCD34D" />
                  </View>
                  <Text style={styles.recalibTitle}>Let's try that again</Text>
                  <Text style={styles.recalibBody}>
                    Your face wasn't in frame long enough. Look straight at the camera and tap below to retry.
                  </Text>
                  <TouchableOpacity style={styles.recalibButton} onPress={handleRetryCalibration}>
                    <Text style={styles.recalibButtonText}>Recalibrate</Text>
                  </TouchableOpacity>
                </View>
              </BlurView>
            </View>
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

        {/* ── MIDDLE: Awareness nudges ── */}
        {!isCalibrating && detectionState.faceInFrame && (
          <AwarenessOverlay
            activeSignals={detectionState.activeSignals}
            newSignals={detectionState.newSignals}
            nudgeMode={session.nudgeMode}
            signalTiers={detectionState.signalTiers}
          />
        )}

        {/* ── BOTTOM SECTION ── */}
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

        {!isCalibrating && !detectionState.needsRecalibration && (
          <View style={styles.bottomSection}>
            {/* Timer pill */}
            <View style={styles.timerWrapper}>
              <BlurView intensity={Platform.OS === 'ios' ? 50 : 90} tint="dark" style={styles.timerPill}>
                <View style={styles.timerDot} />
                <Text style={styles.timerText}>{formatTimer(elapsedSeconds)}</Text>
              </BlurView>
            </View>

            {/* Frosted pill control bar */}
            <View style={styles.controlBarWrapper}>
              <BlurView intensity={Platform.OS === 'ios' ? 60 : 100} tint="dark" style={styles.controlBarBlur}>
                <TouchableOpacity
                  style={[styles.controlButton, isMuted && styles.controlButtonActive]}
                  onPress={handleMuteToggle}
                  accessibilityLabel={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                >
                  <Icon name={isMuted ? 'mic-off' : 'mic-outline'} size={22} color="#FFF" />
                  <Text style={styles.controlLabel}>{isMuted ? 'Muted' : 'Mic'}</Text>
                </TouchableOpacity>

                <View style={styles.controlDivider} />

                <TouchableOpacity
                  style={[styles.controlButton, session.nudgeMode === 'OFF' && styles.controlButtonActive]}
                  onPress={session.toggleNudgeMode}
                  accessibilityLabel={session.nudgeMode === 'ON' ? 'Turn off notes' : 'Turn on notes'}
                >
                  <Icon name={session.nudgeMode === 'ON' ? 'bulb-outline' : 'bulb'} size={22} color="#FFF" />
                  <Text style={styles.controlLabel}>
                    {session.nudgeMode === 'ON' ? 'Notes' : 'Quiet'}
                  </Text>
                </TouchableOpacity>

                <View style={styles.controlDivider} />

                <TouchableOpacity
                  style={styles.endButton}
                  onPress={handleEndSession}
                  accessibilityLabel="End session"
                >
                  <View style={styles.endButtonInner}>
                    <Icon name="stop" size={18} color="#FFF" />
                  </View>
                  <Text style={styles.controlLabel}>End</Text>
                </TouchableOpacity>
              </BlurView>
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
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 220,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  hudToggle: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 40,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 201,
  },
  hudToggleActive: {
    backgroundColor: 'rgba(34, 211, 238, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.5)',
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 240,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  topContainer: {
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 8 : 24,
    zIndex: 50,
  },
  promptWrapper: {
    width: '100%',
  },
  bottomSection: {
    paddingBottom: Platform.OS === 'ios' ? 18 : 22,
    alignItems: 'center',
  },

  // ── Timer pill ──
  timerWrapper: {
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: Platform.OS === 'android' ? 0 : 3,
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: Platform.OS === 'android' ? 'rgba(20,20,26,0.72)' : 'rgba(20,20,26,0.30)',
  },
  timerDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#34D399',
    marginRight: 8,
    shadowColor: '#34D399',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  timerText: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.8,
    fontVariant: ['tabular-nums'],
  },

  // ── Control bar (single frosted pill) ──
  controlBarWrapper: {
    borderRadius: 36,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: Platform.OS === 'android' ? 0 : 4,
  },
  controlBarBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: Platform.OS === 'android' ? 'rgba(18,18,24,0.78)' : 'rgba(18,18,24,0.36)',
  },
  controlButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 24,
    minWidth: 72,
  },
  controlButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  controlDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginHorizontal: 2,
  },
  controlLabel: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 10.5,
    marginTop: 3,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  endButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    minWidth: 72,
  },
  endButtonInner: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },

  // ── Pre-calibration card ──
  preCalibWrapper: {
    marginHorizontal: 16,
    borderRadius: 32,
    overflow: 'hidden',
    // Light shadow — large shadows on Android render as a dark halo around
    // the card that reads as a "thick border" against bright backgrounds.
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: Platform.OS === 'android' ? 0 : 6,
  },
  preCalibBlur: {
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: Platform.OS === 'android' ? 'rgba(12,12,18,0.78)' : 'rgba(12,12,18,0.36)',
  },
  preCalibWatermark: {
    position: 'absolute',
    right: -30,
    bottom: -28,
    opacity: 0.11,
    transform: [{ rotate: '-15deg' }],
    zIndex: 0,
  },
  preCalibInner: {
    paddingVertical: 30,
    paddingHorizontal: 26,
    alignItems: 'center',
    zIndex: 1,
  },
  preCalibIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 233, 160, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  preCalibTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 10,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  preCalibBody: {
    fontSize: 14.5,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.66)',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 290,
  },

  // ── Recalibration card ──
  recalibWrapper: {
    marginHorizontal: 16,
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: Platform.OS === 'android' ? 0 : 6,
  },
  recalibBlur: {
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: Platform.OS === 'android' ? 'rgba(12,12,18,0.82)' : 'rgba(12,12,18,0.38)',
  },
  recalibWatermark: {
    position: 'absolute',
    right: -34,
    top: -30,
    opacity: 0.10,
    transform: [{ rotate: '15deg' }],
    zIndex: 0,
  },
  recalibInner: {
    paddingVertical: 30,
    paddingHorizontal: 26,
    alignItems: 'center',
    zIndex: 1,
  },
  recalibIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(252, 211, 77, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  recalibTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 10,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  recalibBody: {
    fontSize: 14.5,
    color: 'rgba(255,255,255,0.66)',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 290,
    marginBottom: 20,
  },
  recalibButton: {
    paddingVertical: 13,
    paddingHorizontal: 36,
    borderRadius: 999,
    backgroundColor: '#FBBF24',
    shadowColor: '#FBBF24',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
  recalibButtonText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#1F1A0A',
    letterSpacing: 0.3,
  },

  // ── "I'm Ready" CTA ──
  readyContainer: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 14 : 22,
    alignItems: 'center',
  },
  readyButton: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 999,
    backgroundColor: '#34D399',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#34D399',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  readyButtonDisabled: {
    backgroundColor: 'rgba(100,100,120,0.55)',
    shadowOpacity: 0,
    elevation: 0,
  },
  readyButtonText: {
    fontSize: 16.5,
    fontWeight: '700',
    color: '#04220F',
    letterSpacing: 0.2,
  },
  readySubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.40)',
    marginTop: 12,
    letterSpacing: 0.3,
    fontWeight: '500',
  },
});
