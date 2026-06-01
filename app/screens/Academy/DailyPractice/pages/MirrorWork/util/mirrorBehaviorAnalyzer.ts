import { Face } from "react-native-vision-camera-face-detector";
import { MirrorBehaviorSignal } from "../types";

export interface DetectionResult {
  /**
   * Signals that STARTED in this frame (new events only).
   * A signal appears here exactly once when it transitions from
   * inactive → active. It does NOT repeat on subsequent frames
   * while the condition persists.
   */
  newSignals: MirrorBehaviorSignal[];

  /**
   * Signals that are currently active (for UI overlay display).
   * These persist across frames while the condition holds.
   */
  activeSignals: MirrorBehaviorSignal[];

  faceInFrame: boolean;
  lightingWarning: boolean;
}

export interface UserBaseline {
  /** Average number of unique blink events per second during calibration. */
  blinkRatePerSecond: number;
  /** Average distance between inner lip edges at rest. */
  neutralMouthAperture: number;
  /** Average horizontal distance between inner eyebrows at rest. */
  neutralInnerBrowDist: number;
  /** Average horizontal span of NOSE_BOTTOM contour at rest. */
  neutralNostrilWidth: number;
  /** Average bounding-rect area of left+right cheek contours at rest. */
  neutralCheekArea: number;
  /** Average yaw angle at rest. */
  neutralEulerYaw: number;
  // ── Adaptive noise floors (2-sigma of calibration variance) ──
  mouthApertureStddev: number;
  innerBrowDistStddev: number;
  nostrilWidthStddev: number;
  cheekAreaStddev: number;
}

/**
 * EMA alpha for smoothing contour-derived measurements.
 * Lower = more smoothing (more lag). Higher = more responsive (more noise).
 * 0.25 gives ~75% weight to history, 25% to the new reading.
 */
const EMA_ALPHA = 0.25;

export class MirrorBehaviorAnalyzer {
  private baseline: UserBaseline | null = null;

  // Blink tracking
  private recentBlinks: number[] = [];
  private eyeWasClosed: boolean = false;

  // Frame counting states
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

  // ── EMA-smoothed measurements ──
  private smoothedMouthAperture: number | null = null;
  private smoothedInnerBrowDist: number | null = null;
  private smoothedNostrilWidth: number | null = null;
  private smoothedCheekArea: number | null = null;

  // Variance tracking for lip pursing / open-mouth hold
  private apertureHistory: number[] = [];
  private lipGapHistory: number[] = [];

  // Velocity tracking (Head Jerking)
  private lastNosePos: { x: number; y: number; timestamp: number } | null = null;
  private lastHeadJerkTime: number = 0;

  private poorLightingFrameCount: number = 0;
  private lastBlinkSpikeTime: number = 0;

  public setBaseline(baseline: UserBaseline) {
    this.baseline = baseline;
    // Seed EMA with neutral values so we don't trigger signals immediately
    this.smoothedMouthAperture = baseline.neutralMouthAperture;
    this.smoothedInnerBrowDist = baseline.neutralInnerBrowDist;
    this.smoothedNostrilWidth = baseline.neutralNostrilWidth;
    this.smoothedCheekArea = baseline.neutralCheekArea;
  }

  // Helper: EMA update
  private updateEma(prev: number | null, newValue: number): number {
    if (prev === null) return newValue;
    return EMA_ALPHA * newValue + (1 - EMA_ALPHA) * prev;
  }

  // Helper: compute variance of an array
  private getVariance(arr: number[]): number {
    if (arr.length < 2) return 0;
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    return arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length;
  }

  // Helper: handle state transitions
  private updateState(
    condition: boolean,
    stateKey: keyof typeof this.states,
    thresholdFrames: number,
    signal: MirrorBehaviorSignal,
    activeSignals: MirrorBehaviorSignal[],
    newSignals: MirrorBehaviorSignal[]
  ) {
    const state = this.states[stateKey];
    if (condition) {
      state.frames++;
      if (state.frames >= thresholdFrames) {
        activeSignals.push(signal);
        if (!state.emitted) {
          newSignals.push(signal);
          state.emitted = true;
        }
      }
    } else {
      state.frames = 0;
      state.emitted = false;
    }
  }

