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
  /** Average jaw distance (MOUTH_BOTTOM.y - NOSE_BASE.y) at rest. */
  neutralJawDistance: number;
  /** Average brow Y coordinate at rest. */
  neutralBrowY: number;
  /** Average yaw angle at rest. */
  neutralEulerYaw: number;
  /** Average lip gap (LOWER_LIP_TOP.y - UPPER_LIP_BOTTOM.y) at rest. */
  neutralLipGap: number;
}

/**
 * MirrorBehaviorAnalyzer — detects secondary stuttering behaviors
 * from ML Kit face data on a per-frame basis.
 *
 * ARCHITECTURE: This class distinguishes between:
 * - "active" signals: currently-happening conditions (for UI overlay)
 * - "new" signals: transitions from inactive→active (for event counting)
 *
 * Only "new" signals should be counted as events. This prevents a single
 * sustained jaw clench from being counted as hundreds of events.
 */
export class MirrorBehaviorAnalyzer {
  private baseline: UserBaseline | null = null;

  // Blink tracking
  private recentBlinks: number[] = []; // Timestamps of unique blink events
  private eyeWasClosed: boolean = false; // Track previous frame eye state

  // Duration-gated signal state tracking
  // Each tracks: start time of current episode, and whether we've already
  // emitted a "new event" for this episode.
  private eyeClosureState = { startTime: null as number | null, emitted: false };
  private jawTensionState = { startTime: null as number | null, emitted: false };
  private lipPursingState = { startTime: null as number | null, emitted: false };
  private browTensionState = { startTime: null as number | null, emitted: false };
  private gazeAversionState = { startTime: null as number | null, emitted: false };

  // Velocity tracking
  private lastEulerAngles: { pitch: number; roll: number; yaw: number; timestamp: number } | null = null;

  // Guardrail tracking
  private poorLightingFrameCount: number = 0;

  // Blink spike cooldown (emit at most once per 5s window)
  private lastBlinkSpikeTime: number = 0;

  public setBaseline(baseline: UserBaseline) {
    this.baseline = baseline;
  }

