// The motion as data. Every number is copied from the web studio. The source is named on each table.

/** hands-rig.js: up2 defaults (entry ms, exit ms). */
export const UP2 = { i: 520, o: 480 };

/** hands-rig.js AT.palms. Times are pose ms. */
export const PALMS = { open: [380, 900], spread: 3, spreadX: 4, dy: -22, tilt: 2.5, tiltIn: [300, 800], tiltOut: [2000, 2400], nod: -4, faceIn: 300, faceOut: 2250 };

/** hands-rig.js W (the wave from the wrist). */
export const WAVE = { T: 3250, lift: 570, s0: 600, s1: 2500, f: 1.8, A: 14, F: 2.5, lead: 1.22, lag: 75 };
/** hands-rig.js swing() and AT.wave2: the other numbers. */
export const WAVE_X = { liftPow: 1.6, liftBack: 1.5, dropMs: 520, envIn: .1, decay: .55, fadeMs: 260, drag0: 8, dragOut: 10, dragFrom: 560, dragTo: 200,
  armBack: 9, armDrop: 5, skewK: .9, tilt: 2.6, tiltIn: [150, 650], tiltOut: [560, 60], sway: 1.6, swayPhase: 1.2, nod: -4, nodSeg: [200, 700], faceIn: 350, faceOut: 350 };

/** hands-rig.js AT.calm(1) (Hand on the cheek). Times are pose ms. The hand grows 2% and the head leans toward it. */
export const CHEEK = { pop: .02, popSeg: [500, 2200], tilt: 2.8, tiltIn: [200, 700], tiltOut: [2200, 2600], ny: 3 };
/** hands-rig.js AT.chin (Hand at the chin): a small thinking nod, twice (2 Hz) between 800 and 2500 ms; the hand nods with it. */
export const CHIN = { seg: [800, 2500], nod: 5, freq: 2, rot: 1.2, rotPh: .6, dyK: .8, tilt: -3, tiltIn: [150, 600], tiltOut: [2650, 3000], dip: -5, dipSeg: [280, 560] };
/** hands-rig.js AT.heart3 (Heart hands): one pulse of 6% at the peak; dy keeps the top of the hands under the mouth while they grow. */
export const HEART = { pulse: [520, 860], dy: 12, pop: .06, tilt: -2, tiltIn: [200, 700], tiltOut: [2200, 2600], ny: 4, nyIn: [300, 700], nyOut: [2200, 2600] };
/** Heart hands hold NOTHING: no plush heart and no glow in the gap between the hands (founder, 2026-11-25: removed from the kit for good). */

/** One drawing of a pose: where it sits and how big. Position A uses atX, atY, angle. Position B uses wristX, wristY, fa, bend. */
                                                                                                                                                                                       
                                                                                                                                        
/** hands-rig.js POSES (palms = position A with the soft entry, wave / cheek / chin = position B, heart3 = position A with the soft entry and no arm).
 *  pm.js HAND picks the position. enter = the slide in of the rig itself: [0, 0] for the moments with a rigid arm (pm.js P2), the heart hands slide in from below. */
export const POSES                       = {
  palms: { variant: 'A', dur: 2400, mid: .3, face: 'curious', enter: [0, 0], rigid: true, parts: [
    { art: 'palmL', atX: 250, atY: 985, size: 322, angle: -4, mirror: false, sl: .42, wristX: 0, wristY: 0, fa: 0, bend: 0 },
    { art: 'palmR', atX: 750, atY: 985, size: 322, angle: 4, mirror: false, sl: .42, wristX: 0, wristY: 0, fa: 0, bend: 0 }] },
  wave: { variant: 'B', dur: 3250, mid: .36, face: 'smile', enter: [0, 0], rigid: true, parts: [
    { art: 'wave', atX: 0, atY: 0, size: 280, angle: 0, mirror: true, sl: .40, wristX: 782, wristY: 872, fa: 2, bend: 3 }] },
  cheek: { variant: 'B', dur: 2600, mid: .5, face: 'warm', enter: [0, 0], rigid: true, parts: [
    { art: 'cheek', atX: 0, atY: 0, size: 320, angle: 0, mirror: true, sl: .50, wristX: 748, wristY: 930, fa: -10, bend: -11 }] },
  chin: { variant: 'B', dur: 3000, mid: .5, face: 'thinking', enter: [0, 0], rigid: true, parts: [
    { art: 'chin', atX: 0, atY: 0, size: 270, angle: 0, mirror: false, sl: .42, wristX: 440, wristY: 1075, fa: 6, bend: 0 }] },
  heart3: { variant: 'A', dur: 2600, mid: .45, face: 'warm', enter: [0, 330], rigid: false, parts: [
    { art: 'heart3', atX: 277, atY: 1122, size: 316, angle: 0, mirror: false, sl: .2, wristX: 0, wristY: 0, fa: 0, bend: 0 }] },
};

