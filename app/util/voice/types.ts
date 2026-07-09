// Shared types for the on-device voice / accent capability layer.
//
// Phase 1 of the "voice-hover tool nature" feature: let users pick the accent
// the reading-guide voice speaks in, using only on-device (expo-speech) voices.
// See the plan in .claude/plans for the full rationale (cost, store compliance,
// per-device availability caveats).

/**
 * The accents we curate in the picker. These are the English locales that the
 * built-in iOS (AVSpeechSynthesizer) / Android (Google TTS) engines expose.
 * NOTE: presence is per-device — a locale being listed here does NOT mean a
 * voice for it is installed. Availability is resolved at runtime.
 */
export type SupportedAccentLocale =
  | "en-IN" // Indian
  | "en-US" // American
  | "en-GB" // British
  | "en-AU" // Australian
  | "en-IE" // Irish
  | "en-ZA"; // South African

/**
 * Quality tier as surfaced to the user. "natural" = a non-robotic voice
 * (iOS Enhanced/Premium, Android network/high-quality); "basic" = the robotic
 * default that ships preinstalled. The distinction drives the "get the natural
 * version" affordance.
 */
export type VoiceQualityTier = "natural" | "basic";

/** A single concrete on-device voice we can speak with. */
export interface VoiceProfile {
  /** Platform voice identifier passed to Speech.speak({ voice }). */
  identifier: string;
  /** Human/engine name (e.g. "Rishi", "en-in-x-ene-network"). */
  name: string;
  /** BCP-47 language tag from the engine (e.g. "en-IN"). */
  language: string;
  /** Curated accent this voice maps to, if it is one we surface. */
  accent?: SupportedAccentLocale;
  /** Whether this voice is non-robotic. */
  quality: VoiceQualityTier;
  /** Android network voice (higher quality, needs connectivity). */
  isNetwork?: boolean;
}

/** A curated accent plus the voices actually installed for it on this device. */
export interface AccentGroup {
  locale: SupportedAccentLocale;
  /** Display label, e.g. "Indian". */
  label: string;
  /** Emoji flag for the row. */
  flag: string;
  /** Installed voices for this accent (best first). Empty => not installed. */
  voices: VoiceProfile[];
  /** Preferred voice for this accent (natural first), if any installed. */
  bestVoice?: VoiceProfile;
  /** Any voice installed for this accent. */
  isAvailable: boolean;
  /** A non-robotic voice is installed for this accent. */
  hasNatural: boolean;
}

/**
 * The persisted, app-wide voice preference. We store locale + name (not only
 * the identifier) because identifiers can change across OS updates, so we can
 * re-resolve resiliently.
 */
export interface VoicePreference {
  accent: SupportedAccentLocale;
  /** Last-known identifier; may be stale after an OS update. */
  voiceIdentifier?: string;
  /** Last-known voice name, used to re-resolve if the identifier is gone. */
  voiceName?: string;
  quality: VoiceQualityTier;
}

/** How a request to resolve a voice for a preference actually resolved. */
export type VoiceResolutionReason =
  | "exact" // requested accent + a natural voice
  | "accent-basic" // requested accent but only a robotic voice installed
  | "fallback-accent" // requested accent not installed; used another natural accent
  | "auto" // nothing matched; engine default
  | "none"; // no English voice at all on the device

export interface ResolvedVoice {
  voice?: VoiceProfile;
  reason: VoiceResolutionReason;
}
