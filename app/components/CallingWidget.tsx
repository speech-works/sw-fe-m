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
 * CallingWidget (React Native)
 *
 * FIXES IMPLEMENTED:
 * 1. Continuous Mic Stream: Mic runs constantly for instant interruption.
 * 2. Data Throttling: isMicActive flag controls sending mic data (prevents echo loopback).
 * 3. Earpiece/Receiver Route: Audio mode aggressively configured for VOIP to favor the earpiece.
 */
console.log("InputAudioStream", { InputAudioStream });

type Props = {
  websocketUrl: string;
  userId?: string;
  sampleRate?: number;
  onCallStart?: () => void;
  onCallEnd?: () => void;
  ringtoneAsset?: number; // use like: require('../assets/ringtone.mp3')
  ringtoneUri?: string; // or a remote URL
};
const DEFAULT_SAMPLE_RATE = 24000;

// ====================================================================
// Web AudioWorklet Code (Unchanged)
// ====================================================================
// (RESAMPLER_WORKLET_CODE and PLAYBACK_WORKLET_CODE remain as provided)
const RESAMPLER_WORKLET_CODE = `
class ResamplerProcessor extends AudioWorkletProcessor {
constructor() {
super();
}
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
// NOTE: Resampling from hardware sample rate (e.g. 44100) down to target sample rate (e.g. 24000)
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
this.readPos = 0;
this.writePos = 0;
this.samplesQueued = 0;
this.initialThreshold = Math.floor(0.12 * sampleRate);
this.fadeSamples = Math.max(1, Math.floor(0.008 * sampleRate));
this.silenceToPlaybackRamp = 0;
this.initialized = false;
this._previouslyHadSamples = false;
this.port.onmessage = (e) => {
  const msg = e.data;
  if (!msg) return;
  if (msg.cmd === "init") {
    if (msg.thresholdSamples) this.initialThreshold = msg.thresholdSamples;
    if (msg.fadeSamples) this.fadeSamples = msg.fadeSamples;
    this.initialized = true;
    return;
  }
  if (msg.cmd === "chunk" && msg.buffer) {
    const arr = new Float32Array(msg.buffer);
    this._pushToRing(arr);
  }
  if (msg.cmd === "flushImmediate") {
    this.readPos = 0;
    this.writePos = 0;
    this.samplesQueued = 0;
    this.silenceToPlaybackRamp = 0;
    this.port.postMessage({ cmd: "drain" });
  }
  if (msg.cmd === "flush") {
    this.readPos = 0;
    this.writePos = 0;
    this.samplesQueued = 0;
    this.silenceToPlaybackRamp = 0;
  }
  if (msg.cmd === "check_drain_status") {
    this.port.postMessage({ cmd: "drain_status", isDrained: this.samplesQueued === 0 });
  }
};
}
_ensureCapacity(additional) {
if (this.samplesQueued + additional <= this.capacity) return;
let newCap = this.capacity;
while (newCap < this.samplesQueued + additional) newCap *= 2;
const newBuf = new Float32Array(newCap);
if (this.samplesQueued > 0) {
if (this.readPos < this.writePos) {
newBuf.set(this.buffer.subarray(this.readPos, this.writePos), 0);
} else {
const first = this.buffer.subarray(this.readPos, this.capacity);
const second = this.buffer.subarray(0, this.writePos);
newBuf.set(first, 0);
newBuf.set(second, first.length);
}
}
this.buffer = newBuf;
this.capacity = newCap;
this.readPos = 0;
this.writePos = this.samplesQueued;
}
_pushToRing(arr) {
const len = arr.length;
this._ensureCapacity(len);
if (this.writePos + len <= this.capacity) {
this.buffer.set(arr, this.writePos);
this.writePos = (this.writePos + len) % this.capacity;
} else {
const firstLen = this.capacity - this.writePos;
this.buffer.set(arr.subarray(0, firstLen), this.writePos);
const remaining = len - firstLen;
this.buffer.set(arr.subarray(firstLen), 0);
this.writePos = remaining;
}
this.samplesQueued += len;
if (!this._previouslyHadSamples && this.samplesQueued > 0) {
this.silenceToPlaybackRamp = 0;
this._previouslyHadSamples = true;
}
}
_readSample() {
if (this.samplesQueued === 0) return null;
const s = this.buffer[this.readPos];
this.readPos = (this.readPos + 1) % this.capacity;
this.samplesQueued--;
return s;
}
process(inputs, outputs) {
const out = outputs[0];
if (!out || out.length === 0) return true;
const channel = out[0];
if (!this.initialized || this.samplesQueued < this.initialThreshold) {
  for (let i = 0; i < channel.length; i++) channel[i] = 0;
  if (this.samplesQueued === 0 && this._previouslyHadSamples) {
    this._previouslyHadSamples = false;
    this.port.postMessage({ cmd: "drain" });
  }
  return true;
}
for (let i = 0; i < channel.length; i++) {
  const s = this._readSample();
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
if (this.samplesQueued === 0 && this._previouslyHadSamples) {
  this._previouslyHadSamples = false;
  this.port.postMessage({ cmd: "drain" });
} else if (this.samplesQueued > 0) {
  this._previouslyHadSamples = true;
}
return true;
}
}
registerProcessor("playback-processor", PlaybackProcessor);
`;
// ====================================================================
// Main React Component
// ====================================================================
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
  const [status, setStatus] = useState("Click to start call");
  const [turn, setTurn] = useState<"user" | "agent" | null>(null);
  const ws = useRef<WebSocket | null>(null);

  // Web Audio Refs
  const audioContext = useRef<AudioContext | null>(null);
  const resamplerNode = useRef<AudioWorkletNode | null>(null);
  const playbackNode = useRef<AudioWorkletNode | null>(null);

  // NATIVE AUDIO REFS
  const micStream = useRef<InputAudioStream | null>(null);
  const pcmPlayer = useRef<any | null>(null);

  // --- CRITICAL FIX REFS ---
  const isMicActive = useRef(false); // Controls when to send mic data
  // --- END CRITICAL FIX REFS ---

  const outgoingMicBuffer = useRef<ArrayBuffer[]>([]);
  const MAX_OUTGOING_CHUNKS = 300;
  const resamplerPortOnMessageHandler = useRef<
    ((ev: MessageEvent) => void) | null
  >(null);
  const pendingChunks = useRef<ArrayBuffer[]>([]);
  const ttsStreamEnded = useRef(false);
  const JITTER_BUFFER_MS = 120;
  const FADE_MS = 8;

  // Ringtone Refs (Web)
  const ringIntervalRef = useRef<number | null>(null);
  const ringAudioCtxRef = useRef<AudioContext | null>(null);
  const ringOscillatorsRef = useRef<OscillatorNode[]>([]);
  const ringGainRef = useRef<GainNode | null>(null);

  // Ringtone Refs (Native)
  const nativeRingtoneRef = useRef<Audio.Sound | null>(null);
  const nativeRingtoneLoading = useRef(false);

  const checkHeadsetConnected = async (): Promise<boolean> => {
    // Platform.OS === 'web' will not have DeviceInfo, so we can skip the check or return true
    if (Platform.OS === "web") return true;

    try {
      const isConnected = await DeviceInfo.isHeadphonesConnected();
      console.log("Headset Connected Check:", isConnected);
      return isConnected;
    } catch (e) {
      console.error("Error checking headset connection:", e);
      // Fallback to true if the check fails to avoid blocking the call entirely
      return true;
    }
  };

  const cleanupAudio = async () => {
    await stopNativeRingtone();

    // Reset Mic Active Flag
    isMicActive.current = false;

    if (Platform.OS === "ios" || Platform.OS === "android") {
      if (micStream.current) {
        try {
          if (typeof micStream.current.destroy === "function") {
            micStream.current.destroy();
          }
          micStream.current = null;
        } catch (e) {
          console.warn("Failed to destroy micStream:", e);
        }
      }
      if (pcmPlayer.current) {
        try {
          if (typeof pcmPlayer.current.stop === "function") {
            await pcmPlayer.current.stop();
          }
          pcmPlayer.current = null;
        } catch (e) {
          console.warn("Failed to stop pcmPlayer:", e);
        }
      }
    } else {
      // Web AudioWorklet Logic
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
    // Clean up audio mode to return to default. This is important!
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true, // safe default
        interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      });
    } catch (e) {
      console.warn("Failed to reset audio mode:", e);
    }
  };

  useEffect(() => {
    console.log("CallingWidget mounted. Platform:", Platform.OS);
    return () => {
      try {
        ws.current?.close();
      } catch {}
      stopRingTone();
      cleanupAudio();
    };
  }, []);

  // --- Ringtone Functions (Unchanged) ---
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
        console.warn(
          "No native ringtone asset or uri provided. Pass ringtoneAsset or ringtoneUri."
        );
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
  // --- End Ringtone Functions ---

  const startAudioCapture = async () => {
    console.log("startAudioCapture called (Continuous Stream Setup)");
    if (Platform.OS === "ios" || Platform.OS === "android") {
      try {
        const { granted } = await Audio.requestPermissionsAsync();
        if (!granted) {
          setStatus("Microphone permission denied.");
          return;
        }

        if (typeof InputAudioStream === "undefined" || !InputAudioStream) {
          const errorMessage =
            "Microphone streaming module (@dr.pogodin/react-native-audio) failed to load. Check native linking.";
          console.error(`❌ ${errorMessage}`);
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
          Math.max(1024, Math.floor(sampleRate * 0.04)), // 40ms chunk size
          true // stopInBackground
        );
        console.log("InputAudioStream instance created:", stream);
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
        console.log("Chunk listener added to InputAudioStream");

        const startedStream = await stream.start();
        console.log("InputAudioStream started", startedStream);
        micStream.current = stream;
        console.log(
          "✅ Native microphone capture stream started (Continuous)."
        );
      } catch (error) {
        console.error(
          "❌ Failed to start native audio capture components:",
          error
        );
        setStatus("Mic error: " + (error as Error).message);
      }
    } else {
      // (Web AudioWorklet Logic - Unchanged)
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

      const thresholdSamples = Math.ceil(
        (JITTER_BUFFER_MS / 1000) * ctx.sampleRate
      );
      const fadeSamples = Math.max(
        1,
        Math.floor((FADE_MS / 1000) * ctx.sampleRate)
      );
      playback.port.postMessage({ cmd: "init", thresholdSamples, fadeSamples });
      playback.port.onmessage = (ev) => {};

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
          isMicActive.current &&
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
          // Discard data
        } else {
          // WS not open, buffer it
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

      console.log("✅ Web AudioWorklets started (Continuous).");
    }
  };

  const startCall = async () => {
    console.log("Start call button clicked. Status: Preparing audio...");
    setStatus("Preparing audio...");

    if (Platform.OS !== "web") {
      const isHeadsetConnected = await checkHeadsetConnected();
      if (!isHeadsetConnected) {
        setStatus(
          "Please connect a wired or Bluetooth headset to start the call."
        );
        console.log("❌ Call blocked: No headset connected.");
        return; // STOP the call from starting
      }
    }

    // 🛠️ CRITICAL FIX: Set audio mode for two-way communication/VOIP (AEC + Earpiece Route)
    try {
      await Audio.setAudioModeAsync({
        // 1. Allows both recording (mic) and playback (speaker/earpiece)
        allowsRecordingIOS: true,
        // 2. Playback will happen even if the silent switch is on
        playsInSilentModeIOS: true,
        // 3. Stay active for a call
        staysActiveInBackground: true,
        // 4. Use the exclusive communication mode (best for AEC and Earpiece route)
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        // 5. Explicitly set speakerPhone: false to encourage earpiece route on iOS/Android
        // NOTE: This property does not exist directly in the Expo API, but the lack of an explicit `speakerPhone: true`
        // combined with the communication mode usually causes the OS to choose the earpiece.
        // If you were using bare React Native, you would call RNSoundModule.setCategory('PlayAndRecord', true).
        // For Expo, we rely on the above combination.
      });

      // Secondary call to potentially force the route without enabling the speakerphone
      if (Platform.OS === "ios" || Platform.OS === "android") {
        await Audio.setAudioModeAsync({
          // We ensure speakerphone is NOT explicitly forced here.
          // This is the best we can do with the current Expo API to favor the receiver/earpiece.
          allowsRecordingIOS: true,
          interruptionModeIOS: InterruptionModeIOS.DoNotMix,
          interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        });
      }

      console.log(
        "✅ Audio Mode set for VOIP/Communication (Earpiece route attempted)."
      );
    } catch (e) {
      console.error("❌ Failed to set audio mode for call routing:", e);
      setStatus("Audio setup failed.");
      return;
    }

    if (Platform.OS === "web") {
      startRingTone();
    } else {
      console.log(
        "Native platform detected. Starting native ringtone and PCM player."
      );
      startNativeRingtone();
      // NATIVE PCM PLAYER INITIALIZATION (Unchanged)
      if (PCMPlayer && typeof PCMPlayer !== "string") {
        try {
          if (pcmPlayer.current) {
            if (typeof pcmPlayer.current.stop === "function") {
              await pcmPlayer.current.stop();
            }
          }
          pcmPlayer.current = PCMPlayer;
          if (typeof pcmPlayer.current.start === "function") {
            await pcmPlayer.current.start(sampleRate);
            console.log(`✅ PCMPlayer started at ${sampleRate} Hz.`);
          } else {
            console.error("❌ PCMPlayer.start function not found.");
            setStatus("Player init failed.");
            return;
          }
        } catch (e) {
          console.error(
            "❌ Failed to start PCMPlayer. Check native linking.",
            e
          );
          pcmPlayer.current = null;
          setStatus("Player init failed.");
          return;
        }
      } else {
        console.error(
          "❌ react-native-pcm-player-lite module is not available."
        );
        setStatus("Player module missing.");
        return;
      }
    }

    // --- Start the continuous mic stream here, but keep sending DISABLED ---
    await startAudioCapture();
    isMicActive.current = false; // Initial state: Mic is streaming (for AEC), but not sending data.

    setStatus("Connecting to backend...");
    console.log(`Connecting to WebSocket at URL: ${websocketUrl}`);
    ws.current = new WebSocket(websocketUrl);
    ws.current.binaryType = "arraybuffer";

    ws.current.onopen = () => {
      console.log("WebSocket connection opened successfully.");
      console.log("Sending 'join' message to server.");
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
      console.log(
        "WebSocket connection closed. Code:",
        event.code,
        "Reason:",
        event.reason
      );
      setStatus("Disconnected");
      stopRingTone();
      setIsCalling(false);
      setTurn(null);
      onCallEnd?.();
      cleanupAudio();
    };
    ws.current.onerror = (err) => {
      console.error("WebSocket connection error:", err);
      setStatus("Connection error");
    };
  };

  const endCall = async () => {
    console.log("Ending call...");
    try {
      ws.current?.send(JSON.stringify({ type: "end_call" }));
    } catch {}
    try {
      ws.current?.close();
    } catch {}
    ws.current = null;
    stopRingTone();
    if (playbackNode.current) {
      playbackNode.current.port.postMessage({ cmd: "flushImmediate" });
    }
    await cleanupAudio();
    setIsCalling(false);
    setStatus("Call ended.");
    setTurn(null);
    onCallEnd?.();
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
        playbackNode.current.port.postMessage({ cmd: "chunk", buffer: ab }, [
          ab,
        ]);
      } else {
        pendingChunks.current.push(ab);
      }
    } else {
      if (!pcmPlayer.current) {
        console.error("PCM player not initialized, skipping chunk.");
        return;
      }
      let base64Chunk: string;
      if (typeof data === "string") {
        base64Chunk = data;
      } else {
        console.error(
          "Unknown audio data format received for native playback. Expected Base64 string."
        );
        return;
      }
      if (typeof pcmPlayer.current.enqueueBase64 === "function") {
        pcmPlayer.current.enqueueBase64(base64Chunk);
      }
    }
  };

  const handleControlMessage = (data: any) => {
    console.log("Control message received:", data.type);
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
        if (playbackNode.current)
          playbackNode.current.port.postMessage({ cmd: "flushImmediate" });
        stopRingTone();
        setTurn("user");
        setStatus("You can now speak. (Interrupted)");
        isMicActive.current = true;
        break;
      default:
        break;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Calling Widget</Text>
      <Text style={styles.status}>{status}</Text>
      {isCalling ? (
        <TouchableOpacity style={styles.endCallButton} onPress={endCall}>
          <Text style={styles.buttonText}>End Call</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.startCallButton} onPress={startCall}>
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
// ... (StyleSheet.create remains unchanged)
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
  title: {
    marginBottom: 8,
    fontWeight: "bold",
    fontSize: 20,
  },
  status: {
    marginBottom: 12,
    color: "#666",
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
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
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
