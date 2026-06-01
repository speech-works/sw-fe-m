package expo.modules.facelandmarker

import android.graphics.Bitmap
import android.graphics.ImageFormat
import android.media.Image
import androidx.camera.core.ExperimentalGetImage
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.facelandmarker.FaceLandmarker
import com.google.mediapipe.tasks.vision.facelandmarker.FaceLandmarker.FaceLandmarkerOptions
import com.mrousavy.camera.frameprocessors.Frame
import com.mrousavy.camera.frameprocessors.FrameProcessorPlugin
import com.mrousavy.camera.frameprocessors.VisionCameraProxy
import kotlin.math.asin
import kotlin.math.atan2
import kotlin.math.sqrt

/**
 * VisionCamera FrameProcessorPlugin for face landmark detection (VIDEO mode).
 *
 * Uses VIDEO running mode with monotonically increasing timestamps for
 * temporal coherence. Returns blendshapes + landmarks + headPose + imageWidth/imageHeight.
 *
 * Registered via ExpoFaceLandmarkerModule's static init block.
 * JS-side: VisionCameraProxy.initFrameProcessorPlugin('detectFacesFromFrame')
 */
class ExpoFaceLandmarkerPlugin(
    private val proxy: VisionCameraProxy,
    options: Map<String, Any>?
) : FrameProcessorPlugin() {

    private var faceLandmarker: FaceLandmarker? = null
    private var lastTimestampMs: Long = -1L

    private fun getLandmarker(): FaceLandmarker? {
        if (faceLandmarker != null) return faceLandmarker
        try {
            val context = proxy.context.applicationContext
            val baseOptions = BaseOptions.builder()
                .setModelAssetPath("face_landmarker.task")
                .build()

            val opts = FaceLandmarkerOptions.builder()
                .setBaseOptions(baseOptions)
                .setRunningMode(RunningMode.VIDEO)
                .setNumFaces(1)
                .setOutputFaceBlendshapes(true)
                .setOutputFacialTransformationMatrixes(true)
                .setMinFaceDetectionConfidence(0.5f)
                .setMinFacePresenceConfidence(0.5f)
                .setMinTrackingConfidence(0.5f)
                .build()

            faceLandmarker = FaceLandmarker.createFromOptions(context, opts)
            android.util.Log.d("ExpoFaceLandmarkerPlugin", "✅ FaceLandmarker (VIDEO) initialized")
        } catch (e: Exception) {
            android.util.Log.e("ExpoFaceLandmarkerPlugin", "❌ Failed to init: ${e.message}")
        }
        return faceLandmarker
    }

    @OptIn(ExperimentalGetImage::class)
    override fun callback(frame: Frame, params: Map<String, Any>?): Any? {
        return try {
            val image = frame.image

            // Monotonically increasing timestamp in ms (camera delivers ns)
            val rawMs = frame.imageProxy.imageInfo.timestamp / 1_000_000L
            val timestampMs = if (rawMs > lastTimestampMs) rawMs else lastTimestampMs + 1
            lastTimestampMs = timestampMs

            val rotationDegrees = frame.imageProxy.imageInfo.rotationDegrees
            val bitmap = yuvToBitmap(image)
            val upright = if (rotationDegrees != 0) rotateBitmap(bitmap, rotationDegrees) else bitmap

            runDetectionOnBitmap(upright, timestampMs)
        } catch (e: Exception) {
            android.util.Log.e("ExpoFaceLandmarkerPlugin", "❌ callback failed: ${e.message}")
            null
        }
    }

    private fun rotateBitmap(src: Bitmap, degrees: Int): Bitmap {
        val matrix = android.graphics.Matrix()
        matrix.postRotate(degrees.toFloat())
        return Bitmap.createBitmap(src, 0, 0, src.width, src.height, matrix, true)
    }

    /**
     * Convert YUV_420_888 to Bitmap, downsampled by 2 for speed.
     * MediaPipe handles low-res fine for face landmarks.
     */
    private fun yuvToBitmap(image: Image): Bitmap {
        val width = image.width
        val height = image.height

        val yPlane = image.planes[0]
        val uPlane = image.planes[1]
        val vPlane = image.planes[2]

        val yRowStride = yPlane.rowStride
        val uvRowStride = uPlane.rowStride
        val uvPixelStride = uPlane.pixelStride

        val yBuf = yPlane.buffer
        val uBuf = uPlane.buffer
        val vBuf = vPlane.buffer

        val scale = 2
        val scaledW = width / scale
        val scaledH = height / scale
        val pixels = IntArray(scaledW * scaledH)
        var idx = 0

        for (row in 0 until scaledH) {
            val srcRow = row * scale
            for (col in 0 until scaledW) {
                val srcCol = col * scale
                val y = yBuf.get(yRowStride * srcRow + srcCol).toInt() and 0xFF
                val uvIndex = uvPixelStride * (srcCol / 2) + uvRowStride * (srcRow / 2)
                val u = (uBuf.get(uvIndex).toInt() and 0xFF) - 128
                val v = (vBuf.get(uvIndex).toInt() and 0xFF) - 128

                val r = (y + 1.370705f * v).toInt().coerceIn(0, 255)
                val g = (y - 0.698001f * v - 0.337633f * u).toInt().coerceIn(0, 255)
                val b = (y + 1.732446f * u).toInt().coerceIn(0, 255)

                pixels[idx++] = (0xFF shl 24) or (r shl 16) or (g shl 8) or b
            }
        }

        return Bitmap.createBitmap(pixels, scaledW, scaledH, Bitmap.Config.ARGB_8888)
    }

    private fun runDetectionOnBitmap(bitmap: Bitmap, timestampMs: Long): Map<String, Any>? {
        val landmarker = getLandmarker() ?: return null
        val mpImage = BitmapImageBuilder(bitmap).build()
        val result = landmarker.detectForVideo(mpImage, timestampMs)

        val faceLandmarksList = result.faceLandmarks()
        if (faceLandmarksList.isEmpty()) return null

        val firstFace = faceLandmarksList[0]

        val landmarks: List<Map<String, Double>> = firstFace.map { lm ->
            mapOf("x" to lm.x().toDouble(), "y" to lm.y().toDouble(), "z" to lm.z().toDouble())
        }

        val blendshapes: List<Map<String, Any>> = if (result.faceBlendshapes().isPresent) {
            val bsList = result.faceBlendshapes().get()
            if (bsList.isNotEmpty()) {
                bsList[0].map { cat ->
                    mapOf("name" to (cat.categoryName() ?: ""), "score" to cat.score().toDouble())
                }
            } else emptyList()
        } else emptyList()

        val output = mutableMapOf<String, Any>(
            "blendshapes" to blendshapes,
            "landmarks" to landmarks,
            "imageWidth" to bitmap.width,
            "imageHeight" to bitmap.height,
        )

        // Extract head pose from the 4×4 facial transformation matrix (column-major float[]).
        // facialTransformationMatrixes() returns Optional<List<float[]>>.
        // Column-major: R[row][col] = d[col*4 + row]
        // ZYX Euler: yaw=atan2(-R20, R00), pitch=asin(R10), roll=atan2(-R12, R11)
        if (result.facialTransformationMatrixes().isPresent) {
            val matrices = result.facialTransformationMatrixes().get()
            if (matrices.isNotEmpty()) {
                val d = matrices[0]  // float[16], column-major
                if (d.size >= 16) {
                    val toDeg = 180.0 / Math.PI
                    val yaw   = atan2(-d[2].toDouble(),  d[0].toDouble()) * toDeg
                    val pitch = asin(d[1].toDouble().coerceIn(-1.0, 1.0))  * toDeg
                    val roll  = atan2(-d[9].toDouble(),  d[5].toDouble()) * toDeg
                    output["headPose"] = mapOf(
                        "yaw"   to yaw,
                        "pitch" to pitch,
                        "roll"  to roll,
                    )
                }
            }
        }

        return output
    }
}
