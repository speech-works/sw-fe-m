import { getPhonemes } from "./index";
import { Phoneme } from "./types";

/**
 * The /phonemes audio URLs are S3 presigns with a one-hour TTL (X-Amz-Expires
 * is set to 3600 by the backend presigner). A list fetched at mount therefore
 * goes bad in place: leave a Difficult Sounds picker open past the hour and
 * every tap plays nothing, failing with the same opaque AVPlayer -11800 that
 * the audio-session bugs produce. S3 answers an expired signature with 403,
 * and the player cannot tell that apart from an unreachable file.
 *
 * Shared between the two pickers (Settings and Onboarding) for the same reason
 * `ensurePlaybackSession` is: they are verbatim copies of each other, and a fix
 * applied to one has already been forgotten in the other once.
 */
const PRESIGN_TTL_MS = 60 * 60 * 1000;

/** Ten minutes of margin: clock skew between the presigning server and the
 *  device, plus however long a tap sits between resolve and actual fetch. */
const REFRESH_MARGIN_MS = 10 * 60 * 1000;

const phonemeUrlsAreStale = (fetchedAtMs: number): boolean =>
  Date.now() - fetchedAtMs > PRESIGN_TTL_MS - REFRESH_MARGIN_MS;

/**
 * Carry fresh audio URLs onto the list a picker is already showing WITHOUT
 * reordering it: both pickers sort selected-first at load, and re-sorting
 * mid-session would shuffle the rows under the user's finger.
 */
const withFreshAudioUrls = (
  current: Phoneme[],
  fresh: Phoneme[],
): Phoneme[] => {
  const freshByCode = new Map(fresh.map((p) => [p.code, p]));
  return current.map((p) => {
    const f = freshByCode.get(p.code);
    return f ? { ...p, audioUrl: f.audioUrl } : p;
  });
};

/**
 * The playable URL for a tapped phoneme: the one already in hand while the
 * presigns are young, a refetched one once they are near or past expiry.
 * `setPhonemes` receives the refreshed list so the whole screen starts young
 * again; a failed refetch falls back to the URL we had, whose failure the
 * caller's own error path already reports.
 */
export async function playableAudioUrl(
  code: string,
  currentUrl: string,
  fetchedAt: { current: number },
  setPhonemes: (updater: (prev: Phoneme[]) => Phoneme[]) => void,
): Promise<string> {
  if (!phonemeUrlsAreStale(fetchedAt.current)) return currentUrl;
  try {
    const fresh = await getPhonemes();
    fetchedAt.current = Date.now();
    setPhonemes((prev) => withFreshAudioUrls(prev, fresh));
    return fresh.find((p) => p.code === code)?.audioUrl ?? currentUrl;
  } catch {
    return currentUrl;
  }
}
