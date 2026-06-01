import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated } from 'react-native';
import Svg, { Path, Circle, Line, Defs, LinearGradient, Stop, G } from 'react-native-svg';
import { MirrorBehaviorSignal } from '../types';

import type { FaceLandmark3D } from 'expo-face-landmarker/ExpoFaceLandmarker.types';

// ── Holographic mesh tessellation ────────────────────────────────────────────
// A curated subset of the MediaPipe face mesh — feature outlines + cheek/forehead
// cross-hatching for the "AR tech" look. Kept to ~170 edges for 60fps SVG.
const MESH: [number, number][] = [
  // Face oval
  [10, 338], [338, 297], [297, 332], [332, 284], [284, 251], [251, 389], [389, 356], [356, 454],
  [454, 323], [323, 361], [361, 288], [288, 397], [397, 365], [365, 379], [379, 378], [378, 400],
  [400, 377], [377, 152], [152, 148], [148, 176], [176, 149], [149, 150], [150, 136], [136, 172],
  [172, 58], [58, 132], [132, 93], [93, 234], [234, 127], [127, 162], [162, 21], [21, 54], [54, 103],
  [103, 67], [67, 109], [109, 10],
  // Left eye
  [33, 7], [7, 163], [163, 144], [144, 145], [145, 153], [153, 154], [154, 155], [155, 133],
  [33, 246], [246, 161], [161, 160], [160, 159], [159, 158], [158, 157], [157, 173], [173, 133],
  // Right eye
  [362, 382], [382, 381], [381, 380], [380, 374], [374, 373], [373, 390], [390, 249], [249, 263],
  [362, 398], [398, 384], [384, 385], [385, 386], [386, 387], [387, 388], [388, 466], [466, 263],
  // Brows
  [70, 63], [63, 105], [105, 66], [66, 107], [107, 55], [55, 65], [65, 52], [52, 53], [53, 46],
  [300, 293], [293, 334], [334, 296], [296, 336], [336, 285], [285, 295], [295, 282], [282, 283], [283, 276],
  // Nose
  [168, 6], [6, 197], [197, 195], [195, 5], [5, 4], [4, 1], [1, 19], [19, 94], [94, 2],
  [98, 97], [97, 2], [2, 326], [326, 327],
  // Lips outer
  [61, 146], [146, 91], [91, 181], [181, 84], [84, 17], [17, 314], [314, 405], [405, 321], [321, 375], [375, 291],
  [61, 185], [185, 40], [40, 39], [39, 37], [37, 0], [0, 267], [267, 269], [269, 270], [270, 409], [409, 291],
  // Lips inner
  [78, 95], [95, 88], [88, 178], [178, 87], [87, 14], [14, 317], [317, 402], [402, 318], [318, 324], [324, 308],
  [78, 191], [191, 80], [80, 81], [81, 82], [82, 13], [13, 312], [312, 311], [311, 310], [310, 415], [415, 308],
  // ── Tech cross-hatch (cheeks + forehead + bridge) for the holographic feel ──
  [50, 101], [101, 118], [118, 117], [117, 123], [123, 50], [205, 50], [205, 36], [36, 101], [187, 205],
  [280, 330], [330, 347], [347, 346], [346, 352], [352, 280], [425, 280], [425, 266], [266, 330], [411, 425],
  [151, 108], [108, 69], [151, 337], [337, 299], [9, 107], [9, 336],
  [114, 128], [343, 357], [6, 168],
];

// Glowing node landmarks — key feature points
const NODES = [
  1, 4, 6, 10, 152, 33, 133, 362, 263, 168,
  61, 291, 0, 17, 13, 14, 105, 334, 70, 300,
  234, 454, 93, 323, 199,
];

