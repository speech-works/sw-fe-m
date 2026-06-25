import * as Speech from "expo-speech";
import { Platform } from "react-native";
import { SUPPORTED_ACCENTS, toSupportedAccent } from "./accents";
import type {
  AccentGroup,
  ResolvedVoice,
  SupportedAccentLocale,
  VoicePreference,
  VoiceProfile,
  VoiceQualityTier,
} from "./types";

/**
 * On-device voice capability layer. Single source of truth for:
 *  - enumerating the English voices installed on this device,
 *  - grouping them into curated accents with a quality tier,
 *  - resolving the best concrete voice for a saved preference (fallback chain),
 *  - speaking text with a chosen voice.
 *
 * Everything here is on-device, offline, and free (expo-speech wraps the OS
 * TTS engines). Nothing here makes a network call.
 */

/** Raw expo-speech voice shape we rely on. */
type RawVoice = Speech.Voice;

/**
 * Classify a raw voice as natural (non-robotic) or basic (robotic default).
 *
 * iOS exposes a real quality enum (Enhanced/Premium are the non-robotic ones,
 * each a ~100MB download). Android rarely sets the quality field, so we lean on
 * the Google-TTS naming convention where "-network" voices are the higher
 * quality ones. This is a heuristic and intentionally conservative; the Step 0
 * device diagnostic (getDeviceVoiceDiagnostics) is how we validate/refine it on
 * real hardware.
 */
function classifyQuality(voice: RawVoice): VoiceQualityTier {
  const name = voice.name?.toLowerCase() ?? "";
  if (voice.quality === Speech.VoiceQuality.Enhanced) return "natural";
  if (name.includes("enhanced") || name.includes("premium")) return "natural";
  // Android Google TTS: network voices are the non-robotic tier.
  if (Platform.OS === "android" && name.includes("network")) return "natural";
  return "basic";
}

function isNetworkVoice(voice: RawVoice): boolean {
  return (voice.name?.toLowerCase() ?? "").includes("network");
}

function toVoiceProfile(voice: RawVoice): VoiceProfile {
  return {
    identifier: voice.identifier,
    name: voice.name,
    language: voice.language,
    accent: toSupportedAccent(voice.language) ?? undefined,
    quality: classifyQuality(voice),
    isNetwork: isNetworkVoice(voice),
  };
}

/** All English voices installed on this device, as VoiceProfiles. */
export async function getEnglishVoiceProfiles(): Promise<VoiceProfile[]> {
  const all = await Speech.getAvailableVoicesAsync();
  return all
    .filter((v) => !!v.identifier && v.language?.toLowerCase().startsWith("en"))
    .map(toVoiceProfile);
}

/**
 * Order voices best-first within an accent: natural before basic, then
 * (on Android) offline/local before network so the default works without
 * connectivity, then by name for stability.
 */
function compareVoices(a: VoiceProfile, b: VoiceProfile): number {
  if (a.quality !== b.quality) return a.quality === "natural" ? -1 : 1;
  if (!!a.isNetwork !== !!b.isNetwork) return a.isNetwork ? 1 : -1;
  return a.name.localeCompare(b.name);
}

/**
 * Build the curated accent catalogue for this device. Always returns one entry
 * per supported accent (even if no voice is installed) so the picker can show
 * "installable" rows and drive the install flow.
 */
export async function getAccentGroups(
  voices?: VoiceProfile[],
): Promise<AccentGroup[]> {
  const profiles = voices ?? (await getEnglishVoiceProfiles());

  return SUPPORTED_ACCENTS.map((meta) => {
    const groupVoices = profiles
      .filter((v) => v.accent === meta.locale)
      .sort(compareVoices);
    const bestVoice = groupVoices[0];
    return {
      locale: meta.locale,
      label: meta.label,
      flag: meta.flag,
      voices: groupVoices,
      bestVoice,
      isAvailable: groupVoices.length > 0,
      hasNatural: groupVoices.some((v) => v.quality === "natural"),
    };
  });
}

/** The best natural voice across all installed accents, if any. */
function bestNaturalVoiceAcrossAccents(
  groups: AccentGroup[],
): VoiceProfile | undefined {
  for (const group of groups) {
    const natural = group.voices.find((v) => v.quality === "natural");
    if (natural) return natural;
  }
  // No natural anywhere: fall back to any available voice.
  for (const group of groups) {
    if (group.bestVoice) return group.bestVoice;
  }
  return undefined;
}

