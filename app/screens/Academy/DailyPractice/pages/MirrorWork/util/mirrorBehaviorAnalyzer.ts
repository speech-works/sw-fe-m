import { Face } from "react-native-vision-camera-face-detector";
import { MirrorBehaviorSignal } from "../types";

export interface DetectionResult {
  signals: MirrorBehaviorSignal[];
  faceInFrame: boolean;
  lightingWarning: boolean;
}

export interface UserBaseline {
  blinkRatePerSecond: number;
  neutralJawDistance: number;
  neutralBrowY: number;
  neutralEulerYaw: number;
}

export class MirrorBehaviorAnalyzer {
  private baseline: UserBaseline | null = null;
  private recentBlinks: number[] = []; // Timestamps of recent blinks
  private lastEyeClosedTime: number | null = null;
  private lastJawTensedTime: number | null = null;
  private lastBrowTensedTime: number | null = null;
  private lastLipPursedTime: number | null = null;
  private lastGazeAvertedTime: number | null = null;
  
  // Previous frame data for velocity computation
  private lastEulerAngles: { pitch: number; roll: number; yaw: number; timestamp: number } | null = null;
  
  // Guardrail tracking
  private poorLightingFrameCount: number = 0;

  public setBaseline(baseline: UserBaseline) {
    this.baseline = baseline;
  }

