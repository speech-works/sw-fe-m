import { useState, useRef, useEffect, useCallback } from "react";
import { Audio } from "expo-av";

type Turn = "user" | "agent";

interface UseCallSessionProps {
  userId: string;
  websocketUrl: string;
}

export function useCallSession({ userId, websocketUrl }: UseCallSessionProps) {
  const ws = useRef<WebSocket | null>(null);
  const recording = useRef<Audio.Recording | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isUserMuted, setIsUserMuted] = useState(false);
  const [isAgentMuted, setIsAgentMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [currentTurn, setCurrentTurn] = useState<Turn>("agent");
  const playbackQueue = useRef<string[]>([]);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Call timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isCallActive) {
      timer = setInterval(() => setCallDuration((d) => d + 1), 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(timer);
  }, [isCallActive]);

  // Start call: open WebSocket and begin recording loop
  const startCall = useCallback(async () => {
    if (isCallActive) return;
    ws.current = new WebSocket(websocketUrl);

    ws.current.onopen = async () => {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      recording.current = new Audio.Recording();
      setIsCallActive(true);
      recordingLoop();
    };

    ws.current.onmessage = (event) => {
      const uri = event.data as string;
      playbackQueue.current.push(uri);
      if (!isAgentMuted) playNextChunk();
    };

    ws.current.onerror = (err) => console.error("WebSocket error", err);
    ws.current.onclose = () => endCall();
  }, [isCallActive, isAgentMuted]);

  // Recording loop that sends 200ms audio chunks
  const stopRecording = useRef(false);
  const recordingLoop = async () => {
    stopRecording.current = false;
    const chunkMs = 200;
    while (
      !stopRecording.current &&
      ws.current?.readyState === WebSocket.OPEN
    ) {
      if (!isUserMuted) {
        await recording.current?.prepareToRecordAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        await recording.current?.startAsync();
        await delay(chunkMs);
        await recording.current?.stopAndUnloadAsync();

        const uri = recording.current?.getURI();
        if (uri) {
          const buffer = await fetch(uri).then((r) => r.arrayBuffer());
          ws.current?.send(buffer);
        }
        recording.current = new Audio.Recording();
      } else {
        await delay(chunkMs);
      }
    }
  };

  // Play next TTS audio chunk sequentially
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
      if (status.isLoaded && status.didJustFinish) {
        playNextChunk();
      }
    });
  };

  // End call: stop loops, close WebSocket
  const endCall = useCallback(async () => {
    stopRecording.current = true;
    await recording.current?.stopAndUnloadAsync();
    setIsCallActive(false);
    ws.current?.close();
    ws.current = null;
  }, []);

  const toggleUserMute = () => setIsUserMuted((m) => !m);
  const toggleAgentMute = () => setIsAgentMuted((m) => !m);

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

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