/** pm.js handMoment: the rigid arm (rule M12i) and the sleeve shape. */
export const ARM = {
  forearm: 460,                    // hands-rig.js frame(): L
  sleeveUpA: 95, sleeveUpB: 54,    // how far up the forearm the cuff sits (SLEEVE_UP)
  riseDist: 430, riseTilt: 5,      // the arm rises 430 units along its own line and tilts at most 5 degrees
  handTiltShare: .5,               // the hand tilts half as much (gh)
  pivotR: 545, pivotY: 1045,       // the far end of the sleeve: first point outside this circle (centre 500,500) or below this y
  pivotFrom: 60, pivotTo: 700, pivotStep: 10,
  bodyX: 500, bodyY: 1100,         // "which side is the body side" is measured to this point
  cuffScaleW: 1.14, cuffInset: 5, cuffMin: 8, wideB: 1.08,       // hw
  widenA: .0012, widenB: .0009, widenFrom: 60,                   // the sleeve gets wider down the arm
  capK: 1.33,                      // round cap
  cutMin: 1.16, cutPad: 14,        // hands-rig.js: sleeve width >= 2 * cut * 1.16 + 14
  clipAhead: 8,                    // the hand is cut 8 units past the cuff line
  cuffShift: 6, cuffWidth: 5,      // the cuff band
  seamBack: 8, seamLen: 190, seamWidth: 3, seamStops: [[0, 0], [.14, .85], [.5, .85], [1, 0]],
  shadowBack: 40, shadowIn: -2, shadowOut: 14, shadowStops: [[0, .26], [.45, .1], [1, 0]],
  shoulderFrom: 20, shoulderStep: 6, shoulderPad: 3,
  sleeveDark: .09, seamDark: .32,  // sleeve style A: the shirt colour 9% darker; seam 32% darker
};

/** pm.js LIST (def) and handMoment('palms', {lead:140, hold:600}). Times are ms from the start of the moment. */
export const MOMENTS                                                                                                                                                                                                                                                                       = {
  'h-palms': { pose: 'palms', peakMs: 1070, lead: 140, hold: 600, inT: 900, outT: 480, endPause: 60, browMs: 300,
    headSink: 4, gazeX: .5, gazeY: -.6, shrugUpPad: 80, shrugDownPad: 60, faceIn: 0, faceOff: 0 },
  // the other moments: faceIn / faceOff = pose ms where the pose face starts and where the calm face comes back (the beat's face flag)
  'h-wave': { pose: 'wave', peakMs: 1170, lead: 0, hold: 0, inT: 0, outT: 0, endPause: 0, browMs: 0, headSink: 0, gazeX: 0, gazeY: 0, shrugUpPad: 0, shrugDownPad: 0, faceIn: WAVE_X.faceIn, faceOff: WAVE.T - WAVE_X.faceOut },
  'h-cheek': { pose: 'cheek', peakMs: 1300, lead: 0, hold: 0, inT: 0, outT: 0, endPause: 0, browMs: 0, headSink: 0, gazeX: 0, gazeY: 0, shrugUpPad: 0, shrugDownPad: 0, faceIn: 350, faceOff: 2450 },
  'h-chin': { pose: 'chin', peakMs: 1500, lead: 0, hold: 0, inT: 0, outT: 0, endPause: 0, browMs: 0, headSink: 0, gazeX: 0, gazeY: 0, shrugUpPad: 0, shrugDownPad: 0, faceIn: 300, faceOff: 2850 },
  'h-heart': { pose: 'heart3', peakMs: 1170, lead: 0, hold: 0, inT: 0, outT: 0, endPause: 0, browMs: 0, headSink: 0, gazeX: 0, gazeY: 0, shrugUpPad: 0, shrugDownPad: 0, faceIn: 350, faceOff: 2450 },
};

/** live.js frame(): what a full shrug (S.shrug = 1) does. */
export const SHRUG = { lift: 12, tilt: 3, sink: 5, brow: 3, browUp: 3 };

/** live.js: springs (k, c) and caps (rule M2). The web steps them once a display frame; the core steps them at a fixed 1/60 s. */
export const SPRINGS = { rotK: 40, rotC: 9, rotCap: 6, nyK: 55, nyC: 10, nyCap: 8, gazeK: 260, gazeC: 30, stepMs: 1000 / 60, settleMs: 800 };

/** live.js: head pivot (kit units), face change time, blink kinds (seconds). */
export const HEAD_PIVOT = [500, 830];
export const FACE_MS = 340;
export const BLINK = { normal: { c: .08, h: .035, o: .13, m: 1 }, sleepy: { c: .15, h: .08, o: .22, m: 1 }, half: { c: .07, h: .02, o: .12, m: .55 } };