  public analyzeFrame(face: Face, timestampMs: number): DetectionResult {
    const signals: MirrorBehaviorSignal[] = [];
    
    if (!this.baseline) {
      return { signals, faceInFrame: true, lightingWarning: false };
    }

    // 1. EYE_CLOSURE (>400ms)
    const eyesClosed = face.leftEyeOpenProbability < 0.1 && face.rightEyeOpenProbability < 0.1;
    if (eyesClosed) {
      if (!this.lastEyeClosedTime) this.lastEyeClosedTime = timestampMs;
      if (timestampMs - this.lastEyeClosedTime > 400) {
        signals.push(MirrorBehaviorSignal.EYE_CLOSURE);
      }
    } else {
      // Record a blink if it was a quick closure
      if (this.lastEyeClosedTime && (timestampMs - this.lastEyeClosedTime <= 400)) {
        this.recentBlinks.push(timestampMs);
      }
      this.lastEyeClosedTime = null;
    }

    // 2. EYE_BLINK_SPIKE (Rolling 5s window)
    // Clean old blinks
    this.recentBlinks = this.recentBlinks.filter(time => timestampMs - time <= 5000);
    const blinkCountIn5s = this.recentBlinks.length;
    const baselineBlinksIn5s = this.baseline.blinkRatePerSecond * 5;
    // Threshold: >50% above baseline, with a minimum of 2 blinks above to avoid noise
    if (blinkCountIn5s > baselineBlinksIn5s * 1.5 && blinkCountIn5s > baselineBlinksIn5s + 1) {
      signals.push(MirrorBehaviorSignal.EYE_BLINK_SPIKE);
    }

    // 3. JAW_TENSION (Jaw distance drops >40% below baseline for 3+ frames)
    // Distance from NOSE_BASE to MOUTH_BOTTOM is a good proxy for jaw distance
    const jawDistance = face.landmarks.MOUTH_BOTTOM.y - face.landmarks.NOSE_BASE.y;
    if (jawDistance < this.baseline.neutralJawDistance * 0.6) {
      if (!this.lastJawTensedTime) this.lastJawTensedTime = timestampMs;
      if (timestampMs - this.lastJawTensedTime > 300) { // Approx 3 frames at 10fps
        signals.push(MirrorBehaviorSignal.JAW_TENSION);
      }
    } else {
      this.lastJawTensedTime = null;
    }

    // 4. LIP_PURSING (Lips pressed together >500ms)
    // Distance between upper lip bottom and lower lip top
    // For simplicity with landmarks (since contours might be heavy): 
    // We can use MOUTH_LEFT to MOUTH_RIGHT width vs baseline, or rely on contour data if passed.
    // If we only have landmarks, MOUTH_BOTTOM and NOSE_BASE is all we have.
    // Wait, the plugin returns contours: face.contours.UPPER_LIP_BOTTOM etc.
    let lipPursed = false;
    if (face.contours && face.contours.UPPER_LIP_BOTTOM && face.contours.LOWER_LIP_TOP) {
      const upperY = face.contours.UPPER_LIP_BOTTOM.reduce((sum, p) => sum + p.y, 0) / face.contours.UPPER_LIP_BOTTOM.length;
      const lowerY = face.contours.LOWER_LIP_TOP.reduce((sum, p) => sum + p.y, 0) / face.contours.LOWER_LIP_TOP.length;
      const lipDistance = Math.abs(lowerY - upperY);
      // Rough heuristic for closed lips: distance is very small relative to face size
      if (lipDistance < face.bounds.height * 0.02) {
        lipPursed = true;
      }
    }
    
    if (lipPursed) {
      if (!this.lastLipPursedTime) this.lastLipPursedTime = timestampMs;
      if (timestampMs - this.lastLipPursedTime > 500) {
        signals.push(MirrorBehaviorSignal.LIP_PURSING);
      }
    } else {
      this.lastLipPursedTime = null;
    }

    // 5. BROW_TENSION (Brow lowers >30% below neutral for >800ms)
    let browTensed = false;
    if (face.contours && face.contours.LEFT_EYEBROW_BOTTOM) {
      const browY = face.contours.LEFT_EYEBROW_BOTTOM.reduce((sum, p) => sum + p.y, 0) / face.contours.LEFT_EYEBROW_BOTTOM.length;
      if (browY > this.baseline.neutralBrowY * 1.3) { // Y increases downwards
        browTensed = true;
      }
    }

    if (browTensed) {
      if (!this.lastBrowTensedTime) this.lastBrowTensedTime = timestampMs;
      if (timestampMs - this.lastBrowTensedTime > 800) {
        signals.push(MirrorBehaviorSignal.BROW_TENSION);
      }
    } else {
      this.lastBrowTensedTime = null;
    }

    // 6. GAZE_AVERSION (Euler Y > 20 deg for > 3s)
    const isAverted = Math.abs(face.yawAngle - this.baseline.neutralEulerYaw) > 20;
    if (isAverted) {
      if (!this.lastGazeAvertedTime) this.lastGazeAvertedTime = timestampMs;
      if (timestampMs - this.lastGazeAvertedTime > 3000) {
        signals.push(MirrorBehaviorSignal.GAZE_AVERSION);
      }
    } else {
      this.lastGazeAvertedTime = null;
    }

    // 7. HEAD_MOVEMENT (Velocity > 30 deg/sec) AND co-occurring with facial tension
    let fastHeadMovement = false;
    if (this.lastEulerAngles) {
      const dt = (timestampMs - this.lastEulerAngles.timestamp) / 1000;
      if (dt > 0) {
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

    const hasHighReliabilityTension = signals.some(s => 
      [MirrorBehaviorSignal.JAW_TENSION, MirrorBehaviorSignal.LIP_PURSING, MirrorBehaviorSignal.BROW_TENSION, MirrorBehaviorSignal.EYE_CLOSURE].includes(s)
    );

    if (fastHeadMovement && hasHighReliabilityTension) {
      signals.push(MirrorBehaviorSignal.HEAD_MOVEMENT);
    }

    // 8. FACIAL_TENSION_COMPOSITE (2+ high reliability signals)
    const highTensionCount = signals.filter(s => 
      [MirrorBehaviorSignal.JAW_TENSION, MirrorBehaviorSignal.LIP_PURSING, MirrorBehaviorSignal.BROW_TENSION, MirrorBehaviorSignal.EYE_CLOSURE].includes(s)
    ).length;

    if (highTensionCount >= 2) {
      signals.push(MirrorBehaviorSignal.FACIAL_TENSION_COMPOSITE);
    }

    // 9. LOW LIGHT / POOR DETECTION GUARDRAIL
    // ML Kit may detect a face bounding box but fail to resolve landmarks/contours
    // if the lighting is too poor or the image is extremely blurry.
    const hasPoorLighting = !face.landmarks || Object.keys(face.landmarks).length < 5;
    
    if (hasPoorLighting) {
      this.poorLightingFrameCount++;
    } else {
      this.poorLightingFrameCount = 0;
    }

    // Trigger warning if lighting is poor for >10 consecutive sampled frames (~1 second)
    const lightingWarning = this.poorLightingFrameCount > 10;

    return {
      signals,
      faceInFrame: true,
      lightingWarning
    };
  }
}
