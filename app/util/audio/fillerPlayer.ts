/**
 * Filler clips for AI phone calls.
 *
 * When a reply takes a while (the AI model or the voice provider is slow), the
 * app plays a short sound such as "Mm-hm." in the character's own voice, so the
 * caller does not sit in silence. The server says which clips match the voice
 * that is speaking (the `fillers` WebSocket event); this module decides when
 * one may play and owns the sounds.
 *
 * Founder rules this keeps:
 * - Only after the caller's turn has ended (never on the opening line, never
 *   while the caller may still be speaking).
 * - Never two sounds at once: a filler that started plays to its end and the
 *   reply waits for it (FILLER_FINISH_TIMEOUT_MS at most). It stops at once
 *   only if the caller starts speaking or the call ends.
 * - The same filler never plays twice in a row.
 * - A filler is NOT the reply: it never sends playback_started/complete and
 *   never touches the reply's sound.
 *
 * The decision logic is pure (shouldStartFiller, chooseNextFiller) so it is
 * unit tested; FillerPlayer takes its sound loader as a parameter so tests can
 * run without expo-av.
 */

/**
 * How long after the caller's turn ends before a filler may start. A normal
 * reply starts about 1.1 s after the turn ends; at 700 ms nearly every reply
 * got a filler first (real-phone test). A filler is only for a reply that is
 * really late.
 */
export const FILLER_START_DELAY_MS = 1800;
/** The longest the reply waits for a filler to finish before cutting it. */
export const FILLER_FINISH_TIMEOUT_MS = 1500;

export interface FillerGateInput {
  now: number;
  /** When the caller's last turn ended (user_text isFinal); null = not waiting for a reply. */
  turnEndedAt: number | null;
  /** The call's playback state, as in CallingWidget. */
  playbackState: string;
  /** The reply's audio has started, or is about to (its gate is closed). */
  replyStarting: boolean;
  /** A filler already played while waiting for this reply. */
  playedThisWait: boolean;
  /** The caller's voice was heard after the turn ended. */
  userSpokeSinceTurnEnd: boolean;
  fillerCount: number;
  stopping: boolean;
  /** A handover line is pending or playing (handoverPlayer.ts): it has priority. */
  handoverActive?: boolean;
}

/** True when a filler may start now. */
export function shouldStartFiller(i: FillerGateInput): boolean {
  if (i.stopping || i.fillerCount <= 0 || i.handoverActive) return false;
  if (i.turnEndedAt === null) return false;
  if (i.playbackState !== "user_listening" && i.playbackState !== "agent_preparing") return false;
  if (i.replyStarting || i.playedThisWait || i.userSpokeSinceTurnEnd) return false;
  return i.now - i.turnEndedAt >= FILLER_START_DELAY_MS;
}

/** A random filler index other than `previous` (when there is a choice). */
export function chooseNextFiller(
  count: number,
  previous: number | null,
  random: () => number = Math.random,
): number {
  if (count <= 1) return 0;
  if (previous === null || previous < 0 || previous >= count) {
    return Math.min(count - 1, Math.floor(random() * count));
  }
  // Pick among the other count-1 clips, then skip over `previous`.
  const pick = Math.min(count - 2, Math.floor(random() * (count - 1)));
  return pick >= previous ? pick + 1 : pick;
}

/** The part of expo-av's Audio.Sound this module uses. */
export interface FillerSound {
  playAsync(): Promise<unknown>;
  stopAsync(): Promise<unknown>;
  setPositionAsync(ms: number): Promise<unknown>;
  unloadAsync(): Promise<unknown>;
  setOnPlaybackStatusUpdate(cb: ((status: any) => void) | null): void;
  setVolumeAsync?(volume: number): Promise<unknown>;
}

export type FillerEndReason = "finished" | "user_speech" | "stopped" | "reply_timeout";

export interface FillerEnded {
  fillerIndex: number;
  reason: FillerEndReason;
  /** How long the reply was held back by this filler (0 if it was not waiting). */
  waitedMs: number;
}

/**
 * Owns the filler sounds of one call. Never shares the reply's sound object.
 */
export class FillerPlayer {
  private sounds: (FillerSound | null)[] = [];
  private urls: string[] = [];
  private generation = 0;
  private current: { index: number; sound: FillerSound; startedAt: number } | null = null;
  private previous: number | null = null;
  private waiters: (() => void)[] = [];
  private replyWaitStartedAt: number | null = null;
  private volume = 1;

