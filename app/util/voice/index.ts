// Barrel for the on-device voice / accent capability layer (Phase 1 of the
// voice-hover "tool nature" feature). See ./types and the plan for context.

export * from "./types";
export {
  SUPPORTED_ACCENTS,
  ACCENT_META_BY_LOCALE,
  toSupportedAccent,
} from "./accents";
export type { AccentMeta } from "./accents";
export {
  getEnglishVoiceProfiles,
  getAccentGroups,
  resolveVoiceForPreference,
  speakWithProfile,
  stopSpeaking,
  getDeviceVoiceDiagnostics,
} from "./voiceCapability";
export type { SpeakOptions, VoiceDiagnosticRow } from "./voiceCapability";
export {
  launchAndroidVoiceInstall,
  openIOSSettings,
  IOS_VOICE_DOWNLOAD_STEPS,
} from "./voiceInstall";
