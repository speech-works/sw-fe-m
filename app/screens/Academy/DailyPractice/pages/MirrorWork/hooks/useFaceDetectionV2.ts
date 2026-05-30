import { useState, useRef, useEffect, useCallback } from "react";
import { useFrameProcessor, runAtTargetFps } from "react-native-vision-camera";
import { Worklets } from "react-native-worklets-core";
import { faceLandmarkerPlugin, FaceLandmarkerResult, BLENDSHAPE } from "expo-face-landmarker";
import { MirrorBehaviorAnalyzerV2, UserBaselineV2 } from "../util/mirrorBehaviorAnalyzerV2";
import { MirrorBehaviorSignal } from "../types";


const CALIBRATION_DURATION_MS = 15000;
const NO_FACE_DEBOUNCE_MS = 3000;

export interface FaceDetectionStateV2 {
  isCalibrating: boolean;
  faceInFrame: boolean;
  activeSignals: MirrorBehaviorSignal[];
  newSignals: MirrorBehaviorSignal[];
  baseline: UserBaselineV2 | null;
  lightingWarning: boolean;
  calibrationProgress: number;
  /** Latest 478 3D landmarks for mesh rendering */
  latestLandmarks?: FaceLandmarkerResult['landmarks'];
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
  });

  const analyzerRef = useRef(new MirrorBehaviorAnalyzerV2());

  // Refs to avoid stale closures inside the worklet-bridged callback
  const isCalibatingRef = useRef(true);
  const isSilentRef = useRef(isSilent);
  const calibrationStartedRef = useRef(calibrationStarted);

  useEffect(() => { isSilentRef.current = isSilent; }, [isSilent]);
  useEffect(() => { isCalibatingRef.current = state.isCalibrating; }, [state.isCalibrating]);
  useEffect(() => { calibrationStartedRef.current = calibrationStarted; }, [calibrationStarted]);

  const calibrationBufferRef = useRef<FaceLandmarkerResult[]>([]);
  const noFaceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const calibrationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const calibrationCompleteRef = useRef(false);

  // ── Wall-clock calibration timer ──────────────────────────────────────────
  // Drives calibrationProgress independently of face detection results.
  // This ensures the counter always moves even if detectFacesSync returns null.
  useEffect(() => {
    if (!calibrationStarted || !isCalibatingRef.current) return;

    const startMs = Date.now();
    calibrationCompleteRef.current = false;

    const TICK_MS = 100; // update ~10× per second for smooth ring
    calibrationTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startMs;
      const progress = Math.min(elapsed / CALIBRATION_DURATION_MS, 1);

      setState((prev) => ({ ...prev, calibrationProgress: progress }));

      if (elapsed >= CALIBRATION_DURATION_MS && !calibrationCompleteRef.current) {
        calibrationCompleteRef.current = true;
        if (calibrationTimerRef.current) {
          clearInterval(calibrationTimerRef.current);
          calibrationTimerRef.current = null;
        }

        // Use whatever frames we collected; if none, build a zero baseline.
        const buffer = calibrationBufferRef.current;
        const baseline = buffer.length > 0
          ? computeBlendshapeBaseline(buffer)
          : buildZeroBaseline();

        console.log('[MirrorWork v2] Calibration complete (timer). frames collected:', buffer.length);
        analyzerRef.current.setBaseline(baseline);
        setState((prev) => ({
          ...prev,
          isCalibrating: false,
          baseline,
          calibrationProgress: 1,
        }));
      }
    }, TICK_MS);

    return () => {
      if (calibrationTimerRef.current) {
        clearInterval(calibrationTimerRef.current);
        calibrationTimerRef.current = null;
      }
    };
  }, [calibrationStarted]);

  /**
   * Shared result handler — runs on the JS thread for both iOS and Android.
   * During calibration: just accumulates frames into the buffer.
   * After calibration: runs behavior analysis.
   */
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

      // Face is back in frame — clear any pending "no face" debounce
      if (noFaceTimerRef.current) {
        clearTimeout(noFaceTimerRef.current);
        noFaceTimerRef.current = null;
      }
      setState((prev) => {
        if (!prev.faceInFrame) return { ...prev, faceInFrame: true };
        return prev;
      });

      if (isCalibatingRef.current) {
        // Accumulate frames into the buffer for baseline computation.
        // The timer (above useEffect) handles progress + completion.
        if (calibrationStartedRef.current && !calibrationCompleteRef.current) {
          calibrationBufferRef.current.push(result);
        }
      } else {
        const detectionResult = analyzerRef.current.analyzeFrame(result, timestampMs, isSilentRef.current);
        setState((prev) => ({
          ...prev,
          activeSignals: detectionResult.activeSignals,
          newSignals: detectionResult.newSignals,
          lightingWarning: detectionResult.lightingWarning,
          latestLandmarks: result.landmarks,
        }));
      }
    },
    [] // Stable — all state access via refs
  );

  // Use native FrameProcessorPlugin: frame is processed in Kotlin (YUV→Bitmap→MediaPipe).
  // No ArrayBuffer bridge serialization — the result is a plain JS object (Map),
  // which worklets-core handles correctly.
  const handleDetectionResult = Worklets.createRunOnJS(
    (result: FaceLandmarkerResult | null) => {
      processDetectionResult(result);
    }
  );

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    if (!isActive) return;

    runAtTargetFps(5, () => {
      'worklet';
      if (!faceLandmarkerPlugin) {
        // Plugin not registered — this means the native rebuild hasn't happened yet.
        console.warn('[MirrorWork] faceLandmarkerPlugin not available. Run expo run:android.');
        return;
      }
      // @ts-ignore — plugin.call() returns Any? on the native side (a Map)
      const result = faceLandmarkerPlugin.call(frame) as FaceLandmarkerResult | null;
      handleDetectionResult(result ?? null);
    });
  }, [isActive, handleDetectionResult]);

  useEffect(() => {
    return () => {
      if (noFaceTimerRef.current) clearTimeout(noFaceTimerRef.current);
      if (calibrationTimerRef.current) clearInterval(calibrationTimerRef.current);
    };
  }, []);

  return { state, frameProcessor };
}

