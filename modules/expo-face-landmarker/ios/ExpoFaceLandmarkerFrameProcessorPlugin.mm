// Obj-C++ bridge that registers the Swift FrameProcessorPlugin with VisionCamera.
//
// THIS FILE IS NOT THE REGISTRATION THAT ACTUALLY RUNS. Keep it, but do not rely
// on it: for a Swift plugin the macro below expands to an empty Objective-C
// category plus an __attribute__((constructor)), and an empty category emits
// nothing. The resulting object file defines no class and no category and
// exports no referenced symbol, so `-ObjC` does not rescue it and the linker
// drops it from the app binary. Verified by `strings` on a shipped archive:
// "detectFacesFromFrame" was absent, and Mirror Work showed the
// "isn't available on this device" screen on every iPhone.
//
// The registration that runs is the static in ExpoFaceLandmarkerModule.swift.
// This file stays as a harmless second registration for the case where a future
// toolchain does keep the object: it writes the same name with an equivalent
// initializer, so whichever runs last wins and behaviour is identical.

#import <VisionCamera/FrameProcessorPlugin.h>
#import <VisionCamera/FrameProcessorPluginRegistry.h>

#if __has_include("ExpoFaceLandmarker-Swift.h")
#import "ExpoFaceLandmarker-Swift.h"
#elif __has_include(<ExpoFaceLandmarker/ExpoFaceLandmarker-Swift.h>)
#import <ExpoFaceLandmarker/ExpoFaceLandmarker-Swift.h>
#endif

VISION_EXPORT_SWIFT_FRAME_PROCESSOR(ExpoFaceLandmarkerFrameProcessorPlugin, detectFacesFromFrame)
