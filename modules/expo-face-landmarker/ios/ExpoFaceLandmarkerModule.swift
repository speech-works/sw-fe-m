import ExpoModulesCore
import MediaPipeTasksVision
import CoreImage
import UIKit

// MARK: - Result types

struct Blendshape: Codable {
  let name: String
  let score: Float
}

struct LandmarkPoint: Codable {
  let x: Float
  let y: Float
  let z: Float
}

// MARK: - Module

public class ExpoFaceLandmarkerModule: Module {

  private var faceLandmarker: FaceLandmarker?

  public func definition() -> ModuleDefinition {
    Name("ExpoFaceLandmarker")

    OnCreate {
      self.setupFaceLandmarker()
    }

    // Returns { blendshapes: [{name, score}], landmarks: [{x, y, z}] } | null
    AsyncFunction("detectFaces") { (base64Jpeg: String, promise: Promise) in
      guard let data = Data(base64Encoded: base64Jpeg),
            let uiImage = UIImage(data: data),
            let cgImage = uiImage.cgImage else {
        promise.resolve(nil)
        return
      }

      guard let landmarker = self.faceLandmarker else {
        promise.reject("LANDMARKER_NOT_READY", "Face landmarker not initialized")
        return
      }

      let mpImage = try MPImage(uiImage: uiImage)
      let result = try landmarker.detect(image: mpImage)

      guard let firstFace = result.faceLandmarks.first else {
        promise.resolve(nil)
        return
      }

      // ── 52 Blendshape coefficients ──
      var blendshapes: [[String: Any]] = []
      if let firstBlendshapes = result.faceBlendshapes.first {
        blendshapes = firstBlendshapes.categories.map { cat in
          ["name": cat.categoryName ?? "unknown", "score": cat.score]
        }
      }

      // ── 478 3D face landmarks (normalized 0-1 screen coords) ──
      let landmarks = firstFace.map { lm in
        ["x": lm.x, "y": lm.y, "z": lm.z]
      }

      promise.resolve([
        "blendshapes": blendshapes,
        "landmarks": landmarks,
      ])
    }

    // Synchronous frame detection (called from Vision Camera frame processor worklet via runOnJS)
    Function("detectFacesSync") { (base64Jpeg: String) -> [String: Any]? in
      guard let data = Data(base64Encoded: base64Jpeg),
            let uiImage = UIImage(data: data),
            let landmarker = self.faceLandmarker else {
        return nil
      }

      do {
        let mpImage = try MPImage(uiImage: uiImage)
        let result = try landmarker.detect(image: mpImage)

        guard let firstFace = result.faceLandmarks.first else { return nil }

        var blendshapes: [[String: Any]] = []
        if let firstBlendshapes = result.faceBlendshapes.first {
          blendshapes = firstBlendshapes.categories.map { cat in
            ["name": cat.categoryName ?? "", "score": cat.score]
          }
        }

        let landmarks = firstFace.map { lm in
          ["x": lm.x, "y": lm.y, "z": lm.z]
        }

        return ["blendshapes": blendshapes, "landmarks": landmarks]
      } catch {
        print("[ExpoFaceLandmarker] Detection error: \(error)")
        return nil
      }
    }
  }

  // MARK: - Private

  private func setupFaceLandmarker() {
    guard let modelPath = Bundle.main.path(forResource: "face_landmarker", ofType: "task") else {
      // Fall back to module bundle
      guard let modulePath = Bundle(for: ExpoFaceLandmarkerModule.self)
              .path(forResource: "face_landmarker", ofType: "task") else {
        print("[ExpoFaceLandmarker] ⚠️ face_landmarker.task model not found in bundle")
        return
      }
      createLandmarker(modelPath: modulePath)
      return
    }
    createLandmarker(modelPath: modelPath)
  }

  private func createLandmarker(modelPath: String) {
    do {
      let options = FaceLandmarkerOptions()
      options.baseOptions.modelAssetPath = modelPath
      options.runningMode = .image
      options.numFaces = 1
      options.outputFaceBlendshapes = true
      options.outputFacialTransformationMatrixes = false
      options.minFaceDetectionConfidence = 0.5
      options.minFacePresenceConfidence = 0.5
      options.minTrackingConfidence = 0.5

      faceLandmarker = try FaceLandmarker(options: options)
      print("[ExpoFaceLandmarker] ✅ FaceLandmarker initialized")
    } catch {
      print("[ExpoFaceLandmarker] ❌ Failed to create FaceLandmarker: \(error)")
    }
  }
}