// ── Blendshape baseline computation ──

function getBlendshapeScore(result: FaceLandmarkerResult, name: string): number {
  return result.blendshapes.find((b) => b.name === name)?.score ?? 0;
}

function stddev(values: number[], mean: number): number {
  if (values.length < 2) return 0;
  return Math.sqrt(values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length);
}

function computeBlendshapeBaseline(buffer: FaceLandmarkerResult[]): UserBaselineV2 {
  const collect = (name: string) => buffer.map((r) => getBlendshapeScore(r, name));
  const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

  const jawOpenVals = collect(BLENDSHAPE.JAW_OPEN);
  const mouthPuckerVals = collect(BLENDSHAPE.MOUTH_PUCKER);
  const mouthTightenerVals = [
    ...collect(BLENDSHAPE.MOUTH_TIGHTENER_LEFT),
    ...collect(BLENDSHAPE.MOUTH_TIGHTENER_RIGHT),
  ];
  const browDownVals = [
    ...collect(BLENDSHAPE.BROW_DOWN_LEFT),
    ...collect(BLENDSHAPE.BROW_DOWN_RIGHT),
  ];
  const browInnerUpVals = collect(BLENDSHAPE.BROW_INNER_UP);
  const eyeBlinkVals = [
    ...collect(BLENDSHAPE.EYE_BLINK_LEFT),
    ...collect(BLENDSHAPE.EYE_BLINK_RIGHT),
  ];
  const cheekPuffVals = collect(BLENDSHAPE.CHEEK_PUFF);
  const noseSneerVals = [
    ...collect(BLENDSHAPE.NOSE_SNEER_LEFT),
    ...collect(BLENDSHAPE.NOSE_SNEER_RIGHT),
  ];

  const mk = (vals: number[]) => ({ mean: mean(vals), stddev: stddev(vals, mean(vals)) });

  return {
    jawOpen: mk(jawOpenVals),
    mouthPucker: mk(mouthPuckerVals),
    mouthTightener: mk(mouthTightenerVals),
    browDown: mk(browDownVals),
    browInnerUp: mk(browInnerUpVals),
    eyeBlink: mk(eyeBlinkVals),
    cheekPuff: mk(cheekPuffVals),
    noseSneer: mk(noseSneerVals),
  };
}

/** Fallback: calibration timer expired but no face frames were collected. */
function buildZeroBaseline(): UserBaselineV2 {
  const zero = { mean: 0, stddev: 0 };
  return {
    jawOpen: zero,
    mouthPucker: zero,
    mouthTightener: zero,
    browDown: zero,
    browInnerUp: zero,
    eyeBlink: zero,
    cheekPuff: zero,
    noseSneer: zero,
  };
}
