import { FaceLandmarkerResult, BLENDSHAPE } from "expo-face-landmarker";
import { MirrorBehaviorSignal } from "../types";

export interface DetectionResult {
  newSignals: MirrorBehaviorSignal[];
  activeSignals: MirrorBehaviorSignal[];
  faceInFrame: boolean;
  lightingWarning: boolean;
  signalTiers: Partial<Record<MirrorBehaviorSignal, 'A' | 'B' | 'C'>>;
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

// OPEN_MOUTH_HOLD: jaw must stay below this variance to qualify as "frozen".
const JAW_FREEZE_VARIANCE = 0.002;
// History window for OPEN_MOUTH_HOLD stillness guard (~700ms at 12fps = ~8.4 frames).
const JAW_HISTORY_FRAMES = 9;

// K-sigma above baseline to set the adaptive threshold.
const K_SIGMA = 3;

// Hysteresis: signal stays active until value drops below HYST_RATIO * threshold.
const HYST_RATIO = 0.8;

// Tier labels — emergent from combined w_detection × w_clinical but surfaced for UI.
// Tier A: combined weight ≥ 0.70; Tier B: 0.40–0.69; Tier C: head-pose derived.
export const SIGNAL_TIER: Partial<Record<MirrorBehaviorSignal, 'A' | 'B' | 'C'>> = {
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

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function variance(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = arr.reduce((a, b) => a + b, 0) / arr.length;
  return arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length;
}

export class MirrorBehaviorAnalyzerV2 {
  private baseline: UserBaselineV2 | null = null;

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

  // ── Head pose hold state (for GAZE_AVERSION) ──
  private headPoseAboveThresholdMs: number | null = null;

  public setBaseline(baseline: UserBaselineV2) {
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
  }

  private emaUpdate(key: string, raw: number): number {
    const prev = this.ema[key] ?? raw;
    const next = EMA_ALPHA * raw + (1 - EMA_ALPHA) * prev;
    this.ema[key] = next;
    return next;
  }

  /**
   * T(sig) = max( FLOOR[blendshape], baseline.mean + K·baseline.stddev )
   * Entry condition:  value > T
   * Exit condition:   value < T * HYST_RATIO
   */
  private threshold(stat: BlendshapeStat, blendshapeKey: string): number {
    const floor = FLOOR[blendshapeKey] ?? 0;
    return Math.max(floor, stat.mean + K_SIGMA * stat.stddev);
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

    // ── EMA-smoothed blendshape values ──────────────────────────────────────
    const mouthPucker  = this.emaUpdate('mouthPucker',  bs(result, BLENDSHAPE.MOUTH_PUCKER));
    const mouthPress   = this.emaUpdate('mouthPress',   avgBs(result, BLENDSHAPE.MOUTH_PRESS_LEFT, BLENDSHAPE.MOUTH_PRESS_RIGHT));
    const mouthClose   = this.emaUpdate('mouthClose',   bs(result, BLENDSHAPE.MOUTH_CLOSE));
    const mouthStretch = this.emaUpdate('mouthStretch', avgBs(result, BLENDSHAPE.MOUTH_STRETCH_LEFT, BLENDSHAPE.MOUTH_STRETCH_RIGHT));
    const browDown     = this.emaUpdate('browDown',     avgBs(result, BLENDSHAPE.BROW_DOWN_LEFT, BLENDSHAPE.BROW_DOWN_RIGHT));
    const eyeBlink     = this.emaUpdate('eyeBlink',     avgBs(result, BLENDSHAPE.EYE_BLINK_LEFT, BLENDSHAPE.EYE_BLINK_RIGHT));
    const cheekPuff    = this.emaUpdate('cheekPuff',    bs(result, BLENDSHAPE.CHEEK_PUFF));
    const noseSneer    = this.emaUpdate('noseSneer',    avgBs(result, BLENDSHAPE.NOSE_SNEER_LEFT, BLENDSHAPE.NOSE_SNEER_RIGHT));
    const jawOpen      = this.emaUpdate('jawOpen',      bs(result, BLENDSHAPE.JAW_OPEN));
    const mouthFunnel  = this.emaUpdate('mouthFunnel',  bs(result, BLENDSHAPE.MOUTH_FUNNEL));

    // jaw open history for stillness guard (OPEN_MOUTH_HOLD)
    this.jawOpenHistory.push(jawOpen);
    if (this.jawOpenHistory.length > JAW_HISTORY_FRAMES) this.jawOpenHistory.shift();

    // ── 1. LIP_PURSING — AU18 (+AU22) ────────────────────────────────────────
    // mouthPucker > T OR mouthFunnel > T, held ≥ 400ms
    {
      const T = this.threshold(this.baseline.mouthPucker, 'mouthPucker');
      const Tf = this.threshold(this.baseline.mouthPucker, 'mouthPucker'); // same floor for funnel
      const enter = mouthPucker > T || mouthFunnel > Tf;
      const stay  = mouthPucker > T * HYST_RATIO || mouthFunnel > Tf * HYST_RATIO;
      this.updateSignal('LIP_PURSING', enter ? true : (this.states['LIP_PURSING'].hysteresisActive && stay),
        timestampMs, isSpeaking, active, newSigs, MirrorBehaviorSignal.LIP_PURSING);
    }

    // ── 2. JAW_TENSION — AU24+AU17 (clench proxy) ────────────────────────────
    // mouthPress > T AND mouthClose > T AND jawOpen < 0.15
    {
      const Tp = this.threshold(this.baseline.mouthPress, 'mouthPress');
      const Tc = this.threshold(this.baseline.mouthClose, 'mouthClose');
      const enter = mouthPress > Tp && mouthClose > Tc && jawOpen < 0.15;
      const stay  = mouthPress > Tp * HYST_RATIO && mouthClose > Tc * HYST_RATIO && jawOpen < 0.20;
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
    if (headPose) {
      const yawAbs = Math.abs(headPose.yaw);
      const gazeEnter = yawAbs > 20;
      const gazeStay  = yawAbs > 16;  // hysteresis
      this.updateSignal('GAZE_AVERSION', gazeEnter ? true : (this.states['GAZE_AVERSION'].hysteresisActive && gazeStay),
        timestampMs, false, active, newSigs, MirrorBehaviorSignal.GAZE_AVERSION);

      // ── 10. HEAD_JERKING — angular velocity spike ─────────────────────────
      if (this.lastYaw !== null && this.lastPitch !== null && this.lastHeadPoseMs !== null) {
        const dt = (timestampMs - this.lastHeadPoseMs) / 1000;
        if (dt > 0 && dt < 0.5) {
          const dyaw   = Math.abs(headPose.yaw   - this.lastYaw);
          const dpitch = Math.abs(headPose.pitch - this.lastPitch);
          const angVel = Math.sqrt(dyaw * dyaw + dpitch * dpitch) / dt;
          // >180 deg/s = rapid jerk; debounce 1s
          if (angVel > 180 && timestampMs - this.lastHeadJerkMs > 1000) {
            active.push(MirrorBehaviorSignal.HEAD_JERKING);
            newSigs.push(MirrorBehaviorSignal.HEAD_JERKING);
            this.lastHeadJerkMs = timestampMs;
          }
        }
      }
      this.lastYaw = headPose.yaw;
      this.lastPitch = headPose.pitch;
      this.lastHeadPoseMs = timestampMs;
    }

    // ── 11. FACIAL_TENSION_COMPOSITE — ≥2 Tier A/B signals ──────────────────
    const tierABCount = active.filter((s) =>
      SIGNAL_TIER[s] === 'A' || SIGNAL_TIER[s] === 'B'
    ).length;
    if (tierABCount >= 2) {
      active.push(MirrorBehaviorSignal.FACIAL_TENSION_COMPOSITE);
      newSigs.push(MirrorBehaviorSignal.FACIAL_TENSION_COMPOSITE);
    }

    // Build tier map for active signals (UI confidence coloring)
    const signalTiers: Partial<Record<MirrorBehaviorSignal, 'A' | 'B' | 'C'>> = {};
    active.forEach((s) => {
      const tier = SIGNAL_TIER[s];
      if (tier) signalTiers[s] = tier;
    });

    const lightingWarning = result.blendshapes.length < 10;

    return {
      newSignals: newSigs,
      activeSignals: active,
      faceInFrame: true,
      lightingWarning,
      signalTiers,
    };
  }
}
