import { FaceLandmarkerResult, BLENDSHAPE } from "expo-face-landmarker";
import type { FaceLandmark3D } from "expo-face-landmarker/ExpoFaceLandmarker.types";
import { MirrorBehaviorSignal } from "../types";

/** One blendshape channel's live state — surfaced to the Dev HUD for tuning. */
export interface ChannelDebug {
  key: string;
  raw: number;       // raw value this frame
  ema: number;       // smoothed value used for detection
  threshold: number; // current T(sig) — the enter cutoff
  firing: boolean;   // whether the owning signal is active
  /** Display scale max for the HUD bar (defaults to MAX_SCALE). Geometric ratios use their own scale. */
  scaleMax?: number;
}

export interface DetectionDebug {
  channels: ChannelDebug[];
  headPose?: { yaw: number; pitch: number; roll: number };
  /** Device angular speed (deg/s) from the IMU, for ego-motion tuning. */
  deviceAngularSpeed?: number;
}

export interface DetectionResult {
  newSignals: MirrorBehaviorSignal[];
  activeSignals: MirrorBehaviorSignal[];
  faceInFrame: boolean;
  lightingWarning: boolean;
  signalTiers: Partial<Record<MirrorBehaviorSignal, 'A' | 'B' | 'C'>>;
  /** Only populated when debug is enabled (Dev HUD). */
  debug?: DetectionDebug;
}

export interface BlendshapeStat {
  mean: number;
  stddev: number;
}

export interface UserBaselineV2 {
  jawOpen: BlendshapeStat;
  mouthPucker: BlendshapeStat;
  mouthPress: BlendshapeStat;
  mouthClose: BlendshapeStat;
  mouthStretch: BlendshapeStat;
  browDown: BlendshapeStat;
  eyeBlink: BlendshapeStat;
  cheekPuff: BlendshapeStat;
  noseSneer: BlendshapeStat;
  baselineBlinkRatePerMin: number;
  // ── Geometric lip baselines (landmark-derived, facial-hair robust) ──
  mouthWidthGeo: BlendshapeStat;    // resting dist(61,291)/faceScale
  lipThicknessGeo: BlendshapeStat;  // resting (dist(0,13)+dist(17,14))/faceScale
  mouthOpenGeo: BlendshapeStat;     // resting dist(13,14)/faceScale
}

// ── Per-signal absolute minimum threshold floors (spec §2) ──────────────────
// These prevent signals from firing when resting mean ≈ 0 (noise-floor collapse).
const FLOOR: Partial<Record<string, number>> = {
  mouthPucker:  0.40,
  mouthPress:   0.35,
  mouthClose:   0.30,
  browDown:     0.40,
  jawOpen:      0.40,
  eyeBlink:     0.50,
  mouthStretch: 0.40,
  cheekPuff:    0.40,
  noseSneer:    0.45,
};

// ── Required hold durations in ms ────────────────────────────────────────────
const HOLD_MS: Record<string, number> = {
  LIP_PURSING:            400,
  JAW_TENSION:            400,
  BROW_TENSION:           400,
  OPEN_MOUTH_HOLD:        700,
  EYE_BLINKING_STRUGGLE:  600,
  FACIAL_GRIMACING:       400,
  CHEEK_PUFFING:          400,
  NOSTRIL_FLARE:          400,
  GAZE_AVERSION:         2500,
};

// Extra hold time required during active speech to avoid phoneme false-positives.
const SPEECH_HOLD_BONUS_MS = 100;

// FACIAL_TENSION_COMPOSITE: how long the "≥2 Tier A/B signals" condition must
// stay FALSE before we re-arm and count a fresh onset. Prevents one overlapping
// episode (whose underlying count flickers around 2) from inflating the count.
const COMPOSITE_FALLING_DEBOUNCE_MS = 500;

// OPEN_MOUTH_HOLD: jaw must stay below this variance to qualify as "frozen".
const JAW_FREEZE_VARIANCE = 0.002;
// History window for OPEN_MOUTH_HOLD stillness guard (~700ms at 12fps = ~8.4 frames).
const JAW_HISTORY_FRAMES = 9;

// K-sigma above baseline to set the adaptive threshold.
// Lowered from 3 → 2.5 for more sensitivity (the reported failure mode was
// missed detections, not false positives). Robust calibration (median/MAD)
// keeps stddev tight so this stays safe.
const K_SIGMA = 2.5;

// Cap how far calibration noise can push a threshold above its absolute floor.
// A noisy region (e.g. lips under a moustache) inflates mean+K·stddev; without
// a ceiling the bar climbs so high that genuine expressions never cross it.
// T can never exceed FLOOR × this multiplier.
const THRESHOLD_CEILING_MULT = 1.4;

// Hysteresis: signal stays active until value drops below HYST_RATIO * threshold.
const HYST_RATIO = 0.8;

