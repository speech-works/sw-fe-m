// ModernWaveform.tsx (fixed rendering to remove dark/black core)
import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet, LayoutChangeEvent } from "react-native";
import Svg, { Path, G } from "react-native-svg";
import { line as d3Line, curveCatmullRom } from "d3-shape";

type Props = {
  rawSamples?: number[];
  envelope?: number[];
  mode?: "recording" | "playback" | "idle";
  height?: number;
  strokeColor?: string;
  glowColor?: string;
  strokeWidth?: number;
  glowWidth?: number;
  points?: number;
  fps?: number;
  cycles?: number;
  speed?: number;
  paddingHorizontal?: number;
};

const clamp = (v: number, a = -1, b = 1) => Math.max(a, Math.min(b, v));
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export default function ModernWaveform({
  rawSamples,
  envelope,
  mode = "idle",
  height = 140,
  strokeColor = "#b6ffb6", // bright center color
  glowColor = "#ff9040", // glow base
  strokeWidth = 2.4,
  glowWidth = 18, // outer glow width
  points = 420,
  fps = 30,
  cycles = 8,
  speed = 0.08,
  paddingHorizontal = 8,
}: Props) {
  const widthRef = useRef(300);
  const phaseRef = useRef(0);
  // 💡 NEW: Ref for a subtle, randomized phase offset for realism
  const offsetPhaseRef = useRef(0);
  const [path, setPath] = useState<string>("");
  const [animActive, setAnimActive] = useState<boolean>(false);

  useEffect(() => {
    if (mode === "recording") {
      setAnimActive(true);
    } else if (mode === "playback") {
      phaseRef.current = 0;
      setAnimActive(true);
    } else {
      setAnimActive(false);
    }
  }, [mode]);

  useEffect(() => {
    if (!animActive) return;
    let mounted = true;
    const interval = setInterval(() => {
      if (!mounted) return;
      phaseRef.current = (phaseRef.current + speed) % (Math.PI * 2);

      // 💡 REALISM: Update the offset phase for subtle, non-repeating jitter
      offsetPhaseRef.current += (Math.random() - 0.5) * 0.25;
      offsetPhaseRef.current = offsetPhaseRef.current % (Math.PI * 2);

      computeAndSetPath();
    }, 1000 / fps);

    computeAndSetPath();

    return () => {
      mounted = false;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animActive, rawSamples, envelope, points, height, widthRef.current]);

  useEffect(() => {
    computeAndSetPath();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawSamples, envelope, points, height, widthRef.current]);

  function onLayout(e: LayoutChangeEvent) {
    widthRef.current = Math.max(60, Math.floor(e.nativeEvent.layout.width));
    computeAndSetPath();
  }

  function computeAndSetPath() {
    const W = Math.max(40, widthRef.current - paddingHorizontal * 2);
    const H = height;
    const midY = H / 2;

    // --- Raw Samples (Data-driven) Path ---
    if (rawSamples && rawSamples.length > 8) {
      const nIn = rawSamples.length;
      const nOut = points;
      const outPts: [number, number][] = [];
      for (let i = 0; i < nOut; i++) {
        const t = nOut === 1 ? 0.5 : i / (nOut - 1);
        const srcIndexF = t * (nIn - 1);
        const i0 = Math.floor(srcIndexF);
        const i1 = Math.min(nIn - 1, i0 + 1);
        const frac = srcIndexF - i0;
        const s0 = clamp(rawSamples[i0]);
        const s1 = clamp(rawSamples[i1]);
        const s = s0 * (1 - frac) + s1 * frac;
        const x = paddingHorizontal + t * W;
        const y = midY - s * (H * 0.42);
        outPts.push([x, y]);
      }
      const generator = d3Line()
        .x((d: any) => d[0])
        .y((d: any) => d[1])
        .curve(curveCatmullRom.alpha(0.5));
      const p = generator(outPts as any) || "";
      setPath(p);
      return;
    }

    // --- Synthetic Animated (Idle/Playback) Path ---
    const env =
      envelope && envelope.length > 2
        ? envelope.map(clamp01)
        : defaultEnvelope(160);
    const nOut = points;
    const out2: [number, number][] = [];
    const nEnv = env.length;
    const phase = phaseRef.current;
    // 💡 REALISM: Get the running random phase offset
    const offsetPhase = offsetPhaseRef.current;

    for (let i = 0; i < nOut; i++) {
      const t = nOut === 1 ? 0.5 : i / (nOut - 1);

      // Envelope sampling
      const eIdxF = t * (nEnv - 1);
      const e0 = env[Math.floor(eIdxF)] ?? 0;
      const e1 = env[Math.min(nEnv - 1, Math.floor(eIdxF) + 1)] ?? 0;
      const envVal = e0 + (e1 - e0) * (eIdxF - Math.floor(eIdxF));

      // Calculate complex, "turbulent" phase for realism
      const basePhase = phase + t * cycles * Math.PI * 2;
      const totalPhase =
        basePhase +
        offsetPhase * 0.4 + // subtle overall jitter
        Math.sin(t * Math.PI * 7) * 0.8 + // higher frequency internal modulation
        Math.sin(basePhase * 0.1) * 0.2; // very slow, overall shape wobble

      const s = Math.sin(totalPhase);

      // Amplitude modulation for "breathing" effect
      const ampMod = 1 + Math.sin(t * Math.PI * 0.7) * 0.15; // up to 15% amplitude wobble
      const amp = envVal * (H * 0.42) * ampMod;

      const x = paddingHorizontal + t * W;
      const y = midY - s * amp;
      out2.push([x, y]);
    }
    const generator2 = d3Line()
      .x((d: any) => d[0])
      .y((d: any) => d[1])
      .curve(curveCatmullRom.alpha(0.5));
    const p2 = generator2(out2 as any) || "";
    setPath(p2);
  }

  return (
    <View onLayout={onLayout} style={[styles.container, { height }]}>
      <Svg
        width={"100%"}
        height={height}
        viewBox={`0 0 ${Math.max(200, widthRef.current)} ${height}`}
      >
        <G>
          {/* Outer faint glow: low opacity stroke, no fill */}
          <Path
            d={path}
            fill="none"
            stroke={glowColor}
            strokeWidth={glowWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity={0.08}
          />
          {/* Mid glow: slightly stronger */}
          <Path
            d={path}
            fill="none"
            stroke={glowColor}
            strokeWidth={Math.max(1, Math.floor(glowWidth * 0.5))}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity={0.14}
          />
          {/* Bright center stroke (last) */}
          <Path
            d={path}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity={1}
          />
        </G>
      </Svg>
    </View>
  );
}

function defaultEnvelope(n = 160) {
  const arr: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    arr.push(Math.max(0.02, Math.abs(Math.sin((t - 0.5) * Math.PI * 2)) * 0.9));
  }
  return arr;
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    justifyContent: "center",
    overflow: "hidden",
  },
});
