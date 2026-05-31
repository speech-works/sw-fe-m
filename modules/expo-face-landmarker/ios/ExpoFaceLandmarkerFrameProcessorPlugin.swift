import VisionCamera
import MediaPipeTasksVision
import CoreMedia
import CoreVideo

// MARK: - iOS FrameProcessorPlugin for face landmark detection (VIDEO mode)
//
// Registered in ExpoFaceLandmarkerFrameProcessorPlugin.mm via
// VISION_EXPORT_SWIFT_FRAME_PROCESSOR. Called from JS as
// faceLandmarkerPlugin.call(frame).
//
// Uses VIDEO running mode with monotonically increasing timestamps for
// better temporal coherence and less landmark jitter vs IMAGE mode.
// Outputs blendshapes + landmarks + headPose + imageWidth/imageHeight.

@objc(ExpoFaceLandmarkerFrameProcessorPlugin)
public class ExpoFaceLandmarkerFrameProcessorPlugin: FrameProcessorPlugin {

  private var faceLandmarker: FaceLandmarker?
  private var lastTimestampMs: Int64 = -1

  public override init(proxy: VisionCameraProxyHolder, options: [AnyHashable: Any]! = [:]) {
    super.init(proxy: proxy, options: options)
    setupLandmarker()
  }

  private func setupLandmarker() {
    let modelPath = Bundle.main.path(forResource: "face_landmarker", ofType: "task")
      ?? Bundle(for: ExpoFaceLandmarkerFrameProcessorPlugin.self)
           .path(forResource: "face_landmarker", ofType: "task")
    guard let path = modelPath else {
      print("[ExpoFaceLandmarkerPlugin] ⚠️ face_landmarker.task not found")
      return
    }
    do {
      let options = FaceLandmarkerOptions()
      options.baseOptions.modelAssetPath = path
      options.runningMode = .video
      options.numFaces = 1
      options.outputFaceBlendshapes = true
      options.outputFacialTransformationMatrixes = true
      options.minFaceDetectionConfidence = 0.5
      options.minFacePresenceConfidence = 0.5
      options.minTrackingConfidence = 0.5
      faceLandmarker = try FaceLandmarker(options: options)
      print("[ExpoFaceLandmarkerPlugin] ✅ FaceLandmarker (VIDEO) initialized")
    } catch {
      print("[ExpoFaceLandmarkerPlugin] ❌ Init failed: \(error)")
    }
  }

  public override func callback(_ frame: Frame, withArguments arguments: [AnyHashable: Any]?) -> Any? {
    guard let landmarker = faceLandmarker else { return nil }

    let sampleBuffer = frame.buffer

    // Monotonically increasing timestamp in ms
    let pts = CMSampleBufferGetPresentationTimeStamp(sampleBuffer)
    var timestampMs = Int64(CMTimeGetSeconds(pts) * 1000)
    if timestampMs <= lastTimestampMs {
      timestampMs = lastTimestampMs + 1
    }
    lastTimestampMs = timestampMs

    guard let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return nil }
    let imageWidth = CVPixelBufferGetWidth(pixelBuffer)
    let imageHeight = CVPixelBufferGetHeight(pixelBuffer)

    do {
      // frame.orientation reflects the raw sensor orientation including front-camera mirroring.
      // We pass it to MPImage so MediaPipe knows the physical orientation of the pixels.
      let mpImage = try MPImage(pixelBuffer: pixelBuffer, orientation: frame.orientation)
      let result = try landmarker.detect(videoFrame: mpImage, timestampInMilliseconds: Int(timestampMs))

      guard let firstFace = result.faceLandmarks.first else { return nil }

      var blendshapes: [[String: Any]] = []
      if let firstBs = result.faceBlendshapes?.first {
        blendshapes = firstBs.categories.map { cat in
          ["name": cat.categoryName ?? "", "score": Double(cat.score)]
        }
      }

      let landmarks: [[String: Double]] = firstFace.map { lm -> [String: Double] in
        let x = Double(lm.x)
        let y = Double(lm.y)
        let z = Double(lm.z)
        return ["x": x, "y": y, "z": z]
      }

      var output: [String: Any] = [
        "blendshapes": blendshapes,
        "landmarks": landmarks,
        "imageWidth": imageWidth,
        "imageHeight": imageHeight,
      ]

      // Extract yaw/pitch/roll from the 4×4 facial transformation matrix (column-major).
      // Column-major layout: data[col*4 + row].
      // We use a ZYX Euler decomposition:
      //   yaw   (Y) = atan2(data[2],  data[0])   — R[0][0]=data[0], R[0][2]=data[8]... wait
      // MediaPipe column-major means:
      //   R[row][col] = data[col*4 + row]
      //   data[0]=R00, data[1]=R10, data[2]=R20, data[3]=R30
      //   data[4]=R01, data[5]=R11, data[6]=R21, data[7]=R31
      //   data[8]=R02, data[9]=R12, data[10]=R22
      // ZYX Euler:  yaw=atan2(-R[2][0], R[0][0])=atan2(-data[2], data[0])
      //             pitch=asin(R[1][0])=asin(data[1])
      //             roll=atan2(-R[1][2], R[1][1])=atan2(-data[9], data[5])
      if let matrix = result.facialTransformationMatrixes?.first {
        let d = matrix.data  // [Float] x 16, column-major
        if d.count >= 16 {
          let yawRad   = atan2(-Double(d[2]),  Double(d[0]))
          let pitchRad = asin(max(-1, min(1, Double(d[1]))))
          let rollRad  = atan2(-Double(d[9]),  Double(d[5]))
          let toDeg = 180.0 / Double.pi
          output["headPose"] = [
            "yaw":   yawRad   * toDeg,
            "pitch": pitchRad * toDeg,
            "roll":  rollRad  * toDeg,
          ]
        }
      }

      return output
    } catch {
      print("[ExpoFaceLandmarkerPlugin] ❌ Detection error: \(error)")
      return nil
    }
  }
}