// Region polylines for active-signal highlight glow
const REGION_PATHS: Record<string, number[]> = {
  leftEye: [33, 246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7, 33],
  rightEye: [362, 398, 384, 385, 386, 387, 388, 466, 263, 249, 390, 373, 374, 380, 381, 382, 362],
  leftBrow: [70, 63, 105, 66, 107, 55, 65, 52, 53, 46],
  rightBrow: [300, 293, 334, 296, 336, 285, 295, 282, 283, 276],
  nose: [168, 6, 197, 195, 5, 4, 1, 19, 94, 2],
  lips: [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146, 61],
};

interface FacialOutlinesProps {
  landmarks?: FaceLandmark3D[];
  imageSize?: { width: number; height: number };
  viewSize?: { width: number; height: number };
  activeSignals: MirrorBehaviorSignal[];
  signalTiers?: Partial<Record<MirrorBehaviorSignal, 'A' | 'B' | 'C'>>;
}

const TIER_GLOW: Record<'A' | 'B' | 'C', string> = {
  A: '#FF8A4C',
  B: '#FBBF24',
  C: '#A78BFA',
};

function toViewPoint(
  p: FaceLandmark3D,
  viewW: number, viewH: number, imgW: number, imgH: number,
): { x: number; y: number } {
  const scale = Math.max(viewW / imgW, viewH / imgH);
  const offsetX = (viewW - imgW * scale) / 2;
  const offsetY = (viewH - imgH * scale) / 2;
  return {
    x: (1 - p.x) * imgW * scale + offsetX,
    y:       p.y  * imgH * scale + offsetY,
  };
}

function regionPath(indices: number[], pts: { x: number; y: number }[]): string {
  if (indices.length === 0) return '';
  return indices
    .filter((i) => i < pts.length)
    .map((i, k) => `${k === 0 ? 'M' : 'L'} ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)}`)
    .join(' ');
}

