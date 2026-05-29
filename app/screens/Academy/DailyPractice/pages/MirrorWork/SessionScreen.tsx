import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Platform, StatusBar } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useFaceDetection } from './hooks/useFaceDetection';
import { useMirrorSession } from './hooks/useMirrorSession';
import { AwarenessOverlay } from './components/AwarenessOverlay';
import { FaceFrameGuard } from './components/FaceFrameGuard';
import { CognitivePromptCard } from './components/CognitivePromptCard';
import { MirrorWorkCognitivePrompt } from './types';

export const SessionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  
  // Passed from PrepScreen or backend
  const prompts: MirrorWorkCognitivePrompt[] = route.params?.prompts || [
    { id: '1', category: 'Testing', text: 'If you could talk to your younger self, what would you say?' }
  ];

  const device = useCameraDevice('front');
  const { hasPermission, requestPermission } = useCameraPermission();
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const { state: detectionState, frameProcessor } = useFaceDetection(isCameraActive);
  
  const session = useMirrorSession({ prompts });

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  useEffect(() => {
    // Start session when camera is ready
    if (hasPermission && device && !session.isSessionActive) {
      session.startSession();
      setIsCameraActive(true);
    }
  }, [hasPermission, device, session.isSessionActive]);

  // Record discrete new events (for event count in summary)
  useEffect(() => {
    if (detectionState.newSignals.length > 0) {
      session.recordNewSignals(detectionState.newSignals);
    }
  }, [detectionState.newSignals, session.recordNewSignals]);

  // Record active signals for time-based ease score computation
  useEffect(() => {
    session.recordActiveSignals(detectionState.activeSignals);
  }, [detectionState.activeSignals, session.recordActiveSignals]);

  const handleEndSession = () => {
    setIsCameraActive(false);
    session.endSession();
    const scores = session.getAwarenessScores();
    
    // Navigate to Reflection flow
    navigation.navigate('MirrorWorkReflection', {
      scores,
      promptsAttempted: session.currentPromptIndex + 1,
      nudgeMode: session.nudgeMode,
      sessionDurationSeconds: session.sessionDurationSeconds,
      signalCounts: session.signalCounts
    });
  };

  const handleNextPrompt = () => {
    if (session.currentPromptIndex >= prompts.length - 1) {
      handleEndSession();
    } else {
      session.nextPrompt();
    }
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Full Screen Camera */}
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isCameraActive}
        frameProcessor={frameProcessor}
        pixelFormat="yuv"
      />

      {/* Dimming overlay when not in frame */}
      {!detectionState.faceInFrame && (
        <View style={styles.dimmingOverlay} />
      )}

      {/* SafeArea for UI Elements */}
      <SafeAreaView style={styles.safeArea}>
        
        {/* Top Section: Out of Frame Guard & Calibration */}
        <View style={styles.topContainer}>
          {(!detectionState.faceInFrame || detectionState.lightingWarning) && (
            <FaceFrameGuard 
              faceInFrame={detectionState.faceInFrame}
              lightingWarning={detectionState.lightingWarning}
            />
          )}
          {detectionState.isCalibrating && detectionState.faceInFrame && (
            <View style={styles.calibrationBadge}>
              <Text style={styles.calibrationText}>Take a moment to settle in...</Text>
            </View>
          )}
        </View>

        {/* Nudges */}
        {!detectionState.isCalibrating && detectionState.faceInFrame && (
          <AwarenessOverlay 
            activeSignals={detectionState.activeSignals} 
            nudgeMode={session.nudgeMode} 
          />
        )}

        {/* Bottom Section: Prompts and Controls */}
        <View style={styles.bottomSection}>
          {session.currentPrompt && (
            <View style={styles.promptWrapper}>
              <CognitivePromptCard 
                prompt={session.currentPrompt} 
                onNext={handleNextPrompt} 
                isLast={session.currentPromptIndex === prompts.length - 1}
              />
            </View>
          )}

          {/* Google Meet Style Controls */}
          <View style={styles.controlBar}>
            <TouchableOpacity 
              style={[styles.controlButton, isMuted && styles.controlButtonActive]} 
              onPress={() => setIsMuted(!isMuted)}
            >
              <Icon name={isMuted ? "mic-off" : "mic"} size={24} color="#FFF" />
              <Text style={styles.controlLabel}>{isMuted ? "Muted" : "Mute"}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.controlButton, session.nudgeMode === 'OFF' && styles.controlButtonActive]} 
              onPress={session.toggleNudgeMode}
            >
              <Icon name={session.nudgeMode === 'ON' ? "bulb" : "bulb-outline"} size={24} color="#FFF" />
              <Text style={styles.controlLabel}>
                {session.nudgeMode === 'ON' ? "Notes ON" : "Notes OFF"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.controlButton, styles.endButton]} 
              onPress={handleEndSession}
            >
              <Icon name="close" size={24} color="#FFF" />
              <Text style={styles.controlLabel}>End</Text>
            </TouchableOpacity>
          </View>
        </View>

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
  calibrationBadge: {
    backgroundColor: 'rgba(28, 28, 30, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  calibrationText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
  bottomSection: {
    paddingBottom: 20,
  },
  promptWrapper: {
    marginBottom: 20,
  },
  controlBar: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  controlButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(40, 40, 40, 0.8)',
  },
  controlButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  endButton: {
    backgroundColor: '#FF3B30', // Destructive red
  },
  controlLabel: {
    color: '#FFF',
    fontSize: 12,
    marginTop: 6,
    fontWeight: '500',
  },
});
