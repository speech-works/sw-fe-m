/**
 * A user avatar, live: the kit idle only (blink, glance, breath). No hand moves, no body moves, no hair motion
 * (founder, 2026-11-27: Home and the Studio preview are live; every other avatar is a still).
 *
 * Drawn by Pip's drawer (components/Pip: Figure, the same layers, face rig and blob cut), on the UI thread through a
 * Reanimated frame callback: no React render per frame. Reduced motion: the avatar stands still on its face.
 * It lines up exactly with KitAvatarStill (same square box, same blob, same stage).
 */
import React, { memo, useMemo } from "react";
import { View } from "react-native";
import { useFrameCallback, useReducedMotion, useSharedValue } from "react-native-reanimated";
import type { AvatarManifest } from "../../types/avatar";
import { Figure, VIEW, makeBundle } from "../Pip/Pip";
import { faceNow, faceStill, solveIdle } from "../Pip/core/app.js";
import { RING, kitFace, kitKey, liveFigure } from "./kitLook";

const IDLE_SEC = 30;   // the idle (blink, glance, breath) is solved once for 30 s, then loops
let UID = 0;

function Live({ manifest, size, picture, ring }: { manifest?: AvatarManifest | null; size: number; picture: string; ring: boolean }) {
  // built once per picture (picture = kitKey(manifest)); a new object for the same look does not rebuild it
  const B = useMemo(() => makeBundle(liveFigure(manifest), [], { seconds: IDLE_SEC, hair: false }), [picture]);   // eslint-disable-line react-hooks/exhaustive-deps
  const face = useMemo(() => kitFace(manifest), [picture]);   // eslint-disable-line react-hooks/exhaustive-deps
  const uid = useMemo(() => "ka" + UID++ + "_", []);
  const reduced = useReducedMotion();
  const I = useSharedValue<any>(B.I), FK = useSharedValue<any>(B.FK);
  const fc = useSharedValue<any>(faceStill(B.FK, face));
  const fs = useSharedValue<any>(solveIdle(B.I, 0, faceNow(B.FK, faceStill(B.FK, face), 0)));
  const hs = useSharedValue<any>(null);
  // the figure never leaves its blob: no entrance, no jelly, no pose
  const fx = useSharedValue(0), fy = useSharedValue(0), bs = useSharedValue(1), tube = useSharedValue(0), jel = useSharedValue<number[]>([0, 0]);
  const mv = useMemo(() => ({ fx, fy, bs, tube }), [fx, fy, bs, tube]);
  useFrameCallback((info) => {
    fs.value = solveIdle(I.value, info.timeSinceFirstFrame, faceNow(FK.value, fc.value, info.timestamp));
  }, !reduced);
  if (ring) {
    // ring: no blob, no blob cut. The circle (kitLook RING, picture units) fills the box and cuts the figure; the body runs
    // on past its lower arc. The drawer's picture is scaled so the circle's diameter is the box.
    const u = size / (2 * RING.r), w = VIEW.w * u, h = VIEW.h * u;
    return (
      <View style={{ width: size, height: size, borderRadius: size / 2, overflow: "hidden" }} pointerEvents="none">
        <View style={{ position: "absolute", left: (VIEW.x - (RING.cx - RING.r)) * u, top: (VIEW.y - (RING.cy - RING.r)) * u, width: w, height: h }}>
          <Figure fs={fs} mv={mv} hs={hs} jel={jel} B={B} uid={uid} w={w} h={h} blob={false} noCut arts={[]} pv={null} />
        </View>
      </View>
    );
  }
  const h = (size * VIEW.h) / VIEW.w;
  return (
    <View style={{ width: size, height: size }} pointerEvents="none">
      <View style={{ position: "absolute", left: 0, top: (size - h) / 2, width: size, height: h }}>
        <Figure fs={fs} mv={mv} hs={hs} jel={jel} B={B} uid={uid} w={size} h={h} blob blobColour={B.L.blob.colour} arts={[]} pv={null} />
      </View>
    </View>
  );
}

/** Keyed on the picture: a new look mounts a fresh drawer (its shared values start from the new look). */
export const KitAvatarLive = memo(function KitAvatarLive({ manifest, size, ring = false }: { manifest?: AvatarManifest | null; size: number; ring?: boolean }) {
  const picture = kitKey(manifest);
  return <Live key={picture} picture={picture} manifest={manifest} size={size} ring={ring} />;
});
