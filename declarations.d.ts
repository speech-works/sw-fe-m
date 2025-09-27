declare module "react-native-audio-stream" {
  interface AudioStreamerOptions {
    channels?: number;
    sampleRate?: number;
    bitrate?: number;
    bufferSize?: number;
  }

  class AudioStreamer {
    constructor(options?: AudioStreamerOptions);
    write(buffer: Buffer): void;
    stop(): void;
  }

  export default AudioStreamer;
}
