import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { MirrorBehaviorSignal } from '../types';

import type { Face } from 'react-native-vision-camera-face-detector';
import type { FaceLandmark3D } from 'expo-face-landmarker/ExpoFaceLandmarker.types';


// ── MediaPipe Face Mesh connection indices ──
// Canonical subset drawn from the 478-landmark mesh for key facial regions.
// Full tessellation reference: https://github.com/google/mediapipe/blob/master/mediapipe/python/solutions/face_mesh_connections.py
const MESH_CONNECTIONS: [number, number][] = [
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
  // Left eyebrow
  [70, 63], [63, 105], [105, 66], [66, 107], [107, 55], [55, 65], [65, 52], [52, 53], [53, 46],
  // Right eyebrow
  [300, 293], [293, 334], [334, 296], [296, 336], [336, 285], [285, 295], [295, 282], [282, 283], [283, 276],
  // Nose
  [168, 6], [6, 197], [197, 195], [195, 5], [5, 4], [4, 1], [1, 19], [19, 94], [94, 2],
  [98, 97], [97, 2], [2, 326], [326, 327], [327, 294], [294, 278], [278, 344], [344, 440],
  [440, 275], [275, 4], [4, 45], [45, 220], [220, 115], [115, 48], [48, 64], [64, 98],
  // Lips outer
  [61, 146], [146, 91], [91, 181], [181, 84], [84, 17], [17, 314], [314, 405], [405, 321], [321, 375], [375, 291],
  [61, 185], [185, 40], [40, 39], [39, 37], [37, 0], [0, 267], [267, 269], [269, 270], [270, 409], [409, 291],
  // Lips inner
  [78, 95], [95, 88], [88, 178], [178, 87], [87, 14], [14, 317], [317, 402], [402, 318], [318, 324], [324, 308],
  [78, 191], [191, 80], [80, 81], [81, 82], [82, 13], [13, 312], [312, 311], [311, 310], [310, 415], [415, 308],
];

// Region index sets for tension highlighting
const REGIONS = {
  leftEye: [33, 7, 163, 144, 145, 153, 154, 155, 133, 246, 161, 160, 159, 158, 157, 173],
  rightEye: [362, 382, 381, 380, 374, 373, 390, 249, 263, 398, 384, 385, 386, 387, 388, 466],
  leftBrow: [70, 63, 105, 66, 107, 55, 65, 52, 53, 46],
  rightBrow: [300, 293, 334, 296, 336, 285, 295, 282, 283, 276],
  nose: [1, 2, 5, 4, 6, 168, 197, 195, 19, 94, 98, 97, 326, 327, 294, 278, 344, 440, 275, 45, 220, 115, 48, 64],
  lips: [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 185, 40, 39, 37, 0, 267, 269, 270, 409,
    78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 191, 80, 81, 82, 13, 312, 311, 310, 415],
  leftCheek: [123, 116, 117, 118, 119, 120, 121, 128, 50, 101, 205, 36, 142, 126, 209, 49],
  rightCheek: [352, 345, 346, 347, 348, 349, 350, 357, 280, 330, 425, 266, 371, 355, 429, 279],
};

interface FacialOutlinesProps {
  // V2: MediaPipe 478-point landmarks (normalized 0-1)
  landmarks?: FaceLandmark3D[];
  // V1: ML Kit contours fallback
  contours?: Face['contours'];
  frameSize?: { width: number; height: number };
  viewSize?: { width: number; height: number };
  activeSignals: MirrorBehaviorSignal[];
}

function interpolatePoint(p: FaceLandmark3D, viewW: number, viewH: number) {
  return { x: p.x * viewW, y: p.y * viewH };
}

