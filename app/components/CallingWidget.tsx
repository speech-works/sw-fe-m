import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
// Import icons
import Icon from "react-native-vector-icons/FontAwesome5";

// These imports are correct for a React Native environment (Expo)
import {
  Audio,
  InterruptionModeAndroid,
  InterruptionModeIOS,
  AVPlaybackStatus,
} from "expo-av";
// These imports are correct for a React Native environment (Native Modules)
import {
  InputAudioStream,
  AUDIO_FORMATS,
  AUDIO_SOURCES,
  CHANNEL_CONFIGS,
} from "@dr.pogodin/react-native-audio";

import DeviceInfo from "react-native-device-info";

import * as FileSystem from "expo-file-system";

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
    Platform.OS === "web" ? true : false
  );

  // --- NEW UI STATE ---
  const [isMuted, setIsMuted] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [callDuration, setCallDuration] = useState(0);
  // --- ⬇️ MODIFIED: This is now dynamic state ⬇️ ---
  const [suggestedResponses, setSuggestedResponses] = useState<string[]>([]);
  // --- ⬇️ ADDED: State for notification dot ⬇️ ---
  const [showNotificationDot, setShowNotificationDot] = useState(false);
  // --- ⬆️ END NEW UI STATE ⬆️ ---

  const ws = useRef<WebSocket | null>(null);

  const playSeq = useRef(0);
  const forcedStartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
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
    "IDLE"
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
      const isConnected = await DeviceInfo.isHeadphonesConnected();
      return isConnected;
    } catch (e) {
      console.error("Error checking headset connection:", e);
      return true;
    }
  };

  // --- ⬇️ MODIFIED: `updateHeadsetStatus` now sets status text ⬇️ ---
  const updateHeadsetStatus = async (): Promise<boolean> => {
    if (Platform.OS !== "web") {
      const connected = await checkHeadsetConnected();
      setHeadsetConnected(connected);
      // Set status based on connection AND call state
      if (!connected && audioState.current === "IDLE") {
        setStatus("PLEASE CONNECT YOUR HEADPHONES");
      } else if (connected && audioState.current === "IDLE") {
        setStatus("Press to start call");
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
          e
        );
      }
      try {
        await soundToUnload.unloadAsync(); // Use unloadAsync
        console.log(
          "[Audio] Sound object unloaded successfully during cleanup."
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
    updateHeadsetStatus(); // This will set the correct initial status
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
    const ctx = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
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
          { shouldPlay: true, isLooping: true }
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
        const ctx = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
        audioContext.current = ctx;

        // ... (Worklet adding logic is unchanged) ...
        const resamplerBlob = new Blob(
          [
            RESAMPLER_WORKLET_CODE.replace(
              /\$\{DEFAULT_SAMPLE_RATE\}/g,
              String(DEFAULT_SAMPLE_RATE)
            ),
          ],
          { type: "application/javascript" }
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
              (JITTER_BUFFER_MS / 1000) * ctx.sampleRate
            ),
            fadeSamples: Math.max(
              1,
              Math.floor((FADE_MS / 1000) * ctx.sampleRate)
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
          Math.max(6000, ctx.sampleRate / 2 - 1000)
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
        "Starting audio capture with @dr.pogodin/react-native-audio..."
      );
      try {
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
          "Creating new InputAudioStream with potentially smaller buffer..."
        );
        const stream = new InputAudioStream(
          AUDIO_SOURCES.VOICE_RECOGNITION || AUDIO_SOURCES.MIC,
          sampleRate,
          CHANNEL_CONFIGS.MONO,
          AUDIO_FORMATS.PCM_16BIT,
          Math.max(2048, Math.floor(sampleRate * 0.1)),
          true
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
        `[State] Ignoring startCall, state is ${audioState.current}`
      );
      return;
    }
    console.log("[State] Setting state to STARTING");
    audioState.current = "STARTING";

    callId.current += 1;
    isStopping.current = false;
    pendingChunks.current = [];
    outgoingMicBuffer.current = [];

    setStatus("Preparing audio...");
    if (Platform.OS !== "web") {
      const connected = await updateHeadsetStatus(); // <-- Get status directly
      if (!connected) {
        // <-- Check returned value
        console.log("Call blocked: No headset connected.");
        // Status is already set by updateHeadsetStatus
        audioState.current = "IDLE";
        return;
      }
    }

    // --- NEW: Reset UI State ---
    setTranscript([]); // Clear previous transcript
    setCallDuration(0); // Reset timer
    setIsMuted(false); // Ensure not muted
    isMutedRef.current = false;
    setSuggestedResponses([]); // <-- ADDED: Clear suggestions
    setShowNotificationDot(false); // <-- ADDED: Clear notification dot
    // --- END NEW UI State ---

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
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
        "[startCall] startAudioCapture FAILED. Aborting call start."
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
        JSON.stringify({ type: "join", userId, scenarioId: scenarioId })
      );
    };

    ws.current.onmessage = async (msg) => {
      // (This logic is unchanged, but handleControlMessage is modified)
      try {
        if (typeof msg.data === "string") {
          let parsed;
          try {
            parsed = JSON.parse(msg.data);
            handleControlMessage(parsed);
          } catch (jsonError) {
            if (Platform.OS !== "web") {
              console.warn(
                "[WS] Received string data on native, assuming base64 audio chunk - This part needs implementation if backend sends base64."
              );
            } else {
              console.warn(
                "[WS] Received non-JSON string data on web:",
                msg.data.substring(0, 50) + "..."
              );
            }
          }
        } else {
          if (Platform.OS === "web") {
            handleAudioChunkFromServer(msg.data);
          } else {
            console.warn(
              "[WS] Received unexpected binary data on native platform."
            );
          }
        }
      } catch (e) {
        console.warn("WS onmessage processing error:", e);
      }
    };

    ws.current.onclose = (event) => {
      console.log(`[WS] WebSocket closed: ${event.code} ${event.reason}`);
      endCall();
    };

    ws.current.onerror = (err) => {
      console.error("WebSocket error:", err);
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
    // setStatus("Call ended"); // This will be overridden by updateHeadsetStatus
    setTurn(null);
    onCallEnd?.();
    setShowNotificationDot(false); // <-- ADDED: Clear dot on end call

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
        break;

      case "play_stream": {
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

        const urlToPlay = data.url;
        if (!urlToPlay) {
          console.warn("[Audio] play_stream missing url");
          break;
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
            await newSound.loadAsync(
              { uri: urlToPlay },
              { shouldPlay: false, progressUpdateIntervalMillis: 200 }
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
                    await newSound.playAsync();
                  } catch (e) {
                    console.error("[Audio] Error during playAsync:", e);
                    hasStartedPlaying.current = false;
                    playLock.current = false;
                  }
                }
                if ((status as any).didJustFinish) {
                  if (mySeq === playSeq.current) {
                    try {
                      await newSound.unloadAsync();
                    } catch {}
                    soundRef.current = null;
                    setSound(null);
                    playLock.current = false;
                    hasStartedPlaying.current = false;
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
            "[Audio] Interruption requested, but no sound ref was active."
          );
        }
        playLock.current = false;
        hasStartedPlaying.current = false;
        setTurn("user");
        setStatus("Your turn to speak. (Interrupted)");
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
  const canStartCall =
    Platform.OS === "web" ||
    (headsetConnected && audioState.current === "IDLE");
  // --- ⬆️ END OF MODIFICATION ⬆️ ---

  // --- ⬇️ MODIFIED: Render function updated ⬇️ ---
  return (
    <View style={styles.container}>
      {/* --- AVATAR AREA --- */}
      <View style={styles.avatarContainer}>
        <View style={styles.avatarIconWrapper}>
          <Icon name={scenarioIcon} size={100} color="#4A90E2" />
          <View
            style={[
              styles.micIconCircle,
              turn === "agent" && styles.micIconActive, // Green when agent speaks
            ]}
          >
            <Icon
              name="volume-up"
              size={14}
              color={turn === "agent" ? "#FFF" : "#4A90E2"}
            />
          </View>
        </View>
        {/* --- MODIFIED: Use props --- */}
        <Text style={styles.avatarName}>{agentName}</Text>
        <Text style={styles.avatarSubtitle}>{agentDesignation}</Text>
        <Text style={styles.timer}>
          {isCalling ? formatDuration(callDuration) : "00:00"}
        </Text>
      </View>

      {/* --- STATUS / LISTENING INDICATOR --- */}
      <View style={styles.statusContainer}>
        {audioState.current === "STARTING" ? (
          <ActivityIndicator color="#666" />
        ) : (
          <Text style={styles.statusText}>
            {/* --- MODIFIED: Show dynamic status --- */}
            {turn === "user" ? "Listening..." : isCalling ? status : status}
          </Text>
        )}
      </View>

      {/* --- TRANSCRIPT AREA --- */}
      <View style={styles.transcriptOuterContainer}>
        <ScrollView
          ref={scrollRef}
          style={styles.transcriptScroll}
          contentContainerStyle={styles.transcriptContainer}
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: true })
          }
        >
          {transcript.map((item, index) => (
            <Text key={index} style={styles.transcriptText}>
              <Text
                style={
                  // --- MODIFIED: Use agentName prop ---
                  item.speaker === agentName
                    ? styles.speakerAlex
                    : styles.speakerYou
                }
              >
                {item.speaker}:
              </Text>
              {` ${item.text}`}
            </Text>
          ))}
        </ScrollView>
      </View>

      {/* --- SUGGESTED RESPONSES (TIPS) --- */}
      {showTips && (
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>SUGGESTED RESPONSES:</Text>
          <View style={styles.tipsButtonRow}>
            {/* This now maps over the dynamic state */}
            {suggestedResponses.map((text, i) => (
              <TouchableOpacity
                key={i}
                style={styles.tipButton}
                onPress={() => {
                  /* You could wire this to send a message */
                }}
              >
                <Text style={styles.tipButtonText}>{text}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* --- CONTROLS AREA (unchanged) --- */}
      <View style={styles.controlsRow}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={toggleMute}
          disabled={!isCalling}
        >
          <Icon
            name={isMuted ? "microphone-slash" : "microphone"}
            size={28}
            color={!isCalling ? "#aaa" : isMuted ? "#ef4444" : "#333"}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.mainCallButton,
            isCalling ? styles.endCallButton : styles.startCallButton,
            // --- MODIFIED: Use `canStartCall` variable ---
            !canStartCall && !isCalling && styles.disabledButton,
          ]}
          onPress={isCalling ? endCall : startCall}
          // --- MODIFIED: Use `canStartCall` variable ---
          disabled={!canStartCall && !isCalling}
        >
          <Icon
            name={isCalling ? "phone-slash" : "phone"}
            size={32}
            color="#FFF"
          />
        </TouchableOpacity>

        {/* --- MODIFIED: Wrapped in View and added conditional dot --- */}
        <View>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={toggleTips}
            disabled={!isCalling}
          >
            <Icon
              name="lightbulb"
              size={28}
              color={!isCalling ? "#aaa" : showTips ? "#4A90E2" : "#333"}
            />
          </TouchableOpacity>
          {showNotificationDot && <View style={styles.notificationDot} />}
        </View>
        {/* --- END OF MODIFICATION --- */}
      </View>
    </View>
  );
};
// --- ⬆️ END OF MODIFICATION ⬆️ ---

