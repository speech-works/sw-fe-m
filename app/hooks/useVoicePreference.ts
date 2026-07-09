import { useCallback, useEffect, useMemo, useState } from "react";
import { useVoicePreferenceStore } from "../stores/voicePreference";
import {
  getAccentGroups,
  resolveVoiceForPreference,
} from "../util/voice";
import type {
  AccentGroup,
  ResolvedVoice,
  SupportedAccentLocale,
  VoiceProfile,
} from "../util/voice/types";

/**
 * Single consumer API for the voice-hover accent feature. Combines:
 *  - the persisted, app-wide preference (zustand store),
 *  - the device's installed accent catalogue (re-enumerated on demand),
 *  - the resolved concrete voice to speak with (never-dead-end fallback).
 *
 * Used by both the in-tool AccentPicker and the speaking components so they
 * stay perfectly consistent. Selecting an accent/voice saves immediately.
 */
export function useVoicePreference() {
  const preference = useVoicePreferenceStore((s) => s.preference);
  const setPreference = useVoicePreferenceStore((s) => s.setPreference);

  const [groups, setGroups] = useState<AccentGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setGroups(await getAccentGroups());
    } catch (e) {
      console.warn("[useVoicePreference] failed to enumerate voices:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const resolved: ResolvedVoice = useMemo(
    () => resolveVoiceForPreference(preference, groups),
    [preference, groups],
  );

  /** Pick an accent; uses the accent's best installed voice unless one is given. */
  const selectAccent = useCallback(
    (accent: SupportedAccentLocale, voice?: VoiceProfile) => {
      const group = groups.find((g) => g.locale === accent);
      const chosen = voice ?? group?.bestVoice;
      setPreference({
        accent,
        voiceIdentifier: chosen?.identifier,
        voiceName: chosen?.name,
        quality: chosen?.quality ?? "basic",
      });
    },
    [groups, setPreference],
  );

  /** Pick a specific voice within a curated accent. */
  const selectVoice = useCallback(
    (voice: VoiceProfile) => {
      if (!voice.accent) return;
      setPreference({
        accent: voice.accent,
        voiceIdentifier: voice.identifier,
        voiceName: voice.name,
        quality: voice.quality,
      });
    },
    [setPreference],
  );

  return {
    preference,
    groups,
    loading,
    resolved,
    refresh,
    selectAccent,
    selectVoice,
  };
}
