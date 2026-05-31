import { useState, useRef, useEffect, useCallback } from "react";
import { useFrameProcessor, runAtTargetFps } from "react-native-vision-camera";
import { Worklets } from "react-native-worklets-core";
import { faceLandmarkerPlugin, FaceLandmarkerResult, BLENDSHAPE } from "expo-face-landmarker";
import { MirrorBehaviorAnalyzerV2, UserBaselineV2 } from "../util/mirrorBehaviorAnalyzerV2";
import { MirrorBehaviorSignal } from "../types";

const CALIBRATION_DURATION_MS = 15000;
const NO_FACE_DEBOUNCE_MS = 3000;
// Minimum frames collected during calibration to accept the baseline.
// Real-world per-device fps varies widely (mid-tier Android often achieves
// ~3-5 effective fps due to YUV→Bitmap + detectForVideo + matrix extraction).
// 20 frames is sufficient for stable mean/stddev — the threshold exists to
// catch the "face never appeared" case, not to enforce a sample size.
const MIN_CALIBRATION_FRAMES = 20;

export interface FaceDetectionStateV2 {
  isCalibrating: boolean;
  faceInFrame: boolean;
  activeSignals: MirrorBehaviorSignal[];
  newSignals: MirrorBehaviorSignal[];
  baseline: UserBaselineV2 | null;
  lightingWarning: boolean;
  calibrationProgress: number;
  latestLandmarks?: FaceLandmarkerResult['landmarks'];
  imageSize?: { width: number; height: number };
  signalTiers: Partial<Record<MirrorBehaviorSignal, 'A' | 'B' | 'C'>>;
  /** True when the frame processor plugin is not registered (iOS missing native build). */
  detectionUnavailable: boolean;
  /** True when calibration completed but collected too few face frames to be reliable. */
  needsRecalibration: boolean;
}

export function useFaceDetectionV2(
  isActive: boolean,
  isSilent?: (threshold: number) => boolean,
  calibrationStarted: boolean = false
) {
  const [state, setState] = useState<FaceDetectionStateV2>({
    isCalibrating: true,
    faceInFrame: true,
    activeSignals: [],
    newSignals: [],
    baseline: null,
    lightingWarning: false,
    calibrationProgress: 0,
    signalTiers: {},
    detectionUnavailable: false,
    needsRecalibration: false,
  });

  const analyzerRef = useRef(new MirrorBehaviorAnalyzerV2());

  const isCalibatingRef  = useRef(true);
  const isSilentRef      = useRef(isSilent);
  const calibrationStartedRef = useRef(calibrationStarted);
  const pluginCheckedRef = useRef(false);

  useEffect(() => { isSilentRef.current = isSilent; }, [isSilent]);
  useEffect(() => { isCalibatingRef.current = state.isCalibrating; }, [state.isCalibrating]);
  useEffect(() => { calibrationStartedRef.current = calibrationStarted; }, [calibrationStarted]);

  const calibrationBufferRef  = useRef<FaceLandmarkerResult[]>([]);
  const noFaceTimerRef        = useRef<NodeJS.Timeout | null>(null);
  const calibrationTimerRef   = useRef<NodeJS.Timeout | null>(null);
  const calibrationCompleteRef = useRef(false);

  // ── Detect if plugin is unavailable (iOS missing native frame processor) ──
  useEffect(() => {
    if (!pluginCheckedRef.current && isActive) {
      pluginCheckedRef.current = true;
      if (!faceLandmarkerPlugin) {
        setState((prev) => ({ ...prev, detectionUnavailable: true }));
      }
    }
  }, [isActive]);

  // ── Wall-clock calibration timer ─────────────────────────────────────────
  useEffect(() => {
    if (!calibrationStarted || !isCalibatingRef.current) return;

    const startMs = Date.now();
    calibrationCompleteRef.current = false;

    calibrationTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startMs;
      const progress = Math.min(elapsed / CALIBRATION_DURATION_MS, 1);

      setState((prev) => ({ ...prev, calibrationProgress: progress }));

      if (elapsed >= CALIBRATION_DURATION_MS && !calibrationCompleteRef.current) {
        calibrationCompleteRef.current = true;
        clearInterval(calibrationTimerRef.current!);
        calibrationTimerRef.current = null;

        const buffer = calibrationBufferRef.current;

        // Reject a calibration with insufficient face data — never proceed on a
        // zero/degraded baseline, prompt the user to retry instead.
        if (buffer.length < MIN_CALIBRATION_FRAMES) {
          console.warn('[MirrorWork v2] Calibration failed: only', buffer.length, 'frames collected (need', MIN_CALIBRATION_FRAMES, ')');
          setState((prev) => ({
            ...prev,
            calibrationProgress: 1,
            needsRecalibration: true,
          }));
          return;
        }

        const baseline = computeBlendshapeBaseline(buffer);
        const effectiveFps = (buffer.length / (CALIBRATION_DURATION_MS / 1000)).toFixed(1);
        console.log(`[MirrorWork v2] Calibration complete. frames=${buffer.length}, effective fps=${effectiveFps}`);
        analyzerRef.current.setBaseline(baseline);
        setState((prev) => ({
          ...prev,
          isCalibrating: false,
          baseline,
          calibrationProgress: 1,
          needsRecalibration: false,
        }));
      }
    }, 100);

    return () => {
      if (calibrationTimerRef.current) {
        clearInterval(calibrationTimerRef.current);
        calibrationTimerRef.current = null;
      }
    };
  }, [calibrationStarted]);

  const processDetectionResult = useCallback(
    (result: FaceLandmarkerResult | null) => {
      const timestampMs = Date.now();

      if (!result || result.landmarks.length === 0) {
        if (!noFaceTimerRef.current) {
          noFaceTimerRef.current = setTimeout(() => {
            setState((prev) => ({ ...prev, faceInFrame: false }));
          }, NO_FACE_DEBOUNCE_MS);
        }
        return;
      }

      if (noFaceTimerRef.current) {
        clearTimeout(noFaceTimerRef.current);
        noFaceTimerRef.current = null;
      }
      setState((prev) => {
        if (!prev.faceInFrame) return { ...prev, faceInFrame: true };
        return prev;
      });

      const imageSize = (result.imageWidth && result.imageHeight)
        ? { width: result.imageWidth, height: result.imageHeight }
        : undefined;

      if (isCalibatingRef.current) {
        if (calibrationStartedRef.current && !calibrationCompleteRef.current) {
          calibrationBufferRef.current.push(result);
        }
        // Expose landmarks during pre-calibration / calibration too so the
        // FaceGuide overlay can show live positioning feedback.
        setState((prev) => ({
          ...prev,
          latestLandmarks: result.landmarks,
          imageSize: imageSize ?? prev.imageSize,
        }));
      } else {
        const detectionResult = analyzerRef.current.analyzeFrame(result, timestampMs, isSilentRef.current);
        setState((prev) => ({
          ...prev,
          activeSignals: detectionResult.activeSignals,
          newSignals: detectionResult.newSignals,
          lightingWarning: detectionResult.lightingWarning,
          signalTiers: detectionResult.signalTiers,
          latestLandmarks: result.landmarks,
          imageSize: imageSize ?? prev.imageSize,
        }));
      }
    },
    []
  );

  const handleDetectionResult = Worklets.createRunOnJS(
    (result: FaceLandmarkerResult | null) => {
      processDetectionResult(result);
    }
  );

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    if (!isActive) return;

    runAtTargetFps(12, () => {
      'worklet';
      if (!faceLandmarkerPlugin) return;
      // @ts-ignore — plugin.call() returns Any? (a Map) on the native side
      const result = faceLandmarkerPlugin.call(frame) as FaceLandmarkerResult | null;
      handleDetectionResult(result ?? null);
    });
  }, [isActive, handleDetectionResult]);

  // ── Reset calibration so user can retry ──────────────────────────────────
  const retryCalibration = useCallback(() => {
    calibrationBufferRef.current = [];
    calibrationCompleteRef.current = false;
    setState((prev) => ({
      ...prev,
      needsRecalibration: false,
      isCalibrating: true,
      calibrationProgress: 0,
      baseline: null,
    }));
  }, []);

  useEffect(() => {
    return () => {
      if (noFaceTimerRef.current) clearTimeout(noFaceTimerRef.current);
      if (calibrationTimerRef.current) clearInterval(calibrationTimerRef.current);
    };
  }, []);

  return { state, frameProcessor, retryCalibration };
}

