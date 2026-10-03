/**
 * The handover line for AI phone calls.
 *
 * When the voice provider of a call fails and another voice has to speak the
 * next line, the server sends `handover` {jobId, url, durationMs}: the OLD
 * voice's clip "Sorry, I have a bad line. My colleague will pick up." The
 * server holds the next line's audio until this app sends
 * `handover_complete` {jobId} (or 5 s at most), so the two never overlap.
 *
 * Rules this module keeps (pure parts unit tested):
 * - Played only for the line that is about to play (the latest play_stream)
 *   and only before its audio started. A handover that arrives late, twice,
 *   for an older line, or after hang-up is ignored and NOT acked; the
 *   server's own timeout covers it.
 * - One sound at a time: a filler that already started plays to its end
 *   first (the filler player's own cap applies), then the handover. No new
 *   filler starts while a handover is pending or playing.
 * - The reply waits for the handover clip to end.
 * - Stops at once when the caller speaks (then acks, so the held line is
 *   released and the server's barge-in logic decides), on stop_playback,
 *   call_ended and hang-up (no ack: the server already dropped the line).
 * - Its own sounds: never the reply's sound, never playback_started/complete.
 * - Played at the OLD voice's volume (`volume` on the event, voiceVolume.ts).
 */

import { voiceVolumeOrDefault } from "./voiceVolume";

/** Longest the reply waits for a handover clip before cutting it. */
export const HANDOVER_REPLY_WAIT_MAX_MS = 6000;
/** A clip that never reports its end is ended this long after its duration. */
export const HANDOVER_PLAY_GRACE_MS = 1500;
/** Used when the server did not send a duration. */
export const HANDOVER_DEFAULT_DURATION_MS = 5000;

export interface HandoverMessage {
  jobId: string;
  url: string;
  durationMs: number | null;
  /** Playback volume of the OLD voice (voiceVolume.ts); missing = 1. */
  volume?: number;
}

/** The `handover` WebSocket event, or null when it is malformed. */
export function parseHandoverMessage(data: unknown): HandoverMessage | null {
  if (typeof data !== "object" || data === null) return null;
  const d = data as Record<string, unknown>;
  if (typeof d.jobId !== "string" || !d.jobId || typeof d.url !== "string" || !d.url) return null;
  const durationMs =
    typeof d.durationMs === "number" && Number.isFinite(d.durationMs) && d.durationMs > 0 ? d.durationMs : null;
  return { jobId: d.jobId, url: d.url, durationMs, volume: voiceVolumeOrDefault(d.volume) };
}

export type HandoverArrival = "play" | "late" | "stale" | "duplicate" | "inactive";

export interface HandoverArrivalInput {
  jobId: string;
  /** jobId of the latest play_stream (the line that is about to play). */
  currentJobId: string | null;
  /** The reply's audio for the current line already started. */
  replyAudioStarted: boolean;
  /** This jobId was already handled (played or ignored). */
  alreadyHandled: boolean;
  /** The call is live (not stopping or ended). */
  callActive: boolean;
}

/** Pure: what to do with a `handover` event. Only "play" plays and acks. */
export function decideHandoverArrival(i: HandoverArrivalInput): HandoverArrival {
  if (!i.callActive) return "inactive";
  if (i.alreadyHandled) return "duplicate";
  if (i.jobId !== i.currentJobId) return "stale";
  if (i.replyAudioStarted) return "late";
  return "play";
}

export type HandoverEndReason =
  | "finished"
  | "user_speech"
  | "load_failed"
  | "play_timeout"
  | "reply_timeout"
  | "stopped";

/**
 * Pure: whether the end of the clip is acked with `handover_complete`.
 * "stopped" comes from stop_playback, call_ended or hang-up: the server has
 * already dropped the held line, so nothing is sent.
 */
export function shouldAckHandover(reason: HandoverEndReason): boolean {
  return reason !== "stopped";
}

/** The part of expo-av's Audio.Sound this module uses. */
export interface HandoverSound {
  playAsync(): Promise<unknown>;
  stopAsync(): Promise<unknown>;
  setPositionAsync(ms: number): Promise<unknown>;
  unloadAsync(): Promise<unknown>;
  setOnPlaybackStatusUpdate(cb: ((status: any) => void) | null): void;
  setVolumeAsync?(volume: number): Promise<unknown>;
}

export interface HandoverEnded {
  jobId: string;
  reason: HandoverEndReason;
  /** From the `handover` event to the end of the clip. */
  waitedMs: number;
  /** The clip actually started playing. */
  played: boolean;
}

interface Active {
  jobId: string;
  arrivedAt: number;
  sound: HandoverSound | null;
  played: boolean;
  timer: ReturnType<typeof setTimeout> | null;
  endReason: HandoverEndReason | null;
}

/** Owns the handover clips of one call. Never shares the reply's sound. */
export class HandoverPlayer {
  /** Preloaded clips by URL: the current voice's and, briefly, the previous one. */
  private preloaded = new Map<string, HandoverSound>();
  private active: Active | null = null;
  private waiters: (() => void)[] = [];
  private handled: string[] = [];
  private disposed = false;