// --- (STYLES are unchanged from your file) ---
const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: "100%",
    //maxHeight: 700,
    padding: 5,
    flexDirection: "column",
    justifyContent: "space-between",
    // backgroundColor: "red",
  },
  // Avatar
  avatarContainer: {
    alignItems: "center",
    paddingTop: 20,
  },
  avatarIconWrapper: {
    position: "relative",
    marginBottom: 8,
  },
  micIconCircle: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFF",
    borderWidth: 2,
    borderColor: "#4A90E2",
    justifyContent: "center",
    alignItems: "center",
  },
  micIconActive: {
    backgroundColor: "#34C759", // Green
    borderColor: "#FFF",
  },
  avatarName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  avatarSubtitle: {
    fontSize: 16,
    color: "#888",
  },
  timer: {
    fontSize: 18,
    color: "#555",
    marginTop: 8,
    fontVariant: ["tabular-nums"],
  },
  // Status
  statusContainer: {
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 10,
  },
  statusText: {
    fontSize: 16,
    color: "#666",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    fontWeight: "500",
  },
  // Transcript
  transcriptOuterContainer: {
    flex: 1, // Takes up remaining space
    backgroundColor: "#FFF",
    borderRadius: 12,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    height: 0,
  },
  transcriptScroll: {
    flex: 1,
  },
  transcriptContainer: {
    padding: 12,
  },
  transcriptText: {
    fontSize: 15,
    color: "#333",
    lineHeight: 22,
    marginBottom: 8,
  },
  speakerAlex: {
    fontWeight: "bold",
    color: "#00529B",
  },
  speakerYou: {
    fontWeight: "bold",
    color: "#34C759",
  },
  // Tips
  tipsContainer: {
    paddingVertical: 10,
    marginBottom: 10,
  },
  tipsTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#888",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  tipsButtonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  tipButton: {
    backgroundColor: "#E4EAF1",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
  },
  tipButtonText: {
    color: "#4A90E2",
    fontWeight: "500",
  },
  // Controls
  controlsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingBottom: 10,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF",
    ...Platform.select({
      ios: { shadowOpacity: 0.1, shadowRadius: 5 },
      android: { elevation: 3 },
      web: { boxShadow: "0 2px 5px rgba(0,0,0,0.1)" },
    }),
  },
  mainCallButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  startCallButton: {
    backgroundColor: "#34C759",
  },
  endCallButton: {
    backgroundColor: "#FF3B30",
  },
  disabledButton: {
    backgroundColor: "#BDBDBD",
  },
  // --- ⬇️ ADDED: Style for notification dot ⬇️ ---
  notificationDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FF3B30", // Red dot
    borderWidth: 1,
    borderColor: "#FFF",
  },
});

export default CallingWidget;
