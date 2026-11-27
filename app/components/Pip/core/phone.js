// What the phone app imports: the solver, the idle, the face, the hair, the stress scene and the look maker. NOT the four generated look files (the phone makes looks from the kit's part data at run time).
export { solve, solveFrame, prepare, handColours } from './solve.js';
export { HAND_ART } from './art/hand-art.js';
export { prepareIdle, solveIdle, overlayIdle, idleValues, eyeFrame, headMatrix } from './idle.js';
export { hairPath, hairElement, hairPoints } from './hair.js';
export { FACE_MS } from './data/moments.js';
export { prepareStress, solveStress } from './stress.js';
export { faceKit, faceMoment, faceStill, faceNow, faceGo } from './face.js';
export { makeLook, fullManifest, TALL_COLLARS, FACE_NAMES } from './lookgen.js';
export { CHECKED_LOOKS } from './looks/checked.js';
