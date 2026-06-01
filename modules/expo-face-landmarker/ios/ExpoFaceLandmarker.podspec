Pod::Spec.new do |s|
  s.name           = 'ExpoFaceLandmarker'
  s.version        = '1.0.0'
  s.summary        = 'MediaPipe Face Landmarker with blendshapes for SpeechWorks'
  s.description    = 'Expo local module wrapping MediaPipe Face Landmarker to produce 52 blendshape coefficients and 478 3D landmarks for on-device facial tension detection.'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '16.4'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  # MediaPipe Tasks Vision — provides FaceLandmarker with blendshapes
  s.dependency 'MediaPipeTasksVision', '~> 0.10'
  # VisionCamera — required for the FrameProcessorPlugin registration macro
  s.dependency 'VisionCamera'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
  s.resources = ["Assets/**/*"]
end
