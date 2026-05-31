/**
 * MediaPipe Face Landmarker result types.
 * One blendshape per 52 facial muscle activations (0.0 – 1.0).
 */
export interface Blendshape {
  name: string;
  score: number; // 0.0 = relaxed, 1.0 = maximum activation
}

/** A single 3D facial landmark in normalized screen coordinates (0–1). */
export interface FaceLandmark3D {
  x: number;
  y: number;
  z: number;
}

/** Head pose angles in degrees derived from the 4×4 facial transformation matrix. */
export interface HeadPose {
  yaw: number;   // left/right turn — positive = turned right
  pitch: number; // up/down tilt — positive = tilted down
  roll: number;  // head tilt left/right — positive = tilted right
}

/** The full detection result returned for one frame. */
export interface FaceLandmarkerResult {
  /** 52 blendshape coefficients. */
  blendshapes: Blendshape[];
  /** 478 3D facial landmarks (normalized 0-1 screen coords). */
  landmarks: FaceLandmark3D[];
  /** Head pose from facial transformation matrix (VIDEO mode). */
  headPose?: HeadPose;
  /** Image dimensions post-rotation (for overlay cover-crop calculation). */
  imageWidth?: number;
  imageHeight?: number;
}

// ── Named blendshape keys (MediaPipe canonical names) ──
// Using a const object so consumers can reference by key without typos.
export const BLENDSHAPE = {
  // Jaw
  JAW_OPEN: 'jawOpen',
  JAW_FORWARD: 'jawForward',
  JAW_LEFT: 'jawLeft',
  JAW_RIGHT: 'jawRight',
  // Lips
  MOUTH_PUCKER: 'mouthPucker',
  MOUTH_FUNNEL: 'mouthFunnel',
  MOUTH_TIGHTENER_LEFT: 'mouthTightenerLeft',
  MOUTH_TIGHTENER_RIGHT: 'mouthTightenerRight',
  MOUTH_PRESS_LEFT: 'mouthPressLeft',
  MOUTH_PRESS_RIGHT: 'mouthPressRight',
  MOUTH_CLOSE: 'mouthClose',
  MOUTH_STRETCH_LEFT: 'mouthStretchLeft',
  MOUTH_STRETCH_RIGHT: 'mouthStretchRight',
  MOUTH_SMILE_LEFT: 'mouthSmileLeft',
  MOUTH_SMILE_RIGHT: 'mouthSmileRight',
  MOUTH_FROWN_LEFT: 'mouthFrownLeft',
  MOUTH_FROWN_RIGHT: 'mouthFrownRight',
  MOUTH_DIMPLE_LEFT: 'mouthDimpleLeft',
  MOUTH_DIMPLE_RIGHT: 'mouthDimpleRight',
  MOUTH_LEFT: 'mouthLeft',
  MOUTH_RIGHT: 'mouthRight',
  MOUTH_UPPER_UP_LEFT: 'mouthUpperUpLeft',
  MOUTH_UPPER_UP_RIGHT: 'mouthUpperUpRight',
  MOUTH_LOWER_DOWN_LEFT: 'mouthLowerDownLeft',
  MOUTH_LOWER_DOWN_RIGHT: 'mouthLowerDownRight',
  // Brow
  BROW_DOWN_LEFT: 'browDownLeft',
  BROW_DOWN_RIGHT: 'browDownRight',
  BROW_INNER_UP: 'browInnerUp',
  BROW_OUTER_UP_LEFT: 'browOuterUpLeft',
  BROW_OUTER_UP_RIGHT: 'browOuterUpRight',
  // Eye
  EYE_BLINK_LEFT: 'eyeBlinkLeft',
  EYE_BLINK_RIGHT: 'eyeBlinkRight',
  EYE_SQUINT_LEFT: 'eyeSquintLeft',
  EYE_SQUINT_RIGHT: 'eyeSquintRight',
  EYE_WIDE_LEFT: 'eyeWideLeft',
  EYE_WIDE_RIGHT: 'eyeWideRight',
  EYE_LOOK_UP_LEFT: 'eyeLookUpLeft',
  EYE_LOOK_UP_RIGHT: 'eyeLookUpRight',
  EYE_LOOK_DOWN_LEFT: 'eyeLookDownLeft',
  EYE_LOOK_DOWN_RIGHT: 'eyeLookDownRight',
  EYE_LOOK_IN_LEFT: 'eyeLookInLeft',
  EYE_LOOK_OUT_LEFT: 'eyeLookOutLeft',
  EYE_LOOK_IN_RIGHT: 'eyeLookInRight',
  EYE_LOOK_OUT_RIGHT: 'eyeLookOutRight',
  // Cheek & nose
  CHEEK_PUFF: 'cheekPuff',
  CHEEK_SQUINT_LEFT: 'cheekSquintLeft',
  CHEEK_SQUINT_RIGHT: 'cheekSquintRight',
  NOSE_SNEER_LEFT: 'noseSneerLeft',
  NOSE_SNEER_RIGHT: 'noseSneerRight',
  // Tongue
  TONGUE_OUT: 'tongueOut',
} as const;
