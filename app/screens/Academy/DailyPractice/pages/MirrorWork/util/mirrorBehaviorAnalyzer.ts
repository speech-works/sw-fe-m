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
}

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

  // Variance tracking
  private apertureHistory: number[] = [];
  private lipGapHistory: number[] = [];

  // Velocity tracking (Head Jerking)
  private lastNosePos: { x: number; y: number; timestamp: number } | null = null;
  private lastHeadJerkTime: number = 0;

  private poorLightingFrameCount: number = 0;
  private lastBlinkSpikeTime: number = 0;

  public setBaseline(baseline: UserBaseline) {
    this.baseline = baseline;
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

  public analyzeFrame(face: Face, timestampMs: number): DetectionResult {
    const activeSignals: MirrorBehaviorSignal[] = [];
    const newSignals: MirrorBehaviorSignal[] = [];

    if (!this.baseline) {
      return { newSignals: [], activeSignals: [], faceInFrame: true, lightingWarning: false };
    }

    // Extract current mouth aperture
    let mouthAperture = 0;
    if (face.contours && face.contours.UPPER_LIP_BOTTOM && face.contours.LOWER_LIP_TOP) {
      const upperY = face.contours.UPPER_LIP_BOTTOM.reduce((sum, p) => sum + p.y, 0) / face.contours.UPPER_LIP_BOTTOM.length;
      const lowerY = face.contours.LOWER_LIP_TOP.reduce((sum, p) => sum + p.y, 0) / face.contours.LOWER_LIP_TOP.length;
      mouthAperture = Math.abs(lowerY - upperY);
      
      this.apertureHistory.push(mouthAperture);
      if (this.apertureHistory.length > 8) this.apertureHistory.shift();
    }

    // Extract current inner brow distance
    let innerBrowDist = 0;
    if (face.contours && face.contours.LEFT_EYEBROW_BOTTOM && face.contours.RIGHT_EYEBROW_BOTTOM) {
      const leftInnerX = Math.max(...face.contours.LEFT_EYEBROW_BOTTOM.map(p => p.x));
      const rightInnerX = Math.min(...face.contours.RIGHT_EYEBROW_BOTTOM.map(p => p.x));
      if (rightInnerX > leftInnerX) {
        innerBrowDist = rightInnerX - leftInnerX;
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 1. EYE_BLINKING_STRUGGLE (Prolonged closure OR cluster blinking)
    // ─────────────────────────────────────────────────────────────
    const eyesClosed = face.leftEyeOpenProbability < 0.20 && face.rightEyeOpenProbability < 0.20;
    
    // Condition A: Prolonged closure (>1s, ~10 frames)
    this.updateState(eyesClosed, 'eyeClosure', 10, MirrorBehaviorSignal.EYE_BLINKING_STRUGGLE, activeSignals, newSignals);

    // Track blinks for cluster detection
    if (!eyesClosed && this.eyeWasClosed) {
      // Just opened
      this.recentBlinks.push(timestampMs);
    }
    this.eyeWasClosed = eyesClosed;

    // Condition B: Cluster blinking (exceeds baseline significantly)
    this.recentBlinks = this.recentBlinks.filter(time => timestampMs - time <= 5000);
    const blinkCountIn5s = this.recentBlinks.length;
    const baselineBlinksIn5s = this.baseline.blinkRatePerSecond * 5;

    if (baselineBlinksIn5s > 0 && blinkCountIn5s > baselineBlinksIn5s * 1.5 && blinkCountIn5s > baselineBlinksIn5s + 3) {
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
    // 2. JAW_TENSION (Mouth aperture < 50% of rest, sustained 8 frames)
    // ─────────────────────────────────────────────────────────────
    let jawTensed = false;
    if (this.baseline.neutralMouthAperture > 0 && mouthAperture > 0) {
      const apertureRatio = mouthAperture / this.baseline.neutralMouthAperture;
      jawTensed = apertureRatio < 0.5;
    }
    this.updateState(jawTensed, 'jawTension', 8, MirrorBehaviorSignal.JAW_TENSION, activeSignals, newSignals);

    // ─────────────────────────────────────────────────────────────
    // 3. OPEN_MOUTH_HOLD (Aperture > 150% of rest AND frozen low variance)
    // ─────────────────────────────────────────────────────────────
    let openMouthHold = false;
    if (this.baseline.neutralMouthAperture > 0 && mouthAperture > 0) {
      const apertureRatio = mouthAperture / this.baseline.neutralMouthAperture;
      if (apertureRatio > 1.5 && this.apertureHistory.length === 8) {
        const variance = this.getVariance(this.apertureHistory);
        // If variance is very low (frozen), it's a hold, not talking.
        if (variance < (this.baseline.neutralMouthAperture * 0.1)) {
          openMouthHold = true;
        }
      }
    }
    // Sustained ~2 seconds (~20 frames)
    this.updateState(openMouthHold, 'openMouth', 20, MirrorBehaviorSignal.OPEN_MOUTH_HOLD, activeSignals, newSignals);

    // ─────────────────────────────────────────────────────────────
    // 4. LIP_PURSING (Aperture very small AND frozen variance)
    // ─────────────────────────────────────────────────────────────
    let lipPursed = false;
    if (this.baseline.neutralMouthAperture > 0 && mouthAperture > 0) {
      const apertureRatio = mouthAperture / this.baseline.neutralMouthAperture;
      if (apertureRatio < 0.3 && this.apertureHistory.length === 8) {
        const variance = this.getVariance(this.apertureHistory);
        if (variance < (this.baseline.neutralMouthAperture * 0.05)) {
          lipPursed = true;
        }
      }
    }
    this.updateState(lipPursed, 'lipPursing', 8, MirrorBehaviorSignal.LIP_PURSING, activeSignals, newSignals);

    // ─────────────────────────────────────────────────────────────
    // 5. BROW_TENSION (Inner brow compression < 85% of rest)
    // ─────────────────────────────────────────────────────────────
    let browTensed = false;
    if (this.baseline.neutralInnerBrowDist > 0 && innerBrowDist > 0) {
      const browRatio = innerBrowDist / this.baseline.neutralInnerBrowDist;
      // Horizontal squeeze (distance gets smaller)
      browTensed = browRatio < 0.85;
    }
    this.updateState(browTensed, 'browTension', 8, MirrorBehaviorSignal.BROW_TENSION, activeSignals, newSignals);

    // ─────────────────────────────────────────────────────────────
    // 6. GAZE_AVERSION (Euler Yaw > 20° from rest for >3s)
    // ─────────────────────────────────────────────────────────────
    const isAverted = Math.abs(face.yawAngle - this.baseline.neutralEulerYaw) > 20;
    this.updateState(isAverted, 'gazeAversion', 30, MirrorBehaviorSignal.GAZE_AVERSION, activeSignals, newSignals);

    // ─────────────────────────────────────────────────────────────
    // 7. NOSTRIL_FLARE (Nose bottom contour width > 115% of neutral)
    // ─────────────────────────────────────────────────────────────
    let nostrilFlaring = false;
    if (face.contours && face.contours.NOSE_BOTTOM && face.contours.NOSE_BOTTOM.length > 0 &&
        this.baseline.neutralNostrilWidth > 0) {
      const xs = face.contours.NOSE_BOTTOM.map(p => p.x);
      const currentWidth = Math.max(...xs) - Math.min(...xs);
      nostrilFlaring = currentWidth / this.baseline.neutralNostrilWidth > 1.15;
    }
    this.updateState(nostrilFlaring, 'nostrilFlare', 8, MirrorBehaviorSignal.NOSTRIL_FLARE, activeSignals, newSignals);

    // ─────────────────────────────────────────────────────────────
    // 8. CHEEK_PUFFING (LEFT+RIGHT cheek bounding area > 120% of neutral)
    // ─────────────────────────────────────────────────────────────
    let cheekPuffing = false;
    if (face.contours && face.contours.LEFT_CHEEK && face.contours.RIGHT_CHEEK &&
        face.contours.LEFT_CHEEK.length > 0 && face.contours.RIGHT_CHEEK.length > 0 &&
        this.baseline.neutralCheekArea > 0) {
      const lxs = face.contours.LEFT_CHEEK.map(p => p.x);
      const lys = face.contours.LEFT_CHEEK.map(p => p.y);
      const rxs = face.contours.RIGHT_CHEEK.map(p => p.x);
      const rys = face.contours.RIGHT_CHEEK.map(p => p.y);
      const leftArea = (Math.max(...lxs) - Math.min(...lxs)) * (Math.max(...lys) - Math.min(...lys));
      const rightArea = (Math.max(...rxs) - Math.min(...rxs)) * (Math.max(...rys) - Math.min(...rys));
      const avgArea = (leftArea + rightArea) / 2;
      cheekPuffing = avgArea / this.baseline.neutralCheekArea > 1.20;
    }
    this.updateState(cheekPuffing, 'cheekPuff', 8, MirrorBehaviorSignal.CHEEK_PUFFING, activeSignals, newSignals);

    // ─────────────────────────────────────────────────────────────
    // 9. FACIAL_GRIMACING (Mouth asymmetry)
    // ─────────────────────────────────────────────────────────────
    let grimacing = false;
    if (face.landmarks && face.landmarks.MOUTH_LEFT && face.landmarks.MOUTH_RIGHT && face.landmarks.NOSE_BASE) {
      const leftYDist = Math.abs(face.landmarks.MOUTH_LEFT.y - face.landmarks.NOSE_BASE.y);
      const rightYDist = Math.abs(face.landmarks.MOUTH_RIGHT.y - face.landmarks.NOSE_BASE.y);
      
      // If one corner is significantly higher than the other
      const asymmetryRatio = Math.max(leftYDist, rightYDist) / Math.max(1, Math.min(leftYDist, rightYDist));
      if (asymmetryRatio > 1.3) {
        grimacing = true;
      }
    }
    this.updateState(grimacing, 'grimace', 8, MirrorBehaviorSignal.FACIAL_GRIMACING, activeSignals, newSignals);

    // ─────────────────────────────────────────────────────────────
    // 10. HEAD_JERKING (Velocity spikes in nose bridge tracking)
    // ─────────────────────────────────────────────────────────────
    if (face.landmarks && face.landmarks.NOSE_BASE) {
      const currentPos = { x: face.landmarks.NOSE_BASE.x, y: face.landmarks.NOSE_BASE.y, timestamp: timestampMs };
      if (this.lastNosePos) {
        const dt = (currentPos.timestamp - this.lastNosePos.timestamp) / 1000;
        if (dt > 0 && dt < 0.5) {
          const dx = currentPos.x - this.lastNosePos.x;
          const dy = currentPos.y - this.lastNosePos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const velocity = dist / dt;

          // Spike threshold - needs tuning based on face size, but generic relative threshold:
          // Typical bounds are roughly 400x800 for mobile screen coords from Vision Camera.
          if (velocity > 800) { // Large sudden movement
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
    // 9. FACIAL_TENSION_COMPOSITE (2+ high reliability signals active)
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
    // 10. LOW LIGHT GUARDRAIL
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
