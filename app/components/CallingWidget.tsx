import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
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

type Props = {
  websocketUrl: string;
  userId?: string;
  sampleRate?: number;
  onCallStart?: () => void;
  onCallEnd?: () => void;
  ringtoneAsset?: number;
  ringtoneUri?: string;
  scenarioId?: string;
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

// PLAYBACK WORKLET — with simplified and robust final_done logic
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

const INITIAL_STATUS_MESSAGE = "Click to start call";
const HEADSET_REQUIRED_STATUS = "Connect your headphones to start a call";

const CallingWidget: React.FC<Props> = ({
  websocketUrl,
  userId = "anonymous",
  sampleRate = DEFAULT_SAMPLE_RATE,
  onCallStart,
  onCallEnd,
  ringtoneAsset,
  ringtoneUri,
  scenarioId,
}) => {
  const [isCalling, setIsCalling] = useState(false);
  const [status, setStatus] = useState(INITIAL_STATUS_MESSAGE);
  const [turn, setTurn] = useState<"user" | "agent" | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [headsetConnected, setHeadsetConnected] = useState(
    Platform.OS === "web" ? true : false
  );

  const ws = useRef<WebSocket | null>(null);

  const playSeq = useRef(0);
  // Replace whatever you have now with this:
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

  // STOPPING guard (fast, low-level)
  const isStopping = useRef(false);
  // Unique identifier per call to ignore stale async events from prior calls
  const callId = useRef(0);

  const soundRef = useRef<Audio.Sound | null>(null); // authoritative native sound object
  const playLock = useRef<boolean>(false); // prevents overlapping play operations
  const hasStartedPlaying = useRef<boolean>(false);
  const lastPlayedUrl = useRef<string | null>(null); // dedupe quick repeats
  const lastPlayTimestamp = useRef<number>(0);

  // Wait for worklet drain/final_done or timeout. Resolves when safe to start URL playback.
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

  function isPlaybackSuccess(s: AVPlaybackStatus): s is AVPlaybackStatus & {
    isPlaying: boolean;
    didJustFinish: boolean;
    isBuffering: boolean;
    playableDurationMillis?: number;
  } {
    return (s as any).isLoaded === true;
  }

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

  const updateHeadsetStatus = async () => {
    if (Platform.OS !== "web") {
      const connected = await checkHeadsetConnected();
      setHeadsetConnected(connected);
      if (!connected && !isCalling) {
        setStatus(HEADSET_REQUIRED_STATUS);
      } else if (connected && !isCalling) {
        setStatus(INITIAL_STATUS_MESSAGE);
      }
    }
  };

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

  useEffect(() => {
    updateHeadsetStatus();
    return () => {
      try {
        ws.current?.close();
      } catch {}
      stopRingTone();
      cleanupAudio();
    };
  }, []);

  // Ringtone functions (unchanged)
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

  const sendChunk = async () => {
    // This function is not used in this architecture
    console.warn("sendChunk called, but should be disabled.");
  };

  const startAudioCapture = async (): Promise<boolean> => {
    // Added Promise<boolean> return type
    console.log("Starting audio capture...");

    // --- Web Platform Logic (unchanged) ---
    if (Platform.OS === "web") {
      console.log("Setting up Web Audio capture...");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        const ctx = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
        audioContext.current = ctx;

        // Add Resampler Worklet
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

        // Add Playback Worklet
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

        const myCallId = callId.current; // Capture call ID for async safety

        // Initialize Playback Worklet
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

        // Playback Worklet Message Handler
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

        // Flush pending web chunks
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

        // Resampler Worklet Message Handler
        resamplerPortOnMessageHandler.current = (ev) => {
          if (myCallId !== callId.current) return;
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

        // Connect audio graph
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
        return true; // Indicate success for web
      } catch (error) {
        console.error("Failed to start web audio capture:", error);
        setStatus("Mic error: " + (error as Error).message);
        return false; // Indicate failure for web
      }

      // --- Native Platform Logic (FIXED) ---
    } else {
      // iOS or Android
      console.log(
        "Starting audio capture with @dr.pogodin/react-native-audio..."
      );
      try {
        const { granted } = await Audio.requestPermissionsAsync();
        if (!granted) {
          setStatus("Microphone permission denied.");
          console.error("Mic permission denied");
          return false; // Indicate failure
        }
        console.log("Mic permissions granted.");

        // --- ‼️ We have correctly removed the duplicate setAudioModeAsync call. ---

        // Clean up previous stream if exists
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
          // --- ‼️ THIS IS THE FIX (Part 2) ‼️ ---
          //
          // Use VOICE_RECOGNITION, which is designed for STT and
          // should ignore the playback stream.
          //
          AUDIO_SOURCES.VOICE_RECOGNITION || AUDIO_SOURCES.MIC,
          // --- ‼️ END OF FIX ‼️ ---
          sampleRate,
          CHANNEL_CONFIGS.MONO,
          AUDIO_FORMATS.PCM_16BIT,
          Math.max(2048, Math.floor(sampleRate * 0.1)),
          true // Use base64 encoding
        );

        stream.addErrorListener((error) => {
          console.error("InputAudioStream error:", error);
          setStatus("Mic stream error.");
        });

        stream.addChunkListener((chunkBase64) => {
          if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            try {
              ws.current.send(chunkBase64); // Send base64 string directly
            } catch (sendError) {
              console.error("WebSocket send error:", sendError);
            }
          }
        });

        console.log("Starting InputAudioStream...");
        await stream.start();
        micStream.current = stream; // Assign ref AFTER successful start
        console.log("Native mic stream (@dr.pogodin) started successfully.");
        return true; // Indicate success
      } catch (error) {
        console.error("Failed to start native audio capture:", error);
        setStatus("Mic error: " + (error as Error).message);
        return false; // Indicate failure
      }
    }
  };

  // Add a ref for the interval timer
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Make sure to import FileSystem
  // import * as FileSystem from 'expo-file-system';

  const startCall = async () => {
    // --- 1. STATE LOCK ---
    if (audioState.current !== "IDLE") {
      console.warn(
        `[State] Ignoring startCall, state is ${audioState.current}`
      );
      return;
    }
    console.log("[State] Setting state to STARTING");
    audioState.current = "STARTING";
    // --- END LOCK ---

    // Assign a fresh call id
    callId.current += 1;

    // Reset stopping guard and web-specific buffers
    isStopping.current = false;
    pendingChunks.current = [];
    outgoingMicBuffer.current = [];

    setStatus("Preparing audio...");
    // Check headset connection for native platforms
    if (Platform.OS !== "web") {
      await updateHeadsetStatus();
      if (!headsetConnected) {
        console.log("Call blocked: No headset connected.");
        setStatus(HEADSET_REQUIRED_STATUS); // Ensure status reflects block
        audioState.current = "IDLE"; // Release lock before returning
        return;
      }
    }

    // Set Audio Mode for the call
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        interruptionModeIOS: InterruptionModeIOS.MixWithOthers,

        // --- ‼️ THIS IS THE FIX (Part 1) ‼️ ---
        // We MUST use DuckOthers to allow both streams to run.
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        // We set this to false to stop the OS from linking the streams.
        shouldDuckAndroid: false,
        // --- ‼️ END OF FIX ‼️ ---

        playThroughEarpieceAndroid: false,
      });
      console.log("[Audio Mode] Set for active call.");
    } catch (e) {
      console.error("Failed to set audio mode for call:", e);
      setStatus("Audio setup failed.");
      audioState.current = "IDLE"; // Release lock
      return;
    }

    // Start Ringtone (platform specific)
    if (Platform.OS === "web") {
      startRingTone();
    } else {
      startNativeRingtone();
    }

    // --- Start and Check Audio Capture ---
    const captureStarted = await startAudioCapture();

    if (!captureStarted) {
      console.error(
        "[startCall] startAudioCapture FAILED. Aborting call start."
      );
      audioState.current = "IDLE";
      await cleanupAudio();
      return;
    }

    console.log("[startCall] Audio capture started successfully (or is web).");
    // --- End Check ---

    // Set state to indicate call is fully started AFTER capture setup
    console.log("[State] Setting state to STARTED");
    audioState.current = "STARTED";

    // Initialize WebSocket connection
    setStatus("Connecting to backend...");
    ws.current = new WebSocket(websocketUrl);
    ws.current.binaryType = "arraybuffer"; // Still needed for web audio worklet

    ws.current.onopen = () => {
      setStatus("Connected. Joined backend.");
      setIsCalling(true); // Update UI state
      onCallStart?.(); // Trigger callback
      // Send join message
      ws.current?.send(
        JSON.stringify({ type: "join", userId, scenarioId: scenarioId })
      );
    };

    ws.current.onmessage = async (msg) => {
      try {
        if (typeof msg.data === "string") {
          // Check if it's JSON control message or base64 audio (from expo-av recording)
          let parsed;
          try {
            parsed = JSON.parse(msg.data);
            handleControlMessage(parsed);
          } catch (jsonError) {
            // If not JSON, assume it's base64 audio from native recording
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
          // Handle binary data (only expected for Web Audio Worklet)
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
      // Ensure cleanup happens via endCall for consistency
      endCall();
    };

    ws.current.onerror = (err) => {
      // Errors often precede closure, let endCall handle cleanup.
      console.error("WebSocket error:", err);
      setStatus("Connection error");
      // Optionally trigger endCall immediately if needed
      // endCall();
    };
  };

  const endCall = async () => {
    // --- 1. STATE LOCK ---
    // Prevent this from running multiple times
    if (audioState.current === "STOPPING" || audioState.current === "IDLE") {
      console.log(`[State] Ignoring endCall, state is ${audioState.current}`);
      return;
    }
    console.log("[State] Setting state to STOPPING");
    audioState.current = "STOPPING";
    // --- END LOCK ---
    // IMMEDIATELY mark stopping so any low-level handlers drop in-flight chunks.
    isStopping.current = true;

    // 2. Stop UI
    stopRingTone();
    setIsCalling(false);
    setStatus("Call ended.");
    setTurn(null);
    onCallEnd?.();

    // 3. Stop WebSocket - clear handlers BEFORE closing to avoid a final burst of messages
    try {
      if (ws.current) {
        try {
          ws.current.onmessage = null;
        } catch {}
        try {
          ws.current.onclose = null;
        } catch {}
        try {
          ws.current.onerror = null;
        } catch {}
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

    // 4. Stop Hardware
    try {
      playbackNode.current?.port.postMessage({ cmd: "flushImmediate" });
    } catch {}

    // This calls our safe cleanup function
    await cleanupAudio();

    // 5. Reset UI and Unlock State
    updateHeadsetStatus();
    console.log("[State] Setting state to IDLE");
    audioState.current = "IDLE";
  };

  function base64ToArrayBuffer(base64: string) {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  }

  const handleAudioChunkFromServer = async (data: any) => {
    // If we're stopping/cleaning up, ignore incoming audio immediately.
    if (isStopping.current) {
      return;
    }

    // This function is now WEB-ONLY
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
    // NO MORE NATIVE 'ELSE' BLOCK
  };

  const handleControlMessage = async (data: any) => {
    switch (data.type) {
      case "deepgram_ready":
        setStatus("AI is ready.");
        break;

      case "turn":
        if (data.turn === "agent") {
          stopRingTone();
          setTurn("agent");
          setStatus("Agent is speaking...");
          // Mic control is implicitly handled by not being user turn
        } else if (data.turn === "user") {
          setTurn("user");
          setStatus("Your turn to speak.");
          console.log("[Mic] Activating mic via 'turn: user' command.");
          isMicActive.current = true; // Mic ON
        }
        break;

      case "text":
        setStatus(data.data);
        break;

      case "play_stream": {
        stopRingTone();
        setTurn("agent");
        setStatus("Agent is speaking...");

        const urlToPlay = data.url;
        if (!urlToPlay) {
          console.warn("[Audio] play_stream missing url");
          break;
        }

        // bump sequence token - cancels previous play attempts
        const mySeq = ++playSeq.current;

        // If a playback is already in progress, we'll cancel/unload it first.
        // This prevents multiple voices playing at once.
        (async () => {
          playLock.current = true;
          hasStartedPlaying.current = false;

          // Cancel any pending forced-start timer for previous playback
          if (forcedStartTimeoutRef.current) {
            clearTimeout(forcedStartTimeoutRef.current);
            forcedStartTimeoutRef.current = null;
          }

          // Get and unload previous sound safely
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

          // If call ended or a newer play arrived, abort
          if (
            isStopping.current ||
            mySeq !== playSeq.current ||
            audioState.current !== "STARTED"
          ) {
            playLock.current = false;
            return;
          }

          // Create and load new sound manually to avoid callback race
          const newSound = new Audio.Sound();
          let destroyed = false;

          try {
            // Attach status update AFTER load to ensure it references the real instance
            await newSound.loadAsync(
              { uri: urlToPlay },
              { shouldPlay: false, progressUpdateIntervalMillis: 200 }
            );
            // abort if newer play started while loading
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

            // set status callback
            newSound.setOnPlaybackStatusUpdate(async (status) => {
              try {
                // ignore callbacks from older sequences
                if (mySeq !== playSeq.current) return;

                // Note: status here is the success shape
                if (!status.isLoaded) {
                  if ((status as any).error) {
                    console.error("[Audio] load error:", (status as any).error);
                  }
                  return;
                }

                // start playback when loaded if not already started
                if (!status.isPlaying && !hasStartedPlaying.current) {
                  try {
                    hasStartedPlaying.current = true;
                    await newSound.setVolumeAsync(1.0);
                    // some expo versions may not expose setIsMutedAsync — guard it
                    if ((newSound as any).setIsMutedAsync) {
                      try {
                        await (newSound as any).setIsMutedAsync(false);
                      } catch {}
                    }
                    await newSound.playAsync();
                  } catch (e) {
                    console.error("[Audio] Error during playAsync:", e);
                    hasStartedPlaying.current = false;
                    // release lock on error
                    playLock.current = false;
                  }
                }

                // finish handling
                if ((status as any).didJustFinish) {
                  // only clear state if this is the active sequence
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

            // store ref/state
            soundRef.current = newSound;
            setSound(newSound);

            // Forced-start fallback after short delay (platform quirks)
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

      // --- REVISED 'stop_playback' ---
      case "stop_playback": {
        // Interruption
        const soundToStop = soundRef.current; // Get from ref
        soundRef.current = null; // Clear ref immediately
        setSound(null); // Clear state immediately

        if (soundToStop) {
          console.log("[Audio] Interruption. Stopping playback and unloading.");
          try {
            soundToStop.setOnPlaybackStatusUpdate(null);
          } catch {} // Detach listener
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

        playLock.current = false; // Release lock on interruption
        hasStartedPlaying.current = false; // ⬅️ Reset the gate

        // Update UI immediately
        setTurn("user");
        setStatus("Your turn to speak. (Interrupted)");
        // Mic activation will happen when 'turn: user' arrives from backend
        break;
      }
      // --- End REVISED 'stop_playback' ---

      default:
        break;
    }
  };

  // Headset indicator (unchanged)
  const HeadsetStatusIndicator = () => {
    if (Platform.OS === "web") return null;
    const icon = headsetConnected ? "🎧" : "🔇";
    const text = headsetConnected ? "Headset Connected" : "No Headset";
    const color = headsetConnected ? "#10b1" : "#f87171";
    return (
      <View style={styles.headsetIndicator}>
        <Text style={[styles.headsetIcon, { color }]}>{icon}</Text>
        <Text style={[styles.headsetLabel, { color }]}>{text}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Calling Widget</Text>
        <HeadsetStatusIndicator />
      </View>
      <Text
        style={[
          styles.status,
          status === HEADSET_REQUIRED_STATUS && styles.statusWarning,
        ]}
      >
        {status}
      </Text>

      {isCalling ? (
        <TouchableOpacity style={styles.endCallButton} onPress={endCall}>
          <Text style={styles.buttonText}>End Call</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[
            styles.startCallButton,
            !headsetConnected && Platform.OS !== "web" && styles.disabledButton,
          ]}
          onPress={startCall}
          disabled={!headsetConnected && Platform.OS !== "web"}
        >
          <Text style={styles.buttonText}>Start Call</Text>
        </TouchableOpacity>
      )}

      <View style={styles.turnContainer}>
        {turn === "user" && (
          <Text style={styles.userTurn}>Your Turn to Speak</Text>
        )}
        {turn === "agent" && (
          <Text style={styles.agentTurn}>Agent is Responding</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 360,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#fff",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
      },
    }),
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    fontWeight: "bold",
    fontSize: 20,
  },
  status: {
    marginBottom: 12,
    color: "#666",
  },
  statusWarning: {
    color: "#f87171",
    fontWeight: "bold",
  },
  headsetIndicator: {
    flexDirection: "row",
    alignItems: "center",
    padding: 4,
    borderRadius: 4,
  },
  headsetIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  headsetLabel: {
    fontSize: 12,
    fontWeight: "bold",
  },
  endCallButton: {
    width: "100%",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#ef4444",
    borderRadius: 8,
    alignItems: "center",
  },
  startCallButton: {
    width: "100%",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#2563eb",
    borderRadius: 8,
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "#9ca3af",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
  },
  turnContainer: {
    marginTop: 12,
    fontWeight: "bold",
  },
  userTurn: {
    color: "#2563eb",
  },
  agentTurn: {
    color: "#16a34a",
  },
});

export default CallingWidget;
