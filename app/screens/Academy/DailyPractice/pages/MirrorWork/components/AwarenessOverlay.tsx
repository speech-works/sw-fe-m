import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { MirrorBehaviorSignal } from '../types';

interface AwarenessOverlayProps {
  activeSignals: MirrorBehaviorSignal[];
  newSignals?: MirrorBehaviorSignal[];
  nudgeMode: 'ON' | 'OFF';
  /** Per-signal tier for confidence-based styling. A=high, B=moderate, C=head-pose. */
  signalTiers?: Partial<Record<MirrorBehaviorSignal, 'A' | 'B' | 'C'>>;
}

// ── Single-slot nudge timing ─────────────────────────────────────────────────
// Only ONE nudge is shown at a time, chosen by priority, with a gap between
// them and per-signal cooldowns so the screen never crowds and noisy signals
// (head jerk) can't spam.
const NUDGE_VISIBLE_MS = 4500;   // how long a nudge stays on screen
const GLOBAL_GAP_MS    = 2200;   // quiet gap after one dismisses before the next
const PENDING_TTL_MS   = 4000;   // drop a queued signal if not shown within this (stale)
const DEFAULT_COOLDOWN = 9000;   // min gap before the SAME signal can show again

// Per-signal cooldowns — head jerk / gaze are noisy + low-value, so they show rarely.
const PER_SIGNAL_COOLDOWN: Partial<Record<MirrorBehaviorSignal, number>> = {
  [MirrorBehaviorSignal.HEAD_JERKING]:            25000,
  [MirrorBehaviorSignal.GAZE_AVERSION]:           15000,
  [MirrorBehaviorSignal.FACIAL_TENSION_COMPOSITE]:12000,
  [MirrorBehaviorSignal.NOSTRIL_FLARE]:           12000,
};

// Higher = surfaced first when several fire at once. Specific, actionable
// signals OUTRANK the generic composite — "your lips pursed" beats "a lot is
// happening", so the user gets feedback they can actually act on.
const PRIORITY: Record<MirrorBehaviorSignal, number> = {
  [MirrorBehaviorSignal.OPEN_MOUTH_HOLD]:          90,
  [MirrorBehaviorSignal.JAW_TENSION]:              85,
  [MirrorBehaviorSignal.LIP_PURSING]:              85,
  [MirrorBehaviorSignal.EYE_BLINKING_STRUGGLE]:    80,
  [MirrorBehaviorSignal.BROW_TENSION]:             60,
  [MirrorBehaviorSignal.FACIAL_GRIMACING]:         55,
  [MirrorBehaviorSignal.FACIAL_TENSION_COMPOSITE]: 50,  // generic — loses to specifics
  [MirrorBehaviorSignal.CHEEK_PUFFING]:            45,
  [MirrorBehaviorSignal.NOSTRIL_FLARE]:            35,
  [MirrorBehaviorSignal.GAZE_AVERSION]:            25,
  [MirrorBehaviorSignal.HEAD_JERKING]:             10,
};

const NUDGE_MESSAGES: Record<MirrorBehaviorSignal, {
  line1: string;
  line1Soft?: string;  // Tier B/C wording
  line2?: string;
  line2Soft?: string;
}> = {
  [MirrorBehaviorSignal.JAW_TENSION]: {
    line1: 'Your jaw and lips tightened just then.',
    line2: 'If it feels tight, try letting your jaw drop open slightly on your next exhale.',
  },
  [MirrorBehaviorSignal.OPEN_MOUTH_HOLD]: {
    line1: 'Your mouth stayed open just now.',
    line2: 'Relax your jaw and let the sound out naturally.',
  },
  [MirrorBehaviorSignal.LIP_PURSING]: {
    line1: 'Your lips pursed together.',
    line2: 'Resting your lips apart — even slightly — can make the next sound easier to start.',
  },
  [MirrorBehaviorSignal.EYE_BLINKING_STRUGGLE]: {
    line1: 'Your eyes blinked rapidly or closed hard.',
    line2: 'A slow breath can help settle things.',
  },
  [MirrorBehaviorSignal.BROW_TENSION]: {
    line1: 'Your brow tightened.',
    line1Soft: 'You may be holding tension in your forehead.',
    line2: 'See if you can soften your brow — the thinking is already done.',
  },
  [MirrorBehaviorSignal.FACIAL_GRIMACING]: {
    line1: 'There is some struggle in your facial muscles.',
    line1Soft: 'You may have strained a little there.',
    line2: "Take a breath. The word is yours — it'll come.",
  },
  [MirrorBehaviorSignal.CHEEK_PUFFING]: {
    line1: 'You filled your cheeks with air.',
    line1Soft: 'You may have puffed your cheeks just now.',
    line2: 'Let that air out gently before you start.',
  },
  [MirrorBehaviorSignal.NOSTRIL_FLARE]: {
    line1: 'Your nose muscles tensed for a moment.',
    line1Soft: 'You may have some nose tension.',
    line2: 'A soft breath in through the nose can release it.',
  },
  [MirrorBehaviorSignal.GAZE_AVERSION]: {
    line1: 'You looked away for a bit.',
    line1Soft: 'You may have looked away.',
    line2: "Looking away while thinking is normal. Come back when you're ready.",
  },
  [MirrorBehaviorSignal.HEAD_JERKING]: {
    line1: 'Your head moved sharply.',
    line1Soft: 'There was a head movement just now.',
    line2: "That can happen when we push a word out. It's okay.",
  },
  [MirrorBehaviorSignal.FACIAL_TENSION_COMPOSITE]: {
    line1: 'A lot is happening in your face right now.',
    line2: "Take a breath. The word is yours — it'll come.",
  },
};

