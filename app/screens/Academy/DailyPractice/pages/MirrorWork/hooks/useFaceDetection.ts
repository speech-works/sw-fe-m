import { useState, useRef, useEffect, useCallback } from "react";
import { useFrameProcessor } from "react-native-vision-camera";
import { useFaceDetector, Face } from "react-native-vision-camera-face-detector";
import { Worklets } from "react-native-worklets-core";
import { MirrorBehaviorAnalyzer, UserBaseline } from "../util/mirrorBehaviorAnalyzer";
import { MirrorBehaviorSignal } from "../types";

const CALIBRATION_DURATION_MS = 15000;
const NO_FACE_DEBOUNCE_MS = 3000;
const FRAME_SAMPLING_INTERVAL = 3; // Process every 3rd frame

export interface FaceDetectionState {
  isCalibrating: boolean;
  faceInFrame: boolean;
  /** Signals that are currently active (for overlay/nudge display). */
  activeSignals: MirrorBehaviorSignal[];
  /** Signals that transitioned to active THIS frame (for event counting). */
  newSignals: MirrorBehaviorSignal[];
  baseline: UserBaseline | null;
  lightingWarning: boolean;
}

export function useFaceDetection(isActive: boolean) {
  const [state, setState] = useState<FaceDetectionState>({
    isCalibrating: true,
    faceInFrame: true,
    activeSignals: [],
    newSignals: [],
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

    const face = faces[0]; // Most prominent face

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
        const buffer = calibrationBufferRef.current;
        if (buffer.length > 0) {
          // ── Compute mouth aperture baseline ──
          let totalMouthAperture = 0;
          let apertureFrames = 0;

          // ── Compute inner brow distance baseline ──
          let totalInnerBrowDist = 0;
          let browFrames = 0;

          // ── Compute nostril width baseline ──
          let totalNostrilWidth = 0;
          let nostrilFrames = 0;

          // ── Compute cheek area baseline ──
          let totalCheekArea = 0;
          let cheekFrames = 0;

          // ── Compute yaw baseline ──
          let totalYaw = 0;

          // ── Compute blink rate ──
          // Count unique blink events: transitions from open → closed → open
          let blinkCount = 0;
          let wasEyeClosed = false;

          buffer.forEach((f) => {
            // Mouth Aperture (distance between inner lip edges)
            if (f.contours && f.contours.UPPER_LIP_BOTTOM && f.contours.LOWER_LIP_TOP) {
              const upperY =
                f.contours.UPPER_LIP_BOTTOM.reduce((sum, p) => sum + p.y, 0) /
                f.contours.UPPER_LIP_BOTTOM.length;
              const lowerY =
                f.contours.LOWER_LIP_TOP.reduce((sum, p) => sum + p.y, 0) /
                f.contours.LOWER_LIP_TOP.length;
              totalMouthAperture += Math.abs(lowerY - upperY);
              apertureFrames++;
            }

            // Inner Brow Distance (Horizontal Squeeze)
            if (f.contours && f.contours.LEFT_EYEBROW_BOTTOM && f.contours.RIGHT_EYEBROW_BOTTOM) {
              // Find the rightmost point of the left eyebrow
              const leftInnerX = Math.max(...f.contours.LEFT_EYEBROW_BOTTOM.map(p => p.x));
              // Find the leftmost point of the right eyebrow
              const rightInnerX = Math.min(...f.contours.RIGHT_EYEBROW_BOTTOM.map(p => p.x));
              
              if (rightInnerX > leftInnerX) { // sanity check
                totalInnerBrowDist += (rightInnerX - leftInnerX);
                browFrames++;
              }
            }

            // Nostril Width (NOSE_BOTTOM contour horizontal span)
            if (f.contours && f.contours.NOSE_BOTTOM && f.contours.NOSE_BOTTOM.length > 0) {
              const xs = f.contours.NOSE_BOTTOM.map(p => p.x);
              totalNostrilWidth += Math.max(...xs) - Math.min(...xs);
              nostrilFrames++;
            }

            // Cheek Area (average bounding-rect area of left + right cheek contours)
            if (f.contours && f.contours.LEFT_CHEEK && f.contours.RIGHT_CHEEK &&
                f.contours.LEFT_CHEEK.length > 0 && f.contours.RIGHT_CHEEK.length > 0) {
              const lxs = f.contours.LEFT_CHEEK.map(p => p.x);
              const lys = f.contours.LEFT_CHEEK.map(p => p.y);
              const rxs = f.contours.RIGHT_CHEEK.map(p => p.x);
              const rys = f.contours.RIGHT_CHEEK.map(p => p.y);
              const leftArea = (Math.max(...lxs) - Math.min(...lxs)) * (Math.max(...lys) - Math.min(...lys));
              const rightArea = (Math.max(...rxs) - Math.min(...rxs)) * (Math.max(...rys) - Math.min(...rys));
              totalCheekArea += (leftArea + rightArea) / 2;
              cheekFrames++;
            }

            // Yaw
            totalYaw += f.yawAngle;

            // Blink detection (count transitions: open→closed→open)
            const eyesClosed = f.leftEyeOpenProbability < 0.15 && f.rightEyeOpenProbability < 0.15;
            if (wasEyeClosed && !eyesClosed) {
              blinkCount++; // Completed a blink
            }
            wasEyeClosed = eyesClosed;
          });

          const calibrationDurationSec = CALIBRATION_DURATION_MS / 1000;

          const baseline: UserBaseline = {
            blinkRatePerSecond: blinkCount / calibrationDurationSec,
            neutralMouthAperture: apertureFrames > 0 ? totalMouthAperture / apertureFrames : 0,
            neutralInnerBrowDist: browFrames > 0 ? totalInnerBrowDist / browFrames : 0,
            neutralNostrilWidth: nostrilFrames > 0 ? totalNostrilWidth / nostrilFrames : 0,
            neutralCheekArea: cheekFrames > 0 ? totalCheekArea / cheekFrames : 0,
            neutralEulerYaw: totalYaw / buffer.length,
          };

          console.log("[MirrorWork] Calibration complete:", JSON.stringify(baseline));

          analyzerRef.current.setBaseline(baseline);
          setState((prev) => ({ ...prev, isCalibrating: false, baseline }));
        }
      }
    } else {
      // Normal Detection
      const detectionResult = analyzerRef.current.analyzeFrame(face, timestampMs);
      setState((prev) => ({
        ...prev,
        activeSignals: detectionResult.activeSignals,
        newSignals: detectionResult.newSignals,
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
