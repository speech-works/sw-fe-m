import React, { useEffect, useRef, useState } from "react";
import {
  Animated, // <-- IMPORTED
  Easing, // <-- IMPORTED
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
// Import icons
import Icon from "react-native-vector-icons/Feather"; // For UI Controls
import FAIcon from "react-native-vector-icons/FontAwesome5"; // For Scenario Icon (compatibility)

// These imports are correct for a React Native environment (Expo)
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";
import { LinearGradient } from "expo-linear-gradient"; // <-- IMPORTED
// These imports are correct for a React Native environment (Native Modules)
import {
  AUDIO_FORMATS,
  AUDIO_SOURCES,
  CHANNEL_CONFIGS,
  InputAudioStream,
} from "@dr.pogodin/react-native-audio";
import DeviceInfo from "react-native-device-info";

import * as SecureStore from "expo-secure-store";
import * as Localization from "expo-localization";
import {
  GestureHandlerRootView,
  PanGestureHandler,
} from "react-native-gesture-handler";
import { API_BASE_URL } from "../api/constants";
import { SECURE_KEYS_NAME } from "../constants/secureStorageKeys";
import { theme } from "../Theme/tokens";
import { isHeadsetConnected } from "../util/functions/headset";

type CallExitPayload = {
  reason: string | null;
  shouldComplete: boolean;
};

type CallEndAcknowledgementPayload = {
  reason: string | null;
};

type CallPlaybackState =
  | "connecting"
  | "user_listening"
  | "agent_preparing"
  | "agent_playing"
  | "interrupting"
  | "ending"
  | "technical_difficulty";

type Props = {
  websocketUrl: string;
  userId?: string;
  sampleRate?: number;
  onCallStart?: () => Promise<string | null>;
  onCallEnd?: (payload: CallExitPayload) => void | Promise<void>;
  onCallEndAcknowledged?: (
    payload: CallEndAcknowledgementPayload,
  ) => void | Promise<void>;
  ringtoneAsset?: number;
  ringtoneUri?: string;
  scenarioId?: string;
  agentName: string;
  agentDesignation: string;
  scenarioIcon: string;
  practiceActivityId?: string; // <-- ADDED
};
const DEFAULT_SAMPLE_RATE = 24000;
const CALL_DEBUG_LOGS_ENABLED = __DEV__;

const callDebugLog = (...args: unknown[]) => {
  if (CALL_DEBUG_LOGS_ENABLED) {
    console.log(...args);
  }
};

const shouldRewriteStreamOrigin = (hostname: string) =>
  hostname === "localhost" ||
  hostname === "127.0.0.1" ||
  /^10\./.test(hostname) ||
  /^192\.168\./.test(hostname);

const normalizePlayableStreamUrl = (rawUrl: string) => {
  if (!API_BASE_URL) {
    return rawUrl;
  }

  try {
    const streamUrl = new URL(rawUrl);
    const apiUrl = new URL(API_BASE_URL);

    if (__DEV__ && shouldRewriteStreamOrigin(streamUrl.hostname)) {
      streamUrl.protocol = apiUrl.protocol;
      streamUrl.host = apiUrl.host;
      return streamUrl.toString();
    }
  } catch (error) {
    console.warn("[Audio] Failed to normalize stream URL:", error);
  }

  return rawUrl;
};

// Buffer / pacing constants
const JITTER_BUFFER_MS = 300;
const MAX_BUFFER_MS = 400;
const FADE_MS = 12;
const WS_CONNECT_TIMEOUT_MS = 12000;
const CALL_READY_TIMEOUT_MS = 15000;
const AUDIO_START_TIMEOUT_MS = 12000;
const THINKING_LABEL_DELAY_MS = 350;
const MISSED_SPEECH_WATCHDOG_MS = 2600;
const LOCAL_SPEECH_COOLDOWN_MS = 650;
const LOCAL_SPEECH_RMS_THRESHOLD = 0.018;
const POST_PLAYBACK_READY_DELAY_MS = 120;

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

// Helper function to format seconds into MM:SS

const CallingWidget: React.FC<Props> = ({
  websocketUrl,
  userId = "anonymous",
  sampleRate = DEFAULT_SAMPLE_RATE,
  onCallStart,
  onCallEnd,
  onCallEndAcknowledged,
  ringtoneAsset,
  ringtoneUri,
  scenarioId,
  scenarioIcon,
  practiceActivityId, // <-- ADDED
}) => {
  const [isCalling, setIsCalling] = useState(false);
  const [status, setStatus] = useState("Connecting..."); // Changed initial status
  const [, setTurn] = useState<"user" | "agent" | null>(null);
  const [callPlaybackState, setCallPlaybackState] =
    useState<CallPlaybackState>("connecting");
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [headsetConnected, setHeadsetConnected] = useState(
    Platform.OS === "web" ? true : false,
  );
  const [showHeadsetPrompt, setShowHeadsetPrompt] = useState(false);

  // --- NEW UI STATE ---
  const [isMuted, setIsMuted] = useState(false);
  const [showTips, setShowTips] = useState(false);
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
  const [, setIsAgentAudioPlaying] = useState(false);
  const [isCallEndAckInProgress, setIsCallEndAckInProgress] = useState(false);
  const [missedSpeechCueVisible, setMissedSpeechCueVisible] = useState(false);
  const [missedSpeechCueCount, setMissedSpeechCueCount] = useState(0);
  // --- ⬆️ END NEW UI STATE ⬆️ ---

  const ws = useRef<WebSocket | null>(null);
  const componentMountedRef = useRef(true);
  const callPlaybackStateRef = useRef<CallPlaybackState>("connecting");

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
  // --- ⬇️ ADDED: Ref to track current tips visibility for listener ⬇️ ---
  const showTipsRef = useRef(showTips);
  const idleCountdownRef = useRef<NodeJS.Timeout | null>(null);
  const callEndReasonRef = useRef<string | null>(null);
  const callReadyRef = useRef(false);
  const wsConnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const callReadyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const audioStartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const thinkingLabelTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const missedSpeechTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const postPlaybackReadyTimeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);
  const agentAudioStartedRef = useRef(false);
  const currentPlaybackJobIdRef = useRef<string | null>(null);
  const currentPlaybackResponseIdRef = useRef<string | null>(null);
  const currentPlaybackDurationMsRef = useRef<number | null>(null);
  const currentPlaybackStartedAtMsRef = useRef<number | null>(null);
  const playbackStartedAckSentRef = useRef(false);
  const voiceCallV1EnabledRef = useRef(true);
  const agentPreparingStartedAtRef = useRef<number | null>(null);
  const thinkingVisibleAtRef = useRef<number | null>(null);
  const lastLocalSpeechAtRef = useRef(0);
  const lastPlaybackCompletedAtRef = useRef<number | null>(null);
  // --- ⬆️ END NEW REFS ⬆️ ---

  // (awaitPlaybackWorkletDrain function is unchanged)

  // (isPlaybackSuccess function is unchanged)

  // (checkHeadsetConnected function is unchanged)
  const checkHeadsetConnected = async (): Promise<boolean> => {
    return isHeadsetConnected();
  };

  useEffect(() => {
    componentMountedRef.current = true;
    return () => {
      componentMountedRef.current = false;
    };
  }, []);

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

  const clearTimerRef = (
    ref: React.MutableRefObject<ReturnType<typeof setTimeout> | null>,
  ) => {
    if (ref.current) {
      clearTimeout(ref.current);
      ref.current = null;
    }
  };

  const clearCallSafetyTimeouts = () => {
    clearTimerRef(wsConnectTimeoutRef);
    clearTimerRef(callReadyTimeoutRef);
    clearTimerRef(audioStartTimeoutRef);
  };

  const sendClientTrace = (stage: string, details: Record<string, unknown>) => {
    if (ws.current?.readyState !== WebSocket.OPEN) {
      return;
    }

    ws.current.send(
      JSON.stringify({
        type: "client_trace",
        stage,
        ...details,
      }),
    );
  };

  const clearMissedSpeechCue = (resetCount = false) => {
    clearTimerRef(missedSpeechTimeoutRef);
    setMissedSpeechCueVisible(false);
    if (resetCount) {
      setMissedSpeechCueCount(0);
    }
  };

  const markBackendSpeechProgress = () => {
    clearMissedSpeechCue();
  };

  const isMicCaptureReady = () =>
    audioState.current === "STARTED" &&
    !isMutedRef.current &&
    (Platform.OS === "web" || micStream.current !== null);

  const calculatePcmRms = (buffer: ArrayBuffer) => {
    const totalSamples = Math.floor(buffer.byteLength / 2);
    if (totalSamples <= 0) {
      return 0;
    }

    const view = new DataView(buffer);
    const sampleBudget = Math.min(400, totalSamples);
    const stride = Math.max(1, Math.floor(totalSamples / sampleBudget));
    let sumSquares = 0;
    let count = 0;

    for (let sampleIndex = 0; sampleIndex < totalSamples; sampleIndex += stride) {
      const sample = view.getInt16(sampleIndex * 2, true) / 32768;
      sumSquares += sample * sample;
      count += 1;
    }

    return count > 0 ? Math.sqrt(sumSquares / count) : 0;
  };

  const getPcmArrayBufferFromChunk = (chunk: unknown) => {
    if (typeof chunk === "string") {
      return base64ToArrayBuffer(chunk);
    }

    if (chunk instanceof ArrayBuffer) {
      return chunk;
    }

    const maybeView = chunk as ArrayBufferView | null;
    if (
      maybeView &&
      maybeView.buffer instanceof ArrayBuffer &&
      typeof maybeView.byteOffset === "number" &&
      typeof maybeView.byteLength === "number"
    ) {
      return maybeView.buffer.slice(
        maybeView.byteOffset,
        maybeView.byteOffset + maybeView.byteLength,
      );
    }

    return null;
  };

  const scheduleMissedSpeechWatchdog = (speechAt: number) => {
    clearTimerRef(missedSpeechTimeoutRef);
    missedSpeechTimeoutRef.current = setTimeout(() => {
      missedSpeechTimeoutRef.current = null;
      if (
        isStopping.current ||
        callPlaybackStateRef.current !== "user_listening" ||
        lastLocalSpeechAtRef.current !== speechAt
      ) {
        return;
      }

      setMissedSpeechCueVisible(true);
      setMissedSpeechCueCount((count) => count + 1);
    }, MISSED_SPEECH_WATCHDOG_MS);
  };

  const markLocalSpeechDetected = (source: "web" | "native") => {
    if (
      isStopping.current ||
      isMutedRef.current ||
      callPlaybackStateRef.current !== "user_listening"
    ) {
      return;
    }

    const now = Date.now();
    if (now - lastLocalSpeechAtRef.current < LOCAL_SPEECH_COOLDOWN_MS) {
      return;
    }

    lastLocalSpeechAtRef.current = now;
    setMissedSpeechCueVisible(false);
    scheduleMissedSpeechWatchdog(now);

    const playbackCompletedAt = lastPlaybackCompletedAtRef.current;
    if (playbackCompletedAt && now - playbackCompletedAt < 1800) {
      sendClientTrace("post_playback_speech_detected", {
        source,
        msAfterPlaybackComplete: now - playbackCompletedAt,
      });
    }
  };

  const detectLocalSpeechFromPcm = (
    buffer: ArrayBuffer,
    source: "web" | "native",
  ) => {
    if (callPlaybackStateRef.current !== "user_listening") {
      return;
    }

    const rms = calculatePcmRms(buffer);
    if (rms >= LOCAL_SPEECH_RMS_THRESHOLD) {
      markLocalSpeechDetected(source);
    }
  };

  const transitionToUserReadyAfterPlayback = (
    playbackCompletedAt: number,
    attempt = 0,
  ) => {
    lastPlaybackCompletedAtRef.current = playbackCompletedAt;
    clearTimerRef(postPlaybackReadyTimeoutRef);
    isMicActive.current = true;

    postPlaybackReadyTimeoutRef.current = setTimeout(() => {
      postPlaybackReadyTimeoutRef.current = null;
      if (isStopping.current) {
        return;
      }

      if (!isMicCaptureReady() && attempt < 5) {
        transitionToUserReadyAfterPlayback(playbackCompletedAt, attempt + 1);
        return;
      }

      const playbackCompleteToUserReadyMs = Date.now() - playbackCompletedAt;
      syncUserListeningState();
      sendClientTrace("playback_complete_to_user_ready", {
        playbackCompleteToUserReadyMs,
        micCaptureReady: isMicCaptureReady(),
      });
    }, POST_PLAYBACK_READY_DELAY_MS);
  };

  const scheduleWsConnectTimeout = () => {
    clearTimerRef(wsConnectTimeoutRef);
    wsConnectTimeoutRef.current = setTimeout(() => {
      if (
        isStopping.current ||
        audioState.current !== "STARTED" ||
        ws.current?.readyState !== WebSocket.CONNECTING
      ) {
        return;
      }

      console.error("[WS] Timed out while opening call socket.");
      setStatus("Connection timed out");
      endCall();
    }, WS_CONNECT_TIMEOUT_MS);
  };

  const scheduleCallReadyTimeout = () => {
    clearTimerRef(callReadyTimeoutRef);
    callReadyTimeoutRef.current = setTimeout(() => {
      if (isStopping.current || callReadyRef.current) {
        return;
      }

      console.error("[Call] Timed out waiting for AI session readiness.");
      setStatus("AI setup timed out");
      endCall();
    }, CALL_READY_TIMEOUT_MS);
  };

  const clearCallReadyTimeout = () => {
    clearTimerRef(callReadyTimeoutRef);
  };

  const scheduleAudioStartTimeout = (sequence: number) => {
    clearTimerRef(audioStartTimeoutRef);
    audioStartTimeoutRef.current = setTimeout(() => {
      if (
        isStopping.current ||
        sequence !== playSeq.current ||
        hasStartedPlaying.current
      ) {
        return;
      }

      console.error("[Audio] Timed out waiting for agent playback to start.");
      setStatus("Audio failed to start");
      endCall();
    }, AUDIO_START_TIMEOUT_MS);
  };

  const clearAudioStartTimeout = () => {
    clearTimerRef(audioStartTimeoutRef);
  };

  const resetThinkingTelemetry = () => {
    clearTimerRef(thinkingLabelTimeoutRef);
    agentPreparingStartedAtRef.current = null;
    thinkingVisibleAtRef.current = null;
  };

  const scheduleThinkingLabel = () => {
    clearTimerRef(thinkingLabelTimeoutRef);
    if (!agentPreparingStartedAtRef.current) {
      return;
    }

    thinkingLabelTimeoutRef.current = setTimeout(() => {
      thinkingLabelTimeoutRef.current = null;
      if (
        isStopping.current ||
        callPlaybackStateRef.current !== "agent_preparing" ||
        hasStartedPlaying.current
      ) {
        return;
      }

      thinkingVisibleAtRef.current = Date.now();
      setStatus("Thinking...");
    }, THINKING_LABEL_DELAY_MS);
  };

  const syncCallPlaybackState = (
    nextState: CallPlaybackState,
    nextStatus?: string,
  ) => {
    const previousState = callPlaybackStateRef.current;
    callPlaybackStateRef.current = nextState;
    setCallPlaybackState(nextState);
    switch (nextState) {
      case "user_listening":
        resetThinkingTelemetry();
        setIsAgentAudioPlaying(false);
        setTurn("user");
        setStatus(nextStatus ?? "");
        break;
      case "agent_preparing":
        clearMissedSpeechCue();
        setIsAgentAudioPlaying(false);
        setTurn("agent");
        if (previousState !== "agent_preparing") {
          agentPreparingStartedAtRef.current = Date.now();
          thinkingVisibleAtRef.current = null;
          scheduleThinkingLabel();
        }
        if (nextStatus) {
          setStatus(nextStatus);
        }
        break;
      case "agent_playing":
        clearMissedSpeechCue();
        clearTimerRef(thinkingLabelTimeoutRef);
        setIsAgentAudioPlaying(true);
        setTurn("agent");
        setStatus(nextStatus ?? "Agent is speaking...");
        break;
      case "interrupting":
        resetThinkingTelemetry();
        setIsAgentAudioPlaying(false);
        setTurn("user");
        setStatus(nextStatus ?? "");
        break;
      case "ending":
        resetThinkingTelemetry();
        setIsAgentAudioPlaying(false);
        setTurn(null);
        setStatus(nextStatus ?? "Ending call...");
        break;
      case "technical_difficulty":
        resetThinkingTelemetry();
        setIsAgentAudioPlaying(false);
        setTurn(null);
        setStatus(nextStatus ?? "Technical difficulty");
        break;
      case "connecting":
      default:
        resetThinkingTelemetry();
        setIsAgentAudioPlaying(false);
        setTurn(null);
        setStatus(nextStatus ?? "Connecting...");
        break;
    }
  };

  const syncUserListeningState = (nextStatus = "") => {
    syncCallPlaybackState("user_listening", nextStatus);
  };

  const syncAgentPreparingState = (nextStatus?: string) => {
    syncCallPlaybackState("agent_preparing", nextStatus);
  };

  const syncAgentSpeakingState = (nextStatus = "Agent is speaking...") => {
    syncCallPlaybackState("agent_playing", nextStatus);
  };

  const dismissIdleWarning = () => {
    if (!idleWarningVisible) {
      return;
    }

    setIdleWarningVisible(false);
    setIdleCountdown(null);
    if (idleCountdownRef.current) {
      clearInterval(idleCountdownRef.current);
      idleCountdownRef.current = null;
    }
  };

  const resetPlaybackLifecycleRefs = (clearPlaybackIds = true) => {
    currentPlaybackDurationMsRef.current = null;
    currentPlaybackStartedAtMsRef.current = null;
    playbackStartedAckSentRef.current = false;
    if (clearPlaybackIds) {
      currentPlaybackJobIdRef.current = null;
      currentPlaybackResponseIdRef.current = null;
    }
  };

  const getPlaybackProgressMs = (positionMillis?: number | null) => {
    if (typeof positionMillis === "number" && Number.isFinite(positionMillis)) {
      return positionMillis;
    }
    if (currentPlaybackStartedAtMsRef.current) {
      return Math.max(0, Date.now() - currentPlaybackStartedAtMsRef.current);
    }
    return 0;
  };

  const sendPlaybackLifecycleEvent = (
    type: "playback_started" | "playback_interrupted" | "playback_complete",
    extra: Record<string, unknown> = {},
  ) => {
    if (
      !voiceCallV1EnabledRef.current &&
      type !== "playback_complete"
    ) {
      return;
    }

    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      return;
    }

    const jobId = currentPlaybackJobIdRef.current;
    if (!jobId) {
      return;
    }

    try {
      ws.current.send(
        JSON.stringify({
          type,
          jobId,
          responseId: currentPlaybackResponseIdRef.current,
          durationMs: currentPlaybackDurationMsRef.current,
          ...extra,
        }),
      );
    } catch (error) {
      console.warn("[WS] Failed to send playback lifecycle event:", error);
    }
  };

  const acknowledgePlaybackStarted = async (
    playbackStatus?: {
      durationMillis?: number;
      positionMillis?: number;
    } | null,
  ) => {
    if (playbackStartedAckSentRef.current) {
      return;
    }

    if (
      typeof playbackStatus?.durationMillis === "number" &&
      Number.isFinite(playbackStatus.durationMillis)
    ) {
      currentPlaybackDurationMsRef.current = playbackStatus.durationMillis;
    }

    playbackStartedAckSentRef.current = true;
    currentPlaybackStartedAtMsRef.current = Date.now();
    agentAudioStartedRef.current = true;
    clearAudioStartTimeout();
    const thinkingVisible = thinkingVisibleAtRef.current !== null;
    const thinkingVisibleMs = thinkingVisible
      ? Math.max(0, Date.now() - thinkingVisibleAtRef.current!)
      : 0;
    syncAgentSpeakingState();
    sendPlaybackLifecycleEvent("playback_started", {
      startedAtClientMs: currentPlaybackStartedAtMsRef.current,
      thinkingVisible,
      thinkingVisibleMs,
    });
  };

  const sendPlaybackInterrupted = (reason: string, playedMs?: number | null) => {
    sendPlaybackLifecycleEvent("playback_interrupted", {
      reason,
      playedMs: getPlaybackProgressMs(playedMs ?? null),
    });
  };

  const sendPlaybackComplete = (playedMs?: number | null) => {
    sendPlaybackLifecycleEvent("playback_complete", {
      playedMs: getPlaybackProgressMs(playedMs ?? null),
    });
  };

  const cancelPendingAgentPlayback = (clearPlaybackIds = true) => {
    playSeq.current += 1;
    clearAudioStartTimeout();
    if (forcedStartTimeoutRef.current) {
      clearTimeout(forcedStartTimeoutRef.current);
      forcedStartTimeoutRef.current = null;
    }
    playLock.current = false;
    hasStartedPlaying.current = false;
    resetPlaybackLifecycleRefs(clearPlaybackIds);
    setIsAgentAudioPlaying(false);
  };

  // (cleanupAudio function is unchanged)
  const cleanupAudio = async () => {
    callId.current += 1; // Increment call ID to invalidate handlers
    isStopping.current = true; // Set stopping flag
    clearCallSafetyTimeouts();
    resetThinkingTelemetry();
    clearMissedSpeechCue(true);
    clearTimerRef(postPlaybackReadyTimeoutRef);
    await stopNativeRingtone(); // Stop ringtone if playing

    callDebugLog("Cleaning up audio state for new call...");
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
        callDebugLog("Destroying micStream on cleanup...");
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
      callDebugLog("[Audio] Cleaning up sound object via soundRef.");
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
        callDebugLog(
          "[Audio] Sound object unloaded successfully during cleanup.",
        );
      } catch (e) {
        console.warn("[Audio] Error unloading sound during cleanup:", e);
      }
    }

    // 3. Reset Locks and Refs
    playSeq.current += 1;
    playLock.current = false; // Reset lock on cleanup
    hasStartedPlaying.current = false;
    resetPlaybackLifecycleRefs();
    lastPlayedUrl.current = null;
    lastPlayTimestamp.current = 0;
    setIsAgentAudioPlaying(false);
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
      callDebugLog("[Audio Mode] Reset after call cleanup.");
    } catch (e) {
      console.warn("Failed to reset audio mode:", e);
    }
  };

  // --- ⬇️ MODIFIED: `useEffect` simplified ⬇️ ---
  useEffect(() => {
    callPlaybackStateRef.current = callPlaybackState;
  }, [callPlaybackState]);

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
          volume: 0.15, // Extremely subtle, modern ring volume
        });
      } else if (ringtoneUri) {
        await sound.loadAsync(
          { uri: ringtoneUri },
          { shouldPlay: true, isLooping: true, volume: 0.15 },
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

  // (startAudioCapture function is unchanged, already includes mute check)
  const startAudioCapture = async (): Promise<boolean> => {
    callDebugLog("Starting audio capture...");

    // --- Web Platform Logic ---
    if (Platform.OS === "web") {
      callDebugLog("Setting up Web Audio capture...");
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
            callDebugLog("playback worklet drained");
          } else if (d.cmd === "final_done") {
            callDebugLog("playback worklet final_done", d);
            if (finalFallbackId.current) {
              clearTimeout(finalFallbackId.current);
              finalFallbackId.current = null;
            }
            const playbackCompletedAt = Date.now();
            // Notify backend that playback finished naturally
            try {
              sendPlaybackComplete();
              resetPlaybackLifecycleRefs();
            } catch {}
            transitionToUserReadyAfterPlayback(playbackCompletedAt);
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
          detectLocalSpeechFromPcm(ab, "web");

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

        callDebugLog("Web Audio Worklets started successfully.");
        return true;
      } catch (error) {
        console.error("Failed to start web audio capture:", error);
        setStatus("Mic error: " + (error as Error).message);
        return false;
      }

      // --- Native Platform Logic ---
    } else {
      callDebugLog(
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
        callDebugLog("Mic permissions granted.");

        if (micStream.current) {
          callDebugLog("Destroying previous micStream instance...");
          try {
            micStream.current.destroy();
          } catch (e) {
            console.warn("Error destroying previous micStream:", e);
          }
          micStream.current = null;
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        callDebugLog(
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
          if (callPlaybackStateRef.current === "user_listening") {
            try {
              const pcmBuffer = getPcmArrayBufferFromChunk(chunkBase64);
              if (pcmBuffer) {
                detectLocalSpeechFromPcm(pcmBuffer, "native");
              }
            } catch (error) {
              console.warn("Failed to inspect native mic energy:", error);
            }
          }

          if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            try {
              ws.current.send(chunkBase64);
            } catch (sendError) {
              console.error("WebSocket send error:", sendError);
            }
          }
        });

        callDebugLog("Starting InputAudioStream...");
        await stream.start();
        micStream.current = stream;
        callDebugLog("Native mic stream (@dr.pogodin) started successfully.");
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

    if (!websocketUrl) {
      console.error("[Call] Missing websocketUrl for AI call.");
      setStatus("Call service unavailable");
      return;
    }

    if (Platform.OS !== "web") {
      // Check headset before allowing the call to begin.
      const connected = await updateHeadsetStatus(true);
      if (!connected) {
        callDebugLog(
          "[Headset] No headset connected — blocking AI call start.",
        );
        setStatus("PLEASE CONNECT YOUR HEADPHONES");
        return;
      }
    }

    callDebugLog("[State] Setting state to STARTING");
    audioState.current = "STARTING";

    callId.current += 1;
    isStopping.current = false;
    pendingChunks.current = [];
    outgoingMicBuffer.current = [];

    syncCallPlaybackState("connecting", "Preparing audio...");

    // --- NEW: Reset UI State ---
    setCallDuration(0); // Reset timer
    setIsMuted(false); // Ensure not muted
    isMutedRef.current = false;
    setSuggestedResponses([]); // <-- ADDED: Clear suggestions
    setShowNotificationDot(false); // <-- ADDED: Clear notification dot
    setIdleWarningVisible(false);
    setIdleCountdown(null);
    setCallEndReason(null);
    setIsCallEndAckInProgress(false);
    callEndReasonRef.current = null;
    callReadyRef.current = false;
    agentAudioStartedRef.current = false;
    setIsAgentAudioPlaying(false);
    setMaxTurns(null);
    clearCallSafetyTimeouts();
    clearMissedSpeechCue(true);
    clearTimerRef(postPlaybackReadyTimeoutRef);
    lastLocalSpeechAtRef.current = 0;
    lastPlaybackCompletedAtRef.current = null;
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
      callDebugLog("[Audio Mode] Set for active call.");
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

    callDebugLog("[startCall] Audio capture started successfully (or is web).");
    audioState.current = "STARTED";

    setStatus("Starting activity...");
    const startedId = await onCallStart?.();

    if (!startedId) {
      console.error(
        "[startCall] Failed to start activity (Stamina?). Aborting.",
      );
      setStatus("Failed to start activity");
      audioState.current = "IDLE";
      await cleanupAudio();
      return;
    }

    syncCallPlaybackState("connecting", "Connecting...");
    ws.current = new WebSocket(websocketUrl);
    ws.current.binaryType = "arraybuffer";
    scheduleWsConnectTimeout();

    ws.current.onopen = async () => {
      stopRingTone();
      clearTimerRef(wsConnectTimeoutRef);
      scheduleCallReadyTimeout();
      syncCallPlaybackState("connecting", "Connected to AI");
      setIsCalling(true);
      // onCallStart?.(); // REMOVED: Activity is started before WS connection

      // --- NEW: Start Timer ---
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      callTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
      // --- END NEW Timer ---

      const timezone = Localization.getCalendars()[0].timeZone || "UTC";
      const authToken = await SecureStore.getItemAsync(
        SECURE_KEYS_NAME.SW_APP_JWT_KEY,
      );

      ws.current?.send(
        JSON.stringify({
          type: "join",
          userId,
          practiceActivityId: startedId, // Use the ID returned from onCallStart
          clientTimezone: timezone,
          authToken,
        }),
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
            callDebugLog(`[WS MESSAGE REACHED FRONTEND] Type: ${parsed?.type}`);
            if (parsed.type === "agent_speaking") {
              syncAgentPreparingState();
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
      clearCallSafetyTimeouts();
      callDebugLog(`[WS] WebSocket closed: ${event.code} ${event.reason}`);
      if (!callReadyRef.current && event.reason) {
        const normalizedReason = event.reason.toLowerCase();
        if (
          normalizedReason.includes("unauthorized") ||
          normalizedReason.includes("forbidden")
        ) {
          setStatus("Please sign in again");
        } else if (normalizedReason.includes("validation")) {
          setStatus("Call validation failed");
        } else if (normalizedReason.includes("missing")) {
          setStatus("Call setup failed");
        }
      }
      // If the goodbye TTS is still loading or playing, defer cleanup to didJustFinish.
      // Check both soundRef (audio loaded & playing) and playLock (audio is loading via loadAsync).
      const isAudioActive = soundRef.current || playLock.current;
      if (callEndReasonRef.current && isAudioActive) {
        callDebugLog(
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
      clearCallSafetyTimeouts();
      console.error("WebSocket error:", err);
      // If goodbye audio is loading or playing, let it finish
      const isAudioActive = soundRef.current || playLock.current;
      if (callEndReasonRef.current && isAudioActive) {
        callDebugLog(
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
      callDebugLog(`[State] Ignoring endCall, state is ${audioState.current}`);
      return;
    }
    callDebugLog("[State] Setting state to STOPPING");
    audioState.current = "STOPPING";
    isStopping.current = true;
    clearCallSafetyTimeouts();
    clearMissedSpeechCue();
    clearTimerRef(postPlaybackReadyTimeoutRef);

    // --- NEW: Stop Timer ---
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    // --- END NEW Timer ---

    stopRingTone();
    setIsCalling(false);
    const endReason = callEndReasonRef.current;
    if (
      currentPlaybackJobIdRef.current &&
      (playLock.current || soundRef.current || playbackStartedAckSentRef.current)
    ) {
      sendPlaybackInterrupted("user_end_call");
    }
    if (endReason === "technical_difficulty") {
      syncCallPlaybackState("technical_difficulty", "Technical difficulty");
    } else {
      syncCallPlaybackState("ending", "Ending call...");
    }
    resetPlaybackLifecycleRefs();
    const shouldComplete =
      endReason === "limit_reached" ||
      (agentAudioStartedRef.current &&
        endReason !== "technical_difficulty" &&
        endReason !== "idle_timeout");
    void Promise.resolve(
      onCallEnd?.({
        reason: endReason,
        shouldComplete,
      }),
    ).catch((error) => {
      console.warn("Error handling call end:", error);
    });
    setShowNotificationDot(false);
    setIdleWarningVisible(false);
    setIdleCountdown(null);
    if (idleCountdownRef.current) {
      clearInterval(idleCountdownRef.current);
      idleCountdownRef.current = null;
    }
    // If the backend sent a call_ended reason, show the modal after cleanup
    if (endReason) {
      // Keep callEndReason in state so the modal renders;
      // do NOT clear it here — it's cleared when the user dismisses the modal.
      callDebugLog(
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
    callDebugLog("[State] Setting state to IDLE");
    audioState.current = "IDLE";
    updateHeadsetStatus(); // <-- Call this AFTER setting state to IDLE
    // --- END SWAP ---

    // Reset duration for UI
    setCallDuration(0);
    callReadyRef.current = false;
    agentAudioStartedRef.current = false;
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
        stopRingTone();
        clearCallReadyTimeout();
        callReadyRef.current = true;
        voiceCallV1EnabledRef.current = data.voiceCallV1Enabled !== false;
        syncUserListeningState("AI is ready");
        if (data.maxTurns) {
          setMaxTurns(data.maxTurns);
          callDebugLog(`[Cost Control] maxTurns set to ${data.maxTurns}`);
        }
        break;

      case "turn":
        if (data.turn === "agent") {
          markBackendSpeechProgress();
          stopRingTone();
          syncAgentPreparingState();
        } else if (data.turn === "user") {
          markBackendSpeechProgress();
          syncUserListeningState();
          callDebugLog("[Mic] Activating mic via 'turn: user' command.");
          isMicActive.current = true;
          setSuggestedResponses([]); // <-- ADDED: Clear old suggestions
          setShowNotificationDot(false); // <-- ADDED: Clear dot
          dismissIdleWarning();
        }
        break;

      case "text":
        // Agent transcript is intentionally hidden in the call UI.
        break;

      case "user_text":
        // User transcript is intentionally hidden in the call UI.
        // We still use this event as a reliable signal that the user spoke.
        markBackendSpeechProgress();
        dismissIdleWarning();
        break;

      case "play_stream": {
        callDebugLog("[WS] Received play_stream command.");
        markBackendSpeechProgress();
        clearCallReadyTimeout();
        stopRingTone();
        syncAgentPreparingState();

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
        callReadyRef.current = true;
        currentPlaybackJobIdRef.current =
          typeof data.jobId === "string" ? data.jobId : null;
        currentPlaybackResponseIdRef.current =
          typeof data.responseId === "string" ? data.responseId : null;
        currentPlaybackDurationMsRef.current = null;
        currentPlaybackStartedAtMsRef.current = null;
        playbackStartedAckSentRef.current = false;
        const urlToPlay = normalizePlayableStreamUrl(rawUrl);
        if (urlToPlay !== rawUrl) {
          callDebugLog(
            "[Audio] play_stream URL rewritten:",
            rawUrl,
            "→",
            urlToPlay,
          );
        }
        const mySeq = ++playSeq.current;
        scheduleAudioStartTimeout(mySeq);
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
          try {
            callDebugLog("[Audio] Attempting to loadAsync from URL:", urlToPlay);

            await newSound.loadAsync(
              { uri: urlToPlay },
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
            callDebugLog("[Audio] loadAsync completed successfully.");
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
                    callDebugLog("[Audio] Calling playAsync() now...");
                    const playbackStatus = await newSound.playAsync();
                    await acknowledgePlaybackStarted(
                      playbackStatus && playbackStatus.isLoaded
                        ? playbackStatus
                        : null,
                    );
                    callDebugLog("[Audio] playAsync() completed without error.");
                  } catch (e) {
                    console.error("[Audio] Error during playAsync:", e);
                    hasStartedPlaying.current = false;
                    playLock.current = false;
                  }
                }
                if ((status as any).didJustFinish) {
                  clearAudioStartTimeout();
                  callDebugLog("[Audio] playback didJustFinish");
                  if (mySeq === playSeq.current) {
                    const playbackCompletedAt = Date.now();
                    try {
                      await newSound.unloadAsync();
                    } catch {}
                    soundRef.current = null;
                    setSound(null);
                    playLock.current = false;
                    hasStartedPlaying.current = false;
                    sendPlaybackComplete(status.positionMillis);
                    resetPlaybackLifecycleRefs();
                    callDebugLog("[WS] Sent playback_complete");

                    // If this was a server-initiated goodbye, trigger cleanup now
                    if (callEndReasonRef.current) {
                      callDebugLog(
                        `[Audio] Goodbye finished. Triggering deferred endCall (reason: ${callEndReasonRef.current}).`,
                      );
                      endCall();
                      return;
                    }

                    transitionToUserReadyAfterPlayback(playbackCompletedAt);
                    callDebugLog(
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
                  const playbackStatus = await newSound.playAsync();
                  await acknowledgePlaybackStarted(
                    playbackStatus && playbackStatus.isLoaded
                      ? playbackStatus
                      : null,
                  );
                }
              } catch (e) {
                console.warn("[Audio] forced-start error:", e);
                hasStartedPlaying.current = false;
                playLock.current = false;
              }
            }, 250);
          } catch (e) {
            console.error("[Audio] Failed to create/play sound:", e);
            clearAudioStartTimeout();
            try {
              await newSound.unloadAsync();
            } catch {}
            if (mySeq === playSeq.current) {
              syncUserListeningState("Error playing audio");
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
        syncCallPlaybackState("interrupting");
        const soundToStop = soundRef.current;
        soundRef.current = null;
        setSound(null);
        if (soundToStop) {
          callDebugLog("[Audio] Interruption. Stopping playback and unloading.");
          try {
            soundToStop.setOnPlaybackStatusUpdate(null);
          } catch {}
          try {
            const status = await soundToStop.getStatusAsync().catch(() => null);
            if (status && status.isLoaded) {
              sendPlaybackInterrupted("server_stop_playback", status.positionMillis);
            } else {
              sendPlaybackInterrupted("server_stop_playback");
            }
            await soundToStop.stopAsync();
          } catch {}
          try {
            await soundToStop.unloadAsync();
            callDebugLog("[Audio] Sound unloaded due to interruption.");
          } catch (e) {
            console.warn("Error unloading sound during interruption:", e);
          }
        } else {
          callDebugLog(
            "[Audio] Interruption requested, but no sound ref was active.",
          );
          sendPlaybackInterrupted("server_stop_playback");
        }
        cancelPendingAgentPlayback();
        agentAudioStartedRef.current = false;
        syncUserListeningState();
        break;
      }

      case "idle_warning": {
        callDebugLog(
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
        callDebugLog(
          `[Cost Control] call_ended received, reason: ${data.reason}`,
        );
        clearCallSafetyTimeouts();
        if (data.message) {
          setStatus(data.message);
        }
        // Store reason in both state and ref so endCall (triggered by onclose)
        // can access it even if state hasn't flushed yet.
        setCallEndReason(data.reason);
        callEndReasonRef.current = data.reason;
        setIsAgentAudioPlaying(false);
        if (data.reason === "technical_difficulty") {
          syncCallPlaybackState(
            "technical_difficulty",
            data.message || "Technical difficulty",
          );
        } else {
          syncCallPlaybackState("ending", "Ending call...");
        }
        dismissIdleWarning();
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
      callDebugLog("Mute set to:", next);
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

  // Headset enforcement now happens inside `startCall` so we can surface
  // the modal prompt instead of silently disabling the action.

  // We use the raw scenarioIcon from backend (FontAwesome) for the Orb
  // to ensure it matches the list and isn't generic.
  const orbIconName = scenarioIcon || "robot";

  // --- ⬇️ ADDED: Modernized Animation for Visualizer ⬇️ ---
  const ripple1 = useRef(new Animated.Value(0)).current;
  const ripple2 = useRef(new Animated.Value(0)).current;
  const ripple3 = useRef(new Animated.Value(0)).current;
  const suggestionBadgePulse = useRef(new Animated.Value(0)).current;
  const isListeningPlaybackState = callPlaybackState === "user_listening";
  const isAgentSpeakingPlaybackState = callPlaybackState === "agent_playing";
  const isAgentPreparingPlaybackState = callPlaybackState === "agent_preparing";
  const isInterruptingPlaybackState = callPlaybackState === "interrupting";
  const isTerminalPlaybackState =
    callPlaybackState === "ending" ||
    callPlaybackState === "technical_difficulty";
  const isUserVisualPrimary =
    isListeningPlaybackState || isInterruptingPlaybackState;
  const isAgentVisualPrimary = isAgentSpeakingPlaybackState;
  const shouldShowRipple =
    isListeningPlaybackState ||
    isAgentSpeakingPlaybackState ||
    isInterruptingPlaybackState ||
    missedSpeechCueVisible;
  const rippleTint = isAgentSpeakingPlaybackState
    ? "rgba(249, 115, 22, 0.35)"
    : missedSpeechCueVisible
      ? "rgba(14, 165, 233, 0.38)"
    : "rgba(59, 130, 246, 0.28)";

  useEffect(() => {
    const createRipple = (anim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 3000,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
    };

    const r1 = createRipple(ripple1, 0);
    const r2 = createRipple(ripple2, 1000);
    const r3 = createRipple(ripple3, 2000);

    if (shouldShowRipple) {
      r1.start();
      r2.start();
      r3.start();
    } else {
      r1.stop();
      r2.stop();
      r3.stop();
      ripple1.setValue(0);
      ripple2.setValue(0);
      ripple3.setValue(0);
    }
    return () => {
      r1.stop();
      r2.stop();
      r3.stop();
    };
  }, [ripple1, ripple2, ripple3, shouldShowRipple]);

  useEffect(() => {
    if (!showNotificationDot) {
      suggestionBadgePulse.stopAnimation();
      suggestionBadgePulse.setValue(0);
      return;
    }

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(suggestionBadgePulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(suggestionBadgePulse, {
          toValue: 0,
          duration: 700,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    pulse.start();
    return () => {
      pulse.stop();
    };
  }, [showNotificationDot, suggestionBadgePulse]);

  // --- ⬇️ ADDED: Call Button Expansion & Slide Up Animation ⬇️ ---
  const callBtnScale = useRef(new Animated.Value(1)).current;
  const callBtnTranslateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isCalling) {
      Animated.parallel([
        Animated.spring(callBtnScale, {
          toValue: 1.15, // Expand slightly
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(callBtnTranslateY, {
          toValue: -16, // Slide up
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(callBtnScale, {
          toValue: 1, // Reset size
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(callBtnTranslateY, {
          toValue: 0, // Reset position
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isCalling]);
  // --- ⬆️ END ADDED ⬆️ ---

  const agentRestingSlotStyle = isAgentPreparingPlaybackState
    ? styles.orbSlotPreparing
    : isUserVisualPrimary
      ? styles.orbSlotBackRight
      : styles.orbSlotBackLeft;
  const userRestingSlotStyle =
    isAgentVisualPrimary || isAgentPreparingPlaybackState
      ? styles.orbSlotBackLeft
      : styles.orbSlotBackRight;

  const agentOrbSlotStyle = [
    styles.orbSlot,
    isAgentVisualPrimary ? styles.orbSlotPrimary : agentRestingSlotStyle,
    isTerminalPlaybackState && styles.orbSlotDimmed,
  ];

  const userOrbSlotStyle = [
    styles.orbSlot,
    isUserVisualPrimary ? styles.orbSlotPrimary : userRestingSlotStyle,
    isTerminalPlaybackState && styles.orbSlotDimmed,
  ];

  const userFallbackText =
    missedSpeechCueVisible && missedSpeechCueCount >= 2
      ? "Could you say that again?"
      : "";
  const visibleStatus = isCalling
    ? userFallbackText || status
    : "Ready to Connect";
  const suggestionBadgeCount = Math.min(suggestedResponses.length, 9);
  const suggestionBadgeScale = suggestionBadgePulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.18],
  });
  const suggestionBadgeOpacity = suggestionBadgePulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.86, 1],
  });

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
        <View style={styles.dualOrbStage}>
          {/* Animated Ripples sit behind whichever orb is visually primary. */}
          {shouldShowRipple && (
            <View style={styles.rippleLayer} pointerEvents="none">
              {[ripple1, ripple2, ripple3].map((anim, index) => (
                <Animated.View
                  key={`ripple-${index}`}
                  style={[
                    styles.rippleRing,
                    {
                      borderColor: rippleTint,
                      transform: [
                        {
                          scale: anim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.8, 3],
                          }),
                        },
                      ],
                      opacity: anim.interpolate({
                        inputRange: [0, 0.2, 1],
                        outputRange: [0, 0.38, 0],
                      }),
                    },
                  ]}
                />
              ))}
            </View>
          )}

          <Animated.View style={agentOrbSlotStyle}>
            <View style={styles.orbWrapper}>
              <LinearGradient
                colors={["#2B1D12", "#0F172A"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.orbMask,
                  styles.agentOrbMask,
                  isAgentPreparingPlaybackState && styles.orbPreparingGlow,
                  isAgentSpeakingPlaybackState && styles.orbSpeakingGlow,
                ]}
              >
                <LinearGradient
                  colors={["rgba(251, 146, 60, 0.28)", "transparent"]}
                  start={{ x: 0.2, y: 0 }}
                  end={{ x: 0.8, y: 1 }}
                  style={styles.orbInnerGlow}
                />
                <FAIcon
                  name={orbIconName}
                  size={46}
                  color="#FFF7ED"
                  solid
                  style={styles.iconClean}
                />
              </LinearGradient>
            </View>
            <Text style={styles.orbCaption}>Agent</Text>
          </Animated.View>

          <Animated.View style={userOrbSlotStyle}>
            <View style={styles.orbWrapper}>
              <LinearGradient
                colors={["#082F49", "#020617"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.orbMask,
                  styles.userOrbMask,
                  isListeningPlaybackState && styles.userOrbReady,
                  isInterruptingPlaybackState && styles.userOrbInterrupting,
                  missedSpeechCueVisible && styles.userOrbRetry,
                ]}
              >
                <LinearGradient
                  colors={["rgba(125, 211, 252, 0.28)", "transparent"]}
                  start={{ x: 0.2, y: 0 }}
                  end={{ x: 0.8, y: 1 }}
                  style={styles.orbInnerGlow}
                />
                <Icon
                  name="mic"
                  size={50}
                  color="#F0F9FF"
                  style={styles.iconClean}
                />
              </LinearGradient>
            </View>
            <Text style={styles.orbCaption}>You</Text>
          </Animated.View>
        </View>

        {/* Status Text under Orb */}
        <View style={styles.statusContainer}>
          {visibleStatus ? (
            <Text
              style={[
                styles.statusTextModern,
                Boolean(userFallbackText) && styles.retryHintText,
              ]}
            >
              {visibleStatus}
            </Text>
          ) : (
            <View style={styles.statusSpacer} />
          )}
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
              Please connect your headphones before starting the call.
            </Text>

            <View style={styles.promptButtonRow}>
              <TouchableOpacity
                style={styles.promptButtonPrimary}
                onPress={async () => {
                  const connected = await updateHeadsetStatus(true);
                  if (connected) {
                    setShowHeadsetPrompt(false);
                  }
                }}
              >
                <Text style={styles.promptButtonTextPri}>Check Again</Text>
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
        <Animated.View
          style={{
            transform: [
              { scale: callBtnScale },
              { translateY: callBtnTranslateY },
            ],
            zIndex: 10,
          }}
        >
          <TouchableOpacity
            style={[
              styles.mainCallButtonModern,
              isCalling ? styles.endCallButton : styles.startCallButton,
              isCalling && styles.activeCallButtonGlow, // Added glow when active
            ]}
            activeOpacity={0.8}
            onPress={() => (isCalling ? endCall() : startCall())}
          >
            <Icon
              name={isCalling ? "phone-off" : "phone-call"}
              size={32}
              color="#FFF"
            />
          </TouchableOpacity>
        </Animated.View>

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
                setStatus("Start call to see tips");
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
          {showNotificationDot && (
            <Animated.View
              style={[
                styles.notificationBadgeModern,
                {
                  opacity: suggestionBadgeOpacity,
                  transform: [{ scale: suggestionBadgeScale }],
                },
              ]}
            >
              <Text style={styles.notificationBadgeText}>
                {suggestionBadgeCount}
              </Text>
            </Animated.View>
          )}
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
                  dismissIdleWarning();
                  try {
                    ws.current?.send(JSON.stringify({ type: "stay_online" }));
                    callDebugLog("[WS] Sent stay_online");
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
                callEndReason === "limit_reached"
                  ? "trophy"
                  : callEndReason === "technical_difficulty"
                    ? "exclamation-triangle"
                    : callEndReason === "user_ended"
                      ? "check-circle"
                    : "phone-slash"
              }
              size={36}
              color={theme.colors.actionPrimary.default}
              solid
              style={{ marginBottom: 16 }}
            />
            <Text style={styles.promptTitle}>
              {callEndReason === "limit_reached"
                ? "Great practice!"
                : callEndReason === "technical_difficulty"
                  ? "Call unavailable"
                : callEndReason === "user_ended"
                  ? "Call ended"
                  : "Call ended"}
            </Text>
            <Text style={styles.promptText}>
              {callEndReason === "limit_reached"
                ? "You've completed this practice session. Rest your vocal cords and come back tomorrow!"
                : callEndReason === "technical_difficulty"
                  ? "We hit a technical problem and ended the call. This attempt will not count as completed."
                : callEndReason === "user_ended"
                  ? "You've successfully ended the conversation. Great job practicing today!"
                  : "The call was ended due to inactivity. You can start a new session anytime."}
            </Text>
            <View style={styles.promptButtonRow}>
              <TouchableOpacity
                style={[
                  styles.promptButtonPrimary,
                  isCallEndAckInProgress && styles.promptButtonDisabled,
                ]}
                disabled={isCallEndAckInProgress}
                onPress={async () => {
                  const reason = callEndReason;
                  setIsCallEndAckInProgress(true);
                  try {
                    await onCallEndAcknowledged?.({ reason });
                    if (componentMountedRef.current) {
                      setCallEndReason(null);
                      callEndReasonRef.current = null;
                    }
                  } catch (error) {
                    console.warn("Error acknowledging call end:", error);
                  } finally {
                    if (componentMountedRef.current) {
                      setIsCallEndAckInProgress(false);
                    }
                  }
                }}
              >
                <Text style={styles.promptButtonTextPri}>
                  {isCallEndAckInProgress
                    ? "Completing..."
                    : callEndReason === "limit_reached"
                      ? "Done"
                      : "Got it"}
                </Text>
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
    minHeight: 280, // Ensure strictly visible
    maxHeight: 400,
  },
  dualOrbStage: {
    width: 280,
    height: 190,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  rippleLayer: {
    position: "absolute",
    top: 0,
    left: 70,
    width: 140,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 0,
  },
  rippleRing: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70, // CIRCULAR
    borderWidth: 1.5,
    borderColor: "rgba(167, 139, 250, 0.8)", // Violet-400 tint
    backgroundColor: "rgba(167, 139, 250, 0.05)",
  },
  orbSlot: {
    position: "absolute",
    top: 0,
    left: 50,
    width: 180,
    height: 180,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  orbSlotPrimary: {
    opacity: 1,
    zIndex: 3,
    transform: [{ translateX: 0 }, { translateY: -4 }, { scale: 1 }],
  },
  orbSlotBackLeft: {
    opacity: 0.45,
    zIndex: 1,
    transform: [{ translateX: -78 }, { translateY: 42 }, { scale: 0.68 }],
  },
  orbSlotBackRight: {
    opacity: 0.45,
    zIndex: 1,
    transform: [{ translateX: 78 }, { translateY: 42 }, { scale: 0.68 }],
  },
  orbSlotPreparing: {
    opacity: 0.72,
    zIndex: 2,
    transform: [{ translateX: -54 }, { translateY: 28 }, { scale: 0.78 }],
  },
  orbSlotDimmed: {
    opacity: 0.28,
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
        shadowOpacity: 0.6,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 10 },
      },
      android: { elevation: 15 },
      web: { boxShadow: `0 10px 30px rgba(0,0,0,0.5)` },
    }),
  },
  orbMask: {
    width: 140,
    height: 140,
    borderRadius: 70, // CIRCULAR
    overflow: "hidden", // CLIP CONTENT
    borderWidth: 1,
    borderColor: "rgba(167, 139, 250, 0.3)", // Subtle stroke
    alignItems: "center",
    justifyContent: "center",
  },
  agentOrbMask: {
    borderColor: "rgba(251, 146, 60, 0.38)",
  },
  userOrbMask: {
    borderColor: "rgba(56, 189, 248, 0.36)",
  },
  orbPreparingGlow: {
    borderColor: "rgba(251, 146, 60, 0.56)",
    backgroundColor: "rgba(251, 146, 60, 0.08)",
  },
  orbSpeakingGlow: {
    borderColor: "rgba(249, 115, 22, 0.8)",
    backgroundColor: "rgba(249, 115, 22, 0.1)",
  },
  userOrbReady: {
    borderColor: "rgba(56, 189, 248, 0.78)",
    backgroundColor: "rgba(14, 165, 233, 0.09)",
  },
  userOrbInterrupting: {
    borderColor: "rgba(125, 211, 252, 0.9)",
    backgroundColor: "rgba(14, 165, 233, 0.14)",
  },
  userOrbRetry: {
    borderColor: "rgba(34, 211, 238, 0.95)",
    backgroundColor: "rgba(34, 211, 238, 0.14)",
  },
  orbInnerGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  iconClean: {
    textShadowColor: "rgba(167, 139, 250, 0.4)", // Subtle violet glow behind icon
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  orbCaption: {
    marginTop: 10,
    color: "rgba(255,255,255,0.62)",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  statusContainer: {
    marginTop: 18,
    minHeight: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  statusTextModern: {
    color: "rgba(255,255,255,0.9)", // Slightly softer white
    fontSize: 16,
    fontWeight: "400", // Elegant, not too thin
    letterSpacing: 3, // Premium wide tracking
    textTransform: "uppercase",
    textAlign: "center",
  },
  retryHintText: {
    color: "rgba(186, 230, 253, 0.88)",
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 0.2,
    textTransform: "none",
  },
  statusSpacer: {
    height: 24,
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
    justifyContent: "space-between",
    width: "75%", // Sleeker, tighter width
    maxWidth: 320,
    backgroundColor: "rgba(15, 23, 42, 0.4)", // Deeper, semi-transparent indigo
    borderRadius: 999, // Perfect pill shape
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(167, 139, 250, 0.15)", // Very subtle violet border
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  glassControlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent", // Clean minimalist look without background
  },
  glassControlBtnActive: {
    backgroundColor: "rgba(167, 139, 250, 0.15)", // Subtle violet tint when active
    borderColor: "rgba(167, 139, 250, 0.3)",
    borderWidth: 1,
  },
  mainCallButtonModern: {
    width: 64, // Sleek, perfectly sized circle
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    // No negative margin - fits inside the pill gracefully or slightly overlapping
    borderWidth: 0, // Removed thick stroke for a cleaner look
  },
  startCallButton: {
    backgroundColor: "#10B981", // Rich Emerald
    shadowColor: "#10B981",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  endCallButton: {
    backgroundColor: "#E11D48", // Rich Rose/Red
    shadowColor: "#E11D48",
    shadowOpacity: 0.6,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  activeCallButtonGlow: {
    shadowColor: "#F43F5E",
    shadowOpacity: 0.8,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  disabledButton: {
    backgroundColor: "rgba(255,255,255,0.1)", // Glassy disabled state
    shadowOpacity: 0,
  },
  notificationBadgeModern: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#F43F5E",
    borderWidth: 2,
    borderColor: "#1E293B", // Match bg
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#F43F5E",
    shadowOpacity: 0.7,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  notificationBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    lineHeight: 13,
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
  promptButtonDisabled: {
    opacity: 0.72,
  },
  promptButtonTextPri: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});

export default CallingWidget;