// Tier styling — A: solid amber / B: dimmed amber-yellow / C: violet (head pose)
const TIER_BORDER: Record<'A' | 'B' | 'C', string> = {
  A: 'rgba(255, 122, 51, 0.60)',
  B: 'rgba(230, 180, 80, 0.40)',
  C: 'rgba(147, 112, 219, 0.50)',
};
const TIER_BG: Record<'A' | 'B' | 'C', string> = {
  A: 'rgba(28, 22, 16, 0.90)',
  B: 'rgba(24, 22, 14, 0.86)',
  C: 'rgba(18, 16, 28, 0.86)',
};

const ToastMessage: React.FC<{
  msg: { line1: string; line1Soft?: string; line2?: string; line2Soft?: string };
  tier: 'A' | 'B' | 'C';
  lifeMs: number;
}> = ({ msg, tier, lifeMs }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.96)).current;
  const translateY = useRef(new Animated.Value(-8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 8, tension: 100, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, friction: 8, tension: 100, useNativeDriver: true }),
    ]).start();
    // Schedule a gentle fade-out so the parent unmount isn't abrupt.
    const t = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 380, useNativeDriver: true }).start();
    }, Math.max(0, lifeMs - 400));
    return () => clearTimeout(t);
  }, []);

  const soft = tier === 'B' || tier === 'C';
  const line1 = (soft && msg.line1Soft) ? msg.line1Soft : msg.line1;
  const line2 = (soft && msg.line2Soft) ? msg.line2Soft : msg.line2;

  return (
    <Animated.View
      style={[
        styles.toast,
        { opacity, transform: [{ scale }, { translateY }] },
        { backgroundColor: TIER_BG[tier], borderColor: TIER_BORDER[tier] },
        tier === 'B' && styles.toastTierB,
      ]}
    >
      <Text style={styles.line1}>{line1}</Text>
      {line2 && <Text style={styles.line2}>{line2}</Text>}
    </Animated.View>
  );
};

interface CurrentNudge {
  signal: MirrorBehaviorSignal;
  tier: 'A' | 'B' | 'C';
  shownAt: number;
}

export const AwarenessOverlay: React.FC<AwarenessOverlayProps> = ({
  newSignals = [], nudgeMode, signalTiers = {},
}) => {
  const [current, setCurrent] = useState<CurrentNudge | null>(null);

  const currentRef = useRef<CurrentNudge | null>(null);
  useEffect(() => { currentRef.current = current; }, [current]);

  const pendingRef = useRef<Map<MirrorBehaviorSignal, number>>(new Map());
  const lastShownBySignalRef = useRef<Map<MirrorBehaviorSignal, number>>(new Map());
  const lastDismissedAtRef = useRef(0);
  const signalTiersRef = useRef(signalTiers);
  useEffect(() => { signalTiersRef.current = signalTiers; }, [signalTiers]);

  // ── Enqueue newly-fired signals (deduped; respects per-signal cooldown) ──
  useEffect(() => {
    if (nudgeMode === 'OFF' || newSignals.length === 0) return;
    const now = Date.now();
    newSignals.forEach((sig) => {
      if (!NUDGE_MESSAGES[sig]) return;
      const cd = PER_SIGNAL_COOLDOWN[sig] ?? DEFAULT_COOLDOWN;
      const last = lastShownBySignalRef.current.get(sig) ?? 0;
      if (now - last < cd) return; // still cooling down → ignore
      pendingRef.current.set(sig, now);
    });
  }, [newSignals, nudgeMode]);

  // ── Single-slot state machine ──
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();

      // Drop stale queued signals.
      pendingRef.current.forEach((qAt, sig) => {
        if (now - qAt > PENDING_TTL_MS) pendingRef.current.delete(sig);
      });

      // Dismiss the current nudge once its life is up.
      if (currentRef.current && now - currentRef.current.shownAt > NUDGE_VISIBLE_MS) {
        lastDismissedAtRef.current = now;
        setCurrent(null);
        return;
      }

      // Promote the highest-priority pending signal when idle + past the gap.
      if (!currentRef.current &&
          now - lastDismissedAtRef.current > GLOBAL_GAP_MS &&
          pendingRef.current.size > 0) {
        let best: MirrorBehaviorSignal | null = null;
        let bestP = -1;
        pendingRef.current.forEach((_, sig) => {
          const p = PRIORITY[sig] ?? 0;
          if (p > bestP) { bestP = p; best = sig; }
        });
        if (best !== null) {
          const chosen: MirrorBehaviorSignal = best;
          pendingRef.current.delete(chosen);
          const cd = PER_SIGNAL_COOLDOWN[chosen] ?? DEFAULT_COOLDOWN;
          const last = lastShownBySignalRef.current.get(chosen) ?? 0;
          if (now - last >= cd) {
            lastShownBySignalRef.current.set(chosen, now);
            setCurrent({ signal: chosen, tier: signalTiersRef.current[chosen] ?? 'A', shownAt: now });
          }
        }
      }
    }, 250);
    return () => clearInterval(id);
  }, []);

  // Clear everything when nudges are turned off.
  useEffect(() => {
    if (nudgeMode === 'OFF') {
      pendingRef.current.clear();
      setCurrent(null);
    }
  }, [nudgeMode]);

  if (!current || nudgeMode === 'OFF') return null;
  const msg = NUDGE_MESSAGES[current.signal];
  if (!msg) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      <ToastMessage
        key={`${current.signal}-${current.shownAt}`}
        msg={msg}
        tier={current.tier}
        lifeMs={NUDGE_VISIBLE_MS}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 110,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 100,
  },
  toast: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 18,
    maxWidth: 380,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
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
    letterSpacing: -0.2,
  },
  line2: {
    color: '#D1D1D6',
    fontSize: 13.5,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 19,
  },
});
