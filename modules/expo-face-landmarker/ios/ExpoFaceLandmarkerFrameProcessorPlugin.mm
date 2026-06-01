// Obj-C++ bridge that registers the Swift FrameProcessorPlugin with VisionCamera.
// The macro VISION_EXPORT_SWIFT_FRAME_PROCESSOR(ClassName, jsName) generates
// a +load method that calls FrameProcessorPluginRegistry at startup.

#import <VisionCamera/FrameProcessorPlugin.h>
#import <VisionCamera/FrameProcessorPluginRegistry.h>

#if __has_include("ExpoFaceLandmarker-Swift.h")
#import "ExpoFaceLandmarker-Swift.h"
#elif __has_include(<ExpoFaceLandmarker/ExpoFaceLandmarker-Swift.h>)
#import <ExpoFaceLandmarker/ExpoFaceLandmarker-Swift.h>
#endif

VISION_EXPORT_SWIFT_FRAME_PROCESSOR(ExpoFaceLandmarkerFrameProcessorPlugin, detectFacesFromFrame)
