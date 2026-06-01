package expo.modules.facelandmarker

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Base64
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.facelandmarker.FaceLandmarker
import com.google.mediapipe.tasks.vision.facelandmarker.FaceLandmarker.FaceLandmarkerOptions
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.mrousavy.camera.frameprocessors.FrameProcessorPluginRegistry
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise

class ExpoFaceLandmarkerModule : Module() {

  companion object {
    init {
      // Register our VisionCamera FrameProcessorPlugin so it can be called from JS
      // via VisionCameraProxy.initFrameProcessorPlugin('detectFacesFromFrame')
      FrameProcessorPluginRegistry.addFrameProcessorPlugin("detectFacesFromFrame") { proxy, options ->
        ExpoFaceLandmarkerPlugin(proxy, options)
      }
    }
  }


  private var faceLandmarker: FaceLandmarker? = null

  override fun definition() = ModuleDefinition {
    Name("ExpoFaceLandmarker")

    // Async version for base64 JPEG input (used for one-off calls / iOS)
    AsyncFunction("detectFaces") { base64Jpeg: String, promise: Promise ->
      try {
        val result = runDetection(base64Jpeg)
        promise.resolve(result)
      } catch (e: Exception) {
        promise.reject("DETECTION_ERROR", e.message, e)
      }
    }

    // Sync version for iOS frame processor use (called via runOnJS from worklet)
    Function("detectFacesSync") { base64Jpeg: String ->
      try {
        runDetection(base64Jpeg)
      } catch (e: Exception) {
        null
      }
    }

    // Android frame processor path: accepts raw RGBA bytes from frame.toArrayBuffer()
    // when pixelFormat="rgb" is set on the VisionCamera Camera component.
    // Called asynchronously from the JS thread after the worklet dispatches the buffer.
    AsyncFunction("detectFacesFromRgba") { width: Int, height: Int, rgbaBytes: ByteArray ->
      try {
        val bitmap = createBitmapFromRgba(width, height, rgbaBytes)
        runDetectionOnBitmap(bitmap)
      } catch (e: Exception) {
        android.util.Log.e("ExpoFaceLandmarker", "❌ detectFacesFromRgba failed: ${e.message}")
        null
      }
    }
  }

  // MARK: - Private

  private fun getLandmarker(): FaceLandmarker? {
    if (faceLandmarker != null) return faceLandmarker
    val context = appContext.reactContext ?: return null
    try {
      val baseOptions = BaseOptions.builder()
        .setModelAssetPath("face_landmarker.task")
        .build()

      val options = FaceLandmarkerOptions.builder()
        .setBaseOptions(baseOptions)
        .setRunningMode(RunningMode.IMAGE)
        .setNumFaces(1)
        .setOutputFaceBlendshapes(true)
        .setMinFaceDetectionConfidence(0.5f)
        .setMinFacePresenceConfidence(0.5f)
        .setMinTrackingConfidence(0.5f)
        .build()

      faceLandmarker = FaceLandmarker.createFromOptions(context, options)
      android.util.Log.d("ExpoFaceLandmarker", "✅ FaceLandmarker initialized")
    } catch (e: Exception) {
      android.util.Log.e("ExpoFaceLandmarker", "❌ Failed to create FaceLandmarker: ${e.message}")
    }
    return faceLandmarker
  }

  private fun runDetection(base64Jpeg: String): Map<String, Any>? {
    val bytes = Base64.decode(base64Jpeg, Base64.DEFAULT)
    val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size) ?: return null
    return runDetectionOnBitmap(bitmap)
  }

  /**
   * Converts raw RGBA bytes (from VisionCamera's frame.toArrayBuffer() with pixelFormat="rgb")
   * into an Android Bitmap suitable for MediaPipe.
   *
   * VisionCamera's "rgb" pixelFormat on Android produces RGBA_8888 bytes.
   * Each pixel is 4 bytes in [R, G, B, A] order, which we pack into Android's
   * ARGB_8888 int format as 0xAARRGGBB.
   */
  private fun createBitmapFromRgba(width: Int, height: Int, rgbaBytes: ByteArray): Bitmap {
    val intPixels = IntArray(width * height)
    for (i in intPixels.indices) {
      val r = rgbaBytes[i * 4].toInt() and 0xFF
      val g = rgbaBytes[i * 4 + 1].toInt() and 0xFF
      val b = rgbaBytes[i * 4 + 2].toInt() and 0xFF
      val a = rgbaBytes[i * 4 + 3].toInt() and 0xFF
      intPixels[i] = (a shl 24) or (r shl 16) or (g shl 8) or b
    }
    return Bitmap.createBitmap(intPixels, width, height, Bitmap.Config.ARGB_8888)
  }

  private fun runDetectionOnBitmap(bitmap: Bitmap): Map<String, Any>? {
    val landmarker = getLandmarker() ?: return null

    val mpImage = BitmapImageBuilder(bitmap).build()
    val result = landmarker.detect(mpImage)

    val faceLandmarksList = result.faceLandmarks()
    if (faceLandmarksList.isEmpty()) return null

    val firstFace = faceLandmarksList[0]

    // ── 478 3D landmarks ──
    val landmarks: List<Map<String, Float>> = firstFace.map { lm ->
      mapOf("x" to lm.x(), "y" to lm.y(), "z" to lm.z())
    }

    // ── 52 Blendshape coefficients ──
    val blendshapes: List<Map<String, Any>> = if (result.faceBlendshapes().isPresent) {
      val firstFaceBlendshapes = result.faceBlendshapes().get()
      if (firstFaceBlendshapes.isNotEmpty()) {
        firstFaceBlendshapes[0].map { cat ->
          mapOf("name" to (cat.categoryName() ?: ""), "score" to cat.score())
        }
      } else emptyList()
    } else emptyList()

    return mapOf(
      "blendshapes" to blendshapes,
      "landmarks" to landmarks,
    )
  }
}
