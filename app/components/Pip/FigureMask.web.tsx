/**
 * Web (preview page only): the same mask as FigureMask.tsx, as a CSS mask image on the figure's box.
 * The native mask view does not mask on web. tube picks which of the two shapes is the mask.
 */
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { View } from "react-native";
import { runOnJS, useAnimatedReaction } from "react-native-reanimated";
import type { FigureMaskProps } from "./FigureMask";

const svgUrl = (d: string, vb: string) =>
  `url("data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" preserveAspectRatio="none"><path d="${d}" fill="#000"/></svg>`)}")`;

export function FigureMask({ mv, cut, tube, vb, x, y, w, h, children }: FigureMaskProps) {
  const box = useRef<any>(null);
  const urls = useMemo(() => [svgUrl(cut, vb), svgUrl(tube, vb)], [cut, tube, vb]);
  const set = useCallback((i: number) => {
    const el = box.current as HTMLElement | null; if (!el || !el.style) return;
    const s: any = el.style;
    s.maskImage = s.webkitMaskImage = urls[i];
    s.maskSize = s.webkitMaskSize = "100% 100%";
    s.maskRepeat = s.webkitMaskRepeat = "no-repeat";
  }, [urls]);
  useEffect(() => { set(mv.tube.value > 0.5 ? 1 : 0); }, [set, mv.tube]);
  useAnimatedReaction(() => (mv.tube.value > 0.5 ? 1 : 0), (i, prev) => { if (i !== prev) runOnJS(set)(i); }, [set]);
  return <View ref={box} pointerEvents="none" style={{ position: "absolute", left: x, top: y, width: w, height: h }}>{children}</View>;
}
