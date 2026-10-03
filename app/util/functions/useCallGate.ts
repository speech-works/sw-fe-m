import { useCallback, useEffect, useRef, useState } from "react";
import { isHeadsetConnected } from "./headset";
import { getSystemVolume, setSystemVolume } from "./systemVolume";
import {
  CallGateStep,
  VOLUME_LIMIT,
  VOLUME_TARGET,
  decideCallGate,
} from "./callGate";

const HEADSET_POLL_MS = 1500;

/** Headset first; the volume is read only once a headset is found. */
export async function evaluateCallGate(): Promise<CallGateStep> {
  const headset = await isHeadsetConnected();
  const volume = headset ? await getSystemVolume() : null;
  return decideCallGate(volume, VOLUME_LIMIT, headset);
}

/**
 * One gate, two steps in the same screen: headphones, then volume. Calls
 * `onReady` once, when nothing more is needed. It never spends the call; the
 * caller keeps its own way out.
 */
export function useCallGate(onReady: () => void) {
  const [step, setStep] = useState<CallGateStep | "checking">("checking");
  const [stillLoud, setStillLoud] = useState(false);
  const [busy, setBusy] = useState(false);
  const doneRef = useRef(false);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onReadyRef.current();
  }, []);

  const evaluate = evaluateCallGate;

  // Look now, and keep looking for headphones until they are there.
  useEffect(() => {
    if (doneRef.current) return;
    if (step === "need_lower_volume") return;
    let cancelled = false;
    const run = async () => {
      const next = await evaluate();
      if (cancelled || doneRef.current) return;
      if (next === "ok") finish();
      else setStep(next);
    };
    void run();
    if (step === "ok") return;
    const id = setInterval(run, HEADSET_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [step, evaluate, finish]);

  const lowerForMe = useCallback(async () => {
    setBusy(true);
    try {
      // If the volume cannot be set, carry on: the call must not be blocked.
      await setSystemVolume(VOLUME_TARGET);
      finish();
    } finally {
      setBusy(false);
    }
  }, [finish]);

  const iLowered = useCallback(async () => {
    setBusy(true);
    try {
      const next = await evaluate();
      if (next === "ok") finish();
      else if (next === "need_headset") {
        setStillLoud(false);
        setStep("need_headset");
      } else setStillLoud(true);
    } finally {
      setBusy(false);
    }
  }, [evaluate, finish]);

  return { step, stillLoud, busy, lowerForMe, iLowered };
}