export const FacialOutlines: React.FC<FacialOutlinesProps> = ({
  landmarks,
  imageSize,
  viewSize,
  activeSignals,
  signalTiers = {},
}) => {
  // Breathing shimmer on the whole holographic layer
  const breath = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 0.9, duration: 1600, useNativeDriver: true }),
        Animated.timing(breath, { toValue: 0.55, duration: 1600, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  if (!viewSize || !landmarks || landmarks.length < 478) return null;

  const { width: W, height: H } = viewSize;
  const imgW = imageSize?.width ?? W;
  const imgH = imageSize?.height ?? H;

  // Pre-project all landmarks once
  const pts = landmarks.map((p) => toViewPoint(p, W, H, imgW, imgH));

  // Face bounding box for the HUD reticle corners
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const pad = 18;
  const bx0 = minX - pad, by0 = minY - pad, bx1 = maxX + pad, by1 = maxY + pad;
  const cornerLen = Math.min(34, (bx1 - bx0) * 0.18);

  // Active-signal region glows
  const has = (s: MirrorBehaviorSignal) => activeSignals.includes(s);
  const tierOf = (s: MirrorBehaviorSignal): 'A' | 'B' | 'C' => signalTiers[s] ?? 'A';
  const activeRegions: Array<{ key: string; color: string }> = [];
  if (has(MirrorBehaviorSignal.LIP_PURSING) || has(MirrorBehaviorSignal.JAW_TENSION) ||
      has(MirrorBehaviorSignal.OPEN_MOUTH_HOLD) || has(MirrorBehaviorSignal.FACIAL_GRIMACING)) {
    const sig = has(MirrorBehaviorSignal.LIP_PURSING) ? MirrorBehaviorSignal.LIP_PURSING
      : has(MirrorBehaviorSignal.JAW_TENSION) ? MirrorBehaviorSignal.JAW_TENSION
      : has(MirrorBehaviorSignal.OPEN_MOUTH_HOLD) ? MirrorBehaviorSignal.OPEN_MOUTH_HOLD
      : MirrorBehaviorSignal.FACIAL_GRIMACING;
    activeRegions.push({ key: 'lips', color: TIER_GLOW[tierOf(sig)] });
  }
  if (has(MirrorBehaviorSignal.EYE_BLINKING_STRUGGLE)) {
    const c = TIER_GLOW[tierOf(MirrorBehaviorSignal.EYE_BLINKING_STRUGGLE)];
    activeRegions.push({ key: 'leftEye', color: c }, { key: 'rightEye', color: c });
  }
  if (has(MirrorBehaviorSignal.BROW_TENSION)) {
    const c = TIER_GLOW[tierOf(MirrorBehaviorSignal.BROW_TENSION)];
    activeRegions.push({ key: 'leftBrow', color: c }, { key: 'rightBrow', color: c });
  }
  if (has(MirrorBehaviorSignal.NOSTRIL_FLARE)) {
    activeRegions.push({ key: 'nose', color: TIER_GLOW[tierOf(MirrorBehaviorSignal.NOSTRIL_FLARE)] });
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: breath }]}>
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="holoMesh" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#22D3EE" stopOpacity="0.9" />
              <Stop offset="100%" stopColor="#A78BFA" stopOpacity="0.9" />
            </LinearGradient>
            <LinearGradient id="holoBright" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#67E8F9" stopOpacity="1" />
              <Stop offset="100%" stopColor="#C4B5FD" stopOpacity="1" />
            </LinearGradient>
          </Defs>

          {/* Tessellated mesh */}
          <G>
            {MESH.map(([a, b], i) => {
              if (a >= pts.length || b >= pts.length) return null;
              return (
                <Line
                  key={`m${i}`}
                  x1={pts[a].x} y1={pts[a].y}
                  x2={pts[b].x} y2={pts[b].y}
                  stroke="url(#holoMesh)"
                  strokeWidth={0.7}
                  strokeOpacity={0.5}
                  strokeLinecap="round"
                />
              );
            })}
          </G>

          {/* Glowing nodes */}
          {NODES.map((idx, i) => {
            if (idx >= pts.length) return null;
            return (
              <G key={`n${i}`}>
                <Circle cx={pts[idx].x} cy={pts[idx].y} r={2.6} fill="#22D3EE" fillOpacity={0.18} />
                <Circle cx={pts[idx].x} cy={pts[idx].y} r={1.1} fill="#67E8F9" fillOpacity={0.95} />
              </G>
            );
          })}

          {/* HUD reticle corners on the face bbox */}
          <G stroke="url(#holoBright)" strokeWidth={2} strokeLinecap="round" fill="none" opacity={0.8}>
            <Path d={`M ${bx0} ${by0 + cornerLen} L ${bx0} ${by0} L ${bx0 + cornerLen} ${by0}`} />
            <Path d={`M ${bx1 - cornerLen} ${by0} L ${bx1} ${by0} L ${bx1} ${by0 + cornerLen}`} />
            <Path d={`M ${bx0} ${by1 - cornerLen} L ${bx0} ${by1} L ${bx0 + cornerLen} ${by1}`} />
            <Path d={`M ${bx1 - cornerLen} ${by1} L ${bx1} ${by1} L ${bx1} ${by1 - cornerLen}`} />
          </G>
        </Svg>
      </Animated.View>

      {/* Active-signal region glows — full opacity (not breathing) so they read clearly */}
      {activeRegions.length > 0 && (
        <View style={StyleSheet.absoluteFill}>
          <Svg width="100%" height="100%">
            {activeRegions.map(({ key, color }, i) => (
              <G key={`r${i}`}>
                {/* outer soft glow */}
                <Path
                  d={regionPath(REGION_PATHS[key], pts)}
                  stroke={color}
                  strokeWidth={6}
                  strokeOpacity={0.18}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* crisp inner stroke */}
                <Path
                  d={regionPath(REGION_PATHS[key], pts)}
                  stroke={color}
                  strokeWidth={2}
                  strokeOpacity={0.95}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </G>
            ))}
          </Svg>
        </View>
      )}
    </View>
  );
};