  public analyzeFrame(face: Face, timestampMs: number): DetectionResult {
    const activeSignals: MirrorBehaviorSignal[] = [];
    const newSignals: MirrorBehaviorSignal[] = [];

    if (!this.baseline) {
      return { newSignals: [], activeSignals: [], faceInFrame: true, lightingWarning: false };
    }

    // ─────────────────────────────────────────────────────────────
    // 1. EYE_CLOSURE (>400ms sustained close, not a normal blink)
    // ─────────────────────────────────────────────────────────────
    const eyesClosed = face.leftEyeOpenProbability < 0.15 && face.rightEyeOpenProbability < 0.15;

    if (eyesClosed) {
      if (!this.eyeClosureState.startTime) {
        this.eyeClosureState.startTime = timestampMs;
        this.eyeClosureState.emitted = false;
      }
      if (timestampMs - this.eyeClosureState.startTime > 400) {
        activeSignals.push(MirrorBehaviorSignal.EYE_CLOSURE);
        if (!this.eyeClosureState.emitted) {
          newSignals.push(MirrorBehaviorSignal.EYE_CLOSURE);
          this.eyeClosureState.emitted = true;
        }
      }
    } else {
      // Track unique blink events (eye was closed < 400ms then opened)
      if (this.eyeWasClosed && this.eyeClosureState.startTime) {
        const closureDuration = timestampMs - this.eyeClosureState.startTime;
        if (closureDuration > 80 && closureDuration <= 400) {
          // Valid blink (not noise < 80ms, not sustained closure > 400ms)
          this.recentBlinks.push(timestampMs);
        }
      }
      this.eyeClosureState.startTime = null;
      this.eyeClosureState.emitted = false;
    }
    this.eyeWasClosed = eyesClosed;

    // ─────────────────────────────────────────────────────────────
    // 2. EYE_BLINK_SPIKE (Rolling 5s window, relative to baseline)
    // ─────────────────────────────────────────────────────────────
    this.recentBlinks = this.recentBlinks.filter(time => timestampMs - time <= 5000);
    const blinkCountIn5s = this.recentBlinks.length;
    const baselineBlinksIn5s = this.baseline.blinkRatePerSecond * 5;

    // Only trigger if:
    // - Blink count exceeds 150% of baseline AND at least 3 absolute blinks above
    // - Cooldown: don't re-emit within 5 seconds of last spike
    const blinkSpikeActive =
      baselineBlinksIn5s > 0 &&
      blinkCountIn5s > baselineBlinksIn5s * 1.5 &&
      blinkCountIn5s > baselineBlinksIn5s + 3;

    if (blinkSpikeActive) {
      activeSignals.push(MirrorBehaviorSignal.EYE_BLINK_SPIKE);
      if (timestampMs - this.lastBlinkSpikeTime > 5000) {
        newSignals.push(MirrorBehaviorSignal.EYE_BLINK_SPIKE);
        this.lastBlinkSpikeTime = timestampMs;
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 3. JAW_TENSION (Jaw distance drops >40% below baseline, >500ms)
    // ─────────────────────────────────────────────────────────────
    if (
      face.landmarks &&
      face.landmarks.MOUTH_BOTTOM &&
      face.landmarks.NOSE_BASE &&
      this.baseline.neutralJawDistance > 0
    ) {
      const jawDistance = face.landmarks.MOUTH_BOTTOM.y - face.landmarks.NOSE_BASE.y;
      const jawRatio = jawDistance / this.baseline.neutralJawDistance;

      // Tension = jaw is clenched shut (ratio < 0.6 of neutral resting distance)
      if (jawRatio < 0.6) {
        if (!this.jawTensionState.startTime) {
          this.jawTensionState.startTime = timestampMs;
          this.jawTensionState.emitted = false;
        }
        if (timestampMs - this.jawTensionState.startTime > 500) {
          activeSignals.push(MirrorBehaviorSignal.JAW_TENSION);
          if (!this.jawTensionState.emitted) {
            newSignals.push(MirrorBehaviorSignal.JAW_TENSION);
            this.jawTensionState.emitted = true;
          }
        }
      } else {
        this.jawTensionState.startTime = null;
        this.jawTensionState.emitted = false;
      }
    } else {
      this.jawTensionState.startTime = null;
      this.jawTensionState.emitted = false;
    }

    // ─────────────────────────────────────────────────────────────
    // 4. LIP_PURSING (Lips pressed together for >800ms)
    //
    // Uses the BASELINE lip gap, not an absolute pixel threshold.
    // This is critical — face size, distance from camera, and resolution
    // all affect absolute pixel values. Relative-to-baseline comparison
    // eliminates these variables.
    // ─────────────────────────────────────────────────────────────
    let lipPursed = false;
    if (
      face.contours &&
      face.contours.UPPER_LIP_BOTTOM &&
      face.contours.LOWER_LIP_TOP &&
      this.baseline.neutralLipGap > 0
    ) {
      const upperY =
        face.contours.UPPER_LIP_BOTTOM.reduce((sum, p) => sum + p.y, 0) /
        face.contours.UPPER_LIP_BOTTOM.length;
      const lowerY =
        face.contours.LOWER_LIP_TOP.reduce((sum, p) => sum + p.y, 0) /
        face.contours.LOWER_LIP_TOP.length;
      const lipGap = Math.abs(lowerY - upperY);

      // Lips are "pursed" if the gap is < 30% of the user's own neutral lip gap.
      // This is much more conservative than the old `face.bounds.height * 0.02`
      // which was triggering on normal speaking.
      const lipRatio = lipGap / this.baseline.neutralLipGap;
      if (lipRatio < 0.3) {
        lipPursed = true;
      }
    }

    if (lipPursed) {
      if (!this.lipPursingState.startTime) {
        this.lipPursingState.startTime = timestampMs;
        this.lipPursingState.emitted = false;
      }
      // Require 800ms sustained (up from 500ms) — normal speech involves
      // brief lip closures; only sustained pressing is a secondary behavior.
      if (timestampMs - this.lipPursingState.startTime > 800) {
        activeSignals.push(MirrorBehaviorSignal.LIP_PURSING);
        if (!this.lipPursingState.emitted) {
          newSignals.push(MirrorBehaviorSignal.LIP_PURSING);
          this.lipPursingState.emitted = true;
        }
      }
    } else {
      this.lipPursingState.startTime = null;
      this.lipPursingState.emitted = false;
    }

    // ─────────────────────────────────────────────────────────────
    // 5. BROW_TENSION (Brow lowers >30% below neutral for >800ms)
    // ─────────────────────────────────────────────────────────────
    let browTensed = false;
    if (face.contours && face.contours.LEFT_EYEBROW_BOTTOM && this.baseline.neutralBrowY > 0) {
      const browY =
        face.contours.LEFT_EYEBROW_BOTTOM.reduce((sum, p) => sum + p.y, 0) /
        face.contours.LEFT_EYEBROW_BOTTOM.length;
      // Y increases downward, so brow moving DOWN = higher Y = tension
      if (browY > this.baseline.neutralBrowY * 1.3) {
        browTensed = true;
      }
    }

    if (browTensed) {
      if (!this.browTensionState.startTime) {
        this.browTensionState.startTime = timestampMs;
        this.browTensionState.emitted = false;
      }
      if (timestampMs - this.browTensionState.startTime > 800) {
        activeSignals.push(MirrorBehaviorSignal.BROW_TENSION);
        if (!this.browTensionState.emitted) {
          newSignals.push(MirrorBehaviorSignal.BROW_TENSION);
          this.browTensionState.emitted = true;
        }
      }
    } else {
      this.browTensionState.startTime = null;
      this.browTensionState.emitted = false;
    }

    // ─────────────────────────────────────────────────────────────
    // 6. GAZE_AVERSION (Euler Y > 20° from baseline for >3s)
    // ─────────────────────────────────────────────────────────────
    const isAverted = Math.abs(face.yawAngle - this.baseline.neutralEulerYaw) > 20;
    if (isAverted) {
      if (!this.gazeAversionState.startTime) {
        this.gazeAversionState.startTime = timestampMs;
        this.gazeAversionState.emitted = false;
      }
      if (timestampMs - this.gazeAversionState.startTime > 3000) {
        activeSignals.push(MirrorBehaviorSignal.GAZE_AVERSION);
        if (!this.gazeAversionState.emitted) {
          newSignals.push(MirrorBehaviorSignal.GAZE_AVERSION);
          this.gazeAversionState.emitted = true;
        }
      }
    } else {
      this.gazeAversionState.startTime = null;
      this.gazeAversionState.emitted = false;
    }

    // ─────────────────────────────────────────────────────────────
    // 7. HEAD_MOVEMENT (Velocity > 30°/s AND co-occurring with tension)
    // ─────────────────────────────────────────────────────────────
    let fastHeadMovement = false;
    if (this.lastEulerAngles) {
      const dt = (timestampMs - this.lastEulerAngles.timestamp) / 1000;
      if (dt > 0 && dt < 1) {
        // Ignore if gap > 1s (frame drops would cause false spikes)
        const dYaw = Math.abs(face.yawAngle - this.lastEulerAngles.yaw);
        const dPitch = Math.abs(face.pitchAngle - this.lastEulerAngles.pitch);
        const dRoll = Math.abs(face.rollAngle - this.lastEulerAngles.roll);
        const velocity = Math.max(dYaw, dPitch, dRoll) / dt;

        if (velocity > 30) {
          fastHeadMovement = true;
        }
      }
    }

    this.lastEulerAngles = {
      pitch: face.pitchAngle,
      roll: face.rollAngle,
      yaw: face.yawAngle,
      timestamp: timestampMs,
    };

    // HEAD_MOVEMENT only counts when co-occurring with facial tension
    const hasHighReliabilityTension = activeSignals.some((s) =>
      [
        MirrorBehaviorSignal.JAW_TENSION,
        MirrorBehaviorSignal.LIP_PURSING,
        MirrorBehaviorSignal.BROW_TENSION,
        MirrorBehaviorSignal.EYE_CLOSURE,
      ].includes(s),
    );

    if (fastHeadMovement && hasHighReliabilityTension) {
      activeSignals.push(MirrorBehaviorSignal.HEAD_MOVEMENT);
      newSignals.push(MirrorBehaviorSignal.HEAD_MOVEMENT);
    }

    // ─────────────────────────────────────────────────────────────
    // 8. FACIAL_TENSION_COMPOSITE (2+ high reliability signals active)
    // ─────────────────────────────────────────────────────────────
    const highTensionCount = activeSignals.filter((s) =>
      [
        MirrorBehaviorSignal.JAW_TENSION,
        MirrorBehaviorSignal.LIP_PURSING,
        MirrorBehaviorSignal.BROW_TENSION,
        MirrorBehaviorSignal.EYE_CLOSURE,
      ].includes(s),
    ).length;

    if (highTensionCount >= 2) {
      activeSignals.push(MirrorBehaviorSignal.FACIAL_TENSION_COMPOSITE);
      newSignals.push(MirrorBehaviorSignal.FACIAL_TENSION_COMPOSITE);
    }

    // ─────────────────────────────────────────────────────────────
    // 9. LOW LIGHT GUARDRAIL
    // ─────────────────────────────────────────────────────────────
    const hasPoorLighting = !face.landmarks || Object.keys(face.landmarks).length < 5;

    if (hasPoorLighting) {
      this.poorLightingFrameCount++;
    } else {
      this.poorLightingFrameCount = 0;
    }

    const lightingWarning = this.poorLightingFrameCount > 10;

    return {
      newSignals,
      activeSignals,
      faceInFrame: true,
      lightingWarning,
    };
  }
}
