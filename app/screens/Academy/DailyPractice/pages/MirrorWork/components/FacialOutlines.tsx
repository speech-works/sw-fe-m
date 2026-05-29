import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import { Face } from 'react-native-vision-camera-face-detector';
import { MirrorBehaviorSignal } from '../types';

interface Point {
  x: number;
  y: number;
}

interface FacialOutlinesProps {
  contours?: Face['contours'];
  frameSize?: { width: number; height: number };
  viewSize?: { width: number; height: number };
  activeSignals: MirrorBehaviorSignal[];
}

export const FacialOutlines: React.FC<FacialOutlinesProps> = ({
  contours,
  frameSize,
  viewSize,
  activeSignals,
}) => {
  if (!contours || !viewSize) return null;

  // With autoMode enabled in useFaceDetector, the library already accounts for
  // front-camera mirroring and device rotation. Coordinates are in screen space
  // (0 → SCREEN_W, 0 → SCREEN_H). We just pass them through directly.
  const pointsToPolygonString = (points?: Point[]) => {
    if (!points || points.length === 0) return '';
    return points.map((p) => `${p.x},${p.y}`).join(' ');
  };

  // ── Determine which areas to highlight based on active signals ──
  const hasMouthTension = activeSignals.some(s => [
    MirrorBehaviorSignal.JAW_TENSION,
    MirrorBehaviorSignal.LIP_PURSING,
    MirrorBehaviorSignal.OPEN_MOUTH_HOLD,
    MirrorBehaviorSignal.FACIAL_GRIMACING
  ].includes(s));

  const hasEyeTension = activeSignals.includes(MirrorBehaviorSignal.EYE_BLINKING_STRUGGLE);
  const hasBrowTension = activeSignals.includes(MirrorBehaviorSignal.BROW_TENSION);
  const hasNoseTension = activeSignals.includes(MirrorBehaviorSignal.NOSTRIL_FLARE);
  const hasCheekTension = activeSignals.includes(MirrorBehaviorSignal.CHEEK_PUFFING);

  // General face tint if composite tension
  const hasFaceTension = activeSignals.includes(MirrorBehaviorSignal.FACIAL_TENSION_COMPOSITE) ||
                         activeSignals.includes(MirrorBehaviorSignal.HEAD_JERKING);

  const TENSION_FILL = 'rgba(255, 100, 50, 0.4)';
  const IDLE_FILL = 'transparent';
  const OUTLINE_COLOR = 'rgba(255, 255, 255, 0.3)';
  const OUTLINE_WIDTH = 1.5;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%">
        {/* Face Outline */}
        <Polygon
          points={pointsToPolygonString(contours.FACE)}
          fill={hasFaceTension ? TENSION_FILL : IDLE_FILL}
          stroke={OUTLINE_COLOR}
          strokeWidth={OUTLINE_WIDTH}
        />

        {/* Mouth */}
        <Polygon
          points={pointsToPolygonString([
            ...(contours.UPPER_LIP_TOP || []),
            ...(contours.LOWER_LIP_BOTTOM || []).reverse()
          ])}
          fill={hasMouthTension ? TENSION_FILL : IDLE_FILL}
          stroke={OUTLINE_COLOR}
          strokeWidth={OUTLINE_WIDTH}
        />

        {/* Eyes */}
        <Polygon
          points={pointsToPolygonString(contours.LEFT_EYE)}
          fill={hasEyeTension ? TENSION_FILL : IDLE_FILL}
          stroke={OUTLINE_COLOR}
          strokeWidth={OUTLINE_WIDTH}
        />
        <Polygon
          points={pointsToPolygonString(contours.RIGHT_EYE)}
          fill={hasEyeTension ? TENSION_FILL : IDLE_FILL}
          stroke={OUTLINE_COLOR}
          strokeWidth={OUTLINE_WIDTH}
        />

        {/* Brows */}
        <Polygon
          points={pointsToPolygonString([
            ...(contours.LEFT_EYEBROW_TOP || []),
            ...(contours.LEFT_EYEBROW_BOTTOM || []).reverse()
          ])}
          fill={hasBrowTension ? TENSION_FILL : IDLE_FILL}
          stroke={OUTLINE_COLOR}
          strokeWidth={OUTLINE_WIDTH}
        />
        <Polygon
          points={pointsToPolygonString([
            ...(contours.RIGHT_EYEBROW_TOP || []),
            ...(contours.RIGHT_EYEBROW_BOTTOM || []).reverse()
          ])}
          fill={hasBrowTension ? TENSION_FILL : IDLE_FILL}
          stroke={OUTLINE_COLOR}
          strokeWidth={OUTLINE_WIDTH}
        />

        {/* Nose */}
        <Polygon
          points={pointsToPolygonString(contours.NOSE_BOTTOM)}
          fill={hasNoseTension ? TENSION_FILL : IDLE_FILL}
          stroke={OUTLINE_COLOR}
          strokeWidth={OUTLINE_WIDTH}
        />

        {/* Cheeks */}
        <Polygon
          points={pointsToPolygonString(contours.LEFT_CHEEK)}
          fill={hasCheekTension ? TENSION_FILL : IDLE_FILL}
          stroke={OUTLINE_COLOR}
          strokeWidth={OUTLINE_WIDTH}
        />
        <Polygon
          points={pointsToPolygonString(contours.RIGHT_CHEEK)}
          fill={hasCheekTension ? TENSION_FILL : IDLE_FILL}
          stroke={OUTLINE_COLOR}
          strokeWidth={OUTLINE_WIDTH}
        />
      </Svg>
    </View>
  );
};