export const FacialOutlines: React.FC<FacialOutlinesProps> = ({
  landmarks,
  contours,
  viewSize,
  activeSignals,
}) => {
  if (!viewSize) return null;

  const { width: W, height: H } = viewSize;

  // ── Signal → region highlight mapping ──
  const hasMouthTension = activeSignals.some((s) =>
    [MirrorBehaviorSignal.JAW_TENSION, MirrorBehaviorSignal.LIP_PURSING,
    MirrorBehaviorSignal.OPEN_MOUTH_HOLD, MirrorBehaviorSignal.FACIAL_GRIMACING].includes(s));
  const hasEyeTension = activeSignals.includes(MirrorBehaviorSignal.EYE_BLINKING_STRUGGLE);
  const hasBrowTension = activeSignals.includes(MirrorBehaviorSignal.BROW_TENSION);
  const hasNoseTension = activeSignals.includes(MirrorBehaviorSignal.NOSTRIL_FLARE);
  const hasCheekTension = activeSignals.includes(MirrorBehaviorSignal.CHEEK_PUFFING);

  const TENSION_COLOR = 'rgba(255, 100, 50, 0.55)';
  const MESH_COLOR = 'rgba(255, 255, 255, 0.18)';
  const TENSION_MESH_COLOR = 'rgba(255, 140, 80, 0.7)';

  // V2: Render MediaPipe 478-point mesh
  if (landmarks && landmarks.length >= 478) {
    const pts = landmarks;

    const getRegionHighlightColor = (idx: number): string | null => {
      if (hasMouthTension && REGIONS.lips.includes(idx)) return TENSION_COLOR;
      if (hasEyeTension && (REGIONS.leftEye.includes(idx) || REGIONS.rightEye.includes(idx))) return TENSION_COLOR;
      if (hasBrowTension && (REGIONS.leftBrow.includes(idx) || REGIONS.rightBrow.includes(idx))) return TENSION_COLOR;
      if (hasNoseTension && REGIONS.nose.includes(idx)) return TENSION_COLOR;
      if (hasCheekTension && (REGIONS.leftCheek.includes(idx) || REGIONS.rightCheek.includes(idx))) return TENSION_COLOR;
      return null;
    };

    const isEdgeTensed = (a: number, b: number): boolean => {
      return getRegionHighlightColor(a) !== null || getRegionHighlightColor(b) !== null;
    };

    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width="100%" height="100%">
          {MESH_CONNECTIONS.map(([a, b], i) => {
            if (a >= pts.length || b >= pts.length) return null;
            const p1 = interpolatePoint(pts[a], W, H);
            const p2 = interpolatePoint(pts[b], W, H);
            const tensed = isEdgeTensed(a, b);
            return (
              <Path
                key={i}
                d={`M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`}
                stroke={tensed ? TENSION_MESH_COLOR : MESH_COLOR}
                strokeWidth={tensed ? 1.5 : 0.8}
                strokeLinecap="round"
              />
            );
          })}
          {/* Tension landmark dots — draw on active region points */}
          {activeSignals.length > 0 && pts.map((lm, i) => {
            const color = getRegionHighlightColor(i);
            if (!color) return null;
            const { x, y } = interpolatePoint(lm, W, H);
            return (
              <Circle key={`dot-${i}`} cx={x} cy={y} r={1.5} fill={color} />
            );
          })}
        </Svg>
      </View>
    );
  }

  // V1: Fallback to ML Kit contours (used during Phase 1 transition)
  if (contours) {
    const pointsToPath = (points?: { x: number; y: number }[]) => {
      if (!points || points.length === 0) return '';
      return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
    };

    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width="100%" height="100%">
          <Path d={pointsToPath(contours.FACE)} stroke={MESH_COLOR} strokeWidth={1} fill="none" />
          <Path d={pointsToPath(contours.LEFT_EYE)} stroke={hasEyeTension ? TENSION_MESH_COLOR : MESH_COLOR} strokeWidth={1} fill={hasEyeTension ? TENSION_COLOR : 'none'} />
          <Path d={pointsToPath(contours.RIGHT_EYE)} stroke={hasEyeTension ? TENSION_MESH_COLOR : MESH_COLOR} strokeWidth={1} fill={hasEyeTension ? TENSION_COLOR : 'none'} />
          <Path d={pointsToPath(contours.UPPER_LIP_TOP)} stroke={hasMouthTension ? TENSION_MESH_COLOR : MESH_COLOR} strokeWidth={1} fill="none" />
          <Path d={pointsToPath(contours.LOWER_LIP_BOTTOM)} stroke={hasMouthTension ? TENSION_MESH_COLOR : MESH_COLOR} strokeWidth={1} fill="none" />
          <Path d={pointsToPath(contours.NOSE_BOTTOM)} stroke={hasNoseTension ? TENSION_MESH_COLOR : MESH_COLOR} strokeWidth={1} fill={hasNoseTension ? TENSION_COLOR : 'none'} />
          <Path d={pointsToPath(contours.LEFT_CHEEK)} stroke={hasCheekTension ? TENSION_MESH_COLOR : MESH_COLOR} strokeWidth={1} fill={hasCheekTension ? TENSION_COLOR : 'none'} />
          <Path d={pointsToPath(contours.RIGHT_CHEEK)} stroke={hasCheekTension ? TENSION_MESH_COLOR : MESH_COLOR} strokeWidth={1} fill={hasCheekTension ? TENSION_COLOR : 'none'} />
        </Svg>
      </View>
    );
  }

  return null;
};
