import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, PanResponder } from 'react-native';
import { MirrorWorkCognitivePrompt } from '../types';

interface CognitivePromptCardProps {
  prompt: MirrorWorkCognitivePrompt;
  currentIndex: number;
  totalCount: number;
  onNext?: () => void;
}

export const CognitivePromptCard: React.FC<CognitivePromptCardProps> = ({
  prompt,
  currentIndex,
  totalCount,
  onNext,
}) => {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const prevIndexRef = useRef(currentIndex);

  // Slide in when prompt changes
  useEffect(() => {
    if (prevIndexRef.current !== currentIndex) {
      // Start off-screen to the right
      slideAnim.setValue(50);
      opacityAnim.setValue(0);

      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 120,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      prevIndexRef.current = currentIndex;
    }
  }, [currentIndex]);

  // Entry animation on first mount
  useEffect(() => {
    opacityAnim.setValue(0);
    slideAnim.setValue(20);
    Animated.parallel([
      Animated.timing(opacityAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 100, useNativeDriver: true }),
    ]).start();
  }, []);

  // Swipe-left to advance prompt
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 15 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -40 && onNext) {
          // Swipe left → next prompt
          Animated.parallel([
            Animated.timing(slideAnim, { toValue: -40, duration: 150, useNativeDriver: true }),
            Animated.timing(opacityAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
          ]).start(() => onNext());
        }
      },
    })
  ).current;

  return (
    <Animated.View
      style={[
        styles.card,
        {
          opacity: opacityAnim,
          transform: [{ translateX: slideAnim }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      {/* Counter pill */}
      <View style={styles.counterRow}>
        <View style={styles.counterPill}>
          {Array.from({ length: totalCount }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>
        <Text style={styles.counterText}>{currentIndex + 1} of {totalCount}</Text>
      </View>

      <Text style={styles.promptText}>{prompt.text}</Text>

      {totalCount > 1 && (
        <Text style={styles.swipeHint}>← swipe for next</Text>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(18, 18, 22, 0.88)',
    borderRadius: 22,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  counterPill: {
    flexDirection: 'row',
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: '#A78BFA',
    width: 16,
  },
  dotInactive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  counterText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 0.3,
  },
  promptText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    textAlign: 'left',
    lineHeight: 24,
  },
  swipeHint: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.25)',
    marginTop: 10,
    textAlign: 'right',
    letterSpacing: 0.2,
  },
});
