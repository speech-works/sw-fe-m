import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import Svg, { Ellipse, Defs, LinearGradient, Stop } from 'react-native-svg';
import { BlurView } from 'expo-blur';

import type { FaceLandmark3D } from 'expo-face-landmarker/ExpoFaceLandmarker.types';

interface FaceGuideProps {
  landmarks?: FaceLandmark3D[];
  viewSize: { width: number; height: number };
  imageSize?: { width: number; height: number };
  /**
   * Vertical center of the oval as a fraction of view height.
   * Defaults to ~0.55 — slightly below middle so it doesn't overlap
   * with the prompt/calibration card at the top.
   */
  centerYRatio?: number;
  /** Optional override label shown beneath the oval. */
  hintOverride?: string;
}

// ── Three-tier alignment bands ───────────────────────────────────────────────
// OK (green): well-centered, correct distance. Small fluctuations are absorbed.
// CLOSE (yellow): mostly aligned but needs a small adjustment.
// FAR (red): significantly off — far from center or wrong distance.
// NO_FACE (red): no detection at all.
//
// Bounds expressed as fractions of the oval's own radii / height.
const OK_CENTER_OFFSET   = 0.45;  // generous — keeps small movements green
const CLOSE_CENTER_OFFSET = 0.85; // beyond this = red
const OK_SIZE_MIN  = 0.40;
const OK_SIZE_MAX  = 1.30;
const CLOSE_SIZE_MIN = 0.28;
const CLOSE_SIZE_MAX = 1.55;

// Hysteresis on the visual state — avoid flicker on tiny shifts.
const STATE_DWELL_MS = 280;

const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

type Alignment = 'ok' | 'close' | 'far' | 'no-face';

interface AlignmentResult {
  alignment: Alignment;
  dx: number;
  dy: number;
  sizeRatio: number;
}

function computeAlignment(
  landmarks: FaceLandmark3D[] | undefined,
  W: number, H: number, imgW: number, imgH: number,
  ovalCx: number, ovalCy: number, ovalRx: number, ovalRy: number,
): AlignmentResult {
  if (!landmarks || landmarks.length < 100) {
    return { alignment: 'no-face', dx: 0, dy: 0, sizeRatio: 0 };
  }

  const scale = Math.max(W / imgW, H / imgH);
  const offsetX = (W - imgW * scale) / 2;
  const offsetY = (H - imgH * scale) / 2;

  let minY = Infinity, maxY = -Infinity;
  let sumX = 0, sumY = 0;
  for (const lm of landmarks) {
    const x = (1 - lm.x) * imgW * scale + offsetX;
    const y = lm.y * imgH * scale + offsetY;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    sumX += x;
    sumY += y;
  }

  const cx = sumX / landmarks.length;
  const cy = sumY / landmarks.length;
  const faceHeight = maxY - minY;

  const dx = (cx - ovalCx) / ovalRx;
  const dy = (cy - ovalCy) / ovalRy;
  const sizeRatio = faceHeight / (ovalRy * 2);
  const radialOffset = Math.sqrt(dx * dx + dy * dy);

  const sizeOK    = sizeRatio >= OK_SIZE_MIN    && sizeRatio <= OK_SIZE_MAX;
  const sizeClose = sizeRatio >= CLOSE_SIZE_MIN && sizeRatio <= CLOSE_SIZE_MAX;

  if (radialOffset <= OK_CENTER_OFFSET && sizeOK) {
    return { alignment: 'ok', dx, dy, sizeRatio };
  }
  if (radialOffset <= CLOSE_CENTER_OFFSET && sizeClose) {
    return { alignment: 'close', dx, dy, sizeRatio };
  }
  return { alignment: 'far', dx, dy, sizeRatio };
}

// Direction-aware hint based on dx/dy/sizeRatio.
// Note: x is already mirrored to the user's perspective (selfie view), so
// "the face is to the right in the oval" means the user needs to move LEFT.
function getHint(r: AlignmentResult): string {
  switch (r.alignment) {
    case 'ok':      return 'Looking good — hold steady';
    case 'no-face': return 'Look straight at the camera';
    default: {
      // Size cues take priority — clearest signal.
      if (r.sizeRatio < OK_SIZE_MIN)  return r.sizeRatio < CLOSE_SIZE_MIN ? 'Move closer' : 'A little closer';
      if (r.sizeRatio > OK_SIZE_MAX)  return r.sizeRatio > CLOSE_SIZE_MAX ? 'Move back'   : 'A little farther';
      // Otherwise it's a centering issue.
      if (Math.abs(r.dy) > Math.abs(r.dx)) {
        return r.dy < 0 ? 'Move down a bit' : 'Move up a bit';
      }
      return 'Center your face in the oval';
    }
  }
}

const COLOR_FOR: Record<Alignment, { from: string; to: string; glow: string }> = {
  'ok':      { from: '#34D399', to: '#06B6D4', glow: '#34D399' },
  'close':   { from: '#FBBF24', to: '#F59E0B', glow: '#FBBF24' },
  'far':     { from: '#F87171', to: '#EF4444', glow: '#F87171' },
  'no-face': { from: '#F87171', to: '#EF4444', glow: '#F87171' },
};

