import { FaceLandmarkerResult, BLENDSHAPE } from "expo-face-landmarker";

import { MirrorBehaviorSignal } from "../types";

export interface DetectionResult {
  newSignals: MirrorBehaviorSignal[];
  activeSignals: MirrorBehaviorSignal[];
  faceInFrame: boolean;
  lightingWarning: boolean;
}

/** Mean + stddev for a single blendshape dimension. */
export interface BlendshapeStat {
  mean: number;
  stddev: number;
}

/** Baseline computed from 15s neutral calibration, using blendshape coefficients. */
export interface UserBaselineV2 {
  jawOpen: BlendshapeStat;
  mouthPucker: BlendshapeStat;
  mouthTightener: BlendshapeStat;
  browDown: BlendshapeStat;
  browInnerUp: BlendshapeStat;
  eyeBlink: BlendshapeStat;
  cheekPuff: BlendshapeStat;
  noseSneer: BlendshapeStat;
}

const EMA_ALPHA = 0.3;

/** Convenience: get a named blendshape score from a result. */
function bs(result: FaceLandmarkerResult, name: string): number {
  return result.blendshapes.find((b) => b.name === name)?.score ?? 0;
}

function avgBs(result: FaceLandmarkerResult, ...names: string[]): number {
  return names.map((n) => bs(result, n)).reduce((a, b) => a + b, 0) / names.length;
}

export class MirrorBehaviorAnalyzerV2 {
  private baseline: UserBaselineV2 | null = null;

  // ── EMA-smoothed blendshape values ──
  private emaJawOpen: number | null = null;
  private emaMouthPucker: number | null = null;
  private emaMouthTightener: number | null = null;
  private emaBrowDown: number | null = null;
  private emaBrowInnerUp: number | null = null;
  private emaEyeBlink: number | null = null;
  private emaCheekPuff: number | null = null;
  private emaNoseSneer: number | null = null;

  // ── Aperture history for hold detection ──
  private jawOpenHistory: number[] = [];

  // ── Frame counting states ──
  private states = {
    eyeClosure: { frames: 0, emitted: false },
    jawTension: { frames: 0, emitted: false },
    openMouth: { frames: 0, emitted: false },
    lipPursing: { frames: 0, emitted: false },
    browTension: { frames: 0, emitted: false },
    gazeAversion: { frames: 0, emitted: false },
    grimace: { frames: 0, emitted: false },
    nostrilFlare: { frames: 0, emitted: false },
    cheekPuff: { frames: 0, emitted: false },
  };

  // ── Blink tracking ──
  private recentBlinks: number[] = [];
  private eyeWasClosed = false;
  private lastBlinkSpikeTime = 0;

  // ── Head jerk tracking (via landmark[0] — nose tip) ──
  private lastNoseTip: { x: number; y: number; timestamp: number } | null = null;
  private lastHeadJerkTime = 0;

  public setBaseline(baseline: UserBaselineV2) {
    this.baseline = baseline;
    // Seed EMAs with neutral baseline values
    this.emaJawOpen = baseline.jawOpen.mean;
    this.emaMouthPucker = baseline.mouthPucker.mean;
    this.emaMouthTightener = baseline.mouthTightener.mean;
    this.emaBrowDown = baseline.browDown.mean;
    this.emaBrowInnerUp = baseline.browInnerUp.mean;
    this.emaEyeBlink = baseline.eyeBlink.mean;
    this.emaCheekPuff = baseline.cheekPuff.mean;
    this.emaNoseSneer = baseline.noseSneer.mean;
  }

  private ema(prev: number | null, value: number): number {
    return prev === null ? value : EMA_ALPHA * value + (1 - EMA_ALPHA) * prev;
  }

  private getVariance(arr: number[]): number {
    if (arr.length < 2) return 0;
    const m = arr.reduce((a, b) => a + b, 0) / arr.length;
    return arr.reduce((a, b) => a + Math.pow(b - m, 2), 0) / arr.length;
  }

  /**
   * Adaptive threshold: baseline mean ± (nSigma * stddev).
   * Ensures we're well outside the calibration noise floor before firing.
   */
  private threshold(stat: BlendshapeStat, nSigma: number, dir: 'above' | 'below'): number {
    const margin = Math.max(stat.stddev * nSigma, stat.mean * 0.05);
    return dir === 'above' ? stat.mean + margin : stat.mean - margin;
  }

