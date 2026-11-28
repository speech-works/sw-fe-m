/**
 * The front layer of a moment's effect, drawn ABOVE a sheet.
 *
 * On a screen where Pip stands behind a sheet's edge (the day's steps, day done, the notes screen) the sheet is drawn over
 * him, and so over everything inside his stage: a prop that acts ON the sheet (the pencil that ticks the text, the jar,
 * stars falling over the page) would be hidden under it. Android draws children in order (zIndex only sorts siblings),
 * so the layer cannot climb out of the stage by itself.
 *
 * The screen puts <FxFront> around its Pip and <FxFrontHost/> after its sheet. Every PipStage inside hands its front
 * layer to the host, which draws it over the whole screen (in window coordinates, so it does not matter where the host
 * sits). The particles still read the stage's one clock: nothing extra moves per frame.
 */
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

type Nodes = Record<string, React.ReactNode>;
export interface FxFrontApi { set: (key: string, node: React.ReactNode | null) => void }
const Ctx = createContext<FxFrontApi | null>(null);
const HostCtx = createContext<{ nodes: Nodes } | null>(null);

/** The stage inside asks for this: null = draw the front layer in the stage as usual. */
export const useFxFront = () => useContext(Ctx);

/** Wrap the part of the screen that holds both the Pip(s) and the host. */
export function FxFront({ children }: { children: React.ReactNode }) {
  const [nodes, setNodes] = useState<Nodes>({});
  const set = useCallback((key: string, node: React.ReactNode | null) => {
    setNodes(old => {
      if (node == null) { if (!(key in old)) return old; const n = { ...old }; delete n[key]; return n; }
      return { ...old, [key]: node };
    });
  }, []);
  const api = useMemo(() => ({ set }), [set]);
  const host = useMemo(() => ({ nodes }), [nodes]);
  return <Ctx.Provider value={api}><HostCtx.Provider value={host}>{children}</HostCtx.Provider></Ctx.Provider>;
}

/** Draws the front layers over the screen. Put it after the sheet (and before any buttons that must stay on top). */
export function FxFrontHost() {
  const host = useContext(HostCtx);
  const ref = useRef<View>(null);
  const [off, setOff] = useState<[number, number]>([0, 0]);
  const measure = () => ref.current?.measureInWindow((x, y) => { if (Number.isFinite(x) && Number.isFinite(y)) setOff(o => (o[0] === x && o[1] === y ? o : [x, y])); });
  const list = host ? Object.entries(host.nodes) : [];
  return (
    <View ref={ref} onLayout={measure} pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 60 }]}>
      {/* the layers are placed in window coordinates: move them back by where the host sits */}
      <View pointerEvents="none" style={{ position: "absolute", left: -off[0], top: -off[1] }}>
        {list.map(([k, n]) => <React.Fragment key={k}>{n}</React.Fragment>)}
      </View>
    </View>);
}