// ── Geometric lip detection (Fix 1) ──────────────────────────────────────────
// Facial hair kills the lip blendshapes (mouthPucker/mouthPress read ~0), but
// the landmark positions still track. These rules detect purse/press from lip
// GEOMETRY, normalized by inter-ocular distance (invariant to camera distance).
// All are "drop below a fraction of resting baseline" — tune on-device via HUD.
//
// Pursing pulls the mouth corners in → mouthWidthRatio drops. Fire when current
// width < baseline.mean × (1 − PURSE_FRAC).
const PURSE_FRAC = 0.12;            // 12% narrowing
// Pressing rolls the lips inward → lipThicknessRatio thins below baseline.
const PRESS_THIN_FRAC = 0.15;       // 15% thinning
// JAW_TENSION geo gate: mouth must be ~closed (open ratio still near resting).
const MOUTH_CLOSED_FRAC = 1.5;      // open ≤ 1.5× resting open = still basically closed
// Skip the geo channel if the calibration baseline was too noisy to trust
// (face never stabilized) — relative stddev guard.
const GEO_REL_STDDEV_GUARD = 0.10;
// Hysteresis for "drop below" geo channels — widen the stay band so a held
// purse/press doesn't flicker. stay cutoff = baseline × (1 − FRAC × GEO_HYST_RATIO).
const GEO_HYST_RATIO = 0.6;

// ── HEAD_JERKING robustness + ego-motion gating (Fix 2) ─────────────────────
// Two false-fire sources: (a) the phone moving (ego-motion) and (b) single-frame
// MediaPipe pose jitter, which is large at low fps (a 30° jitter ÷ 0.16s = 187°/s).
// Fixes: EMA-smooth the pose first, then require a real angular DISPLACEMENT
// (anti-jitter) AND high residual velocity AND a steady phone, with a long debounce.
const HEAD_JERK_THRESHOLD = 70;           // residual angular velocity on SMOOTHED pose (deg/s)
const HEAD_JERK_MIN_DISPLACEMENT = 12;    // min smoothed pose change in one frame (deg) — anti-jitter
const HEAD_JERK_DEBOUNCE_MS = 2500;       // min gap between jerk detections
// If the device itself rotates faster than this, treat the window as ego-motion
// and suppress. Hand tremor < ~30 deg/s; deliberate phone moves 50–200+.
const DEVICE_MOTION_GATE = 40;            // deg/s
// Residual = apparentHeadVel − GAIN × deviceVel. Lower toward 0.5 if real head
// snaps get over-suppressed.
const DEVICE_MOTION_SUBTRACT_GAIN = 1.0;

// Tier labels — emergent from combined w_detection × w_clinical but surfaced for UI.
// Tier A: combined weight ≥ 0.70; Tier B: 0.40–0.69; Tier C: head-pose derived.
const SIGNAL_TIER: Partial<Record<MirrorBehaviorSignal, 'A' | 'B' | 'C'>> = {
  [MirrorBehaviorSignal.OPEN_MOUTH_HOLD]:        'A',  // 0.95
  [MirrorBehaviorSignal.LIP_PURSING]:            'A',  // 0.85
  [MirrorBehaviorSignal.EYE_BLINKING_STRUGGLE]:  'A',  // 0.85
  [MirrorBehaviorSignal.JAW_TENSION]:            'A',  // 0.75
  [MirrorBehaviorSignal.BROW_TENSION]:           'B',  // 0.62
  [MirrorBehaviorSignal.FACIAL_GRIMACING]:       'B',  // 0.58
  [MirrorBehaviorSignal.CHEEK_PUFFING]:          'B',  // 0.49
  [MirrorBehaviorSignal.GAZE_AVERSION]:          'C',  // 0.46
  [MirrorBehaviorSignal.HEAD_JERKING]:           'C',  // 0.36
  [MirrorBehaviorSignal.NOSTRIL_FLARE]:          'B',  // 0.33
};

// ── EMA smoothing ────────────────────────────────────────────────────────────
// Light alpha — VIDEO mode already provides temporal smoothing.
const EMA_ALPHA = 0.4;

interface SignalState {
  enteredMs: number | null;  // when condition first became true
  hysteresisActive: boolean; // true while above hysteresis exit threshold
  emitted: boolean;          // whether we've pushed to newSignals this activation
}

function makeState(): SignalState {
  return { enteredMs: null, hysteresisActive: false, emitted: false };
}

function bs(result: FaceLandmarkerResult, name: string): number {
  return result.blendshapes.find((b) => b.name === name)?.score ?? 0;
}