  private updateState(
    condition: boolean,
    key: keyof typeof this.states,
    threshFrames: number,
    signal: MirrorBehaviorSignal,
    active: MirrorBehaviorSignal[],
    newSigs: MirrorBehaviorSignal[]
  ) {
    const s = this.states[key];
    if (condition) {
      s.frames++;
      if (s.frames >= threshFrames) {
        active.push(signal);
        if (!s.emitted) { newSigs.push(signal); s.emitted = true; }
      }
    } else {
      s.frames = 0;
      s.emitted = false;
    }
  }

  public analyzeFrame(
    result: FaceLandmarkerResult,
    timestampMs: number,
    isSilent?: (threshold: number) => boolean
  ): DetectionResult {
    const active: MirrorBehaviorSignal[] = [];
    const newSigs: MirrorBehaviorSignal[] = [];

    if (!this.baseline) {
      return { newSignals: [], activeSignals: [], faceInFrame: true, lightingWarning: false };
    }

    // ── Update EMA-smoothed blendshape values ──
    const rawJawOpen = bs(result, BLENDSHAPE.JAW_OPEN);
    this.emaJawOpen = this.ema(this.emaJawOpen, rawJawOpen);

    const rawMouthPucker = bs(result, BLENDSHAPE.MOUTH_PUCKER);
    this.emaMouthPucker = this.ema(this.emaMouthPucker, rawMouthPucker);

    const rawMouthTightener = avgBs(result, BLENDSHAPE.MOUTH_TIGHTENER_LEFT, BLENDSHAPE.MOUTH_TIGHTENER_RIGHT);
    this.emaMouthTightener = this.ema(this.emaMouthTightener, rawMouthTightener);

    const rawBrowDown = avgBs(result, BLENDSHAPE.BROW_DOWN_LEFT, BLENDSHAPE.BROW_DOWN_RIGHT);
    this.emaBrowDown = this.ema(this.emaBrowDown, rawBrowDown);

    const rawBrowInnerUp = bs(result, BLENDSHAPE.BROW_INNER_UP);
    this.emaBrowInnerUp = this.ema(this.emaBrowInnerUp, rawBrowInnerUp);

    const rawEyeBlink = avgBs(result, BLENDSHAPE.EYE_BLINK_LEFT, BLENDSHAPE.EYE_BLINK_RIGHT);
    this.emaEyeBlink = this.ema(this.emaEyeBlink, rawEyeBlink);

    const rawCheekPuff = bs(result, BLENDSHAPE.CHEEK_PUFF);
    this.emaCheekPuff = this.ema(this.emaCheekPuff, rawCheekPuff);

    const rawNoseSneer = avgBs(result, BLENDSHAPE.NOSE_SNEER_LEFT, BLENDSHAPE.NOSE_SNEER_RIGHT);
    this.emaNoseSneer = this.ema(this.emaNoseSneer, rawNoseSneer);

    const jawOpen = this.emaJawOpen!;
    const mouthPucker = this.emaMouthPucker!;
    const mouthTightener = this.emaMouthTightener!;
    const browDown = this.emaBrowDown!;
    const browInnerUp = this.emaBrowInnerUp!;
    const eyeBlink = this.emaEyeBlink!;
    const cheekPuff = this.emaCheekPuff!;
    const noseSneer = this.emaNoseSneer!;

    // Track jaw history for hold detection
    this.jawOpenHistory.push(jawOpen);
    if (this.jawOpenHistory.length > 15) this.jawOpenHistory.shift();

    const silenceGate = isSilent ? isSilent(800) : true;

    // ─────────────────────────────────────────────────────────────
    // 1. EYE_BLINKING_STRUGGLE (prolonged blink OR cluster)
    // ─────────────────────────────────────────────────────────────
    const eyesClosed = eyeBlink > this.threshold(this.baseline.eyeBlink, 2.5, 'above');
    this.updateState(eyesClosed, 'eyeClosure', 12, MirrorBehaviorSignal.EYE_BLINKING_STRUGGLE, active, newSigs);

    if (!eyesClosed && this.eyeWasClosed) this.recentBlinks.push(timestampMs);
    this.eyeWasClosed = eyesClosed;
    this.recentBlinks = this.recentBlinks.filter((t) => timestampMs - t <= 5000);
    // Cluster blinking: 2× baseline rate over 5s
    if (this.recentBlinks.length > 6 && timestampMs - this.lastBlinkSpikeTime > 5000) {
      if (!active.includes(MirrorBehaviorSignal.EYE_BLINKING_STRUGGLE)) {
        active.push(MirrorBehaviorSignal.EYE_BLINKING_STRUGGLE);
        newSigs.push(MirrorBehaviorSignal.EYE_BLINKING_STRUGGLE);
        this.lastBlinkSpikeTime = timestampMs;
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 2. JAW_TENSION — jaw notably more closed than at rest + tightener elevated
    // jawOpen is INVERSE of tension: low jawOpen + high tightener = clenched
    // ─────────────────────────────────────────────────────────────
    const jawTensionThresh = this.threshold(this.baseline.jawOpen, 2.5, 'below');
    const tightenerThresh = this.threshold(this.baseline.mouthTightener, 2.0, 'above');
    const jawTensed = jawOpen < jawTensionThresh && mouthTightener > tightenerThresh;
    this.updateState(jawTensed && silenceGate, 'jawTension', 15, MirrorBehaviorSignal.JAW_TENSION, active, newSigs);

    // ─────────────────────────────────────────────────────────────
    // 3. OPEN_MOUTH_HOLD — jaw notably open AND frozen (not talking)
    // ─────────────────────────────────────────────────────────────
    const openThresh = this.threshold(this.baseline.jawOpen, 2.5, 'above');
    const jawOpenHeld = jawOpen > openThresh && this.jawOpenHistory.length === 15 &&
      this.getVariance(this.jawOpenHistory) < 0.002;
    this.updateState(jawOpenHeld, 'openMouth', 18, MirrorBehaviorSignal.OPEN_MOUTH_HOLD, active, newSigs);

    // ─────────────────────────────────────────────────────────────
    // 4. LIP_PURSING — high mouthPucker score (lips pushed forward/compressed)
    // ─────────────────────────────────────────────────────────────
    const purseThresh = this.threshold(this.baseline.mouthPucker, 2.5, 'above');
    const lipPursed = mouthPucker > purseThresh;
    this.updateState(lipPursed && silenceGate, 'lipPursing', 15, MirrorBehaviorSignal.LIP_PURSING, active, newSigs);

    // ─────────────────────────────────────────────────────────────
    // 5. BROW_TENSION — brow furrowed (browDown elevated) and/or inner brow raised
    // ─────────────────────────────────────────────────────────────
    const browDownThresh = this.threshold(this.baseline.browDown, 2.5, 'above');
    const browTensed = browDown > browDownThresh;
    this.updateState(browTensed, 'browTension', 15, MirrorBehaviorSignal.BROW_TENSION, active, newSigs);

    // ─────────────────────────────────────────────────────────────
    // 6. GAZE_AVERSION — using landmark[468] (left iris) and [473] (right iris)
    //    MediaPipe provides eye iris landmarks at indices 468-472 and 473-477
    //    We approximate gaze by checking horizontal iris position deviation
    // ─────────────────────────────────────────────────────────────
    // Use a simple heuristic: if eye look-in/out blendshapes are elevated
    const eyeLookLeft = avgBs(result, BLENDSHAPE.EYE_LOOK_OUT_LEFT, BLENDSHAPE.EYE_LOOK_IN_RIGHT);
    const eyeLookRight = avgBs(result, BLENDSHAPE.EYE_LOOK_IN_LEFT, BLENDSHAPE.EYE_LOOK_OUT_RIGHT);
    const gazeAversion = Math.max(eyeLookLeft, eyeLookRight) > 0.4;
    this.updateState(gazeAversion, 'gazeAversion', 30, MirrorBehaviorSignal.GAZE_AVERSION, active, newSigs);

    // ─────────────────────────────────────────────────────────────
    // 7. NOSTRIL_FLARE — noseSneer elevated significantly above baseline
    // ─────────────────────────────────────────────────────────────
    const nostrilThresh = this.threshold(this.baseline.noseSneer, 2.5, 'above');
    const nostrilFlaring = noseSneer > nostrilThresh;
    this.updateState(nostrilFlaring, 'nostrilFlare', 15, MirrorBehaviorSignal.NOSTRIL_FLARE, active, newSigs);

    // ─────────────────────────────────────────────────────────────
    // 8. CHEEK_PUFFING — dedicated cheekPuff blendshape
    // ─────────────────────────────────────────────────────────────
    const cheekThresh = this.threshold(this.baseline.cheekPuff, 2.5, 'above');
    const cheekPuffing = cheekPuff > cheekThresh;
    this.updateState(cheekPuffing, 'cheekPuff', 15, MirrorBehaviorSignal.CHEEK_PUFFING, active, newSigs);

    // ─────────────────────────────────────────────────────────────
    // 9. FACIAL_GRIMACING — asymmetry between left/right smile scores
    // ─────────────────────────────────────────────────────────────
    const smileLeft = bs(result, BLENDSHAPE.MOUTH_SMILE_LEFT);
    const smileRight = bs(result, BLENDSHAPE.MOUTH_SMILE_RIGHT);
    const asymmetry = Math.abs(smileLeft - smileRight);
    const grimacing = asymmetry > 0.25; // 0.25 = clearly one-sided
    this.updateState(grimacing, 'grimace', 15, MirrorBehaviorSignal.FACIAL_GRIMACING, active, newSigs);

    // ─────────────────────────────────────────────────────────────
    // 10. HEAD_JERKING — nose tip (landmark index 1) position velocity
    // ─────────────────────────────────────────────────────────────
    if (result.landmarks.length > 1) {
      const noseTip = result.landmarks[1]; // MediaPipe canonical: index 1 = nose tip
      const currentPos = { x: noseTip.x, y: noseTip.y, timestamp: timestampMs };
      if (this.lastNoseTip) {
        const dt = (currentPos.timestamp - this.lastNoseTip.timestamp) / 1000;
        if (dt > 0 && dt < 0.5) {
          const dx = currentPos.x - this.lastNoseTip.x;
          const dy = currentPos.y - this.lastNoseTip.y;
          const velocity = Math.sqrt(dx * dx + dy * dy) / dt;
          // Normalized coords: velocity > 0.8 units/sec = large head jerk
          if (velocity > 0.8) {
            active.push(MirrorBehaviorSignal.HEAD_JERKING);
            if (timestampMs - this.lastHeadJerkTime > 1000) {
              newSigs.push(MirrorBehaviorSignal.HEAD_JERKING);
              this.lastHeadJerkTime = timestampMs;
            }
          }
        }
      }
      this.lastNoseTip = currentPos;
    }

    // ─────────────────────────────────────────────────────────────
    // 11. FACIAL_TENSION_COMPOSITE — 2+ high-reliability signals
    // ─────────────────────────────────────────────────────────────
    const highTensionCount = active.filter((s) =>
      [
        MirrorBehaviorSignal.JAW_TENSION,
        MirrorBehaviorSignal.LIP_PURSING,
        MirrorBehaviorSignal.BROW_TENSION,
        MirrorBehaviorSignal.EYE_BLINKING_STRUGGLE,
        MirrorBehaviorSignal.OPEN_MOUTH_HOLD,
        MirrorBehaviorSignal.FACIAL_GRIMACING,
        MirrorBehaviorSignal.NOSTRIL_FLARE,
        MirrorBehaviorSignal.CHEEK_PUFFING,
      ].includes(s),
    ).length;

    if (highTensionCount >= 2) {
      active.push(MirrorBehaviorSignal.FACIAL_TENSION_COMPOSITE);
      newSigs.push(MirrorBehaviorSignal.FACIAL_TENSION_COMPOSITE);
    }

    // Low-light guardrail: MediaPipe returns empty blendshapes in poor lighting
    const lightingWarning = result.blendshapes.length < 10;

    return {
      newSignals: newSigs,
      activeSignals: active,
      faceInFrame: true,
      lightingWarning,
    };
  }
}
