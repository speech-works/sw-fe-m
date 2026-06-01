import { useState, useRef, useEffect, useCallback } from "react";
import { Dimensions } from "react-native";
import { useFrameProcessor } from "react-native-vision-camera";
import { useFaceDetector, Face } from "react-native-vision-camera-face-detector";
import { Worklets } from "react-native-worklets-core";
import { MirrorBehaviorAnalyzer, UserBaseline } from "../util/mirrorBehaviorAnalyzer";
import { MirrorBehaviorSignal } from "../types";

const SCREEN = Dimensions.get('screen');
const SCREEN_W = SCREEN.width;
const SCREEN_H = SCREEN.height;

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
  /** Raw facial contours for rendering the heatmap SVG */
  latestContours?: Face['contours'];
  /** Frame size required to map ML Kit coordinates to the screen */
  frameSize?: { width: number; height: number };
  /** Calibration progress 0–1 */
  calibrationProgress: number;
}

export function useFaceDetection(
  isActive: boolean,
  isSilent?: (threshold: number) => boolean
) {
  const [state, setState] = useState<FaceDetectionState>({
    isCalibrating: true,
    faceInFrame: true,
    activeSignals: [],
    newSignals: [],
    baseline: null,
    lightingWarning: false,
    calibrationProgress: 0,
  });

  const analyzerRef = useRef(new MirrorBehaviorAnalyzer());

  // ── FIX: Use refs for values read inside worklet-bridged callbacks ──
  // These avoid stale-closure issues entirely.
  const isCalibatingRef = useRef(true);
  const isSilentRef = useRef(isSilent);
  const frameCountRef = useRef(0); // Only mutated on JS thread now

  // Keep isSilentRef current when prop changes
  useEffect(() => {
    isSilentRef.current = isSilent;
  }, [isSilent]);

  // Keep isCalibatingRef in sync with state
  useEffect(() => {
    isCalibatingRef.current = state.isCalibrating;
  }, [state.isCalibrating]);

  // Calibration State
  const calibrationStartTimeRef = useRef<number | null>(null);
  const calibrationBufferRef = useRef<Face[]>([]);
  const calibrationPausedRef = useRef(false); // Paused when face leaves frame

  // No-Face State
  const noFaceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleDetection = useCallback((faces: Face[], frameWidth: number, frameHeight: number) => {
    const timestampMs = Date.now();
    const faceCount = faces.length;

    if (faceCount === 0) {
      // Pause calibration when face is out of frame
      calibrationPausedRef.current = true;

      if (!noFaceTimerRef.current) {
        noFaceTimerRef.current = setTimeout(() => {
          setState((prev) => ({ ...prev, faceInFrame: false }));
        }, NO_FACE_DEBOUNCE_MS);
      }
      return;
    }

    // Face is present — resume calibration if paused
    calibrationPausedRef.current = false;

    if (noFaceTimerRef.current) {
      clearTimeout(noFaceTimerRef.current);
      noFaceTimerRef.current = null;
    }

    const face = faces[0]; // Most prominent face

    setState((prev) => {
      if (!prev.faceInFrame) return { ...prev, faceInFrame: true };
      return prev;
    });

    // ── FIX: Read calibration state from ref, not from stale closure ──
    if (isCalibatingRef.current) {
      if (!calibrationStartTimeRef.current) {
        calibrationStartTimeRef.current = timestampMs;
      }

      calibrationBufferRef.current.push(face);

      const elapsed = timestampMs - calibrationStartTimeRef.current;
      const progress = Math.min(elapsed / CALIBRATION_DURATION_MS, 1);

      // Update progress every ~500ms to avoid flooding setState
      setState((prev) => {
        const prevProgress = prev.calibrationProgress;
        if (Math.abs(progress - prevProgress) > 0.03) {
          return { ...prev, calibrationProgress: progress };
        }
        return prev;
      });

      if (elapsed >= CALIBRATION_DURATION_MS) {
        const buffer = calibrationBufferRef.current;
        if (buffer.length > 0) {
          // ── Compute mouth aperture baseline ──
          let totalMouthAperture = 0;
          let apertureFrames = 0;
          let apertureVarianceSum = 0;
          const apertureValues: number[] = [];

          // ── Compute inner brow distance baseline ──
          let totalInnerBrowDist = 0;
          let browFrames = 0;
          const browValues: number[] = [];

          // ── Compute nostril width baseline ──
          let totalNostrilWidth = 0;
          let nostrilFrames = 0;
          const nostrilValues: number[] = [];

          // ── Compute cheek area baseline ──
          let totalCheekArea = 0;
          let cheekFrames = 0;
          const cheekValues: number[] = [];

          // ── Compute yaw baseline ──
          let totalYaw = 0;

          // ── Compute blink rate ──
          let blinkCount = 0;
          let wasEyeClosed = false;

          buffer.forEach((f) => {
            // Mouth Aperture
            if (f.contours?.UPPER_LIP_BOTTOM && f.contours?.LOWER_LIP_TOP) {
              const upperY =
                f.contours.UPPER_LIP_BOTTOM.reduce((sum, p) => sum + p.y, 0) /
                f.contours.UPPER_LIP_BOTTOM.length;
              const lowerY =
                f.contours.LOWER_LIP_TOP.reduce((sum, p) => sum + p.y, 0) /
                f.contours.LOWER_LIP_TOP.length;
              const aperture = Math.abs(lowerY - upperY);
              totalMouthAperture += aperture;
              apertureValues.push(aperture);
              apertureFrames++;
            }

            // Inner Brow Distance
            if (f.contours?.LEFT_EYEBROW_BOTTOM && f.contours?.RIGHT_EYEBROW_BOTTOM) {
              const leftInnerX = Math.max(...f.contours.LEFT_EYEBROW_BOTTOM.map(p => p.x));
              const rightInnerX = Math.min(...f.contours.RIGHT_EYEBROW_BOTTOM.map(p => p.x));
              if (rightInnerX > leftInnerX) {
                const dist = rightInnerX - leftInnerX;
                totalInnerBrowDist += dist;
                browValues.push(dist);
                browFrames++;
              }
            }

            // Nostril Width
            if (f.contours?.NOSE_BOTTOM && f.contours.NOSE_BOTTOM.length > 0) {
              const xs = f.contours.NOSE_BOTTOM.map(p => p.x);
              const width = Math.max(...xs) - Math.min(...xs);
              totalNostrilWidth += width;
              nostrilValues.push(width);
              nostrilFrames++;
            }

            // Cheek Area
            if (f.contours?.LEFT_CHEEK && f.contours?.RIGHT_CHEEK &&
                f.contours.LEFT_CHEEK.length > 0 && f.contours.RIGHT_CHEEK.length > 0) {
              const lxs = f.contours.LEFT_CHEEK.map(p => p.x);
              const lys = f.contours.LEFT_CHEEK.map(p => p.y);
              const rxs = f.contours.RIGHT_CHEEK.map(p => p.x);
              const rys = f.contours.RIGHT_CHEEK.map(p => p.y);
              const leftArea = (Math.max(...lxs) - Math.min(...lxs)) * (Math.max(...lys) - Math.min(...lys));
              const rightArea = (Math.max(...rxs) - Math.min(...rxs)) * (Math.max(...rys) - Math.min(...rys));
              const area = (leftArea + rightArea) / 2;
              totalCheekArea += area;
              cheekValues.push(area);
              cheekFrames++;
            }

            // Yaw
            totalYaw += f.yawAngle;

            // Blink detection
            const eyesClosed = (f.leftEyeOpenProbability ?? 1) < 0.15 && (f.rightEyeOpenProbability ?? 1) < 0.15;
            if (wasEyeClosed && !eyesClosed) blinkCount++;
            wasEyeClosed = eyesClosed;
          });

          const calibrationDurationSec = CALIBRATION_DURATION_MS / 1000;

          // Compute standard deviations for adaptive thresholding
          const stddev = (values: number[], mean: number) => {
            if (values.length < 2) return 0;
            return Math.sqrt(values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length);
          };

          const neutralMouthAperture = apertureFrames > 0 ? totalMouthAperture / apertureFrames : 0;
          const neutralInnerBrowDist = browFrames > 0 ? totalInnerBrowDist / browFrames : 0;
          const neutralNostrilWidth = nostrilFrames > 0 ? totalNostrilWidth / nostrilFrames : 0;
          const neutralCheekArea = cheekFrames > 0 ? totalCheekArea / cheekFrames : 0;

          const baseline: UserBaseline = {
            blinkRatePerSecond: blinkCount / calibrationDurationSec,
            neutralMouthAperture,
            neutralInnerBrowDist,
            neutralNostrilWidth,
            neutralCheekArea,
            neutralEulerYaw: totalYaw / buffer.length,
            // Adaptive noise floors (2-sigma)
            mouthApertureStddev: stddev(apertureValues, neutralMouthAperture),
            innerBrowDistStddev: stddev(browValues, neutralInnerBrowDist),
            nostrilWidthStddev: stddev(nostrilValues, neutralNostrilWidth),
            cheekAreaStddev: stddev(cheekValues, neutralCheekArea),
          };

          console.log("[MirrorWork] Calibration complete:", JSON.stringify(baseline));

          analyzerRef.current.setBaseline(baseline);
          setState((prev) => ({
            ...prev,
            isCalibrating: false,
            baseline,
            calibrationProgress: 1,
          }));
        }
      }
    } else {
      // ── FIX: Read isSilent from ref to avoid stale closure ──
      const detectionResult = analyzerRef.current.analyzeFrame(face, timestampMs, isSilentRef.current);
      setState((prev) => ({
        ...prev,
        activeSignals: detectionResult.activeSignals,
        newSignals: detectionResult.newSignals,
        lightingWarning: detectionResult.lightingWarning,
        latestContours: face.contours,
        frameSize: { width: frameWidth, height: frameHeight },
      }));
    }
  // Stable callback — no closures over state/props (using refs instead)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { detectFaces } = useFaceDetector({
    performanceMode: 'accurate',
    landmarkMode: 'all',
    contourMode: 'all',
    classificationMode: 'all',
    minFaceSize: 0.1,
    autoMode: true,
    windowWidth: SCREEN_W,
    windowHeight: SCREEN_H,
    trackingEnabled: false,
  });

  const handleDetectionWorklet = Worklets.createRunOnJS(handleDetection);

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    if (!isActive) return;

    // ── FIX: Frame sampling done on the worklet thread with a local counter
    // stored in the worklet context, not via a React ref (which is JS-thread only)
    frameCountRef.current = (frameCountRef.current + 1) % FRAME_SAMPLING_INTERVAL;
    if (frameCountRef.current !== 0) return;

    const faces = detectFaces(frame);
    handleDetectionWorklet(faces, frame.width, frame.height);
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