  constructor(
    private readonly load: (uri: string) => Promise<FillerSound>,
    private readonly onEnded: (e: FillerEnded) => void = () => {},
    private readonly now: () => number = Date.now,
  ) {}

  /** How many clips are ready to play. */
  get count(): number {
    return this.sounds.filter(Boolean).length;
  }

  isPlaying(): boolean {
    return this.current !== null;
  }

  /**
   * Replaces the clips (a new `fillers` event). An empty list turns fillers
   * off. Clips are preloaded so a filler starts at once.
   */
  async setUrls(urls: string[]): Promise<void> {
    if (urls.length === this.urls.length && urls.every((u, i) => u === this.urls[i])) return;
    const gen = ++this.generation;
    const old = this.sounds;
    this.urls = [...urls];
    this.sounds = [];
    this.previous = null;
    // A playing filler of the old voice plays to its end; it is unloaded then.
    for (const s of old) if (s && s !== this.current?.sound) void s.unloadAsync().catch(() => {});
    const loaded = await Promise.all(
      urls.map((u) => this.load(u).catch(() => null)),
    );
    if (gen !== this.generation) {
      for (const s of loaded) if (s) void s.unloadAsync().catch(() => {});
      return;
    }
    this.sounds = loaded;
  }

  /** The voice's playback volume (the `fillers` event); used from the next filler on. */
  setVolume(volume: number): void {
    this.volume = volume;
  }

  getVolume(): number {
    return this.volume;
  }

  /** Plays a filler (not the one played last). Returns its index, or null. */
  async play(random: () => number = Math.random): Promise<number | null> {
    if (this.current) return null;
    const ready = this.sounds
      .map((s, i) => (s ? i : -1))
      .filter((i) => i >= 0);
    if (!ready.length) return null;
    const prevPos = this.previous === null ? null : ready.indexOf(this.previous);
    const index = ready[chooseNextFiller(ready.length, prevPos === -1 ? null : prevPos, random)];
    const sound = this.sounds[index]!;
    this.current = { index, sound, startedAt: this.now() };
    this.previous = index;
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status?.didJustFinish && this.current?.sound === sound) this.finish("finished");
    });
    try {
      await sound.setPositionAsync(0);
      await sound.setVolumeAsync?.(this.volume);
      await sound.playAsync();
    } catch {
      if (this.current?.sound === sound) this.finish("stopped");
      return null;
    }
    return index;
  }

  /**
   * Resolves once no filler is playing. The reply calls this before it starts;
   * after `timeoutMs` the filler is stopped so two sounds never overlap.
   */
  waitUntilIdle(timeoutMs: number = FILLER_FINISH_TIMEOUT_MS): Promise<void> {
    if (!this.current) return Promise.resolve();
    this.replyWaitStartedAt ??= this.now();
    return new Promise((resolve) => {
      let done = false;
      const timer = setTimeout(() => {
        if (done) return;
        if (this.current) this.finish("reply_timeout");
      }, timeoutMs);
      this.waiters.push(() => {
        done = true;
        clearTimeout(timer);
        resolve();
      });
    });
  }

  /** Stops the filler at once (the caller spoke, stop_playback, call end). */
  stop(reason: Exclude<FillerEndReason, "finished" | "reply_timeout"> = "stopped"): void {
    if (this.current) this.finish(reason);
  }

  /** Stops and unloads everything (call end). */
  async dispose(): Promise<void> {
    this.stop("stopped");
    this.generation++;
    const all = this.sounds;
    this.sounds = [];
    this.urls = [];
    this.previous = null;
    await Promise.all(all.map((s) => s?.unloadAsync().catch(() => {})));
  }

  private finish(reason: FillerEndReason): void {
    const cur = this.current;
    if (!cur) return;
    this.current = null;
    cur.sound.setOnPlaybackStatusUpdate(null);
    if (reason !== "finished") void cur.sound.stopAsync().catch(() => {});
    // A clip of a voice that was replaced while it played is unloaded now.
    if (!this.sounds.includes(cur.sound)) void cur.sound.unloadAsync().catch(() => {});
    const waitedMs = this.replyWaitStartedAt === null ? 0 : Math.max(0, this.now() - this.replyWaitStartedAt);
    this.replyWaitStartedAt = null;
    const waiters = this.waiters;
    this.waiters = [];
    for (const w of waiters) w();
    this.onEnded({ fillerIndex: cur.index, reason, waitedMs });
  }
}
