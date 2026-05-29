import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { MirrorBehaviorSignal } from '../types';

interface AwarenessOverlayProps {
  activeSignals: MirrorBehaviorSignal[];
  nudgeMode: 'ON' | 'OFF';
}

const MIN_VISIBLE_MS = 3000;

const NUDGE_MESSAGES: Record<MirrorBehaviorSignal, { line1: string; line2?: string }> = {
  [MirrorBehaviorSignal.JAW_TENSION]: {
    line1: 'Your jaw tightened just then.',
    line2: 'If it feels tight, try letting it drop open slightly on your next exhale.',
  },
  [MirrorBehaviorSignal.OPEN_MOUTH_HOLD]: {
    line1: 'Your mouth stayed open just now.',
    line2: 'Try to relax your jaw and let the sound out naturally.',
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
  [MirrorBehaviorSignal.EYE_BLINKING_STRUGGLE]: {
    line1: 'Your eyes blinked rapidly or closed hard.',
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
  [MirrorBehaviorSignal.HEAD_JERKING]: {
    line1: 'Your head moved sharply.',
    line2: "That sometimes happens when we try to push a word out. It's okay.",
  },
  [MirrorBehaviorSignal.NOSTRIL_FLARE]: {
    line1: 'Your nose muscles tensed for a moment.',
    line2: 'Soft breath in through the nose can release that tension.',
  },
  [MirrorBehaviorSignal.CHEEK_PUFFING]: {
    line1: 'You filled your cheeks with air.',
    line2: 'Let that air out gently before you start. The word will come.',
  },
  [MirrorBehaviorSignal.FACIAL_TENSION_COMPOSITE]: {
    line1: 'A lot is happening in your face right now.',
    line2: "Take a breath. The word is yours — it'll come.",
  },
  [MirrorBehaviorSignal.FACIAL_GRIMACING]: {
    line1: 'There is some struggle in your facial muscles.',
    line2: "Take a breath. The word is yours — it'll come.",
  },
};

export const AwarenessOverlay: React.FC<AwarenessOverlayProps> = ({ activeSignals, nudgeMode }) => {
  const [visibleSignals, setVisibleSignals] = useState<Map<MirrorBehaviorSignal, number>>(new Map());

  useEffect(() => {
    if (nudgeMode === 'OFF') {
      setVisibleSignals(new Map());
      return;
    }

    const now = Date.now();
    setVisibleSignals((prev) => {
      const next = new Map(prev);
      let changed = false;
      
      activeSignals.forEach((sig) => {
        if (!next.has(sig)) {
          next.set(sig, now);
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [activeSignals, nudgeMode]);

  // Periodic cleanup for signals that are no longer active AND have passed MIN_VISIBLE_MS
  useEffect(() => {
    const interval = setInterval(() => {
      setVisibleSignals((prev) => {
        const next = new Map(prev);
        const now = Date.now();
        let changed = false;

        next.forEach((timestamp, sig) => {
          if (!activeSignals.includes(sig) && now - timestamp >= MIN_VISIBLE_MS) {
            next.delete(sig);
            changed = true;
          }
        });

        return changed ? next : prev;
      });
    }, 500);

    return () => clearInterval(interval);
  }, [activeSignals]);

  if (visibleSignals.size === 0) return null;

  // Sort by enum key to keep order somewhat stable, or by timestamp
  const displayedSignals = Array.from(visibleSignals.keys());

  return (
    <View style={styles.container}>
      {displayedSignals.map((sig) => {
        const msg = NUDGE_MESSAGES[sig];
        if (!msg) return null;
        return (
          <View key={sig} style={styles.toast}>
            <Text style={styles.line1}>{msg.line1}</Text>
            {msg.line2 && <Text style={styles.line2}>{msg.line2}</Text>}
          </View>
        );
      })}
    </View>
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
    marginBottom: 8,
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