/**
 * Resolve a concrete voice for a saved preference, implementing the plan's
 * never-dead-end decision tree:
 *   1. requested accent + natural voice  -> "exact"
 *   2. requested accent, only basic voice -> "accent-basic"
 *   3. requested accent not installed     -> best natural elsewhere ("fallback-accent")
 *   4. nothing natural at all             -> best available ("fallback-accent"/"auto")
 *   5. no English voice                   -> engine default ("none")
 *
 * Re-resolution is resilient: we match by identifier first, then by name within
 * the accent (identifiers can change across OS updates).
 */
export function resolveVoiceForPreference(
  preference: VoicePreference | null | undefined,
  groups: AccentGroup[],
): ResolvedVoice {
  const anyVoice = groups.some((g) => g.isAvailable);
  if (!anyVoice) return { reason: "none" };

  if (!preference) {
    return { voice: bestNaturalVoiceAcrossAccents(groups), reason: "auto" };
  }

  const group = groups.find((g) => g.locale === preference.accent);

  if (group?.isAvailable) {
    // Prefer the exact saved voice if still present.
    const byId = preference.voiceIdentifier
      ? group.voices.find((v) => v.identifier === preference.voiceIdentifier)
      : undefined;
    const byName = preference.voiceName
      ? group.voices.find((v) => v.name === preference.voiceName)
      : undefined;
    const chosen = byId ?? byName ?? group.bestVoice;

    if (chosen) {
      return {
        voice: chosen,
        reason: chosen.quality === "natural" ? "exact" : "accent-basic",
      };
    }
  }

  // Requested accent not installed: don't strand the user.
  const fallback = bestNaturalVoiceAcrossAccents(groups);
  return { voice: fallback, reason: fallback ? "fallback-accent" : "auto" };
}

export interface SpeakOptions {
  /** Resolved voice to use. If absent, falls back to language routing/default. */
  voice?: VoiceProfile;
  /** Locale to route by when no explicit voice is available (e.g. "en-IN"). */
  language?: SupportedAccentLocale | string;
  rate?: number;
  /** Base pitch; a small ±3% jitter is applied for naturalness unless disabled. */
  pitch?: number;
  jitterPitch?: boolean;
  onStart?: () => void;
  onDone?: () => void;
  onStopped?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Speak text with the chosen voice. Centralises the Speech.speak call so every
 * surface (VoiceHover, speakText) behaves identically. Passing both `voice` and
 * `language` lets the engine fall back to locale routing if the identifier is
 * momentarily unavailable.
 */
export function speakWithProfile(text: string, options: SpeakOptions = {}): void {
  const {
    voice,
    language,
    rate = 1.0,
    pitch = 1.0,
    jitterPitch = true,
    onStart,
    onDone,
    onStopped,
    onError,
  } = options;

  const finalPitch = jitterPitch ? pitch + (Math.random() * 0.06 - 0.03) : pitch;

  // IMPORTANT: pass EITHER an explicit voice identifier OR a language for locale
  // routing — never both. On iOS, sending `voice` + `language` together can make
  // the utterance silently never fire onDone, which hangs chunked playback.
  const routing = voice?.identifier
    ? { voice: voice.identifier }
    : language
      ? { language }
      : {};

  Speech.speak(text, {
    ...routing,
    rate,
    pitch: finalPitch,
    onStart,
    onDone,
    onStopped,
    onError,
  });
}

/** Stop any in-progress speech. Thin re-export so callers don't import Speech. */
export function stopSpeaking(): void {
  Speech.stop();
}

/**
 * Step 0 diagnostic: the raw, per-device truth of what voices exist. Used by a
 * dev-only screen/log to decide the final curated list on real hardware.
 */
export interface VoiceDiagnosticRow {
  name: string;
  language: string;
  identifier: string;
  quality: VoiceQualityTier;
  rawQuality: string;
  isNetwork: boolean;
  mappedAccent: SupportedAccentLocale | "—";
}

export async function getDeviceVoiceDiagnostics(): Promise<{
  platform: string;
  total: number;
  englishTotal: number;
  rows: VoiceDiagnosticRow[];
}> {
  const all = await Speech.getAvailableVoicesAsync();
  const english = all.filter((v) =>
    v.language?.toLowerCase().startsWith("en"),
  );
  const rows: VoiceDiagnosticRow[] = english
    .map(
      (v): VoiceDiagnosticRow => ({
        name: v.name,
        language: v.language,
        identifier: v.identifier,
        quality: classifyQuality(v),
        rawQuality: String(v.quality),
        isNetwork: isNetworkVoice(v),
        mappedAccent: toSupportedAccent(v.language) ?? "—",
      }),
    )
    .sort((a, b) => a.language.localeCompare(b.language));

  return {
    platform: `${Platform.OS} ${Platform.Version}`,
    total: all.length,
    englishTotal: english.length,
    rows,
  };
}
