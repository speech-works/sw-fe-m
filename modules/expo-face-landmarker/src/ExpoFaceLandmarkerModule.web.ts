import { registerWebModule, NativeModule } from 'expo';

class ExpoFaceLandmarkerModule extends NativeModule<{}> {}

export default registerWebModule(ExpoFaceLandmarkerModule, 'ExpoFaceLandmarkerModule');
