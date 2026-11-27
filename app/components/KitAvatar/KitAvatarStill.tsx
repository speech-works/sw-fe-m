/**
 * A user avatar as a still picture: one Svg, no motion, nothing per frame. For lists, cards and small avatars.
 * The SVG text comes from the kit (kitLook.stillSvg) and is parsed once per picture (the parsed tree is cached).
 */
import React, { memo } from "react";
import { SvgAst, parse } from "react-native-svg";
import type { AvatarManifest } from "../../types/avatar";
import { stillSvg, type KitVariant } from "./kitLook";

const ASTS = new Map<string, ReturnType<typeof parse>>();
const ASTS_MAX = 160;
function astOf(xml: string) {
  const hit = ASTS.get(xml);
  if (hit) return hit;
  const ast = parse(xml);
  ASTS.set(xml, ast);
  if (ASTS.size > ASTS_MAX) ASTS.delete(ASTS.keys().next().value as string);
  return ast;
}

export const KitAvatarStill = memo(function KitAvatarStill({ manifest, size, variant = "blob" }: { manifest?: AvatarManifest | null; size: number; variant?: KitVariant }) {
  const ast = astOf(stillSvg(manifest, variant));
  return <SvgAst ast={ast} override={{ width: size, height: size }} />;
});
