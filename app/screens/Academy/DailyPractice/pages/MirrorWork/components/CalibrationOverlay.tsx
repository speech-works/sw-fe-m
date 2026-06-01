import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import Icon from 'react-native-vector-icons/Ionicons';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

interface CalibrationOverlayProps {
  /** Progress 0–1. */
  progress: number;
  /** Total calibration duration in seconds. */
  durationSeconds: number;
  /** Whether the face is in frame. */
  faceInFrame: boolean;
}

const RING_SIZE = 132;
const STROKE_WIDTH = 6;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const CalibrationOverlay: React.FC<CalibrationOverlayProps> = ({
  progress,
  durationSeconds,
  faceInFrame,
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.94)).current;
  const strokeOffset = useRef(new Animated.Value(CIRCUMFERENCE)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  // Fade-in
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 7, tension: 90, useNativeDriver: true }),
    ]).start();

    // Subtle breathing pulse on the ring's inner glow
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.04, duration: 1400, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1400, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Animate progress ring
  useEffect(() => {
    const targetOffset = CIRCUMFERENCE * (1 - progress);
    Animated.timing(strokeOffset, {
      toValue: targetOffset,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const secondsLeft = Math.max(0, Math.ceil(durationSeconds * (1 - progress)));
  const done = progress >= 0.999;

  return (
    <Animated.View
      style={[styles.wrapper, { opacity, transform: [{ scale }] }]}
    >
      <BlurView intensity={Platform.OS === 'ios' ? 70 : 100} tint="dark" style={styles.blurCard}>
        {/* Decorative watermark */}
        <View style={styles.watermark} pointerEvents="none">
          <Icon name="scan" size={140} color={faceInFrame ? '#34D399' : '#FBBF24'} />
        </View>

        <View style={styles.cardInner}>
          {/* Progress Ring */}
          <Animated.View style={[styles.ringContainer, { transform: [{ scale: pulse }] }]}>
            <Svg width={RING_SIZE} height={RING_SIZE}>
              <Defs>
                <LinearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor={faceInFrame ? '#34D399' : '#FBBF24'} stopOpacity="1" />
                  <Stop offset="100%" stopColor={faceInFrame ? '#06B6D4' : '#F97316'} stopOpacity="1" />
                </LinearGradient>
              </Defs>

              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RADIUS}
                stroke="rgba(255,255,255,0.10)"
                strokeWidth={STROKE_WIDTH}
                fill="none"
              />
              <AnimatedCircle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RADIUS}
                stroke="url(#ringGrad)"
                strokeWidth={STROKE_WIDTH}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={strokeOffset}
                transform={`rotate(-90, ${RING_SIZE / 2}, ${RING_SIZE / 2})`}
              />
            </Svg>
            <View style={styles.ringCenter}>
              {done ? (
                <Text style={styles.doneText}>✓</Text>
              ) : (
                <>
                  <Text style={styles.countdownText}>{secondsLeft}</Text>
                  <Text style={styles.countdownUnit}>seconds</Text>
                </>
              )}
            </View>
          </Animated.View>

          {/* Copy */}
          {!faceInFrame ? (
            <>
              <Text style={styles.heading}>Bring your face back</Text>
              <Text style={styles.body}>
                Calibration paused. Move into frame to continue.
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.heading}>Getting to know you</Text>
              <Text style={styles.body}>
                Keep a relaxed, neutral expression. We're learning what your face looks like at rest.
              </Text>
            </>
          )}
        </View>
      </BlurView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: Platform.OS === 'android' ? 0 : 6,
  },
  blurCard: {
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: Platform.OS === 'android' ? 'rgba(12, 12, 18, 0.82)' : 'rgba(12, 12, 18, 0.38)',
  },
  watermark: {
    position: 'absolute',
    right: -28,
    top: -22,
    opacity: 0.10,
    transform: [{ rotate: '18deg' }],
    zIndex: 0,
  },
  cardInner: {
    paddingVertical: 32,
    paddingHorizontal: 28,
    alignItems: 'center',
    zIndex: 1,
  },
  ringContainer: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownText: {
    fontSize: 38,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -1.2,
    fontVariant: ['tabular-nums'],
  },
  countdownUnit: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  doneText: {
    fontSize: 44,
    fontWeight: '700',
    color: '#34D399',
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 10,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 280,
  },
});
