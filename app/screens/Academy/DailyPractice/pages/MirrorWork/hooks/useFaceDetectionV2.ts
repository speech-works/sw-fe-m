import { useState, useRef, useEffect, useCallback } from "react";
import { Dimensions, Platform } from "react-native";
import { useFrameProcessor } from "react-native-vision-camera";
import { Worklets } from "react-native-worklets-core";
import { useSharedValue } from "react-native-reanimated";
import { detectFacesSync, detectFacesFromRgba, FaceLandmarkerResult, BLENDSHAPE } from "expo-face-landmarker";
import { MirrorBehaviorAnalyzerV2, UserBaselineV2 } from "../util/mirrorBehaviorAnalyzerV2";
import { MirrorBehaviorSignal } from "../types";

const SCREEN = Dimensions.get('screen');
const SCREEN_W = SCREEN.width;
const SCREEN_H = SCREEN.height;

const CALIBRATION_DURATION_MS = 15000;
const NO_FACE_DEBOUNCE_MS = 3000;
const FRAME_SAMPLING_INTERVAL = 3;

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
  isSilent?: (threshold: number) => boolean
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

  useEffect(() => { isSilentRef.current = isSilent; }, [isSilent]);
  useEffect(() => { isCalibatingRef.current = state.isCalibrating; }, [state.isCalibrating]);

  const calibrationStartTimeRef = useRef<number | null>(null);
  const calibrationBufferRef = useRef<FaceLandmarkerResult[]>([]);
  const noFaceTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Shared result handler — runs on the JS thread for both iOS and Android.
   * Contains all calibration and behavior-analysis logic.
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

      if (noFaceTimerRef.current) {
        clearTimeout(noFaceTimerRef.current);
        noFaceTimerRef.current = null;
      }
      setState((prev) => {
        if (!prev.faceInFrame) return { ...prev, faceInFrame: true };
        return prev;
      });

      if (isCalibatingRef.current) {
        if (!calibrationStartTimeRef.current) {
          calibrationStartTimeRef.current = timestampMs;
        }
        calibrationBufferRef.current.push(result);

        const elapsed = timestampMs - calibrationStartTimeRef.current;
        const progress = Math.min(elapsed / CALIBRATION_DURATION_MS, 1);

        setState((prev) => {
          if (Math.abs(progress - prev.calibrationProgress) > 0.03) {
            return { ...prev, calibrationProgress: progress };
          }
          return prev;
        });

        if (elapsed >= CALIBRATION_DURATION_MS) {
          const buffer = calibrationBufferRef.current;
          if (buffer.length > 0) {
            const baseline = computeBlendshapeBaseline(buffer);
            console.log("[MirrorWork v2] Calibration complete:", JSON.stringify(baseline));
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

  // iOS path: base64 JPEG → detectFacesSync (synchronous, no async overhead)
  const handleFrameWorklet = Worklets.createRunOnJS(
    (base64Jpeg: string) => {
      processDetectionResult(detectFacesSync(base64Jpeg));
    }
  );

  // Android path: raw RGBA bytes → detectFacesFromRgba (async native conversion)
  const handleAndroidFrameWorklet = Worklets.createRunOnJS(
    (frameWidth: number, frameHeight: number, rgbaBytes: Uint8Array) => {
      detectFacesFromRgba(frameWidth, frameHeight, rgbaBytes)
        .then(processDetectionResult)
        .catch((e: Error) =>
          console.warn("[MirrorWork] Android face detection error:", e.message)
        );
    }
  );

  // useSharedValue is thread-safe: readable and writable from both JS and worklets.
  const frameCounter = useSharedValue(0);

  // Note: Vision Camera frames are YUV on iOS (toBase64String → JPEG) and
  // RGBA on Android (toArrayBuffer → raw bytes → detectFacesFromRgba).
  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    if (!isActive) return;

    // Increment counter on the worklet thread — no global hacks needed.
    frameCounter.value = (frameCounter.value + 1) % FRAME_SAMPLING_INTERVAL;
    if (frameCounter.value !== 0) return;

    // toBase64String is iOS-only in VisionCamera 4.7.x.
    // On Android, fall back to toArrayBuffer() with pixelFormat="rgb".
    // @ts-ignore — toBase64String is a VisionCamera frame method not yet in typedefs
    if (typeof frame.toBase64String === 'function') {
      // iOS path: native JPEG conversion
      // @ts-ignore
      const base64 = frame.toBase64String('jpeg', 0.7);
      if (!base64) return;
      handleFrameWorklet(base64);

    } else {
      // Android path: raw RGBA bytes (requires pixelFormat="rgb" on Camera)
      // @ts-ignore — toArrayBuffer is the Android frame method
      const buffer = frame.toArrayBuffer();
      const bytes = new Uint8Array(buffer);
      handleAndroidFrameWorklet(frame.width, frame.height, bytes);
    }
  }, [isActive, handleFrameWorklet, handleAndroidFrameWorklet, frameCounter]);

  useEffect(() => {
    return () => {
      if (noFaceTimerRef.current) clearTimeout(noFaceTimerRef.current);
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