  constructor(
    private readonly load: (uri: string) => Promise<HandoverSound>,
    private readonly onEnded: (e: HandoverEnded) => void = () => {},
    private readonly now: () => number = Date.now,
  ) {}

  isActive(): boolean {
    return this.active !== null;
  }

  wasHandled(jobId: string): boolean {
    return this.handled.includes(jobId);
  }

  /** Remembers a jobId as handled (also for ignored events), so a repeat is a duplicate. */
  markHandled(jobId: string): void {
    if (this.handled.includes(jobId)) return;
    this.handled.push(jobId);
    if (this.handled.length > 20) this.handled.shift();
  }

  /**
   * Preloads the speaking voice's clip (from the `fillers` event), so it
   * starts at once if that voice fails later. Keeps the last two voices: the
   * `handover` for the old voice can arrive just before the new voice's
   * `fillers` event.
   */
  async preload(url: string | null): Promise<void> {
    if (!url || this.disposed || this.preloaded.has(url)) return;
    let sound: HandoverSound;
    try {
      sound = await this.load(url);
    } catch {
      return;
    }
    if (this.disposed || this.preloaded.has(url)) {
      void sound.unloadAsync().catch(() => {});
      return;
    }
    this.preloaded.set(url, sound);
    while (this.preloaded.size > 2) {
      const [oldUrl, oldSound] = this.preloaded.entries().next().value as [string, HandoverSound];
      this.preloaded.delete(oldUrl);
      if (oldSound !== this.active?.sound) void oldSound.unloadAsync().catch(() => {});
    }
  }

  /**
   * Plays the clip. `waitForFiller` resolves once no filler is playing (a
   * filler that started plays to its end first). Resolves when the clip ends.
   */
  async play(msg: HandoverMessage, waitForFiller: () => Promise<void> = async () => {}): Promise<HandoverEndReason> {
    this.markHandled(msg.jobId);
    if (this.active || this.disposed) return "stopped";
    const active: Active = {
      jobId: msg.jobId,
      arrivedAt: this.now(),
      sound: null,
      played: false,
      timer: null,
      endReason: null,
    };
    this.active = active;
    const ended = new Promise<HandoverEndReason>((resolve) => {
      this.waiters.push(() => resolve(active.endReason ?? "stopped"));
    });
    const finish = (reason: HandoverEndReason) => this.finish(active, reason);

    await waitForFiller().catch(() => {});
    if (this.active !== active) return ended;

    let sound = this.preloaded.get(msg.url) ?? null;
    if (sound) {
      this.preloaded.delete(msg.url);
    } else {
      try {
        sound = await this.load(msg.url);
      } catch {
        if (this.active === active) finish("load_failed");
        return ended;
      }
      if (this.active !== active) {
        void sound.unloadAsync().catch(() => {});
        return ended;
      }
    }
    active.sound = sound;
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status?.didJustFinish && this.active === active) finish("finished");
    });
    active.timer = setTimeout(() => {
      if (this.active === active) finish("play_timeout");
    }, (msg.durationMs ?? HANDOVER_DEFAULT_DURATION_MS) + HANDOVER_PLAY_GRACE_MS);
    try {
      await sound.setPositionAsync(0);
      await sound.setVolumeAsync?.(msg.volume ?? 1);
      if (this.active !== active) return ended;
      await sound.playAsync();
      active.played = true;
    } catch {
      if (this.active === active) finish("load_failed");
    }
    return ended;
  }

  /**
   * The reply calls this once its audio is loaded: resolves when no handover
   * is playing. After `timeoutMs` the clip is stopped so the two never overlap.
   */
  waitUntilIdle(timeoutMs: number = HANDOVER_REPLY_WAIT_MAX_MS): Promise<void> {
    const active = this.active;
    if (!active) return Promise.resolve();
    return new Promise((resolve) => {
      let done = false;
      const timer = setTimeout(() => {
        if (!done && this.active === active) this.finish(active, "reply_timeout");
      }, timeoutMs);
      this.waiters.push(() => {
        done = true;
        clearTimeout(timer);
        resolve();
      });
    });
  }

  /** Stops the clip at once (the caller spoke, stop_playback, call end). */
  stop(reason: "user_speech" | "stopped" = "stopped"): void {
    if (this.active) this.finish(this.active, reason);
  }

  async dispose(): Promise<void> {
    this.stop("stopped");
    this.disposed = true;
    const all = [...this.preloaded.values()];
    this.preloaded.clear();
    await Promise.all(all.map((s) => s.unloadAsync().catch(() => {})));
  }

  private finish(active: Active, reason: HandoverEndReason): void {
    if (this.active !== active) return;
    this.active = null;
    active.endReason = reason;
    if (active.timer) clearTimeout(active.timer);
    const sound = active.sound;
    if (sound) {
      sound.setOnPlaybackStatusUpdate(null);
      if (reason !== "finished") void sound.stopAsync().catch(() => {});
      void sound.unloadAsync().catch(() => {});
    }
    const waiters = this.waiters;
    this.waiters = [];
    for (const w of waiters) w();
    this.onEnded({
      jobId: active.jobId,
      reason,
      waitedMs: Math.max(0, this.now() - active.arrivedAt),
      played: active.played,
    });
  }
}