export const FaceGuide: React.FC<FaceGuideProps> = ({
  landmarks, viewSize, imageSize, centerYRatio = 0.55, hintOverride,
}) => {
  const { width: W, height: H } = viewSize;
  const imgW = imageSize?.width ?? W;
  const imgH = imageSize?.height ?? H;

  // Oval geometry — roughly 60% of view width, taller-than-wide aspect (~1.3:1)
  const ovalRx = (W * 0.60) / 2;
  const ovalRy = ovalRx * 1.32;
  const ovalCx = W / 2;
  const ovalCy = H * centerYRatio;

  // Compute alignment from landmarks (recomputed each render — cheap).
  const result = useMemo(
    () => computeAlignment(landmarks, W, H, imgW, imgH, ovalCx, ovalCy, ovalRx, ovalRy),
    [landmarks, W, H, imgW, imgH, ovalCx, ovalCy, ovalRx, ovalRy],
  );

  // ── Hysteresis: only commit a state change after STATE_DWELL_MS of the
  //    same alignment — prevents flicker on tiny shifts.
  const committedRef = useRef<Alignment>('no-face');
  const pendingRef = useRef<{ value: Alignment; since: number }>({
    value: result.alignment, since: Date.now(),
  });
  const [, force] = React.useState(0);

  useEffect(() => {
    if (result.alignment === pendingRef.current.value) {
      const elapsed = Date.now() - pendingRef.current.since;
      if (elapsed >= STATE_DWELL_MS && committedRef.current !== result.alignment) {
        committedRef.current = result.alignment;
        force((n) => n + 1);
      }
    } else {
      pendingRef.current = { value: result.alignment, since: Date.now() };
    }
  }, [result.alignment]);

  // Snap immediately when entering 'ok' or leaving 'ok' → 'no-face' (faster reassurance / warning).
  useEffect(() => {
    if (result.alignment === 'ok' || result.alignment === 'no-face') {
      committedRef.current = result.alignment;
      pendingRef.current = { value: result.alignment, since: Date.now() };
      force((n) => n + 1);
    }
  }, [result.alignment]);

  const alignment = committedRef.current;
  const colors = COLOR_FOR[alignment];

  // Breathing pulse — gentler when far/close, none when aligned
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (alignment === 'ok') {
      Animated.timing(pulse, { toValue: 1, duration: 250, useNativeDriver: false }).start();
      return;
    }
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.03, duration: 1100, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 1,    duration: 1100, useNativeDriver: false }),
      ])
    ).start();
  }, [alignment]);

  const hintText = hintOverride ?? getHint(result);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="guideGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={colors.from} stopOpacity="1" />
            <Stop offset="100%" stopColor={colors.to} stopOpacity="1" />
          </LinearGradient>
        </Defs>

        {/* Soft outer halo when aligned */}
        {alignment === 'ok' && (
          <AnimatedEllipse
            cx={ovalCx}
            cy={ovalCy}
            rx={Animated.multiply(pulse, ovalRx + 14) as any}
            ry={Animated.multiply(pulse, ovalRy + 14) as any}
            stroke={colors.glow}
            strokeWidth={2}
            strokeOpacity={0.22}
            fill="none"
          />
        )}

        {/* Main oval guide */}
        <AnimatedEllipse
          cx={ovalCx}
          cy={ovalCy}
          rx={Animated.multiply(pulse, ovalRx) as any}
          ry={Animated.multiply(pulse, ovalRy) as any}
          stroke="url(#guideGrad)"
          strokeWidth={alignment === 'ok' ? 3.5 : 2.5}
          strokeDasharray={alignment === 'ok' ? undefined : '12,9'}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>

      {/* Hint chip below the oval */}
      <View
        style={[
          styles.hintWrap,
          { top: ovalCy + ovalRy + 18, width: W },
        ]}
      >
        <View style={styles.hintInner}>
          <BlurView
            intensity={Platform.OS === 'ios' ? 50 : 90}
            tint="dark"
            style={[
              styles.hintPill,
              alignment === 'ok'    && styles.hintPillOk,
              alignment === 'close' && styles.hintPillClose,
              (alignment === 'far' || alignment === 'no-face') && styles.hintPillFar,
            ]}
          >
            <Text style={styles.hintText}>{hintText}</Text>
          </BlurView>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  hintWrap: {
    position: 'absolute',
    left: 0,
    alignItems: 'center',
  },
  hintInner: {
    borderRadius: 999,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  hintPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Platform.OS === 'android' ? 'rgba(20,20,26,0.78)' : 'rgba(20,20,26,0.36)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  hintPillOk: {
    borderColor: 'rgba(52, 211, 153, 0.45)',
    backgroundColor: Platform.OS === 'android' ? 'rgba(6, 78, 59, 0.62)' : 'rgba(6, 78, 59, 0.34)',
  },
  hintPillClose: {
    borderColor: 'rgba(251, 191, 36, 0.45)',
    backgroundColor: Platform.OS === 'android' ? 'rgba(78, 56, 6, 0.62)' : 'rgba(78, 56, 6, 0.34)',
  },
  hintPillFar: {
    borderColor: 'rgba(248, 113, 113, 0.45)',
    backgroundColor: Platform.OS === 'android' ? 'rgba(78, 11, 11, 0.62)' : 'rgba(78, 11, 11, 0.34)',
  },
  hintText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