  /**
   * Compute adaptive threshold using baseline mean and noise floor.
   * The threshold is at mean - (noiseSigmas * stddev) so it only
   * fires when the measurement deviates beyond actual calibration noise.
   */
  private adaptiveThreshold(
    baseline: number,
    stddev: number,
    noiseSigmas: number,
    direction: 'below' | 'above'
  ): number {
    // Ensure the threshold is at least slightly beyond the noise floor
    const noiseMargin = Math.max(stddev * noiseSigmas, baseline * 0.05);
    return direction === 'below'
      ? baseline - noiseMargin
      : baseline + noiseMargin;
  }

  public analyzeFrame(
    face: Face,
    timestampMs: number,
    isSilent?: (threshold: number) => boolean
  ): DetectionResult {
    const activeSignals: MirrorBehaviorSignal[] = [];
    const newSignals: MirrorBehaviorSignal[] = [];

    if (!this.baseline) {
      return { newSignals: [], activeSignals: [], faceInFrame: true, lightingWarning: false };
    }

    // ── Extract and EMA-smooth mouth aperture ──
    let rawMouthAperture = 0;
    if (face.contours?.UPPER_LIP_BOTTOM && face.contours?.LOWER_LIP_TOP) {
      const upperY = face.contours.UPPER_LIP_BOTTOM.reduce((sum, p) => sum + p.y, 0) / face.contours.UPPER_LIP_BOTTOM.length;
      const lowerY = face.contours.LOWER_LIP_TOP.reduce((sum, p) => sum + p.y, 0) / face.contours.LOWER_LIP_TOP.length;
      rawMouthAperture = Math.abs(lowerY - upperY);
    }
    this.smoothedMouthAperture = this.updateEma(this.smoothedMouthAperture, rawMouthAperture);
    const mouthAperture = this.smoothedMouthAperture ?? 0;

    this.apertureHistory.push(mouthAperture);
    if (this.apertureHistory.length > 12) this.apertureHistory.shift();

    // ── Extract and EMA-smooth inner brow distance ──
    let rawInnerBrowDist = 0;
    if (face.contours?.LEFT_EYEBROW_BOTTOM && face.contours?.RIGHT_EYEBROW_BOTTOM) {
      const leftInnerX = Math.max(...face.contours.LEFT_EYEBROW_BOTTOM.map(p => p.x));
      const rightInnerX = Math.min(...face.contours.RIGHT_EYEBROW_BOTTOM.map(p => p.x));
      if (rightInnerX > leftInnerX) {
        rawInnerBrowDist = rightInnerX - leftInnerX;
      }
    }
    this.smoothedInnerBrowDist = this.updateEma(this.smoothedInnerBrowDist, rawInnerBrowDist);
    const innerBrowDist = this.smoothedInnerBrowDist ?? 0;

    // ─────────────────────────────────────────────────────────────
    // 1. EYE_BLINKING_STRUGGLE (Prolonged closure OR cluster blinking)
    // ─────────────────────────────────────────────────────────────
    const eyesClosed =
      (face.leftEyeOpenProbability ?? 1) < 0.20 &&
      (face.rightEyeOpenProbability ?? 1) < 0.20;

    // Condition A: Prolonged closure (>1.5s, ~15 frames at every-3rd sampling)
    this.updateState(eyesClosed, 'eyeClosure', 15, MirrorBehaviorSignal.EYE_BLINKING_STRUGGLE, activeSignals, newSignals);

    // Track blinks for cluster detection
    if (!eyesClosed && this.eyeWasClosed) {
      this.recentBlinks.push(timestampMs);
    }
    this.eyeWasClosed = eyesClosed;

    // Condition B: Cluster blinking (significantly exceeds baseline)
    this.recentBlinks = this.recentBlinks.filter(time => timestampMs - time <= 5000);
    const blinkCountIn5s = this.recentBlinks.length;
    const baselineBlinksIn5s = this.baseline.blinkRatePerSecond * 5;

    if (
      baselineBlinksIn5s > 0 &&
      blinkCountIn5s > baselineBlinksIn5s * 1.5 &&
      blinkCountIn5s > baselineBlinksIn5s + 3
    ) {
      if (!activeSignals.includes(MirrorBehaviorSignal.EYE_BLINKING_STRUGGLE)) {
        activeSignals.push(MirrorBehaviorSignal.EYE_BLINKING_STRUGGLE);
      }
      if (timestampMs - this.lastBlinkSpikeTime > 5000) {
        if (!newSignals.includes(MirrorBehaviorSignal.EYE_BLINKING_STRUGGLE)) {
          newSignals.push(MirrorBehaviorSignal.EYE_BLINKING_STRUGGLE);
        }
        this.lastBlinkSpikeTime = timestampMs;
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 2. JAW_TENSION — Mouth aperture significantly below neutral
    // Uses adaptive threshold: must be > 2-sigma below neutral, not just 50%.
    // Also gated on silence so it doesn't fire while the user is talking.
    // ─────────────────────────────────────────────────────────────
    let jawTensed = false;
    if (this.baseline.neutralMouthAperture > 0 && mouthAperture > 0) {
      const jawThreshold = this.adaptiveThreshold(
        this.baseline.neutralMouthAperture,
        this.baseline.mouthApertureStddev,
        2.5, // 2.5 sigma below baseline — well outside noise floor
        'below'
      );
      jawTensed = mouthAperture < jawThreshold;
    }
    // ── FIX: isSilent is read from ref in the hook, passed in here ──
    const jawSilentGate = isSilent ? isSilent(800) : true;
    // Sustained ~1.5s (15 frames at every-3rd-frame sampling)
    this.updateState(jawTensed && jawSilentGate, 'jawTension', 15, MirrorBehaviorSignal.JAW_TENSION, activeSignals, newSignals);

    // ─────────────────────────────────────────────────────────────
    // 3. OPEN_MOUTH_HOLD — Aperture well above neutral AND frozen
    // ─────────────────────────────────────────────────────────────
    let openMouthHold = false;
    if (this.baseline.neutralMouthAperture > 0 && mouthAperture > 0) {
      const openThreshold = this.adaptiveThreshold(
        this.baseline.neutralMouthAperture,
        this.baseline.mouthApertureStddev,
        2.5,
        'above'
      );
      if (mouthAperture > openThreshold && this.apertureHistory.length === 12) {
        const variance = this.getVariance(this.apertureHistory);
        // Frozen variance = held open rather than talking
        if (variance < (this.baseline.neutralMouthAperture * 0.08)) {
          openMouthHold = true;
        }
      }
    }
    // Sustained ~2s (20 frames)
    this.updateState(openMouthHold, 'openMouth', 20, MirrorBehaviorSignal.OPEN_MOUTH_HOLD, activeSignals, newSignals);

    // ─────────────────────────────────────────────────────────────
    // 4. LIP_PURSING — Aperture very small AND frozen variance
    // ─────────────────────────────────────────────────────────────
    let lipPursed = false;
    if (this.baseline.neutralMouthAperture > 0 && mouthAperture > 0) {
      const purseThreshold = this.adaptiveThreshold(
        this.baseline.neutralMouthAperture,
        this.baseline.mouthApertureStddev,
        3.0, // 3 sigma — very tight, highly intentional compression
        'below'
      );
      if (mouthAperture < purseThreshold && this.apertureHistory.length === 12) {
        const variance = this.getVariance(this.apertureHistory);
        if (variance < (this.baseline.neutralMouthAperture * 0.04)) {
          lipPursed = true;
        }
      }
    }
    const lipSilentGate = isSilent ? isSilent(800) : true;
    this.updateState(lipPursed && lipSilentGate, 'lipPursing', 15, MirrorBehaviorSignal.LIP_PURSING, activeSignals, newSignals);

    // ─────────────────────────────────────────────────────────────
    // 5. BROW_TENSION — Inner brow distance well below neutral
    // ─────────────────────────────────────────────────────────────
    let browTensed = false;
    if (this.baseline.neutralInnerBrowDist > 0 && innerBrowDist > 0) {
      const browThreshold = this.adaptiveThreshold(
        this.baseline.neutralInnerBrowDist,
        this.baseline.innerBrowDistStddev,
        2.5,
        'below'
      );
      browTensed = innerBrowDist < browThreshold;
    }
    this.updateState(browTensed, 'browTension', 15, MirrorBehaviorSignal.BROW_TENSION, activeSignals, newSignals);

    // ─────────────────────────────────────────────────────────────
    // 6. GAZE_AVERSION — Euler Yaw > 20° from rest for >3s
    // ─────────────────────────────────────────────────────────────
    const isAverted = Math.abs(face.yawAngle - this.baseline.neutralEulerYaw) > 20;
    this.updateState(isAverted, 'gazeAversion', 30, MirrorBehaviorSignal.GAZE_AVERSION, activeSignals, newSignals);

    // ─────────────────────────────────────────────────────────────
    // 7. NOSTRIL_FLARE — Nose bottom contour width above neutral
    // ─────────────────────────────────────────────────────────────
    let nostrilFlaring = false;
    if (face.contours?.NOSE_BOTTOM && face.contours.NOSE_BOTTOM.length > 0 && this.baseline.neutralNostrilWidth > 0) {
      const xs = face.contours.NOSE_BOTTOM.map(p => p.x);
      const rawWidth = Math.max(...xs) - Math.min(...xs);
      this.smoothedNostrilWidth = this.updateEma(this.smoothedNostrilWidth, rawWidth);
      const currentWidth = this.smoothedNostrilWidth ?? rawWidth;

      const nostrilThreshold = this.adaptiveThreshold(
        this.baseline.neutralNostrilWidth,
        this.baseline.nostrilWidthStddev,
        2.5,
        'above'
      );
      nostrilFlaring = currentWidth > nostrilThreshold;
    }
    this.updateState(nostrilFlaring, 'nostrilFlare', 15, MirrorBehaviorSignal.NOSTRIL_FLARE, activeSignals, newSignals);

    // ─────────────────────────────────────────────────────────────
    // 8. CHEEK_PUFFING — Cheek bounding area above neutral
    // ─────────────────────────────────────────────────────────────
    let cheekPuffing = false;
    if (
      face.contours?.LEFT_CHEEK && face.contours?.RIGHT_CHEEK &&
      face.contours.LEFT_CHEEK.length > 0 && face.contours.RIGHT_CHEEK.length > 0 &&
      this.baseline.neutralCheekArea > 0
    ) {
      const lxs = face.contours.LEFT_CHEEK.map(p => p.x);
      const lys = face.contours.LEFT_CHEEK.map(p => p.y);
      const rxs = face.contours.RIGHT_CHEEK.map(p => p.x);
      const rys = face.contours.RIGHT_CHEEK.map(p => p.y);
      const leftArea = (Math.max(...lxs) - Math.min(...lxs)) * (Math.max(...lys) - Math.min(...lys));
      const rightArea = (Math.max(...rxs) - Math.min(...rxs)) * (Math.max(...rys) - Math.min(...rys));
      const rawAvgArea = (leftArea + rightArea) / 2;

      this.smoothedCheekArea = this.updateEma(this.smoothedCheekArea, rawAvgArea);
      const avgArea = this.smoothedCheekArea ?? rawAvgArea;

      const cheekThreshold = this.adaptiveThreshold(
        this.baseline.neutralCheekArea,
        this.baseline.cheekAreaStddev,
        2.5,
        'above'
      );
      cheekPuffing = avgArea > cheekThreshold;
    }
    this.updateState(cheekPuffing, 'cheekPuff', 15, MirrorBehaviorSignal.CHEEK_PUFFING, activeSignals, newSignals);

    // ─────────────────────────────────────────────────────────────
    // 9. FACIAL_GRIMACING — Mouth asymmetry via landmarks
    // Relaxed threshold: 1.6 (was 1.3 — needed to be well above noise)
    // ─────────────────────────────────────────────────────────────
    let grimacing = false;
    if (face.landmarks?.MOUTH_LEFT && face.landmarks?.MOUTH_RIGHT && face.landmarks?.NOSE_BASE) {
      const leftYDist = Math.abs(face.landmarks.MOUTH_LEFT.y - face.landmarks.NOSE_BASE.y);
      const rightYDist = Math.abs(face.landmarks.MOUTH_RIGHT.y - face.landmarks.NOSE_BASE.y);
      const asymmetryRatio = Math.max(leftYDist, rightYDist) / Math.max(1, Math.min(leftYDist, rightYDist));
      if (asymmetryRatio > 1.6) {
        grimacing = true;
      }
    }
    this.updateState(grimacing, 'grimace', 15, MirrorBehaviorSignal.FACIAL_GRIMACING, activeSignals, newSignals);

    // ─────────────────────────────────────────────────────────────
    // 10. HEAD_JERKING — Velocity spikes normalized by face size
    // ─────────────────────────────────────────────────────────────
    if (face.landmarks?.NOSE_BASE && face.bounds) {
      const currentPos = { x: face.landmarks.NOSE_BASE.x, y: face.landmarks.NOSE_BASE.y, timestamp: timestampMs };
      if (this.lastNosePos) {
        const dt = (currentPos.timestamp - this.lastNosePos.timestamp) / 1000;
        if (dt > 0 && dt < 0.5) {
          const dx = currentPos.x - this.lastNosePos.x;
          const dy = currentPos.y - this.lastNosePos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const velocity = dist / dt;
          // Normalize by face width so threshold is distance-independent
          const faceWidth = face.bounds.width ?? 200;
          const normalizedVelocity = velocity / faceWidth;

          if (normalizedVelocity > 3.5) { // 3.5x face-widths/sec = large sudden jerk
            activeSignals.push(MirrorBehaviorSignal.HEAD_JERKING);
            if (timestampMs - this.lastHeadJerkTime > 1000) {
              newSignals.push(MirrorBehaviorSignal.HEAD_JERKING);
              this.lastHeadJerkTime = timestampMs;
            }
          }
        }
      }
      this.lastNosePos = currentPos;
    }

    // ─────────────────────────────────────────────────────────────
    // 11. FACIAL_TENSION_COMPOSITE — 2+ high-reliability signals active
    // ─────────────────────────────────────────────────────────────
    const highTensionCount = activeSignals.filter((s) =>
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
      activeSignals.push(MirrorBehaviorSignal.FACIAL_TENSION_COMPOSITE);
      newSignals.push(MirrorBehaviorSignal.FACIAL_TENSION_COMPOSITE);
    }

    // ─────────────────────────────────────────────────────────────
    // 12. LOW LIGHT GUARDRAIL
    // ─────────────────────────────────────────────────────────────
    const hasPoorLighting = !face.landmarks || Object.keys(face.landmarks).length < 5;
    if (hasPoorLighting) {
      this.poorLightingFrameCount++;
    } else {
      this.poorLightingFrameCount = 0;
    }

    return {
      newSignals,
      activeSignals,
      faceInFrame: true,
      lightingWarning: this.poorLightingFrameCount > 10,
    };
  }
}
