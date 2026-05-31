import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, PanResponder, TouchableOpacity, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import Icon from 'react-native-vector-icons/Ionicons';
import { MirrorWorkCognitivePrompt } from '../types';

interface CognitivePromptCardProps {
  prompt: MirrorWorkCognitivePrompt;
  currentIndex: number;
  totalCount: number;
  onNext?: () => void;
}

const SWIPE_THRESHOLD = 70;

export const CognitivePromptCard: React.FC<CognitivePromptCardProps> = ({
  prompt,
  currentIndex,
  totalCount,
  onNext,
}) => {
  // translateX follows the finger during a horizontal swipe.
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const prevIndexRef = useRef(currentIndex);

  // ── Slide-in when prompt index changes ──
  useEffect(() => {
    if (prevIndexRef.current !== currentIndex) {
      translateX.setValue(60);
      opacity.setValue(0);
      Animated.parallel([
        Animated.spring(translateX, { toValue: 0, friction: 9, tension: 110, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
      prevIndexRef.current = currentIndex;
    }
  }, [currentIndex]);

  // ── Entry animation ──
  useEffect(() => {
    translateX.setValue(0);
    opacity.setValue(0);
    Animated.timing(opacity, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, []);

  // ── Horizontal swipe with live drag feedback ──
  const panResponder = useRef(
    PanResponder.create({
      // Don't grab on simple taps so the buttons still work
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2,
      onMoveShouldSetPanResponderCapture: (_, g) =>
        Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2,
      onPanResponderMove: (_, g) => {
        // Drag follows finger; resistance on rightward drags (since we only advance forward)
        const dx = g.dx > 0 ? g.dx * 0.4 : g.dx;
        translateX.setValue(dx);
        opacity.setValue(1 - Math.min(Math.abs(g.dx) / 200, 0.4));
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < -SWIPE_THRESHOLD && onNext) {
          // Commit: fly off-screen then advance
          Animated.parallel([
            Animated.timing(translateX, { toValue: -400, duration: 180, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
          ]).start(() => onNext());
        } else {
          // Snap back
          Animated.parallel([
            Animated.spring(translateX, { toValue: 0, friction: 7, tension: 80, useNativeDriver: true }),
            Animated.spring(opacity, { toValue: 1, friction: 7, tension: 80, useNativeDriver: true }),
          ]).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, { toValue: 0, friction: 7, tension: 80, useNativeDriver: true }).start();
        Animated.spring(opacity, { toValue: 1, friction: 7, tension: 80, useNativeDriver: true }).start();
      },
    })
  ).current;

  return (
    <Animated.View
      style={[styles.wrapper, { opacity, transform: [{ translateX }] }]}
      {...panResponder.panHandlers}
    >
      <BlurView intensity={Platform.OS === 'ios' ? 60 : 90} tint="dark" style={styles.blurCard}>
        {/* Decorative watermark icon (clipped by border-radius) */}
        <View style={styles.watermark} pointerEvents="none">
          <Icon name="chatbubble-ellipses" size={130} color="#A78BFA" />
        </View>

        <View style={styles.cardInner}>
          {/* Header — progress dots + category */}
          <View style={styles.header}>
            <View style={styles.dotsRow}>
              {Array.from({ length: totalCount }).map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, i === currentIndex && styles.dotActive]}
                />
              ))}
            </View>
            {prompt.category ? (
              <Text style={styles.categoryText}>{prompt.category}</Text>
            ) : (
              <Text style={styles.categoryText}>{currentIndex + 1} / {totalCount}</Text>
            )}
          </View>

          {/* Prompt */}
          <Text style={styles.promptText}>{prompt.text}</Text>

          {/* Footer — swipe hint + next button */}
          {totalCount > 1 && (
            <View style={styles.footer}>
              <Text style={styles.swipeHint}>swipe to skip</Text>
              <TouchableOpacity
                style={styles.nextButton}
                onPress={onNext}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Next prompt"
              >
                <Text style={styles.nextButtonText}>Next</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </BlurView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: Platform.OS === 'android' ? 0 : 6,
  },
  blurCard: {
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: Platform.OS === 'android' ? 'rgba(15, 15, 22, 0.78)' : 'rgba(15, 15, 22, 0.34)',
  },
  watermark: {
    position: 'absolute',
    right: -22,
    bottom: -32,
    opacity: 0.11,
    transform: [{ rotate: '-14deg' }],
    zIndex: 0,
  },
  cardInner: {
    paddingVertical: 22,
    paddingHorizontal: 22,
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 5,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  dotActive: {
    width: 18,
    backgroundColor: '#FFFFFF',
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  promptText: {
    fontSize: 19,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 27,
    letterSpacing: -0.3,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  swipeHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.40)',
    letterSpacing: 0.3,
    fontWeight: '500',
  },
  nextButton: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 24,
    paddingVertical: 9,
    paddingHorizontal: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
  },
  nextButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
