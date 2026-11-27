// What the Speechworks mobile app imports (sw-fe-m-2 app/components/Pip): only what a drawer needs at frame time.
// No look maker, no catalog, no test scenes: the app gets Pip's look already made (core/scripts/bake-pip-app.mjs).
export { solveFrame, prepare, handColours } from './solve.js';
export { HAND_ART } from './art/hand-art.js';
export { prepareIdle, solveIdle, overlayIdle } from './idle.js';
export { hairPath, hairElement } from './hair.js';
export { ARM, FACE_MS } from './data/moments.js';
export { faceMoment, faceStill, faceNow, faceGo } from './face.js';
