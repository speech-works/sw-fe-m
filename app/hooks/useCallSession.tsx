import { useState, useRef, useEffect, useCallback } from "react";
import { Audio } from "expo-av";

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

  // Recording options for raw PCM
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

  const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const getWavAudioData = (wavBuffer: ArrayBuffer): ArrayBuffer => {
    const view = new DataView(wavBuffer);
    let offset = 0;
    if (view.getUint32(offset, false) !== 0x52494646)
      throw new Error("Invalid WAV: Missing RIFF");
    offset += 12;
    while (offset < wavBuffer.byteLength) {
      const chunkId = view.getUint32(offset, false);
      offset += 4;
      const size = view.getUint32(offset, true);
      offset += 4;
      if (chunkId === 0x64617461) return wavBuffer.slice(offset, offset + size);
      offset += size + (size % 2);
    }
    throw new Error("WAV data chunk not found");
  };

  const createWavFile = (
    pcmData: ArrayBuffer,
    sampleRate = 16000,
    numChannels = 1,
    bitDepth = 16
  ): ArrayBuffer => {
    const dataLength = pcmData.byteLength;
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);
    let o = 0;
    const write = (s: string) => {
      for (let i = 0; i < s.length; i++) view.setUint8(o++, s.charCodeAt(i));
    };
    write("RIFF");
    view.setUint32(o, 36 + dataLength, true);
    o += 4;
    write("WAVE");
    write("fmt ");
    view.setUint32(o, 16, true);
    o += 4;
    view.setUint16(o, 1, true);
    o += 2;
    view.setUint16(o, numChannels, true);
    o += 2;
    view.setUint32(o, sampleRate, true);
    o += 4;
    const byteRate = (sampleRate * numChannels * bitDepth) / 8;
    view.setUint32(o, byteRate, true);
    o += 4;
    const blockAlign = (numChannels * bitDepth) / 8;
    view.setUint16(o, blockAlign, true);
    o += 2;
    view.setUint16(o, bitDepth, true);
    o += 2;
    write("data");
    view.setUint32(o, dataLength, true);
    o += 4;
    new Uint8Array(buffer, 44).set(new Uint8Array(pcmData));
    return buffer;
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isCallActive)
      timer = setInterval(() => setCallDuration((d) => d + 1), 1000);
    else setCallDuration(0);
    return () => clearInterval(timer);
  }, [isCallActive]);

  const playNextChunk = async () => {
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
    const uri = playbackQueue.current.shift();
    if (!uri) return;
    const { sound } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: true }
    );
    soundRef.current = sound;
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) playNextChunk();
    });
  };

  const endCall = useCallback(async () => {
    if (!isCallActive) return;
    stopRecording.current = true;
    if (recording.current)
      await recording.current.stopAndUnloadAsync().catch(() => {});
    setIsCallActive(false);
    ws.current?.send(JSON.stringify({ type: "end_call" }));
    ws.current?.close();
    ws.current = null;
    playbackQueue.current = [];
    if (soundRef.current) await soundRef.current.unloadAsync().catch(() => {});
    soundRef.current = null;
    setCallDuration(0);
    setCurrentTurn("agent");
  }, [isCallActive]);

  const stopRecording = useRef(false);

  const recordingLoop = async () => {
    stopRecording.current = false;
    const chunkMs = 100;
    while (
      !stopRecording.current &&
      ws.current?.readyState === WebSocket.OPEN
    ) {
      if (!isUserMuted) {
        try {
          await recording.current?.prepareToRecordAsync(recordingOptions);
          await recording.current?.startAsync();
          await delay(chunkMs);
          await recording.current?.stopAndUnloadAsync();
          const uri = recording.current?.getURI();
          if (uri) {
            const resp = await fetch(uri);
            const buf = await resp.arrayBuffer();
            const pcm = getWavAudioData(buf);
            ws.current?.send(pcm);
            recording.current = new Audio.Recording();
          }
        } catch {
          stopRecording.current = true;
          ws.current?.close();
        }
      } else {
        await delay(chunkMs);
      }
    }
  };

  const startCall = useCallback(async () => {
    if (isCallActive) return;
    ws.current = new WebSocket(websocketUrl);
    ws.current.onopen = async () => {
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

    ws.current.onmessage = async ({ data }) => {
      try {
        const msg = JSON.parse(typeof data === "string" ? data : "");
        if (msg.type === "turn") {
          setCurrentTurn(msg.turn);
          return;
        }
        if (msg.type === "audio" && msg.data) {
          const bin = atob(msg.data);
          const arr = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
          const wavBuf = createWavFile(arr.buffer, 16000, 1, 16);
          const b64 = arrayBufferToBase64(wavBuf);
          playbackQueue.current.push(`data:audio/wav;base64,${b64}`);
          if (!isAgentMuted && !soundRef.current) await playNextChunk();
        }
      } catch {}
    };

    ws.current.onerror = (e) => console.error("WS Error", e);
    ws.current.onclose = () => endCall();
  }, [isCallActive, isAgentMuted, userId, websocketUrl, endCall]);

  const toggleUserMute = () => setIsUserMuted((m) => !m);
  const toggleAgentMute = () => setIsAgentMuted((m) => !m);

  useEffect(
    () => () => {
      endCall();
    },
    [endCall]
  );

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
  };
}
