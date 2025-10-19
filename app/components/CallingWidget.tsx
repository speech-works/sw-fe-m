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

/**
 * CallingWidget — Fix: convert incoming Int16 PCM -> Float32 before posting to playback worklet.
 * Only audio-format / chunk-delivery code changed; everything else preserved.
 */

type Props = {
  websocketUrl: string;
  userId?: string;
  sampleRate?: number;
  onCallStart?: () => void;
  onCallEnd?: () => void;
  ringtoneAsset?: number;
  ringtoneUri?: string;
};
const DEFAULT_SAMPLE_RATE = 24000;

// Buffer / pacing constants (kept as previously)
const JITTER_BUFFER_MS = 350;
const MAX_BUFFER_MS = 700;
const FADE_MS = 8;

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

const PLAYBACK_WORKLET_CODE = `
class PlaybackProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.capacity = Math.max(16384, Math.floor(0.5 * sampleRate));
    this.buffer = new Float32Array(this.capacity);
    this.writePos = 0;
    this.samplesQueued = 0;

    this._readPosFloat = 0.0;
    this.playbackRate = 1.0;

    this.targetSamples = Math.floor(${JITTER_BUFFER_MS} / 1000 * sampleRate);
    this.lowWaterMark = Math.floor(this.targetSamples * 0.5);
    this.highWaterMark = Math.floor(this.targetSamples * 1.5);

    // --- FIX 1: NEW - Define the cross-fade duration in samples ---
    this.FADE_SAMPLES = 128; // A small value (e.g., ~5ms at 24kHz) is enough to remove clicks.

    // --- FIX 2: MODIFIED - Increase the initial buffer threshold ---
    // We'll now wait until we have a larger buffer before starting playback.
    // This provides a better safety margin against network jitter.
    this.initialThreshold = this.highWaterMark;

    this.maxBufferLength = Math.floor(${MAX_BUFFER_MS} / 1000 * sampleRate);

    this.fadeSamples = Math.max(1, Math.floor(${FADE_MS} / 1000 * sampleRate));
    this.silenceToPlaybackRamp = 0;
    this.initialized = false;
    this._previouslyHadSamples = false;

    this.port.onmessage = (e) => {
      const msg = e.data;
      if (!msg) return;
      if (msg.cmd === "init") {
        this.initialized = true;
        return;
      }
      if (msg.cmd === "chunk" && msg.buffer) {
        const arr = new Float32Array(msg.buffer);
        this._pushToRing(arr);
      }
      if (msg.cmd === "flushImmediate") {
        this.writePos = 0;
        this.samplesQueued = 0;
        this._readPosFloat = 0.0;
        this.silenceToPlaybackRamp = 0;
        this.port.postMessage({ cmd: "drain" });
      }
    };
  }

  _ensureCapacity(additional) {
    if (this.samplesQueued + additional <= this.capacity) return;
    
    let newCap = this.capacity;
    while (newCap < this.samplesQueued + additional) newCap *= 2;
    const newBuf = new Float32Array(newCap);

    if (this.samplesQueued > 0) {
        const readPosInt = Math.floor(this._readPosFloat);
        if (readPosInt < this.writePos) {
            newBuf.set(this.buffer.subarray(readPosInt, this.writePos), 0);
        } else {
            const first = this.buffer.subarray(readPosInt, this.capacity);
            const second = this.buffer.subarray(0, this.writePos);
            newBuf.set(first, 0);
            newBuf.set(second, first.length);
        }
    }
    this.buffer = newBuf;
    this.capacity = newCap;
    this._readPosFloat -= Math.floor(this._readPosFloat); 
    this.writePos = this.samplesQueued;
  }

  _pushToRing(arr) {
    // --- FIX 3: NEW - Cross-fading logic ---
    // If we have enough audio buffered and the new chunk is large enough,
    // we can perform a cross-fade to smoothly bridge the chunks.
    if (this.samplesQueued > this.FADE_SAMPLES && arr.length > this.FADE_SAMPLES) {
      for (let i = 0; i < this.FADE_SAMPLES; i++) {
        // Get the sample from the tail of the existing buffer
        const tailIndex = (this.writePos - this.FADE_SAMPLES + i + this.capacity) % this.capacity;
        const tailSample = this.buffer[tailIndex];

        // Get the sample from the head of the new incoming chunk
        const headSample = arr[i];

        // Calculate the fade-out gain (decreases) and fade-in gain (increases)
        const fadeOutGain = 1.0 - (i / this.FADE_SAMPLES);
        const fadeInGain = i / this.FADE_SAMPLES;

        // The blended sample is the sum of the fading tail and the fading-in head.
        const blendedSample = (tailSample * fadeOutGain) + (headSample * fadeInGain);

        // Overwrite the tail of the existing buffer with the blended sample.
        // This creates a seamless transition into the new chunk.
        this.buffer[tailIndex] = blendedSample;
      }
    }

    const len = arr.length;
    if (this.samplesQueued + len > this.maxBufferLength) {
      return;
    }
    this._ensureCapacity(len);
    if (this.writePos + len <= this.capacity) {
      this.buffer.set(arr, this.writePos);
      this.writePos += len;
    } else {
      const firstLen = this.capacity - this.writePos;
      this.buffer.set(arr.subarray(0, firstLen), this.writePos);
      const remaining = len - firstLen;
      this.buffer.set(arr.subarray(firstLen), 0);
      this.writePos = remaining;
    }
    if (this.writePos >= this.capacity) {
        this.writePos -= this.capacity;
    }
    this.samplesQueued += len;
    if (!this._previouslyHadSamples && this.samplesQueued > 0) {
      this.silenceToPlaybackRamp = 0;
      this._previouslyHadSamples = true;
    }
  }

  _readInterpolatedSample() {
    if (this.samplesQueued < 2) return null;
    const i0 = Math.floor(this._readPosFloat);
    const t = this._readPosFloat - i0;
    const a = this.buffer[i0];
    const b = this.buffer[(i0 + 1) % this.capacity];
    const sample = a + (b - a) * t;
    const oldReadPosInt = Math.floor(this._readPosFloat);
    this._readPosFloat += this.playbackRate;
    if (this._readPosFloat >= this.capacity) {
        this._readPosFloat -= this.capacity;
    }
    const consumed = (Math.floor(this._readPosFloat) - oldReadPosInt + this.capacity) % this.capacity;
    this.samplesQueued -= consumed;
    return sample;
  }
  
  _adjustPlaybackRate() {
      const minRate = 0.98;
      const maxRate = 1.02;
      const smoothingFactor = 0.99;
      let targetRate;
      if (this.samplesQueued > this.highWaterMark) {
          targetRate = maxRate;
      } else if (this.samplesQueued < this.lowWaterMark) {
          targetRate = minRate;
      } else {
          const deviation = this.samplesQueued - this.targetSamples;
          const adjustmentRange = this.highWaterMark - this.targetSamples;
          const adjustment = (deviation / adjustmentRange) * (maxRate - 1.0);
          targetRate = 1.0 + adjustment;
      }
      const clampedTargetRate = Math.max(minRate, Math.min(maxRate, targetRate));
      this.playbackRate = (this.playbackRate * smoothingFactor) + (clampedTargetRate * (1.0 - smoothingFactor));
  }

  process(inputs, outputs) {
    const out = outputs[0];
    if (!out || out.length === 0) return true;
    const channel = out[0];

    // The condition for starting playback is now stricter due to the higher initialThreshold
    if (!this.initialized || this.samplesQueued < this.initialThreshold) {
      for (let i = 0; i < channel.length; i++) channel[i] = 0;
      if (this.samplesQueued === 0 && this._previouslyHadSamples) {
        this._previouslyHadSamples = false;
        this.port.postMessage({ cmd: "drain" });
      }
      return true;
    }

    this._adjustPlaybackRate();

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
    
    if (this.samplesQueued <= 1 && this._previouslyHadSamples) {
      this._previouslyHadSamples = false;
      this.port.postMessage({ cmd: "drain" });
    } else if (this.samplesQueued > 1) {
      this._previouslyHadSamples = true;
    }
    return true;
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
  // pendingChunks now holds Float32 ArrayBuffer frames (ready for worklet)
  const pendingChunks = useRef<ArrayBuffer[]>([]);
  const ttsStreamEnded = useRef(false);

  // final-drain coordination (unchanged behavior)
  const finalAudioPending = useRef(false);
  const finalAudioTimer = useRef<number | null>(null);

  // Ringtone refs
  const ringIntervalRef = useRef<number | null>(null);
  const ringAudioCtxRef = useRef<AudioContext | null>(null);
  const ringOscillatorsRef = useRef<OscillatorNode[]>([]);
  const ringGainRef = useRef<GainNode | null>(null);

  const nativeRingtoneRef = useRef<Audio.Sound | null>(null);
  const nativeRingtoneLoading = useRef(false);

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

  const clearFinalAudioTimer = () => {
    try {
      if (finalAudioTimer.current !== null) {
        clearTimeout(finalAudioTimer.current);
        finalAudioTimer.current = null;
      }
    } catch {}
  };

  const scheduleFinalAudioFallback = (ms = 1200) => {
    clearFinalAudioTimer();
    finalAudioTimer.current = setTimeout(() => {
      if (finalAudioPending.current) {
        finalAudioPending.current = false;
        setStatus("Agent finished speaking. Your turn.");
        setTurn("user");
        isMicActive.current = true;
      }
      finalAudioTimer.current = null;
    }, ms) as unknown as number;
  };

  const cleanupAudio = async () => {
    clearFinalAudioTimer();
    await stopNativeRingtone();
    isMicActive.current = false;

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
      if (pcmPlayer.current) {
        try {
          if (typeof pcmPlayer.current.stop === "function")
            await pcmPlayer.current.stop();
          pcmPlayer.current = null;
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

  // Convert PCM16 (little-endian) ArrayBuffer -> Float32 ArrayBuffer (normalized [-1,1])
  const convertInt16ToFloat32Buffer = (ab: ArrayBuffer): ArrayBuffer => {
    // create Int16 view
    const int16 = new Int16Array(ab);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768; // normalize
    }
    return float32.buffer;
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
          const errorMessage = "Mic streaming module failed to load.";
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
            isMicActive.current &&
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

      // initialize worklet
      try {
        (playback.port as any).postMessage({
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
          // optional logging
        } else if (d.cmd === "final_done") {
          // optional logging + fallback handling maybe in other patch
        }
      };

      // If we have pending chunks (Float32 buffers), deliver them now
      if (pendingChunks.current.length > 0) {
        const snapshot = pendingChunks.current.slice();
        for (const floatAb of snapshot) {
          try {
            (playback.port as any).postMessage(
              { cmd: "chunk", buffer: floatAb },
              [floatAb]
            );
          } catch (e) {
            try {
              playback.port.postMessage({ cmd: "chunk", buffer: floatAb });
            } catch {}
          }
        }
        pendingChunks.current = [];
      }

      resamplerPortOnMessageHandler.current = (ev) => {
        const pcmArrayBuffer = ev.data as ArrayBuffer;
        const ab = pcmArrayBuffer.slice(0);

        if (
          isMicActive.current &&
          ws.current &&
          ws.current.readyState === WebSocket.OPEN
        ) {
          try {
            // send raw 16-bit to server (server likely expects 16-bit)
            ws.current.send(ab);
          } catch (e) {
            outgoingMicBuffer.current.push(ab);
            if (outgoingMicBuffer.current.length > MAX_OUTGOING_CHUNKS)
              outgoingMicBuffer.current.shift();
          }
        } else if (!isMicActive.current) {
          // discard while AEC runs
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

      console.log("Web worklets started");
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

      if (Platform.OS === "ios" || Platform.OS === "android") {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          interruptionModeIOS: InterruptionModeIOS.DoNotMix,
          interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        });
      }
    } catch (e) {
      console.error("Failed to set audio mode:", e);
      setStatus("Audio setup failed.");
      return;
    }

    if (Platform.OS === "web") startRingTone();
    else {
      startNativeRingtone();
      if (PCMPlayer && typeof PCMPlayer !== "string") {
        try {
          if (pcmPlayer.current) {
            if (typeof pcmPlayer.current.stop === "function")
              await pcmPlayer.current.stop();
          }
          pcmPlayer.current = PCMPlayer;
          if (typeof pcmPlayer.current.start === "function") {
            await pcmPlayer.current.start(sampleRate);
          } else {
            setStatus("Player init failed.");
            return;
          }
        } catch (e) {
          console.error("Failed to start PCMPlayer:", e);
          pcmPlayer.current = null;
          setStatus("Player init failed.");
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
      ws.current?.send(JSON.stringify({ type: "join", userId }));
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
      (playbackNode.current?.port as any)?.postMessage({
        cmd: "flushImmediate",
      });
    } catch {}
    clearFinalAudioTimer();
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

  // IMPORTANT: convert incoming server audio (likely Int16 PCM) -> Float32 ArrayBuffer
  const handleAudioChunkFromServer = async (data: any) => {
    if (Platform.OS === "web") {
      const pcmBuffer =
        typeof data === "string" ? base64ToArrayBuffer(data) : data;
      // convert Int16 -> Float32 normalized
      let float32Buffer: ArrayBuffer;
      try {
        float32Buffer = convertInt16ToFloat32Buffer(pcmBuffer);
      } catch (e) {
        // if conversion fails, fall back to sending raw buffer (less likely to work)
        console.warn(
          "PCM16->Float32 conversion failed, sending raw buffer as fallback:",
          e
        );
        float32Buffer = pcmBuffer.slice(0);
      }

      if (playbackNode.current) {
        try {
          (playbackNode.current.port as any).postMessage(
            { cmd: "chunk", buffer: float32Buffer },
            [float32Buffer]
          );
        } catch (e) {
          try {
            playbackNode.current.port.postMessage({
              cmd: "chunk",
              buffer: float32Buffer,
            });
          } catch (err) {
            console.warn("deliver chunk failed", err);
          }
        }
      } else {
        // store ready-to-post Float32 buffers in pendingChunks
        pendingChunks.current.push(float32Buffer);
      }
    } else {
      // Native playback: PCMPlayer likely expects Base64 of Int16 — keep previous behavior
      if (!pcmPlayer.current) {
        console.error("PCM player not initialized, skipping chunk.");
        return;
      }
      let base64Chunk: string;
      if (typeof data === "string") base64Chunk = data;
      else {
        console.error("Unknown native audio format");
        return;
      }
      if (typeof pcmPlayer.current.enqueueBase64 === "function")
        pcmPlayer.current.enqueueBase64(base64Chunk);
    }
  };

  const handleControlMessage = (data: any) => {
    switch (data.type) {
      case "deepgram_ready":
        setStatus("Deepgram ready. Start speaking!");
        setTurn("user");
        isMicActive.current = true;
        break;
      case "turn":
        if (data.turn === "agent") {
          stopRingTone();
          setTurn("agent");
          setStatus("Agent is speaking...");
          isMicActive.current = false;
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
        ttsStreamEnded.current = false;
        isMicActive.current = false;
        handleAudioChunkFromServer(data.data);
        break;
      case "audio_end":
        setTimeout(() => {
          setStatus("Agent finished speaking. Your turn.");
          setTurn("user");
          ttsStreamEnded.current = false;
          isMicActive.current = true;
        }, 300);
        break;
      case "interrupted":
        try {
          (playbackNode.current?.port as any)?.postMessage({
            cmd: "flushImmediate",
          });
        } catch {}
        stopRingTone();
        setTurn("user");
        setStatus("You can now speak. (Interrupted)");
        isMicActive.current = true;
        break;
      default:
        break;
    }
  };

  // Headset indicator (unchanged)
  const HeadsetStatusIndicator = () => {
    if (Platform.OS === "web") return null;
    const icon = headsetConnected ? "🎧" : "🔇";
    const text = headsetConnected ? "Headset Connected" : "No Headset";
    const color = headsetConnected ? "#10b981" : "#f87171";
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

export default CallingWidget;

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
