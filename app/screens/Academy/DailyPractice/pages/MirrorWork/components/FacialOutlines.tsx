import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { MirrorBehaviorSignal } from '../types';

import type { FaceLandmark3D } from 'expo-face-landmarker/ExpoFaceLandmarker.types';

// ── Region polylines (ordered landmark indices forming closed-ish loops) ─────
// Drawn as connected paths only when the corresponding tension signal is active,
// so the camera stays clean during normal use.
const REGION_PATHS: Record<string, number[]> = {
  // Outer face oval (subtle base — drawn dimly even when no signals)
  faceOval: [
    10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378,
    400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21,
    54, 103, 67, 109, 10,
  ],
  leftEye: [33, 246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7, 33],
  rightEye: [362, 398, 384, 385, 386, 387, 388, 466, 263, 249, 390, 373, 374, 380, 381, 382, 362],
  leftBrow: [70, 63, 105, 66, 107, 55, 65, 52, 53, 46],
  rightBrow: [300, 293, 334, 296, 336, 285, 295, 282, 283, 276],
  nose: [168, 6, 197, 195, 5, 4, 1, 19, 94, 2],
  outerLips: [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146, 61],
  leftCheek: [50, 117, 118, 119, 120, 100, 142, 36, 205, 187, 207, 216, 213, 192, 147, 123, 50],
  rightCheek: [280, 346, 347, 348, 349, 329, 371, 266, 425, 411, 427, 436, 433, 416, 376, 352, 280],
};

interface FacialOutlinesProps {
  landmarks?: FaceLandmark3D[];
  imageSize?: { width: number; height: number };
  viewSize?: { width: number; height: number };
  activeSignals: MirrorBehaviorSignal[];
  signalTiers?: Partial<Record<MirrorBehaviorSignal, 'A' | 'B' | 'C'>>;
}

// Tier-based stroke colors (match AwarenessOverlay)
const TIER_STROKE: Record<'A' | 'B' | 'C', string> = {
  A: 'rgba(255, 138, 76, 0.85)',
  B: 'rgba(230, 180, 80, 0.75)',
  C: 'rgba(167, 139, 250, 0.75)',
};

// Map a normalized [0,1] landmark to view px with front-camera mirror + cover-crop.
function toViewPoint(
  p: FaceLandmark3D,
  viewW: number, viewH: number,
  imgW: number, imgH: number,
): { x: number; y: number } {
  const scale = Math.max(viewW / imgW, viewH / imgH);
  const offsetX = (viewW - imgW * scale) / 2;
  const offsetY = (viewH - imgH * scale) / 2;
  return {
    x: (1 - p.x) * imgW * scale + offsetX,
    y:       p.y  * imgH * scale + offsetY,
  };
}

function buildPath(
  indices: number[],
  pts: FaceLandmark3D[],
  W: number, H: number, imgW: number, imgH: number,
): string {
  if (indices.length === 0) return '';
  const parts: string[] = [];
  for (let i = 0; i < indices.length; i++) {
    const idx = indices[i];
    if (idx >= pts.length) continue;
    const { x, y } = toViewPoint(pts[idx], W, H, imgW, imgH);
    parts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return parts.join(' ');
}

export const FacialOutlines: React.FC<FacialOutlinesProps> = ({
  landmarks,
  imageSize,
  viewSize,
  activeSignals,
  signalTiers = {},
}) => {
  if (!viewSize || !landmarks || landmarks.length < 478) return null;

  const { width: W, height: H } = viewSize;
  const imgW = imageSize?.width ?? W;
  const imgH = imageSize?.height ?? H;
  const pts = landmarks;

  // ── Signal → region map ────────────────────────────────────────────────────
  const has = (s: MirrorBehaviorSignal) => activeSignals.includes(s);
  const tierOf = (s: MirrorBehaviorSignal): 'A' | 'B' | 'C' => signalTiers[s] ?? 'A';

  const activeRegions: Array<{ key: string; tier: 'A' | 'B' | 'C' }> = [];

  if (has(MirrorBehaviorSignal.LIP_PURSING) || has(MirrorBehaviorSignal.JAW_TENSION) ||
      has(MirrorBehaviorSignal.OPEN_MOUTH_HOLD) || has(MirrorBehaviorSignal.FACIAL_GRIMACING)) {
    const sig = has(MirrorBehaviorSignal.LIP_PURSING) ? MirrorBehaviorSignal.LIP_PURSING
              : has(MirrorBehaviorSignal.JAW_TENSION) ? MirrorBehaviorSignal.JAW_TENSION
              : has(MirrorBehaviorSignal.OPEN_MOUTH_HOLD) ? MirrorBehaviorSignal.OPEN_MOUTH_HOLD
              : MirrorBehaviorSignal.FACIAL_GRIMACING;
    activeRegions.push({ key: 'outerLips', tier: tierOf(sig) });
  }

  if (has(MirrorBehaviorSignal.EYE_BLINKING_STRUGGLE)) {
    activeRegions.push({ key: 'leftEye', tier: tierOf(MirrorBehaviorSignal.EYE_BLINKING_STRUGGLE) });
    activeRegions.push({ key: 'rightEye', tier: tierOf(MirrorBehaviorSignal.EYE_BLINKING_STRUGGLE) });
  }

  if (has(MirrorBehaviorSignal.BROW_TENSION)) {
    const t = tierOf(MirrorBehaviorSignal.BROW_TENSION);
    activeRegions.push({ key: 'leftBrow', tier: t });
    activeRegions.push({ key: 'rightBrow', tier: t });
  }

  if (has(MirrorBehaviorSignal.NOSTRIL_FLARE)) {
    activeRegions.push({ key: 'nose', tier: tierOf(MirrorBehaviorSignal.NOSTRIL_FLARE) });
  }

  if (has(MirrorBehaviorSignal.CHEEK_PUFFING)) {
    const t = tierOf(MirrorBehaviorSignal.CHEEK_PUFFING);
    activeRegions.push({ key: 'leftCheek', tier: t });
    activeRegions.push({ key: 'rightCheek', tier: t });
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%">
        {/* Ultra-faint face oval — gives the user a sense of tracking, never alarming. */}
        <Path
          d={buildPath(REGION_PATHS.faceOval, pts, W, H, imgW, imgH)}
          stroke="rgba(255,255,255,0.10)"
          strokeWidth={0.6}
          fill="none"
          strokeLinecap="round"
        />

        {/* Active-signal region overlays — only drawn while the signal is firing. */}
        {activeRegions.map(({ key, tier }, i) => (
          <Path
            key={`${key}-${i}`}
            d={buildPath(REGION_PATHS[key], pts, W, H, imgW, imgH)}
            stroke={TIER_STROKE[tier]}
            strokeWidth={tier === 'A' ? 2.2 : 1.8}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={tier === 'B' ? '4,3' : undefined}
          />
        ))}
      </Svg>
    </View>
  );
};