// ── Blendshape baseline computation ──────────────────────────────────────────

function getScore(result: FaceLandmarkerResult, name: string): number {
  return result.blendshapes.find((b) => b.name === name)?.score ?? 0;
}

function avg(vals: number[]): number {
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function stddev(vals: number[], mean: number): number {
  if (vals.length < 2) return 0;
  return Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length);
}

function stat(vals: number[]): { mean: number; stddev: number } {
  const m = avg(vals);
  return { mean: m, stddev: stddev(vals, m) };
}

function computeBlendshapeBaseline(buffer: FaceLandmarkerResult[]): UserBaselineV2 {
  const collect = (name: string) => buffer.map((r) => getScore(r, name));
  const collectAvg = (...names: string[]) =>
    buffer.map((r) => names.reduce((s, n) => s + getScore(r, n), 0) / names.length);

  const blinkVals = collectAvg(BLENDSHAPE.EYE_BLINK_LEFT, BLENDSHAPE.EYE_BLINK_RIGHT);
  const blinkMean = avg(blinkVals);
  const blinkStd  = stddev(blinkVals, blinkMean);
  const blinkThresh = Math.max(0.2, blinkMean + 2 * blinkStd);

  // Count blink edge transitions (below→above threshold) for baseline blink rate
  let blinkCount = 0;
  let wasAbove = false;
  for (const v of blinkVals) {
    const nowAbove = v > blinkThresh;
    if (!wasAbove && nowAbove) blinkCount++;
    wasAbove = nowAbove;
  }
  const baselineBlinkRatePerMin = (blinkCount / CALIBRATION_DURATION_MS) * 60000;

  return {
    jawOpen:     stat(collect(BLENDSHAPE.JAW_OPEN)),
    mouthPucker: stat(collect(BLENDSHAPE.MOUTH_PUCKER)),
    mouthPress:  stat(collectAvg(BLENDSHAPE.MOUTH_PRESS_LEFT, BLENDSHAPE.MOUTH_PRESS_RIGHT)),
    mouthClose:  stat(collect(BLENDSHAPE.MOUTH_CLOSE)),
    mouthStretch:stat(collectAvg(BLENDSHAPE.MOUTH_STRETCH_LEFT, BLENDSHAPE.MOUTH_STRETCH_RIGHT)),
    browDown:    stat(collectAvg(BLENDSHAPE.BROW_DOWN_LEFT, BLENDSHAPE.BROW_DOWN_RIGHT)),
    eyeBlink:    { mean: blinkMean, stddev: blinkStd },
    cheekPuff:   stat(collect(BLENDSHAPE.CHEEK_PUFF)),
    noseSneer:   stat(collectAvg(BLENDSHAPE.NOSE_SNEER_LEFT, BLENDSHAPE.NOSE_SNEER_RIGHT)),
    baselineBlinkRatePerMin,
  };
}
