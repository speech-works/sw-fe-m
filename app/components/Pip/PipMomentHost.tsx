/**
 * The one place Pip's moments play in the app: mounted once at the root, above every screen (not above native modals, so a
 * screen fires its moment after its own sheet or modal has closed, or instead of it). Screens call showPipMoment(id).
 * One moment at a time: a moment asked for while another plays waits for it (at most one waits; more are dropped, never stacked).
 */
import React, { useEffect, useRef } from "react";
import { PipMoment } from "./PipMoment";
import type { PipMomentHandle } from "./PipMoment";
import { pipMoment } from "./pipMoments";
import type { PipMomentDef, PipMomentId } from "./pipMoments";
import type { AvatarManifest } from "../../types/avatar";
import { useUserStore } from "../../stores/user";

let host: PipMomentHandle | null = null, playing: Promise<void> | null = null, waiting = false;

/** Play a moment (pipMoments.ts). `override` changes its text, e.g. the real day number. A moment whose figure is "user"
 *  is played by the user's own avatar: `override.look`, or else the signed-in user's saved one. Resolves when the figure has left. */
export async function showPipMoment(id: PipMomentId, override?: Partial<Pick<PipMomentDef, "title" | "body">> & { look?: AvatarManifest | null; variant?: string }): Promise<void> {
  if (!host) return;
  if (playing) { if (waiting) return; waiting = true; await playing; waiting = false; }
  const def = pipMoment(id);
  const look = def.figure === "user" ? (override?.look !== undefined ? override.look : useUserStore.getState().user?.avatarManifest ?? null) : undefined;
  const run = host.play({ ...def, ...override, ...(look !== undefined ? { look } : {}) });
  playing = run.finally(() => { playing = null; });
  return playing;
}

export function PipMomentHost({ dark = true, sound = true }: { dark?: boolean; sound?: boolean }) {
  const ref = useRef<PipMomentHandle>(null);
  useEffect(() => { host = ref.current; return () => { host = null; }; }, []);
  return <PipMoment ref={ref} dark={dark} sound={sound} />;
}
