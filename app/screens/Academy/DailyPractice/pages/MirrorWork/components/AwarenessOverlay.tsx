import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { MirrorBehaviorSignal } from '../types';

interface AwarenessOverlayProps {
  activeSignals: MirrorBehaviorSignal[];
  newSignals?: MirrorBehaviorSignal[];
  nudgeMode: 'ON' | 'OFF';
  /** Per-signal tier for confidence-based styling. A=high, B=moderate, C=head-pose. */
  signalTiers?: Partial<Record<MirrorBehaviorSignal, 'A' | 'B' | 'C'>>;
}

const MIN_VISIBLE_MS = 3000;

// ── Tier A — firm wording (high detection reliability + high clinical weight) ──
// ── Tier B — soft wording ("you may have…") ──
// ── Tier C — informational, violet tint ──
const NUDGE_MESSAGES: Record<MirrorBehaviorSignal, {
  line1: string;
  line1Soft?: string;  // Used for Tier B/C
  line2?: string;
  line2Soft?: string;
}> = {
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
  [MirrorBehaviorSignal.EYE_BLINKING_STRUGGLE]: {
    line1: 'Your eyes blinked rapidly or closed hard.',
    line2: 'A slow breath can help settle things.',
  },
  [MirrorBehaviorSignal.BROW_TENSION]: {
    line1: 'Your brow tightened.',
    line1Soft: 'You may be holding tension in your forehead.',
    line2: 'See if you can soften your brow. The thinking is already done — just let the words come.',
  },
  [MirrorBehaviorSignal.FACIAL_GRIMACING]: {
    line1: 'There is some struggle in your facial muscles.',
    line1Soft: 'You may have strained a little there.',
    line2: "Take a breath. The word is yours — it'll come.",
  },
  [MirrorBehaviorSignal.CHEEK_PUFFING]: {
    line1: 'You filled your cheeks with air.',
    line1Soft: 'You may have puffed your cheeks just now.',
    line2: 'Let that air out gently before you start. The word will come.',
  },
  [MirrorBehaviorSignal.NOSTRIL_FLARE]: {
    line1: 'Your nose muscles tensed for a moment.',
    line1Soft: 'You may have some nose tension.',
    line2: 'Soft breath in through the nose can release that tension.',
  },
  [MirrorBehaviorSignal.GAZE_AVERSION]: {
    line1: 'You looked away for a bit.',
    line1Soft: 'You may have looked away.',
    line2: "Looking away while thinking is normal. Come back when you're ready.",
  },
  [MirrorBehaviorSignal.HEAD_JERKING]: {
    line1: 'Your head moved sharply.',
    line1Soft: 'There was a head movement just now.',
    line2: "That sometimes happens when we try to push a word out. It's okay.",
  },
  [MirrorBehaviorSignal.FACIAL_TENSION_COMPOSITE]: {
    line1: 'A lot is happening in your face right now.',
    line2: "Take a breath. The word is yours — it'll come.",
  },
};

// ── Toast border/glow colors per tier ────────────────────────────────────────
// Tier A: solid amber   rgba(255,122,51,…)
// Tier B: dimmed amber  rgba(230,180,80,…)
// Tier C: violet        rgba(147,112,219,…)
const TIER_BORDER: Record<'A' | 'B' | 'C', string> = {
  A: 'rgba(255, 122, 51, 0.60)',
  B: 'rgba(230, 180, 80, 0.40)',
  C: 'rgba(147, 112, 219, 0.50)',
};

const TIER_BG: Record<'A' | 'B' | 'C', string> = {
  A: 'rgba(28, 22, 16, 0.88)',
  B: 'rgba(24, 22, 14, 0.82)',
  C: 'rgba(18, 16, 28, 0.82)',
};

const ToastMessage: React.FC<{
  msg: { line1: string; line1Soft?: string; line2?: string; line2Soft?: string };
  tier: 'A' | 'B' | 'C';
}> = ({ msg, tier }) => {
  const [opacity] = useState(new Animated.Value(0));
  const [scale]   = useState(new Animated.Value(0.95));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 8, tension: 100, useNativeDriver: true }),
    ]).start();
  }, []);

  const useSoftWording = tier === 'B' || tier === 'C';
  const line1 = (useSoftWording && msg.line1Soft) ? msg.line1Soft : msg.line1;
  const line2 = (useSoftWording && msg.line2Soft) ? msg.line2Soft : msg.line2;

  return (
    <Animated.View
      style={[
        styles.toast,
        { opacity, transform: [{ scale }] },
        { backgroundColor: TIER_BG[tier], borderColor: TIER_BORDER[tier] },
        tier === 'B' && styles.toastTierB,
      ]}
    >
      <Text style={styles.line1}>{line1}</Text>
      {line2 && <Text style={styles.line2}>{line2}</Text>}
    </Animated.View>
  );
};

export const AwarenessOverlay: React.FC<AwarenessOverlayProps> = ({
  activeSignals, newSignals = [], nudgeMode, signalTiers = {},
}) => {
  const [visibleSignals, setVisibleSignals] = useState<Map<MirrorBehaviorSignal, number>>(new Map());

  useEffect(() => {
    if (nudgeMode === 'OFF' || newSignals.length === 0) return;
    const now = Date.now();
    setVisibleSignals((prev) => {
      const next = new Map(prev);
      newSignals.forEach((sig) => next.set(sig, now));
      return next;
    });
  }, [newSignals, nudgeMode]);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisibleSignals((prev) => {
        const next = new Map(prev);
        const now = Date.now();
        let changed = false;
        next.forEach((ts, sig) => {
          if (now - ts >= MIN_VISIBLE_MS) { next.delete(sig); changed = true; }
        });
        return changed ? next : prev;
      });
    }, 500);
    return () => clearInterval(interval);
  }, []);

  if (visibleSignals.size === 0 || nudgeMode === 'OFF') return null;

  return (
    <View style={styles.container}>
      {Array.from(visibleSignals.entries()).map(([sig, ts]) => {
        const msg = NUDGE_MESSAGES[sig];
        if (!msg) return null;
        const tier = signalTiers[sig] ?? 'A';
        return <ToastMessage key={`${sig}-${ts}`} msg={msg} tier={tier} />;
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 100,
  },
  toast: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    width: '100%',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    borderWidth: 1.5,
  },
  toastTierB: {
    borderStyle: 'dashed',
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
