/**
 * Pip's figure seen through its mask (transparent outside; nothing is painted): everything above the blob's cut line,
 * plus the blob below it. tube = 1: above the cut line only the blob's own width is open.
 * The mask is a static picture (Android draws it once and reuses it). Web: FigureMask.web.tsx.
 */
import React from "react";
import { View } from "react-native";
import MaskedView from "@react-native-masked-view/masked-view";
import Svg, { Path } from "react-native-svg";
import Animated, { useAnimatedStyle } from "react-native-reanimated";

export type FigureMaskProps = { mv: { tube: any }; cut: string; tube: string; vb: string; x: number; y: number; w: number; h: number; children: React.ReactNode };

export function FigureMask({ mv, cut, tube, vb, x, y, w, h, children }: FigureMaskProps) {
  return (
    <MaskedView pointerEvents="none" style={{ position: "absolute", left: x, top: y, width: w, height: h }}
      maskElement={
        <View pointerEvents="none" style={{ width: w, height: h }}>
          <MaskPart mv={mv} which="cut"><Svg width={w} height={h} viewBox={vb}><Path d={cut} fill="#000" /></Svg></MaskPart>
          <MaskPart mv={mv} which="tube"><Svg width={w} height={h} viewBox={vb}><Path d={tube} fill="#000" /></Svg></MaskPart>
        </View>}>
      {children}
    </MaskedView>);
}

const ABS = { position: "absolute" as const, left: 0, top: 0 };
/** One of the two mask shapes; only one is on at a time (tube: 0 = the cut, 1 = the hole). */
function MaskPart({ mv, which, children }: { mv: { tube: any }; which: "cut" | "tube"; children: React.ReactNode }) {
  const st = useAnimatedStyle(() => ({ opacity: which === "tube" ? mv.tube.value : 1 - mv.tube.value }));
  return <Animated.View pointerEvents="none" style={[ABS, st]}>{children}</Animated.View>;
}
