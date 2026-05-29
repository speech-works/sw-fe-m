import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { MirrorBehaviorSignal } from '../types';

interface AwarenessOverlayProps {
  activeSignals: MirrorBehaviorSignal[];
  nudgeMode: 'ON' | 'OFF';
}

const NUDGE_COOLDOWN_MS = 10000;
const NUDGE_VISIBLE_MS = 3000;

const NUDGE_MESSAGES: Record<MirrorBehaviorSignal, { line1: string; line2?: string }> = {
  [MirrorBehaviorSignal.JAW_TENSION]: {
    line1: 'Your jaw tightened just then.',
    line2: 'If it feels tight, try letting it drop open slightly on your next exhale.',
  },
  [MirrorBehaviorSignal.LIP_PURSING]: {
    line1: 'Your lips pressed together.',
    line2: 'Resting your lips apart — even slightly — can make the next sound easier to start.',
  },
  [MirrorBehaviorSignal.EYE_CLOSURE]: {
    line1: 'Your eyes closed for a moment.',
    line2: 'Keeping them open can help you stay connected to the moment.',
  },
  [MirrorBehaviorSignal.EYE_BLINK_SPIKE]: {
    line1: 'Blinking picked up just now.',
    line2: 'A slow breath can help settle things.',
  },
  [MirrorBehaviorSignal.BROW_TENSION]: {
    line1: "There's some tension in your forehead.",
    line2: 'See if you can soften your brow. The thinking is already done — just let the words come.',
  },
  [MirrorBehaviorSignal.GAZE_AVERSION]: {
    line1: 'You looked away for a bit.',
    line2: "Looking away while thinking is normal. Come back when you're ready.",
  },
  [MirrorBehaviorSignal.HEAD_MOVEMENT]: {
    line1: 'Your head moved while your face was tense.',
    line2: "That sometimes happens when we're working hard to get a word out. It's okay.",
  },
  [MirrorBehaviorSignal.FACIAL_TENSION_COMPOSITE]: {
    line1: 'A lot is happening in your face right now.',
    line2: "Take a breath. The word is yours — it'll come.",
  },
};

export const AwarenessOverlay: React.FC<AwarenessOverlayProps> = ({ activeSignals, nudgeMode }) => {
  const [currentNudge, setCurrentNudge] = useState<MirrorBehaviorSignal | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const lastNudgeTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (nudgeMode === 'OFF' || activeSignals.length === 0) return;

    const now = Date.now();
    if (now - lastNudgeTimeRef.current < NUDGE_COOLDOWN_MS) {
      return; // In cooldown
    }

    if (currentNudge) return; // Already showing a nudge

    // Pick the most critical signal (FACIAL_TENSION_COMPOSITE has highest priority)
    const priorityOrder = [
      MirrorBehaviorSignal.FACIAL_TENSION_COMPOSITE,
      MirrorBehaviorSignal.HEAD_MOVEMENT,
      MirrorBehaviorSignal.JAW_TENSION,
      MirrorBehaviorSignal.EYE_CLOSURE,
      MirrorBehaviorSignal.LIP_PURSING,
      MirrorBehaviorSignal.BROW_TENSION,
      MirrorBehaviorSignal.GAZE_AVERSION,
      MirrorBehaviorSignal.EYE_BLINK_SPIKE,
    ];

    const signalToShow = priorityOrder.find(s => activeSignals.includes(s));

    if (signalToShow) {
      setCurrentNudge(signalToShow);
      lastNudgeTimeRef.current = now;

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setCurrentNudge(null);
        });
      }, NUDGE_VISIBLE_MS);
    }
  }, [activeSignals, nudgeMode, fadeAnim, currentNudge]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!currentNudge) return null;

  const msg = NUDGE_MESSAGES[currentNudge];

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.toast}>
        <Text style={styles.line1}>{msg.line1}</Text>
        {msg.line2 && <Text style={styles.line2}>{msg.line2}</Text>}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100, // Show near the top/middle so it's in their eye line while looking at camera
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 100,
  },
  toast: {
    backgroundColor: 'rgba(28, 28, 30, 0.85)',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  line1: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  line2: {
    color: '#D1D1D6',
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
  },
});
