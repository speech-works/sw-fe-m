import { useState, useRef, useEffect, useCallback } from "react";
import { useFrameProcessor, runAtTargetFps } from "react-native-vision-camera";
import { Worklets } from "react-native-worklets-core";
import { faceLandmarkerPlugin, FaceLandmarkerResult, BLENDSHAPE } from "expo-face-landmarker";
import { MirrorBehaviorAnalyzerV2, UserBaselineV2, ChannelDebug, computeLipGeometry } from "../util/mirrorBehaviorAnalyzerV2";
import { MirrorBehaviorSignal } from "../types";

// ── Crash-safe DeviceMotion loader ───────────────────────────────────────────
// expo-sensors' barrel (`expo-sensors`) does `import * as Pedometer`, and every
// sensor's native wrapper calls requireNativeModule(...) which THROWS at import
// if the native module isn't in the build. A static import therefore crashes the
// whole screen at startup on any build that predates `expo install expo-sensors`.
// We load DeviceMotion lazily via a deep path (bypasses Pedometer) inside a
// try/catch, so a missing native module degrades head-jerk to camera-only
// instead of crashing. Becomes fully functional after a native rebuild.
let DeviceMotion: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  DeviceMotion = require("expo-sensors/build/DeviceMotion").default;
} catch {
  DeviceMotion = null;
}

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
  /** Live tuning data — only populated when debugEnabled. */
  debug?: {
    channels: ChannelDebug[];
    headPose?: { yaw: number; pitch: number; roll: number };
    deviceAngularSpeed?: number;
    fps: number;
    framesAnalyzed: number;
  };
}

