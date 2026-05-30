import { requireNativeModule } from 'expo-modules-core';
import type { FaceLandmarkerResult } from './ExpoFaceLandmarker.types';

// Require the native module
const ExpoFaceLandmarkerNative = requireNativeModule('ExpoFaceLandmarker');

/**
 * Detect face landmarks and blendshapes from a base64-encoded JPEG image.
 * Async — suitable for one-off calls.
 */
export async function detectFaces(base64Jpeg: string): Promise<FaceLandmarkerResult | null> {
  return ExpoFaceLandmarkerNative.detectFaces(base64Jpeg);
}

/**
 * Detect face landmarks and blendshapes from a base64-encoded JPEG image.
 * Sync — called from Vision Camera frame processor via Worklets.createRunOnJS.
 * NOTE: This should be called on the JS thread, not from a worklet directly.
 */
export function detectFacesSync(base64Jpeg: string): FaceLandmarkerResult | null {
  return ExpoFaceLandmarkerNative.detectFacesSync(base64Jpeg);
}

/**
 * Detect face landmarks and blendshapes from raw RGBA pixel bytes.
 * Android-only frame processor path: VisionCamera exposes frame.toArrayBuffer()
 * which returns RGBA_8888 bytes when pixelFormat="rgb" is set on the Camera.
 * Async because pixel-to-bitmap conversion happens on the native thread.
 *
 * IMPORTANT: Pass the raw ArrayBuffer (not a Uint8Array wrapper).
 * Expo Modules natively converts ArrayBuffer → ByteArray on the Kotlin side.
 * Wrapping in Uint8Array causes the worklet bridge to serialize it as
 * '[object Object]', which Kotlin cannot convert (causes ANR on real devices).
 */
export async function detectFacesFromRgba(
  width: number,
  height: number,
  rgbaBuffer: ArrayBuffer
): Promise<FaceLandmarkerResult | null> {
  return ExpoFaceLandmarkerNative.detectFacesFromRgba(width, height, rgbaBuffer);
}


export type { FaceLandmarkerResult, Blendshape, FaceLandmark3D } from './ExpoFaceLandmarker.types';
export { BLENDSHAPE } from './ExpoFaceLandmarker.types';

export default ExpoFaceLandmarkerNative;
