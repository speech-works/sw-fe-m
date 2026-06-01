import { requireOptionalNativeModule } from 'expo-modules-core';
import { VisionCameraProxy } from 'react-native-vision-camera';
import type { FaceLandmarkerResult } from './ExpoFaceLandmarker.types';

// Optional require: returns null instead of throwing if the native module isn't
// in the build. A static `requireNativeModule` throws AT IMPORT, which crashes
// the whole app at startup (since this module is imported eagerly) rather than
// just disabling the Mirror Work feature. With the optional variant, a missing
// module degrades to the `detectionUnavailable` state instead of a hard crash.
const ExpoFaceLandmarkerNative = requireOptionalNativeModule('ExpoFaceLandmarker');

/**
 * VisionCamera FrameProcessorPlugin — called directly from a frame processor worklet.
 * Receives the Frame natively (YUV_420_888 → Bitmap → MediaPipe), no bridge serialization.
 * Returns FaceLandmarkerResult-shaped object or null if no face detected.
 */
export const faceLandmarkerPlugin = VisionCameraProxy.initFrameProcessorPlugin('detectFacesFromFrame', {});

/** True when the native module is present in this build. */
export const isFaceLandmarkerAvailable = ExpoFaceLandmarkerNative != null;

/**
 * Detect face landmarks and blendshapes from a base64-encoded JPEG image.
 * Async — suitable for one-off calls.
 */
export async function detectFaces(base64Jpeg: string): Promise<FaceLandmarkerResult | null> {
  if (!ExpoFaceLandmarkerNative) return null;
  return ExpoFaceLandmarkerNative.detectFaces(base64Jpeg);
}

/**
 * Detect face landmarks and blendshapes from a base64-encoded JPEG image.
 * Sync — called from Vision Camera frame processor via Worklets.createRunOnJS.
 * NOTE: This should be called on the JS thread, not from a worklet directly.
 */
export function detectFacesSync(base64Jpeg: string): FaceLandmarkerResult | null {
  if (!ExpoFaceLandmarkerNative) return null;
  return ExpoFaceLandmarkerNative.detectFacesSync(base64Jpeg);
}

export type { FaceLandmarkerResult, Blendshape, FaceLandmark3D } from './ExpoFaceLandmarker.types';
export { BLENDSHAPE } from './ExpoFaceLandmarker.types';

export default ExpoFaceLandmarkerNative;
