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

let host: PipMomentHandle | null = null, playing: Promise<void> | null = null, waiting = false;

/** Play a moment (pipMoments.ts). `with` overrides its text, e.g. the real day number. Resolves when Pip has left. */
export async function showPipMoment(id: PipMomentId, override?: Partial<Pick<PipMomentDef, "title" | "body">>): Promise<void> {
  if (!host) return;
  if (playing) { if (waiting) return; waiting = true; await playing; waiting = false; }
  const run = host.play({ ...pipMoment(id), ...override });
  playing = run.finally(() => { playing = null; });
  return playing;
}

export function PipMomentHost({ dark = true, sound = true }: { dark?: boolean; sound?: boolean }) {
  const ref = useRef<PipMomentHandle>(null);
  useEffect(() => { host = ref.current; return () => { host = null; }; }, []);
  return <PipMoment ref={ref} dark={dark} sound={sound} />;
}