function avgBs(result: FaceLandmarkerResult, ...names: string[]): number {
  const vals = names.map((n) => bs(result, n));
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function variance(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = arr.reduce((a, b) => a + b, 0) / arr.length;
  return arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length;
}

// ── Geometric lip features (Fix 1) ───────────────────────────────────────────
// MediaPipe 478-mesh landmark indices.
const LM = {
  mouthCornerR: 61, mouthCornerL: 291,
  outerTop: 0, outerBottom: 17,
  innerTop: 13, innerBottom: 14,
  eyeOuterR: 33, eyeOuterL: 263,
} as const;

function dist2D(a: FaceLandmark3D, b: FaceLandmark3D): number {
  const dx = a.x - b.x, dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export interface LipGeometry {
  mouthWidthRatio: number;
  mouthOpenRatio: number;
  lipThicknessRatio: number;
}

/**
 * Lip-shape features from landmark positions, normalized by inter-ocular
 * distance (dist(33,263)). Eyes don't move when the mouth does, so this is
 * invariant to both mouth movement and camera distance. Robust to facial hair
 * because it reads landmark POSITIONS, not lip texture. Returns null if the
 * landmark array is too short or the face is degenerate.
 */
export function computeLipGeometry(lm?: FaceLandmark3D[]): LipGeometry | null {
  if (!lm || lm.length < 468) return null;
  const faceScale = dist2D(lm[LM.eyeOuterR], lm[LM.eyeOuterL]);
  if (faceScale < 1e-4) return null;
  const mouthWidth   = dist2D(lm[LM.mouthCornerR], lm[LM.mouthCornerL]);
  const mouthOpen    = dist2D(lm[LM.innerTop], lm[LM.innerBottom]);
  const lipThickness = dist2D(lm[LM.outerTop], lm[LM.innerTop])
                     + dist2D(lm[LM.outerBottom], lm[LM.innerBottom]);
  return {
    mouthWidthRatio:   mouthWidth   / faceScale,
    mouthOpenRatio:    mouthOpen    / faceScale,
    lipThicknessRatio: lipThickness / faceScale,
  };
}

export class MirrorBehaviorAnalyzerV2 {
  private baseline: UserBaselineV2 | null = null;
  private debugEnabled = false;
  private deviceAngularSpeed = 0; // deg/s from the IMU (ego-motion)

  // ── EMA state ──
  private ema: Partial<Record<string, number>> = {};

  // ── History buffers ──
  private jawOpenHistory: number[] = [];

  // ── Signal hold states ──
  private states: Record<string, SignalState> = {
    LIP_PURSING:            makeState(),
    JAW_TENSION:            makeState(),
    BROW_TENSION:           makeState(),
    OPEN_MOUTH_HOLD:        makeState(),
    EYE_BLINKING_STRUGGLE:  makeState(),
    FACIAL_GRIMACING:       makeState(),
    CHEEK_PUFFING:          makeState(),
    NOSTRIL_FLARE:          makeState(),
    GAZE_AVERSION:          makeState(),
  };

  // ── Blink cluster tracking ──
  private recentBlinkTimes: number[] = [];
  private eyeWasAboveThreshold = false;
  private lastBlinkClusterTime = 0;

  // ── Head jerk tracking ──
  private lastYaw: number | null = null;
  private lastPitch: number | null = null;
  private lastHeadPoseMs: number | null = null;
  private lastHeadJerkMs = 0;

  // ── Composite onset tracking (edge-debounced — see analyzeFrame §11) ──
  private compositeActive = false;
  private compositeBelowSinceMs: number | null = null;

  public setDebugEnabled(enabled: boolean) {
    this.debugEnabled = enabled;
  }

  /** Latest device angular speed (deg/s) from the IMU, for ego-motion cancellation. */
  public setDeviceAngularSpeed(degPerSec: number) {
    this.deviceAngularSpeed = degPerSec;
  }

  /**
   * Clear all per-session detection state (EMAs, hold timers, history buffers,
   * edge trackers) WITHOUT touching the calibrated baseline. The analyzer
   * instance is created once and reused (useFaceDetectionV2), so a re-calibrated
   * session would otherwise inherit stale state — including the composite latch.
   */
  public reset() {
    this.ema = {};
    this.jawOpenHistory = [];
    Object.keys(this.states).forEach((k) => { this.states[k] = makeState(); });
    this.recentBlinkTimes = [];
    this.eyeWasAboveThreshold = false;
    this.lastBlinkClusterTime = 0;
    this.lastYaw = null;
    this.lastPitch = null;
    this.lastHeadPoseMs = null;
    this.lastHeadJerkMs = 0;
    this.compositeActive = false;
    this.compositeBelowSinceMs = null;
  }

  public setBaseline(baseline: UserBaselineV2) {
    // Clear stale per-session state BEFORE seeding the EMAs below, so the fresh
    // baseline-seeded EMAs survive (reset() must not run after this point).
    this.reset();
    this.baseline = baseline;
    // Seed EMAs with baseline means
    this.ema['mouthPucker']  = baseline.mouthPucker.mean;
    this.ema['mouthPress']   = baseline.mouthPress.mean;
    this.ema['mouthClose']   = baseline.mouthClose.mean;
    this.ema['mouthStretch'] = baseline.mouthStretch.mean;
    this.ema['browDown']     = baseline.browDown.mean;
    this.ema['eyeBlink']     = baseline.eyeBlink.mean;
    this.ema['cheekPuff']    = baseline.cheekPuff.mean;
    this.ema['noseSneer']    = baseline.noseSneer.mean;
    this.ema['jawOpen']      = baseline.jawOpen.mean;
    // Geometric lip baselines
    this.ema['mouthWidthGeo']   = baseline.mouthWidthGeo.mean;
    this.ema['lipThicknessGeo'] = baseline.lipThicknessGeo.mean;
    this.ema['mouthOpenGeo']    = baseline.mouthOpenGeo.mean;
  }

  private emaUpdate(key: string, raw: number): number {
    const prev = this.ema[key] ?? raw;
    const next = EMA_ALPHA * raw + (1 - EMA_ALPHA) * prev;
    this.ema[key] = next;
    return next;
  }

  /**
   * T(sig) = clamp( baseline.mean + K·baseline.stddev,  FLOOR,  FLOOR × CEILING )
   * Entry condition:  value > T
   * Exit condition:   value < T * HYST_RATIO
   *
   * The ceiling is the key fix for noisy regions: a high calibration stddev
   * (facial hair, occlusion) can no longer raise the bar beyond FLOOR×1.4.
   */
  private threshold(stat: BlendshapeStat, blendshapeKey: string): number {
    const floor = FLOOR[blendshapeKey] ?? 0;
    const adaptive = stat.mean + K_SIGMA * stat.stddev;
    if (floor <= 0) return adaptive; // no floor defined → no ceiling
    return Math.min(Math.max(floor, adaptive), floor * THRESHOLD_CEILING_MULT);
  }

  /**
   * Update one signal's hold-timer state with hysteresis and ms-based timing.
   * Returns true if the signal is currently active (hold satisfied).
   */
  private updateSignal(
    key: string,
    enterCondition: boolean,
    timestampMs: number,
    isSpeaking: boolean,
    active: MirrorBehaviorSignal[],
    newSigs: MirrorBehaviorSignal[],
    signal: MirrorBehaviorSignal
  ): boolean {
    const s = this.states[key];
    const holdRequired = HOLD_MS[key] + (isSpeaking ? SPEECH_HOLD_BONUS_MS : 0);

    if (!s.hysteresisActive) {
      if (enterCondition) {
        s.hysteresisActive = true;
        s.enteredMs = timestampMs;
        s.emitted = false;
      }
    } else {
      // Hysteresis: exit only when condition has stayed false (below 0.8*T)
      // The enterCondition here is already the hysteresis-exit condition from the caller.
      if (!enterCondition) {
        s.hysteresisActive = false;
        s.enteredMs = null;
        s.emitted = false;
        return false;
      }
    }

    if (s.hysteresisActive && s.enteredMs !== null) {
      const heldMs = timestampMs - s.enteredMs;
      if (heldMs >= holdRequired) {
        active.push(signal);
        if (!s.emitted) {
          newSigs.push(signal);
          s.emitted = true;
        }
        return true;
      }
    }
    return false;
  }

  public analyzeFrame(
    result: FaceLandmarkerResult,
    timestampMs: number,
    isSilent?: (threshold: number) => boolean
  ): DetectionResult {
    const active: MirrorBehaviorSignal[] = [];
    const newSigs: MirrorBehaviorSignal[] = [];

    if (!this.baseline) {
      return { newSignals: [], activeSignals: [], faceInFrame: true, lightingWarning: false, signalTiers: {} };
    }

    // isSpeaking = NOT silent (inverted from old "silenceGate")
    const isSpeaking = isSilent ? !isSilent(800) : false;

    // ── Raw blendshape values (captured for the Dev HUD) ────────────────────
    const rawMouthPucker  = bs(result, BLENDSHAPE.MOUTH_PUCKER);
    const rawMouthPress   = avgBs(result, BLENDSHAPE.MOUTH_PRESS_LEFT, BLENDSHAPE.MOUTH_PRESS_RIGHT);
    const rawMouthClose   = bs(result, BLENDSHAPE.MOUTH_CLOSE);
    const rawMouthStretch = avgBs(result, BLENDSHAPE.MOUTH_STRETCH_LEFT, BLENDSHAPE.MOUTH_STRETCH_RIGHT);
    const rawBrowDown     = avgBs(result, BLENDSHAPE.BROW_DOWN_LEFT, BLENDSHAPE.BROW_DOWN_RIGHT);
    const rawEyeBlink     = avgBs(result, BLENDSHAPE.EYE_BLINK_LEFT, BLENDSHAPE.EYE_BLINK_RIGHT);
    const rawCheekPuff    = bs(result, BLENDSHAPE.CHEEK_PUFF);
    const rawNoseSneer    = avgBs(result, BLENDSHAPE.NOSE_SNEER_LEFT, BLENDSHAPE.NOSE_SNEER_RIGHT);
    const rawJawOpen      = bs(result, BLENDSHAPE.JAW_OPEN);
    const rawMouthFunnel  = bs(result, BLENDSHAPE.MOUTH_FUNNEL);

    // ── EMA-smoothed blendshape values ──────────────────────────────────────
    const mouthPucker  = this.emaUpdate('mouthPucker',  rawMouthPucker);
    const mouthPress   = this.emaUpdate('mouthPress',   rawMouthPress);
    const mouthClose   = this.emaUpdate('mouthClose',   rawMouthClose);
    const mouthStretch = this.emaUpdate('mouthStretch', rawMouthStretch);
    const browDown     = this.emaUpdate('browDown',     rawBrowDown);
    const eyeBlink     = this.emaUpdate('eyeBlink',     rawEyeBlink);
    const cheekPuff    = this.emaUpdate('cheekPuff',    rawCheekPuff);
    const noseSneer    = this.emaUpdate('noseSneer',    rawNoseSneer);
    const jawOpen      = this.emaUpdate('jawOpen',      rawJawOpen);
    const mouthFunnel  = this.emaUpdate('mouthFunnel',  rawMouthFunnel);

    // ── Geometric lip features (landmark-derived, facial-hair robust) ───────
    const geo = computeLipGeometry(result.landmarks);
    const geoAvailable = geo !== null;
    let mouthWidthRatio = NaN, lipThicknessRatio = NaN, mouthOpenRatio = NaN;
    if (geo) {
      mouthWidthRatio   = this.emaUpdate('mouthWidthGeo',   geo.mouthWidthRatio);
      lipThicknessRatio = this.emaUpdate('lipThicknessGeo', geo.lipThicknessRatio);
      mouthOpenRatio    = this.emaUpdate('mouthOpenGeo',    geo.mouthOpenRatio);
    }

    // jaw open history for stillness guard (OPEN_MOUTH_HOLD)
    this.jawOpenHistory.push(jawOpen);
    if (this.jawOpenHistory.length > JAW_HISTORY_FRAMES) this.jawOpenHistory.shift();

    // ── 1. LIP_PURSING — AU18 (+AU22): blendshape OR geometric narrowing ─────
    {
      const T = this.threshold(this.baseline.mouthPucker, 'mouthPucker');
      const Tf = T; // funnel shares the floor
      const bsEnter = mouthPucker > T || mouthFunnel > Tf;
      const bsStay  = mouthPucker > T * HYST_RATIO || mouthFunnel > Tf * HYST_RATIO;

      // Geometric channel: mouth width drops below baseline × (1 − PURSE_FRAC).
      const w = this.baseline.mouthWidthGeo;
      const geoUsable = geoAvailable && w.mean > 0 && (w.stddev / w.mean) < GEO_REL_STDDEV_GUARD;
      const geoEnter = geoUsable && mouthWidthRatio < w.mean * (1 - PURSE_FRAC);
      const geoStay  = geoUsable && mouthWidthRatio < w.mean * (1 - PURSE_FRAC * GEO_HYST_RATIO);

      const enter = bsEnter || geoEnter;
      const stay  = bsStay  || geoStay;
      this.updateSignal('LIP_PURSING', enter ? true : (this.states['LIP_PURSING'].hysteresisActive && stay),
        timestampMs, isSpeaking, active, newSigs, MirrorBehaviorSignal.LIP_PURSING);
    }

    // ── 2. JAW_TENSION — AU24+AU17: blendshape OR geometric lip-press+closed ──
    {
      const Tp = this.threshold(this.baseline.mouthPress, 'mouthPress');
      const Tc = this.threshold(this.baseline.mouthClose, 'mouthClose');
      const bsEnter = mouthPress > Tp && mouthClose > Tc && jawOpen < 0.15;
      const bsStay  = mouthPress > Tp * HYST_RATIO && mouthClose > Tc * HYST_RATIO && jawOpen < 0.20;

      // Geometric channel: lips thin (pressing) AND mouth basically closed.
      const th = this.baseline.lipThicknessGeo;
      const op = this.baseline.mouthOpenGeo;
      const geoUsable = geoAvailable && th.mean > 0 && (th.stddev / th.mean) < GEO_REL_STDDEV_GUARD;
      const closedT = op.mean * MOUTH_CLOSED_FRAC;
      const geoEnter = geoUsable && lipThicknessRatio < th.mean * (1 - PRESS_THIN_FRAC) && mouthOpenRatio < closedT;
      const geoStay  = geoUsable && lipThicknessRatio < th.mean * (1 - PRESS_THIN_FRAC * GEO_HYST_RATIO) && mouthOpenRatio < closedT;

      const enter = bsEnter || geoEnter;
      const stay  = bsStay  || geoStay;
      this.updateSignal('JAW_TENSION', enter ? true : (this.states['JAW_TENSION'].hysteresisActive && stay),
        timestampMs, isSpeaking, active, newSigs, MirrorBehaviorSignal.JAW_TENSION);
    }

    // ── 3. BROW_TENSION — AU4 ────────────────────────────────────────────────
    {
      const T = this.threshold(this.baseline.browDown, 'browDown');
      const enter = browDown > T;
      const stay  = browDown > T * HYST_RATIO;
      this.updateSignal('BROW_TENSION', enter ? true : (this.states['BROW_TENSION'].hysteresisActive && stay),
        timestampMs, false, active, newSigs, MirrorBehaviorSignal.BROW_TENSION);
    }

    // ── 4. OPEN_MOUTH_HOLD — AU26/27 frozen ──────────────────────────────────
    // jawOpen > T AND mouthStretch LOW (not strained-open) AND jaw frozen
    {
      const T = this.threshold(this.baseline.jawOpen, 'jawOpen');
      const Ts = this.threshold(this.baseline.mouthStretch, 'mouthStretch');
      const jawFrozen = this.jawOpenHistory.length === JAW_HISTORY_FRAMES &&
        variance(this.jawOpenHistory) < JAW_FREEZE_VARIANCE;
      const enter = jawOpen > T && mouthStretch < Ts && jawFrozen;
      const stay  = jawOpen > T * HYST_RATIO && mouthStretch < Ts;
      this.updateSignal('OPEN_MOUTH_HOLD', enter ? true : (this.states['OPEN_MOUTH_HOLD'].hysteresisActive && stay),
        timestampMs, false, active, newSigs, MirrorBehaviorSignal.OPEN_MOUTH_HOLD);
    }

    // ── 5. EYE_BLINKING_STRUGGLE — AU45 (prolonged close) ──────────────────
    {
      const T = this.threshold(this.baseline.eyeBlink, 'eyeBlink');
      const enter = eyeBlink > T;
      const stay  = eyeBlink > T * HYST_RATIO;
      this.updateSignal('EYE_BLINKING_STRUGGLE', enter ? true : (this.states['EYE_BLINKING_STRUGGLE'].hysteresisActive && stay),
        timestampMs, false, active, newSigs, MirrorBehaviorSignal.EYE_BLINKING_STRUGGLE);

      // Blink cluster: track blink edges (above → below threshold)
      const nowAbove = eyeBlink > T;
      if (this.eyeWasAboveThreshold && !nowAbove) {
        this.recentBlinkTimes.push(timestampMs);
      }
      this.eyeWasAboveThreshold = nowAbove;
      // Prune blinks older than 5s
      this.recentBlinkTimes = this.recentBlinkTimes.filter((t) => timestampMs - t <= 5000);
      // Cluster: ≥ 2× baseline blink rate in 5s window
      const baselineRate5s = (this.baseline.baselineBlinkRatePerMin / 60) * 5;
      const clusterThresh = Math.max(4, Math.round(baselineRate5s * 2));
      if (this.recentBlinkTimes.length >= clusterThresh &&
          timestampMs - this.lastBlinkClusterTime > 5000 &&
          !active.includes(MirrorBehaviorSignal.EYE_BLINKING_STRUGGLE)) {
        active.push(MirrorBehaviorSignal.EYE_BLINKING_STRUGGLE);
        newSigs.push(MirrorBehaviorSignal.EYE_BLINKING_STRUGGLE);
        this.lastBlinkClusterTime = timestampMs;
      }
    }

    // ── 6. FACIAL_GRIMACING — AU20+AU27 (strained-open / lip stretch) ────────
    // mouthStretch > T (bilateral) OR L/R smile asymmetry > 0.30
    {
      const T = this.threshold(this.baseline.mouthStretch, 'mouthStretch');
      const smileL = bs(result, BLENDSHAPE.MOUTH_SMILE_LEFT);
      const smileR = bs(result, BLENDSHAPE.MOUTH_SMILE_RIGHT);
      const asymmetry = Math.abs(smileL - smileR);
      const enter = mouthStretch > T || asymmetry > 0.30;
      const stay  = mouthStretch > T * HYST_RATIO || asymmetry > 0.24;
      this.updateSignal('FACIAL_GRIMACING', enter ? true : (this.states['FACIAL_GRIMACING'].hysteresisActive && stay),
        timestampMs, isSpeaking, active, newSigs, MirrorBehaviorSignal.FACIAL_GRIMACING);
    }

    // ── 7. CHEEK_PUFFING — AD34 ───────────────────────────────────────────────
    {
      const T = this.threshold(this.baseline.cheekPuff, 'cheekPuff');
      const enter = cheekPuff > T;
      const stay  = cheekPuff > T * HYST_RATIO;
      this.updateSignal('CHEEK_PUFFING', enter ? true : (this.states['CHEEK_PUFFING'].hysteresisActive && stay),
        timestampMs, false, active, newSigs, MirrorBehaviorSignal.CHEEK_PUFFING);
    }

    // ── 8. NOSTRIL_FLARE — AU9 ────────────────────────────────────────────────
    {
      const T = this.threshold(this.baseline.noseSneer, 'noseSneer');
      const enter = noseSneer > T;
      const stay  = noseSneer > T * HYST_RATIO;
      this.updateSignal('NOSTRIL_FLARE', enter ? true : (this.states['NOSTRIL_FLARE'].hysteresisActive && stay),
        timestampMs, false, active, newSigs, MirrorBehaviorSignal.NOSTRIL_FLARE);
    }

    // ── 9. GAZE_AVERSION — head yaw > 20° sustained 2.5s ─────────────────────
    const headPose = result.headPose;
    const deviceMoving = this.deviceAngularSpeed > DEVICE_MOTION_GATE;
    if (headPose) {
      const yawAbs = Math.abs(headPose.yaw);
      // Don't START the 2.5s timer while the phone is actively moving (ego-motion),
      // but once an aversion is held, device motion doesn't reset it.
      const gazeEnter = yawAbs > 20 && !deviceMoving;
      const gazeStay  = yawAbs > 16;  // hysteresis
      this.updateSignal('GAZE_AVERSION', gazeEnter ? true : (this.states['GAZE_AVERSION'].hysteresisActive && gazeStay),
        timestampMs, false, active, newSigs, MirrorBehaviorSignal.GAZE_AVERSION);

      // ── 10. HEAD_JERKING — jitter-robust, ego-motion compensated ───────────
      // EMA-smooth the pose first: single-frame MediaPipe pose jitter (large at
      // low fps) is the dominant false-fire source, not real movement.
      const sYaw   = this.emaUpdate('headYaw',   headPose.yaw);
      const sPitch = this.emaUpdate('headPitch', headPose.pitch);
      if (this.lastYaw !== null && this.lastPitch !== null && this.lastHeadPoseMs !== null) {
        const dt = (timestampMs - this.lastHeadPoseMs) / 1000;
        if (dt > 0 && dt < 0.5) {
          const dyaw   = sYaw   - this.lastYaw;
          const dpitch = sPitch - this.lastPitch;
          const displacement = Math.sqrt(dyaw * dyaw + dpitch * dpitch); // degrees of smoothed change
          const apparent = displacement / dt;                           // deg/s
          // Subtract device ego-motion, then require a real displacement (not just
          // a velocity spike from a tiny dt), high residual velocity, a steady
          // phone, and a long debounce.
          const residual = Math.max(0, apparent - DEVICE_MOTION_SUBTRACT_GAIN * this.deviceAngularSpeed);
          if (!deviceMoving &&
              displacement > HEAD_JERK_MIN_DISPLACEMENT &&
              residual > HEAD_JERK_THRESHOLD &&
              timestampMs - this.lastHeadJerkMs > HEAD_JERK_DEBOUNCE_MS) {
            active.push(MirrorBehaviorSignal.HEAD_JERKING);
            newSigs.push(MirrorBehaviorSignal.HEAD_JERKING);
            this.lastHeadJerkMs = timestampMs;
          }
        }
      }
      this.lastYaw = sYaw;     // store SMOOTHED pose for next-frame delta
      this.lastPitch = sPitch;
      this.lastHeadPoseMs = timestampMs;
    }

    // ── 11. FACIAL_TENSION_COMPOSITE — ≥2 Tier A/B signals ──────────────────
    // Push to `active` every frame it holds (so downstream time/region accrual
    // stays correct), but emit a NEW signal only on the RISING edge — matching
    // the per-onset `emitted` dedup every other signal uses via updateSignal.
    // Without this the composite was counted once per frame (~12×/s), inflating
    // "Multiple cues" to dozens for a single overlapping moment. A short falling
    // debounce keeps a one-frame dip below 2 from splitting one episode in two.
    const tierABCount = active.filter((s) =>
      SIGNAL_TIER[s] === 'A' || SIGNAL_TIER[s] === 'B'
    ).length;
    if (tierABCount >= 2) {
      active.push(MirrorBehaviorSignal.FACIAL_TENSION_COMPOSITE);
      this.compositeBelowSinceMs = null;
      if (!this.compositeActive) {
        newSigs.push(MirrorBehaviorSignal.FACIAL_TENSION_COMPOSITE);
        this.compositeActive = true;
      }
    } else if (this.compositeActive) {
      if (this.compositeBelowSinceMs === null) {
        this.compositeBelowSinceMs = timestampMs;
      } else if (timestampMs - this.compositeBelowSinceMs >= COMPOSITE_FALLING_DEBOUNCE_MS) {
        this.compositeActive = false;
        this.compositeBelowSinceMs = null;
      }
    }

    // Build tier map for active signals (UI confidence coloring)
    const signalTiers: Partial<Record<MirrorBehaviorSignal, 'A' | 'B' | 'C'>> = {};
    active.forEach((s) => {
      const tier = SIGNAL_TIER[s];
      if (tier) signalTiers[s] = tier;
    });

    const lightingWarning = result.blendshapes.length < 10;

    // ── Dev HUD snapshot (only when enabled) ────────────────────────────────
    let debug: DetectionDebug | undefined;
    if (this.debugEnabled) {
      const has = (s: MirrorBehaviorSignal) => active.includes(s);
      debug = {
        channels: [
          { key: 'mouthPucker',  raw: rawMouthPucker,  ema: mouthPucker,  threshold: this.threshold(this.baseline.mouthPucker, 'mouthPucker'),  firing: has(MirrorBehaviorSignal.LIP_PURSING) },
          { key: 'mouthFunnel',  raw: rawMouthFunnel,  ema: mouthFunnel,  threshold: this.threshold(this.baseline.mouthPucker, 'mouthPucker'),  firing: has(MirrorBehaviorSignal.LIP_PURSING) },
          { key: 'mouthPress',   raw: rawMouthPress,   ema: mouthPress,   threshold: this.threshold(this.baseline.mouthPress, 'mouthPress'),     firing: has(MirrorBehaviorSignal.JAW_TENSION) },
          { key: 'mouthClose',   raw: rawMouthClose,   ema: mouthClose,   threshold: this.threshold(this.baseline.mouthClose, 'mouthClose'),     firing: has(MirrorBehaviorSignal.JAW_TENSION) },
          { key: 'browDown',     raw: rawBrowDown,     ema: browDown,     threshold: this.threshold(this.baseline.browDown, 'browDown'),         firing: has(MirrorBehaviorSignal.BROW_TENSION) },
          { key: 'jawOpen',      raw: rawJawOpen,      ema: jawOpen,      threshold: this.threshold(this.baseline.jawOpen, 'jawOpen'),           firing: has(MirrorBehaviorSignal.OPEN_MOUTH_HOLD) },
          { key: 'mouthStretch', raw: rawMouthStretch, ema: mouthStretch, threshold: this.threshold(this.baseline.mouthStretch, 'mouthStretch'), firing: has(MirrorBehaviorSignal.FACIAL_GRIMACING) },
          { key: 'eyeBlink',     raw: rawEyeBlink,     ema: eyeBlink,     threshold: this.threshold(this.baseline.eyeBlink, 'eyeBlink'),         firing: has(MirrorBehaviorSignal.EYE_BLINKING_STRUGGLE) },
          { key: 'cheekPuff',    raw: rawCheekPuff,    ema: cheekPuff,    threshold: this.threshold(this.baseline.cheekPuff, 'cheekPuff'),       firing: has(MirrorBehaviorSignal.CHEEK_PUFFING) },
          { key: 'noseSneer',    raw: rawNoseSneer,    ema: noseSneer,    threshold: this.threshold(this.baseline.noseSneer, 'noseSneer'),       firing: has(MirrorBehaviorSignal.NOSTRIL_FLARE) },
          // ── Geometric lip channels (own display scale; fire on DROP below marker) ──
          ...(geoAvailable ? [
            { key: 'mouthWidthGeo', raw: geo!.mouthWidthRatio,   ema: mouthWidthRatio,   threshold: this.baseline.mouthWidthGeo.mean * (1 - PURSE_FRAC),       firing: has(MirrorBehaviorSignal.LIP_PURSING), scaleMax: 1.5 },
            { key: 'lipThickGeo',   raw: geo!.lipThicknessRatio, ema: lipThicknessRatio, threshold: this.baseline.lipThicknessGeo.mean * (1 - PRESS_THIN_FRAC), firing: has(MirrorBehaviorSignal.JAW_TENSION),  scaleMax: 0.4 },
            { key: 'mouthOpenGeo',  raw: geo!.mouthOpenRatio,    ema: mouthOpenRatio,    threshold: this.baseline.mouthOpenGeo.mean * MOUTH_CLOSED_FRAC,       firing: has(MirrorBehaviorSignal.JAW_TENSION),  scaleMax: 0.4 },
          ] : []),
        ],
        headPose: result.headPose,
        deviceAngularSpeed: this.deviceAngularSpeed,
      };
    }

    return {
      newSignals: newSigs,
      activeSignals: active,
      faceInFrame: true,
      lightingWarning,
      signalTiers,
      debug,
    };
  }
}
