// ModernWaveform.tsx
import React, { useMemo, useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";

type Props = {
  envelope?: number[];
  mode?: "recording" | "playback" | "idle";
  height?: number;
  glowColor?: string;
  points?: number;
  // Unused compatibility props
  strokeColor?: string;
  strokeWidth?: number;
  glowWidth?: number;
  fps?: number;
  cycles?: number;
  speed?: number;
  paddingHorizontal?: number;
  rawSamples?: number[];
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export default function ModernWaveform({
  envelope,
  mode = "idle",
  height = 40,
  glowColor = "#F97316", // Default Orange
  points = 40, // View-based bars
}: Props) {
  const [containerWidth, setContainerWidth] = useState(300);

  function onLayout(e: LayoutChangeEvent) {
    if (e.nativeEvent.layout.width > 0) {
      setContainerWidth(e.nativeEvent.layout.width);
    }
  }

  // 1. Data Processing
  const bars = useMemo(() => {
    // Render Bars
    const count = points;
    const barData: number[] = [];
    const isActive = mode === "recording" || mode === "playback";

    if (!isActive || !envelope || envelope.length === 0) {
      // Idle state: just a flat line or tiny hum
      return new Array(count).fill(0.05);
    }

    // Sampling Logic
    const step = envelope.length / count;
    for (let i = 0; i < count; i++) {
      const index = Math.floor(i * step);
      const val = envelope[index] || 0;

      // Boost low signals for visibility
      let h = Math.max(0.05, val * 1.5);

      // Add minimal jitter if active to feel "alive"
      if (isActive && h < 0.15) h += Math.random() * 0.05;

      barData.push(clamp01(h));
    }
    return barData;
  }, [envelope, mode, points]);

  // 2. Render
  // SoundCloud Style: Bars aligned center vertically
  // Calculate gap and width based on container
  // 60% bar, 40% gap
  const totalSlots = points;
  const slotWidth = containerWidth / totalSlots;
  const barWidth = Math.max(2, slotWidth * 0.6);
  const gap = Math.max(1, slotWidth * 0.4);

  return (
    <View style={[styles.container, { height }]} onLayout={onLayout}>
      <View style={styles.row}>
        {bars.map((hRatio, i) => {
          const h = Math.max(4, hRatio * height);

          // Dynamic Opacity for "fade out" effect at edges?
          // Or just solid? Solid is crisper.
          // Maybe slight opacity if idle?
          const opacity = mode === "idle" ? 0.3 : 1;

          return (
            <View
              key={i}
              style={{
                width: barWidth,
                height: h,
                backgroundColor: glowColor,
                borderRadius: barWidth / 2,
                marginHorizontal: gap / 2,
                opacity,
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden", // Clip if needed
  },
  row: {
    flexDirection: "row",
    alignItems: "center", // Centers vertically = Mirrored effect
    justifyContent: "center",
    height: "100%",
    width: "100%",
  },
});
