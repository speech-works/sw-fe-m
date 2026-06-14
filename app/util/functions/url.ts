/**
 * Normalizes and safety-checks a user-provided link before it is opened with
 * Linking.openURL. Only http/https destinations are allowed, so a malicious or
 * malformed value (e.g. `javascript:`, `file:`, `intent:`) can never be
 * launched. A scheme-less value like "instagram.com/me" is treated as https.
 *
 * Returns a safe, fully-qualified URL string, or null if the input is unsafe.
 */
export function toSafeExternalUrl(
  url: string | undefined | null,
): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // If the value already declares a scheme, only http/https are allowed.
  const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed);
  const candidate = hasScheme ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}
