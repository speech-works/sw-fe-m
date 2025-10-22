import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
// These imports are correct for a React Native environment (Expo)
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";
// These imports are correct for a React Native environment (Native Modules)
import {
  InputAudioStream,
  AUDIO_FORMATS,
  AUDIO_SOURCES,
  CHANNEL_CONFIGS,
} from "@dr.pogodin/react-native-audio";
// This import is correct for a React Native environment (Native Module)
import PCMPlayer from "react-native-pcm-player-lite";
import DeviceInfo from "react-native-device-info";

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
  const [headsetConnected, setHeadsetConnected] = useState(
    Platform.OS === "web" ? true : false
  );

  const ws = useRef<WebSocket | null>(null);

  // Web Audio Refs
  const audioContext = useRef<AudioContext | null>(null);
  const resamplerNode = useRef<AudioWorkletNode | null>(null);
  const playbackNode = useRef<AudioWorkletNode | null>(null);

  // Native refs
  const micStream = useRef<InputAudioStream | null>(null);
  const pcmPlayer = useRef<any | null>(null);

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

  // Tracks if the player is "warm" and ready for audio
  const isAudioReady = useRef(false);
  // Holds audio that arrives before the player is warm
  const pendingAudioChunks = useRef<string[]>([]);
  // Prevents multiple startCall() taps
  const isPlayerStarting = useRef(false);

  const isPlayerInitialized = useRef(false);

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
    await stopNativeRingtone();
    isMicActive.current = false;

    // Clear all persistent refs to prevent state pollution between calls
    console.log("Cleaning up audio state for new call...");
    pendingChunks.current = [];
    outgoingMicBuffer.current = [];

    if (finalFallbackId.current) {
      clearTimeout(finalFallbackId.current);
      finalFallbackId.current = null;
    }

    // 1. Immediately cut off all NEW audio from JavaScript.
    isAudioReady.current = false;
    pendingAudioChunks.current = []; // Clear queue
    isPlayerStarting.current = false;

    // 2. Get a local ref to the player.
    const playerToStop = pcmPlayer.current;

    // 3. Set the global ref to null. This stops any new JS calls.
    pcmPlayer.current = null;

    if (Platform.OS === "ios" || Platform.OS === "android") {
      if (micStream.current) {
        try {
          if (typeof micStream.current.destroy === "function")
            micStream.current.destroy();
          micStream.current = null;
        } catch (e) {
          console.warn("Failed to destroy micStream:", e);
        }
      }
      if (playerToStop) {
        try {
          // 4. Give a *very* brief "grace period" (e.g., 50ms).
          // This allows any in-flight native 'write' commands that have
          // *already* been called from handleAudioChunkFromServer
          // to hopefully complete before 'stop' destroys the AudioTrack.
          await new Promise((resolve) => setTimeout(resolve, 50));

          // 5. NOW, call stop.
          if (typeof playerToStop.stop === "function") {
            console.log("[PCMPlayer] Stopping player instance...");
            await playerToStop.stop();
          }
        } catch (e) {
          console.warn("Failed to stop pcmPlayer:", e);
        }
      }
    } else {
      if (resamplerNode.current) {
        try {
          resamplerNode.current.disconnect();
        } catch {}
        resamplerNode.current = null;
      }
      if (playbackNode.current) {
        try {
          playbackNode.current.disconnect();
        } catch {}
        playbackNode.current = null;
      }
      if (audioContext.current) {
        try {
          audioContext.current.close();
        } catch {}
        audioContext.current = null;
      }
    }

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      });
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

  const startAudioCapture = async () => {
    console.log("startAudioCapture called");
    if (Platform.OS === "ios" || Platform.OS === "android") {
      try {
        const { granted } = await Audio.requestPermissionsAsync();
        if (!granted) {
          setStatus("Microphone permission denied.");
          return;
        }
        if (typeof InputAudioStream === "undefined" || !InputAudioStream) {
          const errorMessage = "Microphone streaming module failed to load.";
          console.error(errorMessage);
          setStatus("Mic error: " + errorMessage);
          return;
        }
        if (micStream.current) {
          micStream.current.destroy();
          micStream.current = null;
        }
        const stream = new InputAudioStream(
          AUDIO_SOURCES.MIC,
          sampleRate,
          CHANNEL_CONFIGS.MONO,
          AUDIO_FORMATS.PCM_16BIT,
          Math.max(1024, Math.floor(sampleRate * 0.04)),
          true
        );
        stream.addErrorListener((error) => {
          console.error("InputAudioStream error:", error);
        });
        stream.addChunkListener((chunk) => {
          const pcmBase64 = chunk;
          if (
            //isMicActive.current &&
            ws.current &&
            ws.current.readyState === WebSocket.OPEN
          ) {
            ws.current.send(pcmBase64);
          }
        });
        const startedStream = await stream.start();
        micStream.current = stream;
        console.log("Native mic stream started");
      } catch (error) {
        console.error("Failed to start native audio capture:", error);
        setStatus("Mic error: " + (error as Error).message);
      }
    } else {
      // Web path
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      audioContext.current = ctx;

      const resamplerBlob = new Blob(
        [
          RESAMPLER_WORKLET_CODE.replace(
            /\${SAMPLE_RATE}/g,
            String(sampleRate)
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

      try {
        playback.port.postMessage({
          cmd: "init",
          playbackRate: 0.92,
          thresholdSamples: Math.floor((JITTER_BUFFER_MS / 1000) * sampleRate),
          fadeSamples: Math.max(1, Math.floor((FADE_MS / 1000) * sampleRate)),
        });
      } catch (e) {}

      playback.port.onmessage = (ev) => {
        const d = ev.data;
        if (!d || !d.cmd) return;
        if (d.cmd === "drain") {
          console.log("playback worklet drained");
        } else if (d.cmd === "final_done") {
          console.log("playback worklet final_done", d);

          // Clear any fallback timer waiting to force user turn
          if (finalFallbackId.current) {
            clearTimeout(finalFallbackId.current);
            finalFallbackId.current = null;
          }

          // Normal successful flow: hand control back to user
          setStatus("Agent finished speaking. Your turn.");
          setTurn("user");
          isMicActive.current = true;
        }
      };

      if (pendingChunks.current.length > 0) {
        const snapshot = pendingChunks.current.slice();
        for (const ab of snapshot) {
          try {
            playback.port.postMessage({ cmd: "chunk", buffer: ab }, [ab]);
          } catch (e) {}
        }
        pendingChunks.current = [];
      }

      resamplerPortOnMessageHandler.current = (ev) => {
        const pcmArrayBuffer = ev.data as ArrayBuffer;
        const ab = pcmArrayBuffer.slice(0);

        if (
          //isMicActive.current &&
          ws.current &&
          ws.current.readyState === WebSocket.OPEN
        ) {
          try {
            ws.current.send(ab);
          } catch (e) {
            outgoingMicBuffer.current.push(ab);
            if (outgoingMicBuffer.current.length > MAX_OUTGOING_CHUNKS)
              outgoingMicBuffer.current.shift();
          }
        } else if (!isMicActive.current) {
          // discard
        } else {
          outgoingMicBuffer.current.push(ab);
          if (outgoingMicBuffer.current.length > MAX_OUTGOING_CHUNKS)
            outgoingMicBuffer.current.shift();
        }
      };

      resampler.port.onmessage = resamplerPortOnMessageHandler.current;

      const preFilter = ctx.createBiquadFilter();
      preFilter.type = "lowpass";
      const cutoff = Math.min(12000, Math.max(6000, sampleRate / 2 - 1000));
      preFilter.frequency.value = cutoff;
      source.connect(preFilter);
      preFilter.connect(resampler);

      const silentGain = ctx.createGain();
      silentGain.gain.value = 0;
      resampler.connect(silentGain);
      silentGain.connect(ctx.destination);

      console.log("Web worklets started (pacing hardened)");
    }
  };

  const startCall = async () => {
    setStatus("Preparing audio...");
    if (Platform.OS !== "web") {
      await updateHeadsetStatus();
      if (!headsetConnected) {
        console.log("Call blocked: No headset connected.");
        return;
      }
    }

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      });
    } catch (e) {
      console.error("Failed to set audio mode:", e);
      setStatus("Audio setup failed.");
      return;
    }

    if (Platform.OS === "web") startRingTone();
    else {
      startNativeRingtone();
      if (PCMPlayer && typeof PCMPlayer !== "string") {
        // 1. Prevent double-taps
        if (isPlayerStarting.current) {
          console.warn(
            "[PCMPlayer] Start call ignored, player is already starting."
          );
          return;
        }
        isPlayerStarting.current = true; // Set lock

        try {
          if (isPlayerInitialized.current) {
            // 2. ALWAYS STOP FIRST (Cooldown)
            // This cleans up the singleton, even on the 1st call.
            if (typeof PCMPlayer.stop === "function") {
              console.log(
                "[PCMPlayer] Cooldown: Stopping any previous instance..."
              );
              await PCMPlayer.stop();
            }

            // 3. ALWAYS DELAY (Cooldown)
            // Gives the native thread time to release the hardware.
            await new Promise((resolve) => setTimeout(resolve, 250));
          }

          // 4. ASSIGN AND START
          pcmPlayer.current = PCMPlayer;
          if (typeof pcmPlayer.current.start === "function") {
            console.log("[PCMPlayer] Starting new audio track...");
            await pcmPlayer.current.start(sampleRate);
            // Set this to true *after* start() succeeds.
            // It will now be true for all subsequent calls.
            isPlayerInitialized.current = true;
            // 5. START WARM-UP (DON'T AWAIT)
            // We start a timer. When it fires, we'll flush the audio queue.
            // We use 300ms as a safe "warm-up" time.
            setTimeout(() => {
              console.log(
                "[PCMPlayer] AudioTrack is now considered warm. Flushing queue."
              );
              isAudioReady.current = true;
              isPlayerStarting.current = false; // Release lock

              // Now, flush any audio that arrived during warm-up
              if (
                pcmPlayer.current &&
                typeof pcmPlayer.current.enqueueBase64 === "function"
              ) {
                for (const chunk of pendingAudioChunks.current) {
                  try {
                    pcmPlayer.current.enqueueBase64(chunk);
                  } catch (e) {
                    console.warn("Error flushing chunk from queue:", e);
                  }
                }
              }
              pendingAudioChunks.current = []; // Clear queue
            }, 300);
          } else {
            setStatus("Player init failed.");
            isPlayerStarting.current = false; // Release lock
            return;
          }
        } catch (e) {
          console.error("Failed to start PCMPlayer:", e);
          pcmPlayer.current = null;
          setStatus("Player init failed: " + (e as Error).message);
          isPlayerStarting.current = false; // Release lock
          return;
        }
      } else {
        setStatus("Player module missing.");
        return;
      }
    }

    await startAudioCapture();
    isMicActive.current = false;

    setStatus("Connecting to backend...");
    ws.current = new WebSocket(websocketUrl);
    ws.current.binaryType = "arraybuffer";
    ws.current.onopen = () => {
      setStatus("Connected. Joined backend.");
      setIsCalling(true);
      onCallStart?.();
      ws.current?.send(
        JSON.stringify({ type: "join", userId, scenarioId: scenarioId })
      );
    };
    ws.current.onmessage = async (msg) => {
      try {
        if (typeof msg.data === "string") {
          const parsed = JSON.parse(msg.data as string);
          handleControlMessage(parsed);
        } else {
          handleAudioChunkFromServer(msg.data);
        }
      } catch (e) {
        console.warn("WS parse error:", e);
      }
    };
    ws.current.onclose = (event) => {
      setStatus("Disconnected");
      stopRingTone();
      setIsCalling(false);
      setTurn(null);
      onCallEnd?.();
      cleanupAudio();
      updateHeadsetStatus();
    };
    ws.current.onerror = (err) => {
      console.error("WebSocket error:", err);
      setStatus("Connection error");
    };
  };

  const endCall = async () => {
    try {
      ws.current?.send(JSON.stringify({ type: "end_call" }));
    } catch {}
    try {
      ws.current?.close();
    } catch {}
    ws.current = null;
    stopRingTone();
    try {
      playbackNode.current?.port.postMessage({ cmd: "flushImmediate" });
    } catch {}
    await cleanupAudio();
    setIsCalling(false);
    setStatus("Call ended.");
    setTurn(null);
    onCallEnd?.();
    updateHeadsetStatus();
  };

  function base64ToArrayBuffer(base64: string) {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  }

  const handleAudioChunkFromServer = async (data: any) => {
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
    } else {
      if (!pcmPlayer.current) {
        console.error("PCM player not initialized");
        return;
      }
      let base64Chunk: string;
      if (typeof data === "string") base64Chunk = data;
      else {
        console.error("Unknown native audio format");
        return;
      }
      if (!isAudioReady.current) {
        // Player is not warm yet. Queue this chunk.
        pendingAudioChunks.current.push(base64Chunk);
      } else {
        // Player is warm. Send it.
        try {
          pcmPlayer.current.enqueueBase64(base64Chunk);
        } catch (e) {
          console.error("PCMPlayer.enqueueBase64 error:", e);
          // This could happen if the player crashes mid-call
          // In this case, we just log the error and drop the chunk
        }
      }
    }
  };

  const handleControlMessage = (data: any) => {
    switch (data.type) {
      case "deepgram_ready":
        // --- START: MODIFICATION ---
        // Just update status. Turn switches via worklet 'final_done' after greeting.
        setStatus("AI is ready.");
        // --- END: MODIFICATION ---
        break;
      case "turn":
        if (data.turn === "agent") {
          stopRingTone();
          setTurn("agent");
          setStatus("Agent is speaking...");
          //isMicActive.current = false;
        } else if (data.turn === "user") {
          setTurn("user");
          setStatus("Your turn to speak.");
          isMicActive.current = true;
        }
        break;
      case "text":
        setStatus(data.data);
        break;
      case "audio_chunk":
        stopRingTone();
        setTurn("agent");
        setStatus("Agent is speaking...");
        //isMicActive.current = false;
        handleAudioChunkFromServer(data.data);
        break;

      case "audio_end": {
        // Tell the worklet we expect final audio frames
        try {
          playbackNode.current?.port.postMessage({ cmd: "final_expected" });
        } catch (e) {
          console.warn("Failed to post final_expected to worklet:", e);
        }

        setStatus("Finishing playback...");

        // Reset any existing fallback, then start a new one.
        if (finalFallbackId.current) {
          clearTimeout(finalFallbackId.current);
          finalFallbackId.current = null;
        }

        // Fallback: if we don't receive final_done within this window, unstick UI.
        const FALLBACK_MS = 1000; // 1 second — conservative
        finalFallbackId.current = window.setTimeout(() => {
          console.warn(
            "final_done not received within fallback window — forcing user turn."
          );
          finalFallbackId.current = null;
          setStatus("Your turn to speak.");
          setTurn("user");
          isMicActive.current = true;
        }, FALLBACK_MS);

        break;
      }

      case "interrupted": {
        // Immediate stop & flush of playback so user can speak right away.
        try {
          playbackNode.current?.port.postMessage({ cmd: "flushImmediate" });
        } catch (e) {
          console.warn("Failed to post flushImmediate to worklet:", e);
        }

        // Stop any ringtones
        stopRingTone();

        // Clear fallback if present (we're already switching to user)
        if (finalFallbackId.current) {
          clearTimeout(finalFallbackId.current);
          finalFallbackId.current = null;
        }

        // Switch to user turn and enable mic
        setTurn("user");
        setStatus("You can now speak. (Interrupted)");
        isMicActive.current = true;
        break;
      }

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
