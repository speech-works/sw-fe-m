import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface CalibrationOverlayProps {
  /** Progress 0–1. 1 = complete (triggers exit animation). */
  progress: number;
  /** Total calibration duration in seconds (for countdown display). */
  durationSeconds: number;
  /** Whether the face is in frame (pauses countdown display when false). */
  faceInFrame: boolean;
}

const RING_SIZE = 110;
const STROKE_WIDTH = 7;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const CalibrationOverlay: React.FC<CalibrationOverlayProps> = ({
  progress,
  durationSeconds,
  faceInFrame,
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;
  const strokeOffset = useRef(new Animated.Value(CIRCUMFERENCE)).current;

  // Fade in on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 7,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Animate progress ring
  useEffect(() => {
    const targetOffset = CIRCUMFERENCE * (1 - progress);
    Animated.timing(strokeOffset, {
      toValue: targetOffset,
      duration: 150,
      useNativeDriver: false, // strokeDashoffset not supported on native driver
    }).start();
  }, [progress]);

  const secondsLeft = Math.max(0, Math.ceil(durationSeconds * (1 - progress)));

  const statusText = !faceInFrame
    ? 'Move back into the frame to continue...'
    : secondsLeft > 0
    ? `${secondsLeft}s`
    : 'Done!';

  return (
    <Animated.View
      style={[
        styles.overlay,
        { opacity, transform: [{ scale }] },
      ]}
    >
      {/* Progress Ring */}
      <View style={styles.ringContainer}>
        <Svg width={RING_SIZE} height={RING_SIZE} style={styles.ring}>
          {/* Background track */}
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            stroke="rgba(255,255,255,0.15)"
            strokeWidth={STROKE_WIDTH}
            fill="none"
          />
          {/* Progress arc */}
          <AnimatedCircle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            stroke={faceInFrame ? '#34D399' : '#F59E0B'}
            strokeWidth={STROKE_WIDTH}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={strokeOffset}
            // Rotate -90° so arc starts from the top
            transform={`rotate(-90, ${RING_SIZE / 2}, ${RING_SIZE / 2})`}
          />
        </Svg>
        <View style={styles.ringCenter}>
          <Text style={[styles.countdownText, !faceInFrame && styles.countdownPaused]}>
            {secondsLeft > 0 ? secondsLeft : '✓'}
          </Text>
        </View>
      </View>

      {/* Instructions */}
      <Text style={styles.heading}>Getting to know you</Text>

      {!faceInFrame ? (
        <Text style={styles.pausedText}>
          Move back into the frame to resume calibration.
        </Text>
      ) : (
        <>
          <Text style={styles.instructionPrimary}>
            Keep a relaxed, neutral expression and look straight at the camera.
          </Text>
          <Text style={styles.instructionSecondary}>
            We're learning what your face looks like at rest so we can spot changes during your session.
          </Text>
        </>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(15, 15, 20, 0.82)',
    borderRadius: 28,
    paddingVertical: 28,
    paddingHorizontal: 24,
    marginHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    // Glassmorphism shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 20,
  },
  ringContainer: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  ring: {
    position: 'absolute',
  },
  ringCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownText: {
    fontSize: 30,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  countdownPaused: {
    color: '#F59E0B',
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  instructionPrimary: {
    fontSize: 15,
    fontWeight: '500',
    color: '#E5E7EB',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 10,
  },
  instructionSecondary: {
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    lineHeight: 19,
  },
  pausedText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FCD34D',
    textAlign: 'center',
    lineHeight: 20,
  },
});
