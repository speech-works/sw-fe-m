import { useState, useRef, useEffect, useCallback } from "react";
import { useFrameProcessor } from "react-native-vision-camera";
import { useFaceDetector, Face } from "react-native-vision-camera-face-detector";
import { Worklets, useRunOnJS } from "react-native-worklets-core";
import { MirrorBehaviorAnalyzer, UserBaseline } from "../util/mirrorBehaviorAnalyzer";
import { MirrorBehaviorSignal } from "../types";

const CALIBRATION_DURATION_MS = 15000;
const NO_FACE_DEBOUNCE_MS = 3000;
const FRAME_SAMPLING_INTERVAL = 3; // Process every 3rd frame

export interface FaceDetectionState {
  isCalibrating: boolean;
  faceInFrame: boolean;
  activeSignals: MirrorBehaviorSignal[];
  baseline: UserBaseline | null;
  lightingWarning: boolean;
}

export function useFaceDetection(isActive: boolean) {
  const [state, setState] = useState<FaceDetectionState>({
    isCalibrating: true,
    faceInFrame: true,
    activeSignals: [],
    baseline: null,
    lightingWarning: false,
  });

  const analyzerRef = useRef(new MirrorBehaviorAnalyzer());
  const frameCountRef = useRef(0);

  // Calibration State
  const calibrationStartTimeRef = useRef<number | null>(null);
  const calibrationBufferRef = useRef<Face[]>([]);

  // No-Face State
  const noFaceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleDetection = useCallback((faces: Face[]) => {
    const timestampMs = Date.now();
    const faceCount = faces.length;

    if (faceCount === 0) {
      if (!noFaceTimerRef.current) {
        noFaceTimerRef.current = setTimeout(() => {
          setState((prev) => ({ ...prev, faceInFrame: false }));
        }, NO_FACE_DEBOUNCE_MS);
      }
      return;
    }

    // Face is present
    if (noFaceTimerRef.current) {
      clearTimeout(noFaceTimerRef.current);
      noFaceTimerRef.current = null;
    }

    const face = faces[0]; // Assume single most prominent face

    setState((prev) => {
      if (!prev.faceInFrame) return { ...prev, faceInFrame: true };
      return prev;
    });

    if (state.isCalibrating) {
      if (!calibrationStartTimeRef.current) {
        calibrationStartTimeRef.current = timestampMs;
      }

      calibrationBufferRef.current.push(face);

      if (timestampMs - calibrationStartTimeRef.current >= CALIBRATION_DURATION_MS) {
        // Compute baseline
        const buffer = calibrationBufferRef.current;
        if (buffer.length > 0) {
          let totalBlinks = 0;
          let totalJaw = 0;
          let totalBrowY = 0;
          let totalYaw = 0;
          let framesWithBrow = 0;

          buffer.forEach((f) => {
            if (f.leftEyeOpenProbability < 0.1 && f.rightEyeOpenProbability < 0.1) {
              totalBlinks++;
            }
            if (f.landmarks && f.landmarks.MOUTH_BOTTOM && f.landmarks.NOSE_BASE) {
              totalJaw += (f.landmarks.MOUTH_BOTTOM.y - f.landmarks.NOSE_BASE.y);
            }
            if (f.contours && f.contours.LEFT_EYEBROW_BOTTOM) {
              const browY = f.contours.LEFT_EYEBROW_BOTTOM.reduce((sum, p) => sum + p.y, 0) / f.contours.LEFT_EYEBROW_BOTTOM.length;
              totalBrowY += browY;
              framesWithBrow++;
            }
            totalYaw += f.yawAngle;
          });

          // A basic heuristic for blink count during 15s. (This counts frames closed, not unique blinks, but it's an ok proxy, or we can just divide).
          // Actually, we'll just set an average blink rate for now.
          const baseline: UserBaseline = {
            blinkRatePerSecond: (totalBlinks / buffer.length) * 10, // Approx
            neutralJawDistance: totalJaw / buffer.length,
            neutralBrowY: framesWithBrow > 0 ? totalBrowY / framesWithBrow : 0,
            neutralEulerYaw: totalYaw / buffer.length,
          };

          analyzerRef.current.setBaseline(baseline);
          setState((prev) => ({ ...prev, isCalibrating: false, baseline }));
        }
      }
    } else {
      // Normal Detection
      const detectionResult = analyzerRef.current.analyzeFrame(face, timestampMs);
      setState((prev) => ({
        ...prev,
        activeSignals: detectionResult.signals,
        lightingWarning: detectionResult.lightingWarning,
      }));
    }
  }, [state.isCalibrating]);

  const { detectFaces } = useFaceDetector({
    performanceMode: 'accurate',
    landmarkMode: 'all',
    contourMode: 'all',
    classificationMode: 'all',
    minFaceSize: 0.1,
    trackingEnabled: true,
  });

  const handleDetectionWorklet = Worklets.createRunOnJS(handleDetection);

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    if (!isActive) return;

    frameCountRef.current += 1;
    if (frameCountRef.current % FRAME_SAMPLING_INTERVAL !== 0) return;

    const faces = detectFaces(frame);
    handleDetectionWorklet(faces);
  }, [isActive, handleDetectionWorklet]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (noFaceTimerRef.current) {
        clearTimeout(noFaceTimerRef.current);
      }
    };
  }, []);

  return {
    state,
    frameProcessor,
  };
}
