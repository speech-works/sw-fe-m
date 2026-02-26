import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
  ActivityIndicator,
  Animated, // <-- IMPORTED
  Modal, // <-- IMPORTED
} from "react-native";
// Import icons
import Icon from "react-native-vector-icons/Feather"; // For UI Controls
import FAIcon from "react-native-vector-icons/FontAwesome5"; // For Scenario Icon (compatibility)

// These imports are correct for a React Native environment (Expo)
import {
  Audio,
  InterruptionModeAndroid,
  InterruptionModeIOS,
  AVPlaybackStatus,
} from "expo-av";
import { LinearGradient } from "expo-linear-gradient"; // <-- IMPORTED
// These imports are correct for a React Native environment (Native Modules)
import {
  InputAudioStream,
  AUDIO_FORMATS,
  AUDIO_SOURCES,
  CHANNEL_CONFIGS,
} from "@dr.pogodin/react-native-audio";

import DeviceInfo from "react-native-device-info";
import * as SecureStore from "expo-secure-store";
import { SECURE_KEYS_NAME } from "../constants/secureStorageKeys";
import { theme } from "../Theme/tokens";
import { API_BASE_URL } from "../api/constants";

// --- ⬇️ MODIFIED: Added agentName and agentDesignation ⬇️ ---
type Props = {
  websocketUrl: string;
  userId?: string;
  sampleRate?: number;
  onCallStart?: () => void;
  onCallEnd?: () => void;
  ringtoneAsset?: number;
  ringtoneUri?: string;
  scenarioId?: string;
  agentName: string;
  agentDesignation: string;
  scenarioIcon: string;
};
const DEFAULT_SAMPLE_RATE = 24000;

// Buffer / pacing constants
const JITTER_BUFFER_MS = 300;
const MAX_BUFFER_MS = 400;
const FADE_MS = 12;

// RESAMPLER WORKLET (unchanged)
const RESAMPLER_WORKLET_CODE = `
class ResamplerProcessor extends AudioWorkletProcessor {
constructor() { super(); }
mixToMono(inputs) {
  if (!inputs || inputs.length === 0) return new Float32Array(0);
  if (inputs.length === 1) return inputs[0].slice(0);
  const len = inputs[0].length;
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    let s = 0;
    for (let ch = 0; ch < inputs.length; ch++) s += inputs[ch][i] || 0;
    out[i] = s / inputs.length;
  }
  return out;
}
resample(inputBuffer, inputSampleRate, outputSampleRate) {
  if (inputSampleRate === outputSampleRate) return inputBuffer;
  const ratio = inputSampleRate / outputSampleRate;
  const newLength = Math.round(inputBuffer.length / ratio);
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const oldIndex = i * ratio;
    const i0 = Math.floor(oldIndex);
    const t = oldIndex - i0;
    const a = inputBuffer[i0] ?? 0;
    const b = inputBuffer[i0 + 1] ?? a;
    result[i] = a + (b - a) * t;
  }
  return result;
}
floatTo16BitPCM(input) {
  const buf = new ArrayBuffer(input.length * 2);
  const view = new DataView(buf);
  for (let i = 0; i < input.length; i++) {
    let s = input[i];
    if (isNaN(s) || !isFinite(s)) s = 0;
    s = Math.max(-1, Math.min(1, s));
    const val = Math.round(s * 32767);
    view.setInt16(i * 2, val, true);
  }
  return buf;
}
process(inputs) {
  const inputChannels = inputs[0];
  if (!inputChannels || inputChannels.length === 0) return true;
  const mono = this.mixToMono(inputChannels);
  const down = this.resample(mono, sampleRate, ${DEFAULT_SAMPLE_RATE});
  const pcm = this.floatTo16BitPCM(down);
  this.port.postMessage(pcm, [pcm]);
  return true;
}
}
registerProcessor("resampler-processor", ResamplerProcessor);
`;

// PLAYBACK WORKLET (unchanged)
const PLAYBACK_WORKLET_CODE = `
class PlaybackProcessor extends AudioWorkletProcessor {
constructor() {
  super();
  this.capacity = Math.max(16384, Math.floor(0.5 * sampleRate));
  this.buffer = new Float32Array(this.capacity);
  this.readPos = 0;
  this.samplesQueued = 0;
  this.sourceOffset = 0.0;
  this._previouslyHadSamples = false;
  this.baseRate = 0.92;
  this.targetPlaybackRate = this.baseRate;
  this.currentPlaybackRate = this.baseRate;
  this.maxRateStepPerFrame = 0.0002;
  this.initialThreshold = Math.floor(${JITTER_BUFFER_MS} / 1000 * sampleRate);
  this.fadeSamples = Math.max(1, Math.floor(${FADE_MS} / 1000 * sampleRate));
  this.silenceToPlaybackRamp = 0;
  this.initialized = false;
  this.maxBufferLength = Math.floor(${MAX_BUFFER_MS} / 1000 * sampleRate);
  this.justWarmed = false;
  this.finalExpected = false;

  this.port.onmessage = (e) => {
    const msg = e.data;
    if (!msg) return;
    if (msg.cmd === "init") {
      if (msg.thresholdSamples) this.initialThreshold = msg.thresholdSamples;
      if (msg.fadeSamples) this.fadeSamples = msg.fadeSamples;
      if (typeof msg.playbackRate === "number") {
        this.baseRate = Math.max(0.75, Math.min(1.0, msg.playbackRate));
        this.targetPlaybackRate = Math.min(this.targetPlaybackRate, this.baseRate);
      }
      this.initialized = true;
      return;
    }
    if (msg.cmd === "set_rate" && typeof msg.rate === "number") {
      const requested = msg.rate;
      if (msg.allowAboveBase) {
        this.targetPlaybackRate = Math.max(0.75, Math.min(1.25, requested));
      } else {
        this.targetPlaybackRate = Math.max(0.75, Math.min(this.baseRate, requested));
      }
      return;
    }
    // Simplified handler: just set the flag. The process() loop will handle sending the message reliably.
    if (msg.cmd === "final_expected") {
        this.finalExpected = true;
        return;
    }
    if (msg.cmd === "chunk" && msg.buffer) {
      const arr = new Float32Array(msg.buffer);
      this._pushToRing(arr);
      if (this.samplesQueued >= this.initialThreshold) {
        this.justWarmed = true;
      } else {
        this.justWarmed = false;
      }
    }
    if (msg.cmd === "flushImmediate") {
      this.readPos = 0;
      this.samplesQueued = 0;
      this.sourceOffset = 0.0;
      this.silenceToPlaybackRamp = 0;
      this._previouslyHadSamples = false;
      this.currentPlaybackRate = this.targetPlaybackRate = this.baseRate;
      this.port.postMessage({ cmd: "drain" });
    }
    if (msg.cmd === "flush") {
      this.readPos = 0;
      this.samplesQueued = 0;
      this.sourceOffset = 0.0;
      this.silenceToPlaybackRamp = 0;
      this._previouslyHadSamples = false;
      this.currentPlaybackRate = this.targetPlaybackRate = this.baseRate;
    }
  };
}

_ensureCapacity(additional) {
  if (this.samplesQueued + additional <= this.capacity) return;
  let newCap = this.capacity;
  while (newCap < this.samplesQueued + additional) newCap *= 2;
  const newBuf = new Float32Array(newCap);
  if (this.samplesQueued > 0) {
    if (this.readPos + this.samplesQueued <= this.capacity) {
      newBuf.set(this.buffer.subarray(this.readPos, this.readPos + this.samplesQueued), 0);
    } else {
      const first = this.buffer.subarray(this.readPos, this.capacity);
      const second = this.buffer.subarray(0, (this.readPos + this.samplesQueued) % this.capacity);
      newBuf.set(first, 0);
      newBuf.set(second, first.length);
    }
  }
  this.buffer = newBuf;
  this.capacity = newCap;
  this.readPos = 0;
}

_pushToRing(arr) {
  const len = arr.length;
  if (this.samplesQueued + len > this.maxBufferLength) return;
  this._ensureCapacity(len);
  let writePos = (this.readPos + this.samplesQueued) % this.capacity;
  if (writePos + len <= this.capacity) {
    this.buffer.set(arr, writePos);
  } else {
    const firstLen = this.capacity - writePos;
    this.buffer.set(arr.subarray(0, firstLen), writePos);
    this.buffer.set(arr.subarray(firstLen), 0);
  }
  this.samplesQueued += len;
  if (!this._previouslyHadSamples && this.samplesQueued > 0) {
    this.silenceToPlaybackRamp = 0;
    this._previouslyHadSamples = true;
  }
}

_readInterpolatedSample() {
  if (this.samplesQueued <= 0) return null;
  const integerOffset = Math.floor(this.sourceOffset);
  const frac = this.sourceOffset - integerOffset;
  const idx0 = (this.readPos + integerOffset) % this.capacity;
  const idx1 = (this.readPos + integerOffset + 1) % this.capacity;
  const v0 = this.buffer[idx0] || 0;
  const v1 = this.buffer[idx1] || 0;
  const sample = v0 * (1 - frac) + v1 * frac;
  this.sourceOffset += this.currentPlaybackRate;
  let consumed = Math.floor(this.sourceOffset);
  if (consumed > 0) {
    this.readPos = (this.readPos + consumed) % this.capacity;
    this.samplesQueued = Math.max(0, this.samplesQueued - consumed);
    this.sourceOffset = this.sourceOffset - consumed;
  }
  return sample;
}

process(inputs, outputs) {
  const out = outputs[0];
  if (!out || out.length === 0) return true;
  const channel = out[0];

  if (!this.initialized) {
    for (let i = 0; i < channel.length; i++) channel[i] = 0;
    return true;
  }

  const allowedTarget = this.justWarmed ? Math.min(this.targetPlaybackRate, this.baseRate) : Math.min(this.targetPlaybackRate, this.baseRate);
  const rateDiff = allowedTarget - this.currentPlaybackRate;
  const step = this.maxRateStepPerFrame;
  if (Math.abs(rateDiff) > step) {
    this.currentPlaybackRate += Math.sign(rateDiff) * step;
  } else {
    this.currentPlaybackRate = allowedTarget;
  }

  if (this.samplesQueued < this.initialThreshold) {
    for (let i = 0; i < channel.length; i++) channel[i] = 0;
    // --- START: MODIFICATION ---
    // Simplified drain check during warmup
    if (this.samplesQueued === 0 && this._previouslyHadSamples) {
        this._previouslyHadSamples = false;
        this.port.postMessage({ cmd: "drain" });
    }
    // --- END: MODIFICATION ---
    return true;
  }

  const lowWaterMark = Math.floor(this.initialThreshold * 0.5);
  if (this.samplesQueued < lowWaterMark) {
    const diff = this.baseRate - this.currentPlaybackRate;
    const smallStep = Math.min(Math.abs(diff), this.maxRateStepPerFrame);
    if (diff > 0) this.currentPlaybackRate += smallStep;
    else this.currentPlaybackRate -= Math.min(Math.abs(diff), this.maxRateStepPerFrame);
  }

  for (let i = 0; i < channel.length; i++) {
    const s = this._readInterpolatedSample();
    if (s === null) {
      channel[i] = 0;
      this.silenceToPlaybackRamp = 0;
      continue;
    }
    if (this.silenceToPlaybackRamp < this.fadeSamples) {
      const g = (this.silenceToPlaybackRamp + 1) / this.fadeSamples;
      channel[i] = s * g;
      this.silenceToPlaybackRamp++;
    } else {
      channel[i] = s;
    }
  }

  // --- START: MODIFICATION - Robust Drain and Final Logic ---
  if (this.samplesQueued > 0) {
      this._previouslyHadSamples = true;
  } else { // samplesQueued is 0
      if (this._previouslyHadSamples) {
          // We just drained
          this.port.postMessage({ cmd: 'drain' });
          // console.log("Worklet drained."); // Optional: uncomment for debugging
      }
      this._previouslyHadSamples = false;
  }


if (this.finalExpected) {
  // Accept truly empty OR "nearly empty" buffers as drained.
  const nearlyEmptyThreshold = Math.max(1, this.fadeSamples); // small grace area
  if (this.samplesQueued === 0) {
    this.port.postMessage({ cmd: "final_done" });
    this.finalExpected = false;
  } else if (this.samplesQueued <= nearlyEmptyThreshold) {
    // Force-clean the tiny remainder — avoids sticking on residual samples.
    this.readPos = 0;
    this.samplesQueued = 0;
    this.sourceOffset = 0.0;
    this.port.postMessage({ cmd: "final_done" });
    this.finalExpected = false;
  }
}


  return true;
  // --- END: MODIFICATION ---
}
}
registerProcessor("playback-processor", PlaybackProcessor);
`;

