// ModernWaveform.tsx
import React, { useMemo, useRef, useState } from "react";
import { View, StyleSheet, LayoutChangeEvent } from "react-native";
import Svg, { Rect, Defs, LinearGradient, Stop } from "react-native-svg";

type Props = {
  envelope?: number[];
  mode?: "recording" | "playback" | "idle";
  height?: number;
  strokeColor?: string;
  glowColor?: string;
  points?: number; // Number of bars to render
  paddingHorizontal?: number;
  // Unused props kept for compatibility
  rawSamples?: number[];
  strokeWidth?: number;
  glowWidth?: number;
  fps?: number;
  cycles?: number;
  speed?: number;
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export default function ModernWaveform({
  envelope,
  mode = "idle",
  height = 40,
  strokeColor = "#334155", // Slate 700 default
  glowColor = "#F97316", // Orange default
  points = 60,
  paddingHorizontal = 0,
}: Props) {
  const widthRef = useRef(300);
  const [containerWidth, setContainerWidth] = useState(300);

  function onLayout(e: LayoutChangeEvent) {
    const w = Math.max(60, Math.floor(e.nativeEvent.layout.width));
    widthRef.current = w;
    setContainerWidth(w);
  }

  // Generate bars data
  const bars = useMemo(() => {
    // If no envelope, or empty, return idle pattern or zeroes
    const data =
      envelope && envelope.length > 0 ? envelope : new Array(points).fill(0.05); // Idle hum

    const barCount = points;
    const result: { x: number; h: number; opacity: number }[] = [];

    // Calculate dimensions
    // We want the bars to span the width
    // Gap ratio: 0.4 (40% gap, 60% bar)
    const availableWidth = containerWidth - paddingHorizontal * 2;
    const totalSlots = barCount;
    const slotWidth = availableWidth / totalSlots;
    const gap = 2; // Fixed pixel gap looks better than ratio usually, or slotWidth * 0.3
    const barWidth = Math.max(2, slotWidth - gap);

    // Resample data to fit barCount
    // data has N points, we need M bars.
    // Usually data.length (512) > barCount (60).
    const step = data.length / barCount;

    for (let i = 0; i < barCount; i++) {
      // Sample the envelope
      const dataIndex = Math.floor(i * step);
      // Average a few samples for smoothness? Or just point sample?
      // Point sample is snappier.
      const rawVal = data[dataIndex] ?? 0;

      // Enhance value for visual pop
      let val = clamp01(rawVal);

      // If idle/recording but silence, show tiny blips
      if (mode === "recording" && val < 0.05)
        val = Math.max(val, Math.random() * 0.05);
      if (mode === "idle")
        val = 0.1 + Math.sin(i * 0.5 + Date.now() * 0.005) * 0.05; // This won't animate without re-render loop, so stick to static if no data

      // Height calculation (Mirrored)
      // Max height is container height
      const h = Math.max(4, val * height);

      const x = paddingHorizontal + i * slotWidth;

      // Opacity fade at edges for "rolling" look
      // center is opaque, sides slightly faded? No, usually uniform is fine.
      // Let's keep it uniform opacity.

      result.push({ x, h, opacity: 1 });
    }

    return { bars: result, barWidth };
  }, [envelope, containerWidth, points, height, mode, paddingHorizontal]);

  // If idle and no envelope, we might want a simple static line or dots.
  // But SmartRecorder passes 0-filled envelope in idle.

  const midY = height / 2;

  // Color logic: Recording/Playing = Active Color (GlowColor/Orange)
  // Idle = StrokeColor (Neutral)
  const active = mode === "recording" || mode === "playback";
  const barFill = active ? glowColor : strokeColor;

  return (
    <View onLayout={onLayout} style={[styles.container, { height }]}>
      <Svg width="100%" height={height}>
        <Defs>
          <LinearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={barFill} stopOpacity="0.8" />
            <Stop offset="0.5" stopColor={barFill} stopOpacity="1" />
            <Stop offset="1" stopColor={barFill} stopOpacity="0.8" />
          </LinearGradient>
        </Defs>
        {bars.bars.map((bar, i) => (
          <Rect
            key={i}
            x={bar.x}
            y={midY - bar.h / 2}
            width={bars.barWidth}
            height={bar.h}
            rx={bars.barWidth / 2} // Pill shape
            fill={active ? "url(#barGradient)" : barFill}
            opacity={active ? 1 : 0.3} // Dim entry/exit bars via envelope, or just global dim
          />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    justifyContent: "center",
  },
});