export function useFaceDetectionV2(
  isActive: boolean,
  isSilent?: (threshold: number) => boolean,
  calibrationStarted: boolean = false,
  debugEnabled: boolean = false
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
  const debugEnabledRef  = useRef(debugEnabled);

  useEffect(() => { isSilentRef.current = isSilent; }, [isSilent]);
  useEffect(() => { isCalibatingRef.current = state.isCalibrating; }, [state.isCalibrating]);
  useEffect(() => { calibrationStartedRef.current = calibrationStarted; }, [calibrationStarted]);
  useEffect(() => {
    debugEnabledRef.current = debugEnabled;
    analyzerRef.current.setDebugEnabled(debugEnabled);
  }, [debugEnabled]);

  const calibrationBufferRef  = useRef<FaceLandmarkerResult[]>([]);
  const noFaceTimerRef        = useRef<NodeJS.Timeout | null>(null);
  const calibrationTimerRef   = useRef<NodeJS.Timeout | null>(null);
  const calibrationCompleteRef = useRef(false);

  // ── fps + frame-count tracking for the Dev HUD ──
  const frameTimesRef     = useRef<number[]>([]);
  const framesAnalyzedRef = useRef(0);

  // ── Device angular speed (deg/s) from the IMU for head-jerk ego-motion cancellation ──
  const deviceAngularSpeedRef = useRef(0);

  // ── Detect if plugin is unavailable (iOS missing native frame processor) ──
  useEffect(() => {
    if (!pluginCheckedRef.current && isActive) {
      pluginCheckedRef.current = true;
      if (!faceLandmarkerPlugin) {
        setState((prev) => ({ ...prev, detectionUnavailable: true }));
      }
    }
  }, [isActive]);

  // ── IMU listener: track device angular speed for head-jerk ego-motion cancellation ──
  useEffect(() => {
    if (!isActive || !DeviceMotion) return; // null when the native module isn't in this build
    let sub: { remove: () => void } | null = null;
    let cancelled = false;
    (async () => {
      try {
        const available = await DeviceMotion.isAvailableAsync();
        if (!available || cancelled) return;
        DeviceMotion.setUpdateInterval(60); // ~16fps, fresh between 12fps frames
        sub = DeviceMotion.addListener((d: { rotationRate?: { alpha: number; beta: number; gamma: number } }) => {
          const r = d.rotationRate; // {alpha,beta,gamma} deg/s; undefined on gyro-less devices
          if (!r) return;
          deviceAngularSpeedRef.current =
            Math.sqrt(r.alpha * r.alpha + r.beta * r.beta + r.gamma * r.gamma);
        });
      } catch {
        // Sensor unavailable — head-jerk falls back to camera-only behavior.
      }
    })();
    return () => {
      cancelled = true;
      sub?.remove();
      deviceAngularSpeedRef.current = 0;
    };
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
        analyzerRef.current.setDeviceAngularSpeed(deviceAngularSpeedRef.current);
        const detectionResult = analyzerRef.current.analyzeFrame(result, timestampMs, isSilentRef.current);

        // ── fps tracking (rolling window of last 30 analyzed frames) ──
        framesAnalyzedRef.current += 1;
        const times = frameTimesRef.current;
        times.push(timestampMs);
        if (times.length > 30) times.shift();
        const fps = times.length > 1
          ? (times.length - 1) / ((times[times.length - 1] - times[0]) / 1000)
          : 0;

        setState((prev) => ({
          ...prev,
          activeSignals: detectionResult.activeSignals,
          newSignals: detectionResult.newSignals,
          lightingWarning: detectionResult.lightingWarning,
          signalTiers: detectionResult.signalTiers,
          latestLandmarks: result.landmarks,
          imageSize: imageSize ?? prev.imageSize,
          debug: debugEnabledRef.current && detectionResult.debug
            ? {
                channels: detectionResult.debug.channels,
                headPose: detectionResult.debug.headPose,
                deviceAngularSpeed: detectionResult.debug.deviceAngularSpeed,
                fps: Math.round(fps * 10) / 10,
                framesAnalyzed: framesAnalyzedRef.current,
              }
            : prev.debug,
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

function median(vals: number[]): number {
  if (vals.length === 0) return 0;
  const s = [...vals].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * Robust baseline stat: median (location) + scaled MAD (spread).
 *
 * Plain mean/stddev are wrecked by a handful of noisy calibration frames —
 * exactly what facial hair / occlusion produce in the lip region. Median and
 * MAD ignore outliers, so a few bad frames can't inflate the threshold and
 * silence a whole signal. The 1.4826 factor makes MAD a consistent estimator
 * of stddev for normally-distributed data, so downstream K·stddev math is unchanged.
 */
function robustStat(vals: number[]): { mean: number; stddev: number } {
  if (vals.length === 0) return { mean: 0, stddev: 0 };
  const med = median(vals);
  const mad = median(vals.map((v) => Math.abs(v - med)));
  return { mean: med, stddev: 1.4826 * mad };
}

function computeBlendshapeBaseline(buffer: FaceLandmarkerResult[]): UserBaselineV2 {
  const collect = (name: string) => buffer.map((r) => getScore(r, name));
  const collectAvg = (...names: string[]) =>
    buffer.map((r) => names.reduce((s, n) => s + getScore(r, n), 0) / names.length);

  const blinkVals = collectAvg(BLENDSHAPE.EYE_BLINK_LEFT, BLENDSHAPE.EYE_BLINK_RIGHT);
  const blink = robustStat(blinkVals);
  const blinkThresh = Math.max(0.2, blink.mean + 2 * blink.stddev);

  // Count blink edge transitions (below→above threshold) for baseline blink rate
  let blinkCount = 0;
  let wasAbove = false;
  for (const v of blinkVals) {
    const nowAbove = v > blinkThresh;
    if (!wasAbove && nowAbove) blinkCount++;
    wasAbove = nowAbove;
  }
  const baselineBlinkRatePerMin = (blinkCount / CALIBRATION_DURATION_MS) * 60000;

  // ── Geometric lip baselines (landmark-derived; facial-hair robust) ──
  const geoFrames = buffer
    .map((r) => computeLipGeometry(r.landmarks))
    .filter((g): g is NonNullable<typeof g> => g !== null);
  const mouthWidthGeo   = robustStat(geoFrames.map((g) => g.mouthWidthRatio));
  const lipThicknessGeo = robustStat(geoFrames.map((g) => g.lipThicknessRatio));
  const mouthOpenGeo    = robustStat(geoFrames.map((g) => g.mouthOpenRatio));

  return {
    jawOpen:     robustStat(collect(BLENDSHAPE.JAW_OPEN)),
    mouthPucker: robustStat(collect(BLENDSHAPE.MOUTH_PUCKER)),
    mouthPress:  robustStat(collectAvg(BLENDSHAPE.MOUTH_PRESS_LEFT, BLENDSHAPE.MOUTH_PRESS_RIGHT)),
    mouthClose:  robustStat(collect(BLENDSHAPE.MOUTH_CLOSE)),
    mouthStretch:robustStat(collectAvg(BLENDSHAPE.MOUTH_STRETCH_LEFT, BLENDSHAPE.MOUTH_STRETCH_RIGHT)),
    browDown:    robustStat(collectAvg(BLENDSHAPE.BROW_DOWN_LEFT, BLENDSHAPE.BROW_DOWN_RIGHT)),
    eyeBlink:    blink,
    cheekPuff:   robustStat(collect(BLENDSHAPE.CHEEK_PUFF)),
    noseSneer:   robustStat(collectAvg(BLENDSHAPE.NOSE_SNEER_LEFT, BLENDSHAPE.NOSE_SNEER_RIGHT)),
    baselineBlinkRatePerMin,
    mouthWidthGeo,
    lipThicknessGeo,
    mouthOpenGeo,
  };
}
