import { useState, useRef, useEffect, useCallback } from "react";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";

type Turn = "user" | "agent";

interface UseCallSessionProps {
  userId: string;
  websocketUrl: string;
}

/**
 * Hook to manage a live AI calling session: captures audio, streams to server,
 * receives TTS audio back, and handles UI state.
 */
export function useCallSession({ userId, websocketUrl }: UseCallSessionProps) {
  const ws = useRef<WebSocket | null>(null);
  const recording = useRef<Audio.Recording | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isUserMuted, setIsUserMuted] = useState(false);
  const [isAgentMuted, setIsAgentMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [currentTurn, setCurrentTurn] = useState<Turn>("user");
  const playbackQueue = useRef<string[]>([]);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Define explicit recording options for raw 16-bit PCM at 16kHz.
  // This format is highly compatible with most speech-to-text services.
  const recordingOptions = {
    android: {
      extension: ".wav",
      outputFormat: Audio.AndroidOutputFormat.DEFAULT,
      audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
      sampleRate: 16000,
      numberOfChannels: 1,
      bitRate: 256000,
    },
    ios: {
      extension: ".wav",
      audioQuality: Audio.IOSAudioQuality.MAX,
      sampleRate: 16000,
      numberOfChannels: 1,
      bitRate: 256000,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
    web: {
      mimeType: "audio/wav",
      bitsPerSecond: 256000,
    },
  };

  // Helper function for delays
  const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  // Function to convert ArrayBuffer to Base64 without using Blob or Buffer
  // This approach is more compatible with React Native environments.
  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  /**
   * Parses a WAV ArrayBuffer to extract the raw audio data (PCM).
   * This is more robust than a fixed slice(44) as WAV files can have extra metadata chunks.
   * @param wavBuffer The ArrayBuffer of the WAV file.
   * @returns An ArrayBuffer containing only the raw PCM audio data.
   * @throws Error if the WAV format is invalid or data chunk is not found.
   */
  const getWavAudioData = (wavBuffer: ArrayBuffer): ArrayBuffer => {
    const view = new DataView(wavBuffer);
    let offset = 0;

    // Check RIFF header
    if (view.getUint32(offset, false) !== 0x52494646) {
      throw new Error("Invalid WAV file: Missing RIFF header");
    }
    offset += 4; // Skip chunk ID
    offset += 4; // Skip chunk size

    // Check WAVE format
    if (view.getUint32(offset, false) !== 0x57415645) {
      throw new Error("Invalid WAV file: Missing WAVE format");
    }
    offset += 4;

    // Iterate through chunks to find the "data" chunk
    while (offset < wavBuffer.byteLength) {
      const chunkId = view.getUint32(offset, false);
      offset += 4;
      const chunkSize = view.getUint32(offset, true); // Little-endian
      offset += 4;

      // Found "data" chunk
      if (chunkId === 0x64617461) {
        return wavBuffer.slice(offset, offset + chunkSize);
      }

      // Skip to the next chunk
      offset += chunkSize;
      if (chunkSize % 2 !== 0) {
        offset += 1;
      }
    }

    throw new Error("Invalid WAV file: Data chunk not found");
  };

  // NEW: A function to generate a WAV header and combine it with the audio data.
  const createWavFile = (
    pcmData: ArrayBuffer,
    sampleRate = 16000,
    numChannels = 1,
    bitDepth = 16
  ): ArrayBuffer => {
    const dataLength = pcmData.byteLength;
    const headerLength = 44;
    const wavBuffer = new ArrayBuffer(headerLength + dataLength);
    const view = new DataView(wavBuffer);
    let offset = 0;

    const writeString = (str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset++, str.charCodeAt(i));
      }
    };

    const writeUint32 = (val: number, littleEndian = true) => {
      view.setUint32(offset, val, littleEndian);
      offset += 4;
    };

    const writeUint16 = (val: number, littleEndian = true) => {
      view.setUint16(offset, val, littleEndian);
      offset += 2;
    };

    // RIFF header
    writeString("RIFF");
    writeUint32(36 + dataLength);
    writeString("WAVE");

    // fmt sub-chunk
    writeString("fmt ");
    writeUint32(16);
    writeUint16(1); // Audio Format (1 for PCM)
    writeUint16(numChannels);
    writeUint32(sampleRate);
    const byteRate = (sampleRate * numChannels * bitDepth) / 8;
    writeUint32(byteRate);
    const blockAlign = (numChannels * bitDepth) / 8;
    writeUint16(blockAlign);
    writeUint16(bitDepth);

    // data sub-chunk
    writeString("data");
    writeUint32(dataLength);

    // Copy PCM data
    const pcmView = new Uint8Array(pcmData);
    const wavView = new Uint8Array(wavBuffer);
    wavView.set(pcmView, headerLength);

    return wavBuffer;
  };

  // Increment call timer every second when active
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isCallActive) {
      timer = setInterval(() => setCallDuration((d) => d + 1), 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(timer);
  }, [isCallActive]);

  /**
   * Plays queued TTS audio chunks sequentially.
   * Ensures only one sound is playing at a time and unloads previous ones.
   */
  const playNextChunk = async () => {
    console.log("playNextChunk called...", { playbackQueue });
    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync();
      } catch (e) {
        console.warn(
          "Error unloading previous sound, might already be unloaded:",
          e
        );
      }
      soundRef.current = null;
    }
    const uri = playbackQueue.current.shift();
    console.log("playNextChunk uri...", { uri });
    if (!uri) return;

    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true }
      );
      console.log(" Audio.Sound.createAsync...", { sound });
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          playNextChunk(); // Play next chunk when current one finishes
        }
      });
    } catch (error) {
      console.error("Error playing audio chunk:", error);
      playNextChunk(); // Attempt to play the next chunk even if this one failed
    }
  };

  /**
   * Ends the call: stops recording loop, closes WebSocket, and resets state.
   * This function is defined early to be accessible by other callbacks.
   */
  const endCall = useCallback(async () => {
    if (!isCallActive) return; // Prevent multiple calls to endCall
    console.log("Ending call...");
    stopRecording.current = true; // Signal recording loop to stop

    if (recording.current) {
      try {
        await recording.current.stopAndUnloadAsync();
      } catch (e) {
        console.warn(
          "Error stopping recording, might already be stopped or not started:",
          e
        );
      }
      recording.current = null; // Clear recording instance
    }

    setIsCallActive(false); // Update call active state

    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current?.send(JSON.stringify({ type: "end_call" })); // Send end signal to backend
      ws.current?.close(); // Close WebSocket connection
    }
    ws.current = null; // Clear WebSocket instance

    playbackQueue.current = []; // Clear any pending audio for playback
    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync();
      } catch (e) {
        console.warn("Error unloading soundRef on endCall:", e);
      }
      soundRef.current = null;
    }
    setCallDuration(0); // Reset call duration
    setCurrentTurn("agent"); // Reset turn to default
    console.log("Call ended.");
  }, [isCallActive]);

  // Controls stopping in recording loop
  const stopRecording = useRef(false);

  // Debugging flag to save the next audio chunk
  const saveNextChunkForDebug = useRef(false);

  /**
   * Loop to capture audio chunks and send over WebSocket.
   * This runs continuously while the call is active and not muted.
   */
  const recordingLoop = async () => {
    stopRecording.current = false;
    const chunkMs = 100; // Capture audio in 100ms chunks for lower latency

    while (
      !stopRecording.current &&
      ws.current?.readyState === WebSocket.OPEN
    ) {
      if (!isUserMuted) {
        try {
          // Prepare and start recording with the defined options
          await recording.current?.prepareToRecordAsync(recordingOptions);
          await recording.current?.startAsync();
          await delay(chunkMs); // Record for chunkMs duration
          await recording.current?.stopAndUnloadAsync(); // Stop and unload the recording

          const uri = recording.current?.getURI();
          if (uri) {
            // Fetch the audio data as an ArrayBuffer from the URI
            const response = await fetch(uri);
            const arrayBuffer = await response.arrayBuffer();

            // *** NEW: Extract pure PCM data using the WAV parser ***
            const pcmData = getWavAudioData(arrayBuffer);

            console.log(
              `Sending ${pcmData.byteLength} bytes of PCM audio to WebSocket.`
            );
            ws.current?.send(pcmData); // Send raw PCM data

            // DEBUGGING: Save one chunk to file system if flag is set
            if (saveNextChunkForDebug.current) {
              // Save the full WAV file (before slicing)
              const fullWavFileName = `debug_audio_full_wav_${Date.now()}.wav`;
              const fullWavFilePath =
                FileSystem.documentDirectory + fullWavFileName;
              await FileSystem.writeAsStringAsync(
                fullWavFilePath,
                arrayBufferToBase64(arrayBuffer),
                {
                  encoding: FileSystem.EncodingType.Base64,
                }
              );
              console.log(`DEBUG: Saved full WAV audio to: ${fullWavFilePath}`);

              // Save the extracted PCM data
              const pcmFileName = `debug_audio_extracted_pcm_${Date.now()}.pcm`; // Renamed for clarity
              const pcmFilePath = FileSystem.documentDirectory + pcmFileName;
              await FileSystem.writeAsStringAsync(
                pcmFilePath,
                arrayBufferToBase64(pcmData),
                {
                  encoding: FileSystem.EncodingType.Base64,
                }
              );
              console.log(
                `DEBUG: Saved extracted PCM audio to: ${pcmFilePath}`
              );

              saveNextChunkForDebug.current = false; // Reset flag after saving
            }
          }
          // Re-initialize a new recording instance for the next chunk
          recording.current = new Audio.Recording();
        } catch (error) {
          console.error("Error during recording loop:", error);
          // If a recording error occurs, attempt to end the call gracefully
          stopRecording.current = true;
          ws.current?.close(); // Close WebSocket to trigger onclose handler
        }
      } else {
        // If user is muted, just delay without recording to maintain loop timing
        await delay(chunkMs);
      }
    }
    console.log("Recording loop stopped.");
  };

  /**
   * Starts the call: initializes WebSocket connection and begins audio recording.
   */
  const startCall = useCallback(async () => {
    if (isCallActive) return; // Prevent starting an already active call
    ws.current = new WebSocket(websocketUrl);

    ws.current.onopen = async () => {
      console.log("Frontend WS connected.");
      ws.current?.send(JSON.stringify({ type: "join", userId }));

      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      recording.current = new Audio.Recording();
      setIsCallActive(true);
      recordingLoop();
    };

    /**
     * Corrected onmessage handler to handle raw PCM audio data.
     * It now creates a valid WAV file before playing.
     */
    ws.current.onmessage = async (event) => {
      console.log("Receiving message in call session", { event });
      try {
        const msg = JSON.parse(event.data as string);

        if (msg.type === "turn") {
          setCurrentTurn(msg.turn);
          return;
        }

        if (msg.type === "audio" && msg.data) {
          // 1. Decode the Base64 PCM data into a binary ArrayBuffer
          const pcmBinaryString = atob(msg.data);
          const pcmArrayBuffer = new ArrayBuffer(pcmBinaryString.length);
          const pcmUint8Array = new Uint8Array(pcmArrayBuffer);
          for (let i = 0; i < pcmBinaryString.length; i++) {
            pcmUint8Array[i] = pcmBinaryString.charCodeAt(i);
          }

          // 2. Create a full WAV file with a proper header
          const wavFileBuffer = createWavFile(pcmArrayBuffer, 16000, 1, 16);

          // 3. Re-encode the complete WAV file to Base64
          const wavBase64 = arrayBufferToBase64(wavFileBuffer);

          // 4. Create a new data URI with the correct MIME type
          const dataUri = `data:audio/wav;base64,${wavBase64}`;
          playbackQueue.current.push(dataUri);

          if (!isAgentMuted) {
            if (!soundRef.current) {
              playNextChunk();
            }
          }
          return;
        }
      } catch (e) {
        console.error("Failed to process incoming audio message:", e);
      }
    };

    ws.current.onerror = (err) =>
      console.error("WebSocket error on frontend:", err);
    ws.current.onclose = () => {
      console.log("Frontend WS disconnected.");
      endCall();
    };
  }, [
    isCallActive,
    isAgentMuted,
    userId,
    websocketUrl,
    endCall,
    recordingLoop,
  ]);

  // Toggle user microphone mute state
  const toggleUserMute = () => setIsUserMuted((m) => !m);
  // Toggle agent audio playback mute state
  const toggleAgentMute = () => setIsAgentMuted((m) => !m);

  // DEBUGGING FUNCTION: Call this to save the next audio chunk
  const debugSaveAudioChunk = useCallback(() => {
    saveNextChunkForDebug.current = true;
    console.log("DEBUG: Next audio chunk will be saved.");
  }, []);

  // Clean up WebSocket and recording when the component unmounts
  useEffect(() => {
    return () => {
      endCall();
    };
  }, [endCall]);

  return {
    isCallActive,
    startCall,
    endCall,
    isUserMuted,
    toggleUserMute,
    isAgentMuted,
    toggleAgentMute,
    callDuration,
    currentTurn,
    debugSaveAudioChunk,
  };
}