// ---- Component starts here ----

// --- ⬇️ MODIFIED: `speaker` is now `string` ⬇️ ---
type TranscriptItem = {
  speaker: "You" | string;
  text: string;
};

// Helper function to format seconds into MM:SS
const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
};

const CallingWidget: React.FC<Props> = ({
  websocketUrl,
  userId = "anonymous",
  sampleRate = DEFAULT_SAMPLE_RATE,
  onCallStart,
  onCallEnd,
  ringtoneAsset,
  ringtoneUri,
  scenarioId,
  agentName,
  agentDesignation,
  scenarioIcon,
}) => {
  const [isCalling, setIsCalling] = useState(false);
  const [status, setStatus] = useState("Connecting..."); // Changed initial status
  const [turn, setTurn] = useState<"user" | "agent" | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [headsetConnected, setHeadsetConnected] = useState(
    Platform.OS === "web" ? true : false,
  );
  const [showHeadsetPrompt, setShowHeadsetPrompt] = useState(false);

  // --- NEW UI STATE ---
  const [isMuted, setIsMuted] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [callDuration, setCallDuration] = useState(0);
  // --- ⬇️ MODIFIED: This is now dynamic state ⬇️ ---
  const [suggestedResponses, setSuggestedResponses] = useState<string[]>([]);
  // --- ⬇️ ADDED: State for notification dot ⬇️ ---
  const [showNotificationDot, setShowNotificationDot] = useState(false);
  // --- ⬇️ ADDED: Cost control state ⬇️ ---
  const [idleWarningVisible, setIdleWarningVisible] = useState(false);
  const [idleCountdown, setIdleCountdown] = useState<number | null>(null);
  const [callEndReason, setCallEndReason] = useState<string | null>(null);
  const [maxTurns, setMaxTurns] = useState<number | null>(null);
  // --- ⬆️ END NEW UI STATE ⬆️ ---

  const ws = useRef<WebSocket | null>(null);

  const playSeq = useRef(0);
  const forcedStartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // Web Audio Refs
  const audioContext = useRef<AudioContext | null>(null);
  const resamplerNode = useRef<AudioWorkletNode | null>(null);
  const playbackNode = useRef<AudioWorkletNode | null>(null);

  // Native refs
  const micStream = useRef<InputAudioStream | null>(null);

  const isLoadingSound = useRef(false);

  // pacing refs
  const isMicActive = useRef(false);
  const outgoingMicBuffer = useRef<ArrayBuffer[]>([]);
  const MAX_OUTGOING_CHUNKS = 300;
  const resamplerPortOnMessageHandler = useRef<
    ((ev: MessageEvent) => void) | null
  >(null);
  const pendingChunks = useRef<ArrayBuffer[]>([]);

  // Ringtone refs
  const ringIntervalRef = useRef<number | null>(null);
  const ringAudioCtxRef = useRef<AudioContext | null>(null);
  const ringOscillatorsRef = useRef<OscillatorNode[]>([]);
  const ringGainRef = useRef<GainNode | null>(null);

  const nativeRingtoneRef = useRef<Audio.Sound | null>(null);
  const nativeRingtoneLoading = useRef(false);

  const finalFallbackId = useRef<number | null>(null);
  const recording = useRef<Audio.Recording | null>(null);

  const audioState = useRef<"IDLE" | "STARTING" | "STARTED" | "STOPPING">(
    "IDLE",
  );

  const isStopping = useRef(false);
  const callId = useRef(0);

  const soundRef = useRef<Audio.Sound | null>(null);
  const playLock = useRef<boolean>(false);
  const hasStartedPlaying = useRef<boolean>(false);
  const lastPlayedUrl = useRef<string | null>(null);
  const lastPlayTimestamp = useRef<number>(0);

  // --- NEW REFS ---
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMutedRef = useRef(false); // Ref for mute state for async listeners
  const scrollRef = useRef<ScrollView>(null);
  // --- ⬇️ ADDED: Ref to track current tips visibility for listener ⬇️ ---
  const showTipsRef = useRef(showTips);
  const idleCountdownRef = useRef<NodeJS.Timeout | null>(null);
  const callEndReasonRef = useRef<string | null>(null);
  // --- ⬆️ END NEW REFS ⬆️ ---

  // (awaitPlaybackWorkletDrain function is unchanged)
  const awaitPlaybackWorkletDrain = (timeoutMs = 700): Promise<void> => {
    return new Promise((resolve) => {
      try {
        if (Platform.OS !== "web" || !playbackNode.current) {
          return resolve();
        }
        const port = playbackNode.current.port as any;
        if (!port) return resolve();

        let finished = false;
        const oldHandler = port.onmessage;

        const cleanupAndResolve = () => {
          if (finished) return;
          finished = true;
          try {
            port.onmessage = oldHandler ?? null;
          } catch {}
          resolve();
        };

        // Wrap old handler so existing logic still runs
        port.onmessage = (ev: any) => {
          try {
            const d = ev?.data;
            // If the worklet explicitly signals final_done or drain -> resolve
            if (d && (d.cmd === "final_done" || d.cmd === "drain")) {
              cleanupAndResolve();
            }
          } catch (e) {
            // ignore
          }
          // call original handler too (so other parts of the app still get messages)
          try {
            if (typeof oldHandler === "function") oldHandler(ev);
          } catch {}
        };

        // Ask for a graceful finalization
        try {
          port.postMessage({ cmd: "final_expected" });
        } catch (e) {
          // best-effort
        }

        // Timeout fallback: if no response in time, force immediate flush and continue
        const to = setTimeout(() => {
          try {
            // send flushImmediate to clear tiny remnants
            port.postMessage({ cmd: "flushImmediate" });
          } catch {}
          cleanupAndResolve();
        }, timeoutMs);

        // Ensure cleanup when resolved
        const origResolve = resolve;
        resolve = () => {
          clearTimeout(to);
          origResolve();
        };
      } catch (e) {
        // if anything fails, resolve immediately to avoid hanging
        resolve();
      }
    });
  };

  // (isPlaybackSuccess function is unchanged)
  function isPlaybackSuccess(s: AVPlaybackStatus): s is AVPlaybackStatus & {
    isPlaying: boolean;
    didJustFinish: boolean;
    isBuffering: boolean;
    playableDurationMillis?: number;
  } {
    return (s as any).isLoaded === true;
  }

  // (checkHeadsetConnected function is unchanged)
  const checkHeadsetConnected = async (): Promise<boolean> => {
    if (Platform.OS === "web") return true;
    try {
      // Simulators can't detect Mac-connected peripherals via DeviceInfo
      const isEmulator = await DeviceInfo.isEmulator();
      if (isEmulator) return true;

      const isConnected = await DeviceInfo.isHeadphonesConnected();
      return isConnected;
    } catch (e) {
      console.error("Error checking headset connection:", e);
      return true;
    }
  };

  // --- ⬇️ MODIFIED: `updateHeadsetStatus` with prompt control ⬇️ ---
  const updateHeadsetStatus = async (
    shouldShowPrompt = false,
  ): Promise<boolean> => {
    if (Platform.OS !== "web") {
      const connected = await checkHeadsetConnected();
      setHeadsetConnected(connected);
      // Set status based on connection AND call state
      if (!connected && audioState.current === "IDLE") {
        setStatus("PLEASE CONNECT YOUR HEADPHONES");
        if (shouldShowPrompt) setShowHeadsetPrompt(true); // Only show if requested
      } else if (connected && audioState.current === "IDLE") {
        setStatus("Press to start call");
        setShowHeadsetPrompt(false);
      }
      return connected;
    } else {
      // Web is always "connected"
      setHeadsetConnected(true);
      if (audioState.current === "IDLE") {
        setStatus("Press to start call");
      }
      return true;
    }
  };
  // --- ⬆️ END OF MODIFICATION ⬆️ ---

  // (cleanupAudio function is unchanged)
  const cleanupAudio = async () => {
    callId.current += 1; // Increment call ID to invalidate handlers
    isStopping.current = true; // Set stopping flag
    await stopNativeRingtone(); // Stop ringtone if playing

    console.log("Cleaning up audio state for new call...");
    pendingChunks.current = []; // Clear web pending chunks
    outgoingMicBuffer.current = []; // Clear web outgoing buffer
    if (finalFallbackId.current) {
      // Clear web final_done fallback timer
      clearTimeout(finalFallbackId.current);
      finalFallbackId.current = null;
    }

    // --- START: Combined Cleanup ---

    // 1. Clean up Mic Stream/Worklets
    if (Platform.OS === "ios" || Platform.OS === "android") {
      // Native: Destroy InputAudioStream
      if (micStream.current) {
        console.log("Destroying micStream on cleanup...");
        try {
          // Check if destroy exists before calling
          if (typeof micStream.current.destroy === "function") {
            micStream.current.destroy();
          } else {
            console.warn("micStream.destroy() method not found.");
          }
        } catch (e) {
          console.warn("Failed to destroy micStream:", e);
        }
        micStream.current = null; // Clear the ref
      }
    } else {
      // Web: Disconnect and nullify worklets and context
      if (resamplerNode.current) {
        try {
          (resamplerNode.current.port as any).onmessage = null; // Remove listener
          resamplerNode.current.disconnect();
        } catch {}
        resamplerNode.current = null;
      }
      if (playbackNode.current) {
        try {
          (playbackNode.current.port as any).onmessage = null; // Remove listener
          playbackNode.current.disconnect();
        } catch {}
        playbackNode.current = null;
      }
      if (audioContext.current) {
        try {
          await audioContext.current.close();
        } catch {} // Close context
        audioContext.current = null;
      }
      resamplerPortOnMessageHandler.current = null; // Clear web handler ref
    }

    // 2. Clean up expo-av PLAYBACK Sound Object (using soundRef)
    const soundToUnload = soundRef.current; // Get from ref
    soundRef.current = null; // Clear ref
    setSound(null); // Clear state

    if (soundToUnload) {
      console.log("[Audio] Cleaning up sound object via soundRef.");
      try {
        soundToUnload.setOnPlaybackStatusUpdate(null); // Detach listener
        await soundToUnload.stopAsync(); // Attempt to stop first
      } catch (e) {
        console.warn(
          "[Audio] Error stopping sound during cleanup (might be unloaded):",
          e,
        );
      }
      try {
        await soundToUnload.unloadAsync(); // Use unloadAsync
        console.log(
          "[Audio] Sound object unloaded successfully during cleanup.",
        );
      } catch (e) {
        console.warn("[Audio] Error unloading sound during cleanup:", e);
      }
    }

    // 3. Reset Locks and Refs
    playLock.current = false; // Reset lock on cleanup
    hasStartedPlaying.current = false;
    lastPlayedUrl.current = null;
    lastPlayTimestamp.current = 0;
    // isLoadingSound.current = false; // (If you were still using this)

    // --- End Combined Cleanup ---

    // Reset Audio Mode to allow other apps' audio
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false, // Recording disallowed after call
        playsInSilentModeIOS: true,
        interruptionModeIOS: InterruptionModeIOS.MixWithOthers, // Allow others
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers, // Allow others
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false, // Don't keep audio active when app backgrounds after call
      });
      console.log("[Audio Mode] Reset after call cleanup.");
    } catch (e) {
      console.warn("Failed to reset audio mode:", e);
    }
  };

  // --- ⬇️ MODIFIED: `useEffect` simplified ⬇️ ---
  useEffect(() => {
    updateHeadsetStatus(false); // Check status but don't popup yet
    return () => {
      try {
        ws.current?.close();
      } catch {}
      stopRingTone();
      cleanupAudio();
      // Clear timer on unmount
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, []);
  // --- ⬆️ END OF MODIFICATION ⬆️ ---

  // --- ⬇️ ADDED: useEffect to sync showTips state to ref ⬇️ ---
  useEffect(() => {
    showTipsRef.current = showTips;
  }, [showTips]);
  // --- ⬆️ END OF MODIFICATION ⬆️ ---

  // (Ringtone functions are unchanged)
  const startRingTone = () => {
    if (Platform.OS !== "web") {
      startNativeRingtone();
      return;
    }
    if (ringIntervalRef.current) return;
    const ctx = new (
      window.AudioContext || (window as any).webkitAudioContext
    )();
    ringAudioCtxRef.current = ctx;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(ctx.destination);
    ringGainRef.current = gain;
    const playBeep = () => {
      try {
        const o = ctx.createOscillator();
        o.type = "sine";
        o.frequency.value = 540;
        o.connect(gain);
        const now = ctx.currentTime;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.25, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
        o.start(now);
        o.stop(now + 0.21);
        ringOscillatorsRef.current.push(o);
        setTimeout(() => {
          const idx = ringOscillatorsRef.current.indexOf(o);
          if (idx !== -1) ringOscillatorsRef.current.splice(idx, 1);
        }, 300);
      } catch (e) {
        console.warn("Ring beep error", e);
      }
    };
    playBeep();
    setTimeout(playBeep, 200);
    const id = window.setInterval(() => {
      playBeep();
      setTimeout(playBeep, 200);
    }, 800);
    ringIntervalRef.current = id as unknown as number;
  };
  const stopRingTone = () => {
    if (Platform.OS !== "web") {
      stopNativeRingtone();
      return;
    }
    if (ringIntervalRef.current) {
      clearInterval(ringIntervalRef.current);
      ringIntervalRef.current = null;
    }
    try {
      ringOscillatorsRef.current.forEach((o) => {
        try {
          o.disconnect();
          o.stop();
        } catch {}
      });
    } catch {}
    ringOscillatorsRef.current = [];
    if (ringGainRef.current) {
      try {
        ringGainRef.current.disconnect();
      } catch {}
      ringGainRef.current = null;
    }
    if (ringAudioCtxRef.current) {
      try {
        ringAudioCtxRef.current.close();
      } catch {}
      ringAudioCtxRef.current = null;
    }
  };
  const startNativeRingtone = async () => {
    if (nativeRingtoneRef.current) {
      try {
        const status = await nativeRingtoneRef.current.getStatusAsync();
        if (status.isLoaded && status.isPlaying) return;
      } catch {}
    }
    if (nativeRingtoneLoading.current) return;
    nativeRingtoneLoading.current = true;
    try {
      const sound = new Audio.Sound();
      if (ringtoneAsset) {
        await sound.loadAsync(ringtoneAsset, {
          shouldPlay: true,
          isLooping: true,
        });
      } else if (ringtoneUri) {
        await sound.loadAsync(
          { uri: ringtoneUri },
          { shouldPlay: true, isLooping: true },
        );
      } else {
        console.warn("No native ringtone asset or uri provided.");
        nativeRingtoneLoading.current = false;
        return;
      }
      nativeRingtoneRef.current = sound;
      await nativeRingtoneRef.current.playAsync();
      await nativeRingtoneRef.current.setIsLoopingAsync(true);
    } catch (e) {
      console.warn("Failed to start native ringtone:", e);
    } finally {
      nativeRingtoneLoading.current = false;
    }
  };
  const stopNativeRingtone = async () => {
    try {
      if (nativeRingtoneRef.current) {
        try {
          const st = await nativeRingtoneRef.current.getStatusAsync();
          if (st.isLoaded && st.isPlaying) {
            await nativeRingtoneRef.current.stopAsync();
          }
        } catch {}
        try {
          await nativeRingtoneRef.current.unloadAsync();
        } catch {}
        nativeRingtoneRef.current = null;
      }
    } catch (e) {
      console.warn("Error stopping native ringtone:", e);
    }
  };

  // (sendChunk function is unchanged)
  const sendChunk = async () => {
    // This function is not used in this architecture
    console.warn("sendChunk called, but should be disabled.");
  };

  // (startAudioCapture function is unchanged, already includes mute check)
  const startAudioCapture = async (): Promise<boolean> => {
    console.log("Starting audio capture...");

    // --- Web Platform Logic ---
    if (Platform.OS === "web") {
      console.log("Setting up Web Audio capture...");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        const ctx = new (
          window.AudioContext || (window as any).webkitAudioContext
        )();
        audioContext.current = ctx;

        // ... (Worklet adding logic is unchanged) ...
        const resamplerBlob = new Blob(
          [
            RESAMPLER_WORKLET_CODE.replace(
              /\$\{DEFAULT_SAMPLE_RATE\}/g,
              String(DEFAULT_SAMPLE_RATE),
            ),
          ],
          { type: "application/javascript" },
        );
        const resamplerUrl = URL.createObjectURL(resamplerBlob);
        await ctx.audioWorklet.addModule(resamplerUrl);
        URL.revokeObjectURL(resamplerUrl);

        const playbackBlob = new Blob([PLAYBACK_WORKLET_CODE], {
          type: "application/javascript",
        });
        const playbackUrl = URL.createObjectURL(playbackBlob);
        await ctx.audioWorklet.addModule(playbackUrl);
        URL.revokeObjectURL(playbackUrl);

        const source = ctx.createMediaStreamSource(stream);
        const resampler = new AudioWorkletNode(ctx, "resampler-processor");
        resamplerNode.current = resampler;
        const playback = new AudioWorkletNode(ctx, "playback-processor", {
          numberOfOutputs: 1,
          outputChannelCount: [1],
        });
        playbackNode.current = playback;
        playback.connect(ctx.destination);
        // ... (Playback worklet init and message handling is unchanged) ...
        const myCallId = callId.current;
        try {
          playback.port.postMessage({
            cmd: "init",
            playbackRate: 0.92,
            thresholdSamples: Math.floor(
              (JITTER_BUFFER_MS / 1000) * ctx.sampleRate,
            ),
            fadeSamples: Math.max(
              1,
              Math.floor((FADE_MS / 1000) * ctx.sampleRate),
            ),
          });
        } catch (e) {
          console.warn("Error initializing playback worklet:", e);
        }
        playback.port.onmessage = (ev) => {
          if (myCallId !== callId.current) return;
          const d = ev.data;
          if (!d || !d.cmd) return;
          if (d.cmd === "drain") {
            console.log("playback worklet drained");
          } else if (d.cmd === "final_done") {
            console.log("playback worklet final_done", d);
            if (finalFallbackId.current) {
              clearTimeout(finalFallbackId.current);
              finalFallbackId.current = null;
            }
            setStatus("Agent finished speaking. Your turn.");
            setTurn("user");
            // Notify backend that playback finished naturally
            try {
              ws.current?.send(JSON.stringify({ type: "playback_complete" }));
            } catch {}
          }
        };
        if (pendingChunks.current.length > 0) {
          pendingChunks.current.forEach((ab) => {
            if (myCallId === callId.current) {
              try {
                playback.port.postMessage({ cmd: "chunk", buffer: ab }, [ab]);
              } catch (e) {
                /* handle */
              }
            }
          });
          pendingChunks.current = [];
        }

        // --- MUTE CHECK ADDED HERE ---
        resamplerPortOnMessageHandler.current = (ev) => {
          if (myCallId !== callId.current || isMutedRef.current) return; // <-- MUTE CHECK
          const pcmArrayBuffer = ev.data as ArrayBuffer;
          const ab = pcmArrayBuffer.slice(0);

          if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            try {
              ws.current.send(ab);
            } catch (e) {
              console.warn("WS send error (web), buffering:", e);
              outgoingMicBuffer.current.push(ab);
              if (outgoingMicBuffer.current.length > MAX_OUTGOING_CHUNKS)
                outgoingMicBuffer.current.shift();
            }
          } else {
            outgoingMicBuffer.current.push(ab);
            if (outgoingMicBuffer.current.length > MAX_OUTGOING_CHUNKS)
              outgoingMicBuffer.current.shift();
          }
        };
        resampler.port.onmessage = resamplerPortOnMessageHandler.current;
        // ... (Audio graph connection logic is unchanged) ...
        const preFilter = ctx.createBiquadFilter();
        preFilter.type = "lowpass";
        preFilter.frequency.value = Math.min(
          12000,
          Math.max(6000, ctx.sampleRate / 2 - 1000),
        );
        source.connect(preFilter);
        preFilter.connect(resampler);
        const silentGain = ctx.createGain();
        silentGain.gain.value = 0;
        resampler.connect(silentGain);
        silentGain.connect(ctx.destination);

        console.log("Web Audio Worklets started successfully.");
        return true;
      } catch (error) {
        console.error("Failed to start web audio capture:", error);
        setStatus("Mic error: " + (error as Error).message);
        return false;
      }

      // --- Native Platform Logic ---
    } else {
      console.log(
        "Starting audio capture with @dr.pogodin/react-native-audio...",
      );
      try {
        // Simulators can't reliably test native microphone via @dr.pogodin/react-native-audio
        const isEmulator = await DeviceInfo.isEmulator();
        if (isEmulator && Platform.OS === "ios") {
          console.warn(
            "Simulator detected: Bypassing native mic capture to prevent permission crash.",
          );
          // We still return true so the call can proceed, even if the user can't speak natively
          return true;
        }

        const { granted } = await Audio.requestPermissionsAsync();
        if (!granted) {
          setStatus("Microphone permission denied.");
          console.error("Mic permission denied");
          return false;
        }
        console.log("Mic permissions granted.");

        if (micStream.current) {
          console.log("Destroying previous micStream instance...");
          try {
            micStream.current.destroy();
          } catch (e) {
            console.warn("Error destroying previous micStream:", e);
          }
          micStream.current = null;
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        console.log(
          "Creating new InputAudioStream with potentially smaller buffer...",
        );
        const stream = new InputAudioStream(
          AUDIO_SOURCES.VOICE_RECOGNITION || AUDIO_SOURCES.MIC,
          sampleRate,
          CHANNEL_CONFIGS.MONO,
          AUDIO_FORMATS.PCM_16BIT,
          Math.max(2048, Math.floor(sampleRate * 0.1)),
          true,
        );

        stream.addErrorListener((error) => {
          console.error("InputAudioStream error:", error);
          setStatus("Mic stream error.");
        });

        // --- MUTE CHECK ADDED HERE ---
        stream.addChunkListener((chunkBase64) => {
          if (isMutedRef.current) return; // <-- MUTE CHECK

          if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            try {
              ws.current.send(chunkBase64);
            } catch (sendError) {
              console.error("WebSocket send error:", sendError);
            }
          }
        });

        console.log("Starting InputAudioStream...");
        await stream.start();
        micStream.current = stream;
        console.log("Native mic stream (@dr.pogodin) started successfully.");
        return true;
      } catch (error) {
        console.error("Failed to start native audio capture:", error);
        setStatus("Mic error: " + (error as Error).message);
        return false;
      }
    }
  };

  // --- ⬇️ MODIFIED: `startCall` headset check ⬇️ ---
  const startCall = async () => {
    if (audioState.current !== "IDLE") {
      console.warn(
        `[State] Ignoring startCall, state is ${audioState.current}`,
      );
      return;
    }

    if (Platform.OS !== "web") {
      // Check headset but don't block — call proceeds via loudspeaker if no headset
      const connected = await updateHeadsetStatus(true);
      if (!connected) {
        console.log(
          "[Headset] No headset connected — proceeding via loudspeaker.",
        );
      }
    }

    console.log("[State] Setting state to STARTING");
    audioState.current = "STARTING";

    callId.current += 1;
    isStopping.current = false;
    pendingChunks.current = [];
    outgoingMicBuffer.current = [];

    setStatus("Preparing audio...");

    // --- NEW: Reset UI State ---
    setTranscript([]); // Clear previous transcript
    setCallDuration(0); // Reset timer
    setIsMuted(false); // Ensure not muted
    isMutedRef.current = false;
    setSuggestedResponses([]); // <-- ADDED: Clear suggestions
    setShowNotificationDot(false); // <-- ADDED: Clear notification dot
    setIdleWarningVisible(false);
    setIdleCountdown(null);
    setCallEndReason(null);
    callEndReasonRef.current = null;
    setMaxTurns(null);
    if (idleCountdownRef.current) {
      clearInterval(idleCountdownRef.current);
      idleCountdownRef.current = null;
    }
    // --- END NEW UI State ---

    try {
      const isEmulator =
        Platform.OS === "ios" ? await DeviceInfo.isEmulator() : false;
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: !isEmulator,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });
      console.log("[Audio Mode] Set for active call.");
    } catch (e) {
      console.error("Failed to set audio mode for call:", e);
      setStatus("Audio setup failed.");
      audioState.current = "IDLE";
      return;
    }

    if (Platform.OS === "web") {
      startRingTone();
    } else {
      startNativeRingtone();
    }
    setStatus("Calling..."); // Update UI

    const captureStarted = await startAudioCapture();
    if (!captureStarted) {
      console.error(
        "[startCall] startAudioCapture FAILED. Aborting call start.",
      );
      setStatus("Mic setup failed"); // Update UI
      audioState.current = "IDLE";
      await cleanupAudio();
      return;
    }

    console.log("[startCall] Audio capture started successfully (or is web).");
    audioState.current = "STARTED";

    setStatus("Connecting...");
    ws.current = new WebSocket(websocketUrl);
    ws.current.binaryType = "arraybuffer";

    ws.current.onopen = () => {
      setStatus("Connected"); // Status for UI
      setIsCalling(true);
      onCallStart?.();

      // --- NEW: Start Timer ---
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      callTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
      // --- END NEW Timer ---

      ws.current?.send(
        JSON.stringify({ type: "join", userId, scenarioId: scenarioId }),
      );
    };

    ws.current.onmessage = async (msg) => {
      if (isStopping.current) return;
      // (This logic is unchanged, but handleControlMessage is modified)
      try {
        if (typeof msg.data === "string") {
          let parsed;
          try {
            parsed = JSON.parse(msg.data);
            console.log(`[WS MESSAGE REACHED FRONTEND] Type: ${parsed?.type}`);
            if (parsed.type === "agent_speaking") {
              setStatus("Agent is speaking...");
              // setIsAgentSpeaking(true); // This state is not defined in the original code
            } else if (parsed.type === "agent_listening") {
              // This case is handled by handleControlMessage's 'turn: user'
            }
            handleControlMessage(parsed);
          } catch (jsonError) {
            if (Platform.OS !== "web") {
              console.warn(
                "[WS] Received string data on native, assuming base64 audio chunk - This part needs implementation if backend sends base64.",
              );
            } else {
              console.warn(
                "[WS] Received non-JSON string data on web:",
                msg.data.substring(0, 50) + "...",
              );
            }
          }
        } else {
          if (Platform.OS === "web") {
            handleAudioChunkFromServer(msg.data);
          } else {
            console.warn(
              "[WS] Received unexpected binary data on native platform.",
            );
          }
        }
      } catch (e) {
        console.warn("WS onmessage processing error:", e);
      }
    };

    ws.current.onclose = (event) => {
      console.log(`[WS] WebSocket closed: ${event.code} ${event.reason}`);
      // If the goodbye TTS is still loading or playing, defer cleanup to didJustFinish.
      // Check both soundRef (audio loaded & playing) and playLock (audio is loading via loadAsync).
      const isAudioActive = soundRef.current || playLock.current;
      if (callEndReasonRef.current && isAudioActive) {
        console.log(
          "[WS] Socket closed but goodbye audio still active — deferring cleanup to didJustFinish.",
        );
        // Detach WS handlers so nothing else fires
        if (ws.current) {
          ws.current.onmessage = null;
          ws.current.onclose = null;
          ws.current.onerror = null;
        }
        ws.current = null;
        return;
      }
      endCall();
    };

    ws.current.onerror = (err) => {
      console.error("WebSocket error:", err);
      // If goodbye audio is loading or playing, let it finish
      const isAudioActive = soundRef.current || playLock.current;
      if (callEndReasonRef.current && isAudioActive) {
        console.log(
          "[WS] Socket error but goodbye audio still active — deferring cleanup.",
        );
        if (ws.current) {
          ws.current.onmessage = null;
          ws.current.onclose = null;
          ws.current.onerror = null;
        }
        ws.current = null;
        return;
      }
      setStatus("Connection error");
      endCall();
    };
  };
  // --- ⬆️ END OF MODIFICATION ⬆️ ---

  // --- ⬇️ MODIFIED: `endCall` order of operations ⬇️ ---
  const endCall = async () => {
    if (audioState.current === "STOPPING" || audioState.current === "IDLE") {
      console.log(`[State] Ignoring endCall, state is ${audioState.current}`);
      return;
    }
    console.log("[State] Setting state to STOPPING");
    audioState.current = "STOPPING";
    isStopping.current = true;

    // --- NEW: Stop Timer ---
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    // --- END NEW Timer ---

    stopRingTone();
    setIsCalling(false);
    setTurn(null);
    onCallEnd?.();
    setShowNotificationDot(false);
    setIdleWarningVisible(false);
    setIdleCountdown(null);
    if (idleCountdownRef.current) {
      clearInterval(idleCountdownRef.current);
      idleCountdownRef.current = null;
    }
    // If the backend sent a call_ended reason, show the modal after cleanup
    const endReason = callEndReasonRef.current;
    if (endReason) {
      // Keep callEndReason in state so the modal renders;
      // do NOT clear it here — it's cleared when the user dismisses the modal.
      console.log(
        `[EndCall] Server-initiated disconnect, reason: ${endReason}`,
      );
    }

    try {
      if (ws.current) {
        ws.current.onmessage = null;
        ws.current.onclose = null;
        ws.current.onerror = null;
        try {
          ws.current.send(JSON.stringify({ type: "end_call" }));
        } catch {}
        try {
          ws.current.close();
        } catch {}
      }
    } catch (e) {
      console.warn("Error closing ws:", e);
    }
    ws.current = null;

    try {
      playbackNode.current?.port.postMessage({ cmd: "flushImmediate" });
    } catch {}

    await cleanupAudio();

    // --- SWAPPED ORDER ---
    console.log("[State] Setting state to IDLE");
    audioState.current = "IDLE";
    updateHeadsetStatus(); // <-- Call this AFTER setting state to IDLE
    // --- END SWAP ---

    // Reset duration for UI
    setCallDuration(0);
  };
  // --- ⬆️ END OF MODIFICATION ⬆️ ---

  // (base64ToArrayBuffer function is unchanged)
  function base64ToArrayBuffer(base64: string) {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  }

  // (handleAudioChunkFromServer function is unchanged)
  const handleAudioChunkFromServer = async (data: any) => {
    if (isStopping.current) {
      return;
    }
    if (Platform.OS === "web") {
      const pcmBuffer =
        typeof data === "string" ? base64ToArrayBuffer(data) : data;
      const ab = pcmBuffer.slice(0);
      if (playbackNode.current) {
        try {
          playbackNode.current.port.postMessage({ cmd: "chunk", buffer: ab }, [
            ab,
          ]);
        } catch (e) {
          try {
            playbackNode.current.port.postMessage({
              cmd: "chunk",
              buffer: ab.slice(0),
            });
          } catch (err) {
            console.warn("deliver chunk failed", err);
          }
        }
      } else {
        pendingChunks.current.push(ab);
      }
    }
  };

  // --- ⬇️ MODIFIED: `handleControlMessage` updated ⬇️ ---
  const handleControlMessage = async (data: any) => {
    switch (data.type) {
      case "deepgram_ready":
        setStatus("AI is ready");
        if (data.maxTurns) {
          setMaxTurns(data.maxTurns);
          console.log(`[Cost Control] maxTurns set to ${data.maxTurns}`);
        }
        break;

      case "turn":
        if (data.turn === "agent") {
          stopRingTone();
          setTurn("agent");
          setStatus("Agent is speaking...");
        } else if (data.turn === "user") {
          setTurn("user");
          setStatus("Your turn to speak");
          console.log("[Mic] Activating mic via 'turn: user' command.");
          isMicActive.current = true;
          setSuggestedResponses([]); // <-- ADDED: Clear old suggestions
          setShowNotificationDot(false); // <-- ADDED: Clear dot
          // Dismiss idle warning if it's showing (user spoke or backend reset)
          if (idleWarningVisible) {
            setIdleWarningVisible(false);
            setIdleCountdown(null);
            if (idleCountdownRef.current) {
              clearInterval(idleCountdownRef.current);
              idleCountdownRef.current = null;
            }
          }
        }
        break;

      case "text":
        // This is assumed to be text from the AI
        setTranscript((prev) => [
          ...prev,
          { speaker: agentName, text: data.data }, // <-- MODIFIED: Use agentName
        ]);
        break;

      case "user_text":
        // This is text from the User
        setTranscript((prev) => [...prev, { speaker: "You", text: data.data }]);
        // Dismiss idle warning — user spoke, backend will reset its timer
        if (idleWarningVisible) {
          setIdleWarningVisible(false);
          setIdleCountdown(null);
          if (idleCountdownRef.current) {
            clearInterval(idleCountdownRef.current);
            idleCountdownRef.current = null;
          }
        }
        break;

      case "play_stream": {
        console.log("[WS] Received play_stream command.");
        stopRingTone();
        setTurn("agent");
        setStatus("Agent is speaking...");

        // --- ⬇️ ADDED: Set new suggestions & notification dot ⬇️ ---
        if (data.suggestions && data.suggestions.length > 0) {
          setSuggestedResponses(data.suggestions);
          // Only show dot if the panel is currently closed
          // --- ⬇️ MODIFIED: Use ref for current state ⬇️ ---
          if (!showTipsRef.current) {
            setShowNotificationDot(true);
          }
        }
        // --- ⬆️ END OF MODIFICATION ⬆️ ---

        const rawUrl = data.url;
        if (!rawUrl) {
          console.warn("[Audio] play_stream missing url");
          break;
        }
        // Rewrite the stream URL's origin to match API_BASE_URL so the device
        // can always reach it, even if the backend embeds a different internal IP.
        const urlToPlay = rawUrl.replace(/^https?:\/\/[^/]+/, API_BASE_URL);
        if (urlToPlay !== rawUrl) {
          console.log(
            "[Audio] play_stream URL rewritten:",
            rawUrl,
            "→",
            urlToPlay,
          );
        }
        const mySeq = ++playSeq.current;
        (async () => {
          playLock.current = true;
          hasStartedPlaying.current = false;
          if (forcedStartTimeoutRef.current) {
            clearTimeout(forcedStartTimeoutRef.current);
            forcedStartTimeoutRef.current = null;
          }
          const prev = soundRef.current;
          soundRef.current = null;
          setSound(null);
          if (prev) {
            try {
              prev.setOnPlaybackStatusUpdate(null);
            } catch {}
            try {
              await prev.stopAsync().catch(() => {});
            } catch {}
            try {
              await prev.unloadAsync().catch(() => {});
            } catch {}
          }
          if (
            isStopping.current ||
            mySeq !== playSeq.current ||
            audioState.current !== "STARTED"
          ) {
            playLock.current = false;
            return;
          }
          const newSound = new Audio.Sound();
          let destroyed = false;
          try {
            // Fetch auth token so the TTS stream endpoint can authenticate
            const token = await SecureStore.getItemAsync(
              SECURE_KEYS_NAME.SW_APP_JWT_KEY,
            );
            console.log("[Audio] Attempting to loadAsync from URL:", urlToPlay);

            await newSound.loadAsync(
              {
                uri: urlToPlay,
                headers: token
                  ? { Authorization: `Bearer ${token}` }
                  : undefined,
              },
              { shouldPlay: false, progressUpdateIntervalMillis: 200 },
            );
            if (
              mySeq !== playSeq.current ||
              isStopping.current ||
              audioState.current !== "STARTED"
            ) {
              try {
                await newSound.unloadAsync();
              } catch {}
              playLock.current = false;
              return;
            }
            console.log("[Audio] loadAsync completed successfully.");
            newSound.setOnPlaybackStatusUpdate(async (status) => {
              try {
                if (mySeq !== playSeq.current) return;
                if (!status.isLoaded) {
                  if ((status as any).error) {
                    console.error("[Audio] load error:", (status as any).error);
                  }
                  return;
                }
                if (!status.isPlaying && !hasStartedPlaying.current) {
                  try {
                    hasStartedPlaying.current = true;
                    await newSound.setVolumeAsync(1.0);
                    if ((newSound as any).setIsMutedAsync) {
                      try {
                        await (newSound as any).setIsMutedAsync(false);
                      } catch {}
                    }
                    console.log("[Audio] Calling playAsync() now...");
                    await newSound.playAsync();
                    console.log("[Audio] playAsync() completed without error.");
                  } catch (e) {
                    console.error("[Audio] Error during playAsync:", e);
                    hasStartedPlaying.current = false;
                    playLock.current = false;
                  }
                }
                if ((status as any).didJustFinish) {
                  console.log("[Audio] playback didJustFinish");
                  if (mySeq === playSeq.current) {
                    try {
                      await newSound.unloadAsync();
                    } catch {}
                    soundRef.current = null;
                    setSound(null);
                    playLock.current = false;
                    hasStartedPlaying.current = false;
                    // Notify backend that playback finished naturally (P0)
                    try {
                      ws.current?.send(
                        JSON.stringify({ type: "playback_complete" }),
                      );
                      console.log("[WS] Sent playback_complete");
                    } catch {}

                    // If this was a server-initiated goodbye, trigger cleanup now
                    if (callEndReasonRef.current) {
                      console.log(
                        `[Audio] Goodbye finished. Triggering deferred endCall (reason: ${callEndReasonRef.current}).`,
                      );
                      endCall();
                      return;
                    }

                    setStatus("Agent finished speaking. Your turn.");
                    setTurn("user");
                    console.log(
                      "[Audio] Transitioned turn back to user after natural playback finish.",
                    );
                  }
                }
              } catch (e) {
                console.warn("[Audio status cb] error:", e);
              }
            });
            soundRef.current = newSound;
            setSound(newSound);
            forcedStartTimeoutRef.current = setTimeout(async () => {
              try {
                forcedStartTimeoutRef.current = null;
                if (mySeq !== playSeq.current || isStopping.current) return;
                const st = await newSound.getStatusAsync();
                if (
                  st.isLoaded &&
                  !st.isPlaying &&
                  !hasStartedPlaying.current
                ) {
                  hasStartedPlaying.current = true;
                  await newSound.setVolumeAsync(1.0);
                  await newSound.playAsync();
                }
              } catch (e) {
                console.warn("[Audio] forced-start error:", e);
                hasStartedPlaying.current = false;
                playLock.current = false;
              }
            }, 250);
          } catch (e) {
            console.error("[Audio] Failed to create/play sound:", e);
            try {
              await newSound.unloadAsync();
            } catch {}
            if (mySeq === playSeq.current) {
              setStatus("Error playing audio");
              setTurn("user");
            }
            soundRef.current = null;
            setSound(null);
            playLock.current = false;
          }
        })();
        break;
      }

      // (stop_playback case is unchanged)
      case "stop_playback": {
        const soundToStop = soundRef.current;
        soundRef.current = null;
        setSound(null);
        if (soundToStop) {
          console.log("[Audio] Interruption. Stopping playback and unloading.");
          try {
            soundToStop.setOnPlaybackStatusUpdate(null);
          } catch {}
          try {
            await soundToStop.stopAsync();
          } catch {}
          try {
            await soundToStop.unloadAsync();
            console.log("[Audio] Sound unloaded due to interruption.");
          } catch (e) {
            console.warn("Error unloading sound during interruption:", e);
          }
        } else {
          console.log(
            "[Audio] Interruption requested, but no sound ref was active.",
          );
        }
        playLock.current = false;
        hasStartedPlaying.current = false;
        setTurn("user");
        setStatus("Your turn to speak. (Interrupted)");
        break;
      }

      case "idle_warning": {
        console.log(
          `[Cost Control] idle_warning received, timeout: ${data.timeout_seconds}s`,
        );
        setIdleWarningVisible(true);
        setIdleCountdown(data.timeout_seconds || 10);
        // Start a local countdown for UI display
        if (idleCountdownRef.current) {
          clearInterval(idleCountdownRef.current);
        }
        let remaining = data.timeout_seconds || 10;
        idleCountdownRef.current = setInterval(() => {
          remaining -= 1;
          setIdleCountdown(remaining);
          if (remaining <= 0) {
            if (idleCountdownRef.current) {
              clearInterval(idleCountdownRef.current);
              idleCountdownRef.current = null;
            }
            setIdleWarningVisible(false);
          }
        }, 1000);
        break;
      }

      case "call_ended": {
        console.log(
          `[Cost Control] call_ended received, reason: ${data.reason}`,
        );
        // Store reason in both state and ref so endCall (triggered by onclose)
        // can access it even if state hasn't flushed yet.
        setCallEndReason(data.reason);
        callEndReasonRef.current = data.reason;
        // Dismiss any active idle warning
        setIdleWarningVisible(false);
        if (idleCountdownRef.current) {
          clearInterval(idleCountdownRef.current);
          idleCountdownRef.current = null;
        }
        // Do NOT call endCall() or ws.close() here.
        // The backend will close the socket; onclose will trigger endCall.
        break;
      }

      default:
        break;
    }
  };

  // (toggleMute function is unchanged)
  const toggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      isMutedRef.current = next; // Update ref for async listeners
      console.log("Mute set to:", next);
      return next;
    });
  };

  // --- ⬇️ ADDED: New handler for tips button ⬇️ ---
  const toggleTips = () => {
    // If we are about to open the panel (i.e., showTips is currently false)
    if (!showTips) {
      setShowNotificationDot(false);
    }
    setShowTips((prev) => !prev);
  };
  // --- ⬆️ END OF MODIFICATION ⬆️ ---

  // --- ⬇️ MODIFIED: `canStartCall` now uses state ⬇️ ---
  // This check is now handled in the startCall button's `disabled` prop
  // Headphones are recommended but not required — loudspeaker works too
  const canStartCall = audioState.current === "IDLE";
  // --- ⬆️ END OF MODIFICATION ⬆️ ---

  // We use the raw scenarioIcon from backend (FontAwesome) for the Orb
  // to ensure it matches the list and isn't generic.
  const orbIconName = scenarioIcon || "robot";

  // --- ⬇️ ADDED: Animation for Visualizer ⬇️ ---
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );

    if (turn === "agent" || audioState.current === "STARTED") {
      pulse.start();
    } else {
      pulse.stop();
      pulseAnim.setValue(1); // Reset
    }
    return () => pulse.stop();
  }, [turn, audioState.current]);
  // --- ⬆️ END ADDED ⬆️ ---

  // --- ⬇️ MODIFIED: Render function updated ⬇️ ---
  return (
    <View style={styles.container}>
      {/* Headphone Status Indicator (Top Center) */}
      {!isCalling && (
        <View style={styles.headphoneIndicator}>
          <FAIcon
            name="headphones-alt"
            size={14}
            color={headsetConnected ? "#10B981" : "#EF4444"}
          />
          <Text
            style={{
              color: "rgba(255,255,255,0.5)",
              fontSize: 12,
              fontWeight: "500",
            }}
          >
            {headsetConnected ? "Headset Ready" : "No Headset"}
          </Text>
        </View>
      )}

      {/* Spacer to push content center */}
      <View style={{ flex: 1 }} />

      {/* --- VISUALIZER AREA --- */}
      <View style={styles.visualizerContainer}>
        {/* Outer Glow Halo */}
        <Animated.View
          style={[
            styles.orbGlow,
            {
              transform: [{ scale: pulseAnim }],
              opacity: turn === "agent" ? 0.6 : 0.2,
            },
          ]}
        />
        {/* Core Orb - Modernized with Gradient & Layered Icon */}
        {/* Core Orb - Nested structure for Shadow + Clipping */}
        <View style={styles.orbWrapper}>
          <LinearGradient
            colors={["rgba(255,255,255,0.2)", "rgba(255,255,255,0.05)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.orbMask}
          >
            {/* Background Reflection Icon */}
            <FAIcon
              name={orbIconName}
              size={80}
              color="rgba(255,255,255,0.1)"
              solid
              style={{ position: "absolute" }}
            />
            {/* Main Icon */}
            <FAIcon name={orbIconName} size={48} color="#FFF" solid />
          </LinearGradient>
        </View>

        {/* Status Text under Orb */}
        <View style={styles.statusContainer}>
          <Text style={styles.statusTextModern}>
            {turn === "user"
              ? "Listening..."
              : isCalling
                ? status
                : "Ready to Connect"}
          </Text>
        </View>
      </View>

      <View style={{ flex: 1 }} />

      {/* --- HEADSET PROMPT OVERLAY --- */}
      <Modal
        visible={showHeadsetPrompt}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true} // Covers status bar on Android
      >
        <View style={styles.promptOverlay}>
          <View style={styles.promptGlassBox}>
            <FAIcon
              name="headphones-alt"
              size={40}
              color={theme.colors.actionPrimary.default}
              style={{ marginBottom: 16 }}
            />
            <Text style={styles.promptTitle}>Headphones Required</Text>
            <Text style={styles.promptText}>
              Please connect your headphones to continue.
            </Text>

            <View style={styles.promptButtonRow}>
              <TouchableOpacity
                style={styles.promptButtonPrimary}
                onPress={() => setShowHeadsetPrompt(false)}
              >
                <Text style={styles.promptButtonTextPri}>Okay</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* --- SUGGESTIONS (Floating) --- */}
      {showTips && suggestedResponses.length > 0 && (
        <View style={styles.glassTipsContainer}>
          <Text style={styles.tipsTitleModern}>SUGGESTIONS</Text>
          <View style={styles.tipsButtonRow}>
            {suggestedResponses.map((text, i) => (
              <TouchableOpacity
                key={i}
                style={styles.tipButtonGlass}
                onPress={() => {
                  // Handle suggestion press if needed
                }}
              >
                <Text style={styles.tipButtonTextModern}>{text}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* --- CONTROLS DOCK --- */}
      <View style={styles.controlsDock}>
        {/* Mute */}
        <TouchableOpacity
          style={[
            styles.glassControlBtn,
            isMuted && styles.glassControlBtnActive,
            !isCalling && { opacity: 0.5 }, // Visual hint but still interactive
          ]}
          onPress={() => {
            if (!isCalling) {
              setStatus("Start call to use mute");
              // Reset status after a delay?
              // Better: simple alert or nothing?
              // Actually status text is good feedback area.
              return;
            }
            toggleMute();
          }}
          // disabled={!isCalling} <-- REMOVED
        >
          <Icon name={isMuted ? "mic-off" : "mic"} size={22} color="#FFF" />
        </TouchableOpacity>

        {/* End / Start Call - Main Button */}
        <TouchableOpacity
          style={[
            styles.mainCallButtonModern,
            isCalling ? styles.endCallButton : styles.startCallButton,
            // Removed disabled styling to encourage interaction
          ]}
          onPress={() => (isCalling ? endCall() : startCall())}
        >
          <Icon
            name={isCalling ? "phone-off" : "phone-call"}
            size={32}
            color="#FFF"
          />
        </TouchableOpacity>

        {/* Tips / Suggestions */}
        <View style={{ position: "relative" }}>
          <TouchableOpacity
            style={[
              styles.glassControlBtn,
              showTips && styles.glassControlBtnActive,
              !isCalling && { opacity: 0.5 },
            ]}
            onPress={() => {
              if (!isCalling) {
                setStatus("Start call to saw tips");
                return;
              }
              toggleTips();
            }}
            // disabled={!isCalling} <-- REMOVED
          >
            <Icon
              name="message-circle" // 'lightbulb' -> 'message-circle' or 'edit-3'
              size={22}
              color={showTips ? "#FFF" : "rgba(255,255,255,0.7)"}
            />
          </TouchableOpacity>
          {showNotificationDot && <View style={styles.notificationDotModern} />}
        </View>
      </View>

      {/* --- IDLE WARNING OVERLAY --- */}
      <Modal
        visible={idleWarningVisible}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
      >
        <View style={styles.promptOverlay}>
          <View style={styles.promptGlassBox}>
            <FAIcon
              name="hourglass-half"
              size={36}
              color={theme.colors.actionPrimary.default}
              style={{ marginBottom: 16 }}
            />
            <Text style={styles.promptTitle}>Are you still there?</Text>
            <Text style={styles.promptText}>
              {idleCountdown !== null && idleCountdown > 0
                ? `Call will end in ${idleCountdown} seconds`
                : "Ending call..."}
            </Text>
            <View style={styles.promptButtonRow}>
              <TouchableOpacity
                style={styles.promptButtonPrimary}
                onPress={() => {
                  setIdleWarningVisible(false);
                  setIdleCountdown(null);
                  if (idleCountdownRef.current) {
                    clearInterval(idleCountdownRef.current);
                    idleCountdownRef.current = null;
                  }
                  try {
                    ws.current?.send(JSON.stringify({ type: "stay_online" }));
                    console.log("[WS] Sent stay_online");
                  } catch {}
                }}
              >
                <Text style={styles.promptButtonTextPri}>I'm still here</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- CALL ENDED MODAL --- */}
      <Modal
        visible={callEndReason !== null && !isCalling}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
      >
        <View style={styles.promptOverlay}>
          <View style={styles.promptGlassBox}>
            <FAIcon
              name={
                callEndReason === "limit_reached" ? "trophy" : "phone-slash"
              }
              size={36}
              color={theme.colors.actionPrimary.default}
              solid
              style={{ marginBottom: 16 }}
            />
            <Text style={styles.promptTitle}>
              {callEndReason === "limit_reached"
                ? "Great practice!"
                : "Call ended"}
            </Text>
            <Text style={styles.promptText}>
              {callEndReason === "limit_reached"
                ? "You've completed this practice session. Rest your vocal cords and come back tomorrow!"
                : "The call was ended due to inactivity. You can start a new session anytime."}
            </Text>
            <View style={styles.promptButtonRow}>
              <TouchableOpacity
                style={styles.promptButtonPrimary}
                onPress={() => {
                  setCallEndReason(null);
                  callEndReasonRef.current = null;
                }}
              >
                <Text style={styles.promptButtonTextPri}>Got it</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};
// --- ⬆️ END OF MODIFICATION ⬆️ ---

// --- NEW FUTURISTIC STYLES ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 40, // Reduced from 60
    paddingTop: 40, // Reduced from 60
  },

  // Visualizer area - Flexible to prevent overflow
  visualizerContainer: {
    flex: 1, // Allow to grow/shrink
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    minHeight: 200, // Ensure strictly visible
    maxHeight: 400,
  },
  orbGlow: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110, // CIRCULAR
    backgroundColor: theme.colors.actionPrimary.default,
    opacity: 0.3, // Slightly more visible glow
    shadowColor: theme.colors.actionPrimary.default,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 50, // Softer, larger spread
  },
  orbWrapper: {
    width: 140,
    height: 140,
    borderRadius: 70, // CIRCULAR
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.5,
        shadowRadius: 25,
        shadowOffset: { width: 0, height: 10 },
      },
      android: { elevation: 15 },
      web: { boxShadow: `0 10px 40px rgba(0,0,0,0.5)` },
    }),
  },
  orbMask: {
    width: 140,
    height: 140,
    borderRadius: 70, // CIRCULAR
    overflow: "hidden", // CLIP CONTENT
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  statusContainer: {
    marginTop: 50,
  },
  statusTextModern: {
    color: "rgba(255,255,255,0.9)", // Slightly softer white
    fontSize: 16,
    fontWeight: "400", // Elegant, not too thin
    letterSpacing: 3, // Premium wide tracking
    textTransform: "uppercase",
    textAlign: "center",
  },

  // Headphone Indicator - Sleek Pill
  headphoneIndicator: {
    position: "absolute",
    top: 10, // Higher up
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 30, // Pill shape
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  // Tips / Suggestions Container
  glassTipsContainer: {
    width: "90%",
    backgroundColor: "rgba(15, 23, 42, 0.6)", // Deeper, more subtle background
    borderRadius: 24,
    padding: 20, // More padding
    marginBottom: 30,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  tipsTitleModern: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 12,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  tipsButtonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  tipButtonGlass: {
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  tipButtonTextModern: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    fontWeight: "500",
  },

  // Controls Dock - Floating Premium Look
  controlsDock: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between", // Spread out nicely
    width: "85%", // Slightly wider
    maxWidth: 360,
    backgroundColor: "rgba(255,255,255,0.07)", // Very subtle glass
    borderRadius: 50, // Full pill
    paddingVertical: 12,
    paddingHorizontal: 32, // More internal breathing room
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20, // Floating soft shadow
    elevation: 10,
  },
  glassControlBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.03)", // Subtle button bg
  },
  glassControlBtnActive: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderColor: "rgba(255,255,255,0.3)",
    borderWidth: 1,
  },
  mainCallButtonModern: {
    width: 72, // Larger call button
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -40, // More pronounced float
    borderWidth: 6, // Thicker border to mask the dock line
    borderColor: "#0F172A", // Match the dark background of the screen
  },
  startCallButton: {
    backgroundColor: "#10B981",
    shadowColor: "#10B981",
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  },
  endCallButton: {
    backgroundColor: "#EF4444",
    shadowColor: "#EF4444",
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  },
  disabledButton: {
    backgroundColor: "#64748B",
    shadowOpacity: 0,
  },
  notificationDotModern: {
    position: "absolute",
    top: 4,
    right: 6,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#F43F5E",
    borderWidth: 1.5,
    borderColor: "#1E293B", // Match bg
  },

  // Headset Prompt - Refined
  promptOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.85)", // Darker, more immersive
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2000,
    padding: 20,
  },
  promptGlassBox: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#1E293B",
    borderRadius: 30,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.6,
    shadowRadius: 50,
    elevation: 20,
  },
  promptTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#F8FAFC",
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  promptText: {
    fontSize: 15,
    color: "#94A3B8",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
  promptButtonRow: {
    flexDirection: "row",
    justifyContent: "center",
    width: "100%",
  },
  promptButtonPrimary: {
    backgroundColor: theme.colors.actionPrimary.default,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 20,
    shadowColor: theme.colors.actionPrimary.default,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  promptButtonTextPri: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});

export default CallingWidget;
