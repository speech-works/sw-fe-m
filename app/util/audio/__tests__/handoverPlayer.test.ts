import { FILLER_START_DELAY_MS, FillerPlayer, shouldStartFiller, type FillerSound } from "../fillerPlayer";
import {
  HANDOVER_PLAY_GRACE_MS,
  HandoverPlayer,
  decideHandoverArrival,
  parseHandoverMessage,
  shouldAckHandover,
  type HandoverArrivalInput,
  type HandoverEnded,
  type HandoverSound,
} from "../handoverPlayer";

class FakeSound implements HandoverSound, FillerSound {
  cb: ((s: any) => void) | null = null;
  played = 0;
  stopped = 0;
  unloaded = 0;
  constructor(public uri: string) {}
  async playAsync() {
    this.played++;
  }
  async stopAsync() {
    this.stopped++;
  }
  async setPositionAsync() {}
  volume: number | null = null;
  async setVolumeAsync(v: number) {
    this.volume = v;
  }
  async unloadAsync() {
    this.unloaded++;
  }
  setOnPlaybackStatusUpdate(cb: ((s: any) => void) | null) {
    this.cb = cb;
  }
  finish() {
    this.cb?.({ isLoaded: true, didJustFinish: true });
  }
}

const URL_OLD = "https://api.test/tts/filler/speechify/kristy/handover";
const URL_NEW = "https://api.test/tts/filler/google/Kore/handover";
const MSG = { jobId: "j2", url: URL_OLD, durationMs: 3000 };
const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

function setup(opts: { failLoad?: boolean } = {}) {
  const sounds: FakeSound[] = [];
  const ended: HandoverEnded[] = [];
  let clock = 0;
  const player = new HandoverPlayer(
    async (uri) => {
      if (opts.failLoad) throw new Error("404");
      const s = new FakeSound(uri);
      sounds.push(s);
      return s;
    },
    (e) => ended.push(e),
    () => clock,
  );
  return { player, sounds, ended, tick: (ms: number) => (clock += ms) };
}

describe("parseHandoverMessage", () => {
  it("reads jobId, url and durationMs; rejects malformed events", () => {
    expect(parseHandoverMessage({ type: "handover", jobId: "j", url: "u", durationMs: 3360 })).toEqual({
      jobId: "j",
      url: "u",
      durationMs: 3360,
      volume: 1,
    });
    expect(parseHandoverMessage({ jobId: "j", url: "u", durationMs: 3360, volume: 0.46 })?.volume).toBe(0.46);
    expect(parseHandoverMessage({ jobId: "j", url: "u", durationMs: "x" })?.durationMs).toBeNull();
    expect(parseHandoverMessage({ jobId: "j", url: "u", durationMs: -1 })?.durationMs).toBeNull();
    expect(parseHandoverMessage({ url: "u" })).toBeNull();
    expect(parseHandoverMessage({ jobId: "j" })).toBeNull();
    expect(parseHandoverMessage(null)).toBeNull();
  });
});

describe("decideHandoverArrival", () => {
  const base: HandoverArrivalInput = {
    jobId: "j2",
    currentJobId: "j2",
    replyAudioStarted: false,
    alreadyHandled: false,
    callActive: true,
  };

  it("plays for the line that is about to play, before its audio", () => {
    expect(decideHandoverArrival(base)).toBe("play");
  });

  it("9. ignores it when the reply's audio already started (never overlap)", () => {
    expect(decideHandoverArrival({ ...base, replyAudioStarted: true })).toBe("late");
  });

  it("7. ignores a duplicate and a stale jobId", () => {
    expect(decideHandoverArrival({ ...base, alreadyHandled: true })).toBe("duplicate");
    expect(decideHandoverArrival({ ...base, currentJobId: "j3" })).toBe("stale");
    expect(decideHandoverArrival({ ...base, currentJobId: null })).toBe("stale");
  });

  it("6. ignores it after hang-up", () => {
    expect(decideHandoverArrival({ ...base, callActive: false })).toBe("inactive");
  });
});

describe("shouldAckHandover", () => {
  it("acks every end except a stop from the server or hang-up", () => {
    expect(shouldAckHandover("finished")).toBe(true);
    expect(shouldAckHandover("user_speech")).toBe(true);
    expect(shouldAckHandover("load_failed")).toBe(true);
    expect(shouldAckHandover("play_timeout")).toBe(true);
    expect(shouldAckHandover("reply_timeout")).toBe(true);
    expect(shouldAckHandover("stopped")).toBe(false);
  });
});

describe("8. fillers and the handover: one sound at a time", () => {
  it("no new filler starts while a handover is pending or playing", () => {
    const gate = {
      now: 10_000,
      turnEndedAt: 10_000 - FILLER_START_DELAY_MS,
      playbackState: "agent_preparing",
      replyStarting: false,
      playedThisWait: false,
      userSpokeSinceTurnEnd: false,
      fillerCount: 4,
      stopping: false,
    };
    expect(shouldStartFiller(gate)).toBe(true);
    expect(shouldStartFiller({ ...gate, handoverActive: true })).toBe(false);
  });

  it("a filler that already started plays to its end, then the handover plays", async () => {
    const fillerSounds: FakeSound[] = [];
    const filler = new FillerPlayer(async (u) => {
      const s = new FakeSound(u);
      fillerSounds.push(s);
      return s;
    });
    await filler.setUrls(["f0"]);
    await filler.play();
    const { player, sounds, ended } = setup();
    const done = player.play(MSG, () => filler.waitUntilIdle(1500));
    await flush();
    expect(sounds).toHaveLength(0); // the handover has not started
    expect(fillerSounds[0].stopped).toBe(0); // and the filler was not cut
    fillerSounds[0].finish();
    await flush();
    expect(sounds[0].played).toBe(1);
    sounds[0].finish();
    await expect(done).resolves.toBe("finished");
    expect(ended[0]).toMatchObject({ jobId: "j2", reason: "finished", played: true });
  });
});

describe("HandoverPlayer", () => {
  afterEach(() => jest.useRealTimers());

  it("plays a preloaded clip at once with its own sound, and reports the wait", async () => {
    const { player, sounds, ended, tick } = setup();
    await player.preload(URL_OLD);
    expect(sounds).toHaveLength(1);
    const done = player.play(MSG);
    await flush();
    expect(sounds).toHaveLength(1); // no second load
    expect(sounds[0].played).toBe(1);
    expect(player.isActive()).toBe(true);
    tick(3200);
    sounds[0].finish();
    await expect(done).resolves.toBe("finished");
    expect(ended).toEqual([{ jobId: "j2", reason: "finished", waitedMs: 3200, played: true }]);
    expect(player.isActive()).toBe(false);
    expect(sounds[0].unloaded).toBe(1);
  });

  it("plays the clip at the OLD voice's volume; 1 when the server sent none", async () => {
    const { player, sounds } = setup();
    const done = player.play({ ...MSG, volume: 0.46 });
    await flush();
    expect(sounds[0].volume).toBe(0.46);
    sounds[0].finish();
    await done;
    const again = player.play({ ...MSG, jobId: "j3" });
    await flush();
    expect(sounds[1].volume).toBe(1);
    sounds[1].finish();
    await again;
  });

  it("loads the clip when it was not preloaded", async () => {
    const { player, sounds } = setup();
    const done = player.play(MSG);
    await flush();
    expect(sounds[0].uri).toBe(URL_OLD);
    sounds[0].finish();
    await done;
  });

  it("keeps the old voice's clip when the new voice's is preloaded (handover comes first)", async () => {
    const { player, sounds } = setup();
    await player.preload(URL_OLD);
    await player.preload(URL_NEW);
    expect(sounds.map((s) => s.unloaded)).toEqual([0, 0]);
    await player.preload("https://api.test/third");
    expect(sounds[0].unloaded).toBe(1); // only the oldest beyond two is dropped
  });

  it("a clip that cannot load ends at once (and is acked, so the line is not held for nothing)", async () => {
    const { player, ended } = setup({ failLoad: true });
    await expect(player.play(MSG)).resolves.toBe("load_failed");
    expect(ended[0]).toMatchObject({ reason: "load_failed", played: false });
    expect(shouldAckHandover(ended[0].reason)).toBe(true);
  });

  it("6. the caller speaks: the clip stops at once", async () => {
    const { player, sounds, ended } = setup();
    const done = player.play(MSG);
    await flush();
    player.stop("user_speech");
    await expect(done).resolves.toBe("user_speech");
    expect(sounds[0].stopped).toBe(1);
    expect(ended[0].reason).toBe("user_speech");
    expect(player.isActive()).toBe(false);
  });

  it("6. stop_playback / hang-up before the clip loaded: it never plays", async () => {
    let resolveLoad!: (s: FakeSound) => void;
    const ended: HandoverEnded[] = [];
    const late = new FakeSound(URL_OLD);
    const player = new HandoverPlayer(
      () => new Promise((r) => (resolveLoad = r)),
      (e) => ended.push(e),
    );
    const done = player.play(MSG);
    await flush();
    player.stop("stopped");
    resolveLoad(late);
    await expect(done).resolves.toBe("stopped");
    await flush();
    expect(late.played).toBe(0);
    expect(late.unloaded).toBe(1);
    expect(shouldAckHandover(ended[0].reason)).toBe(false);
  });

  it("6. stopped while waiting for a filler: the handover never starts", async () => {
    const { player, sounds } = setup();
    let fillerDone!: () => void;
    const done = player.play(MSG, () => new Promise<void>((r) => (fillerDone = r)));
    await flush();
    player.stop("stopped");
    fillerDone();
    await expect(done).resolves.toBe("stopped");
    expect(sounds).toHaveLength(0);
  });

  it("6. dispose stops and unloads everything, and later events do nothing", async () => {
    const { player, sounds } = setup();
    await player.preload(URL_NEW);
    const done = player.play({ ...MSG, url: URL_OLD });
    await flush();
    await player.dispose();
    await expect(done).resolves.toBe("stopped");
    expect(sounds.every((s) => s.unloaded === 1)).toBe(true);
    await expect(player.play({ ...MSG, jobId: "j9" })).resolves.toBe("stopped");
  });

  it("10. a clip that never reports its end is ended after its duration + grace (no hang)", async () => {
    jest.useFakeTimers();
    const { player, ended } = setup();
    const done = player.play(MSG);
    await flush();
    jest.advanceTimersByTime(3000 + HANDOVER_PLAY_GRACE_MS);
    await expect(done).resolves.toBe("play_timeout");
    expect(ended[0].reason).toBe("play_timeout");
  });

  it("the reply waits for the clip to end; after the cap the clip is stopped (never overlap)", async () => {
    jest.useFakeTimers();
    const { player, sounds } = setup();
    void player.play(MSG);
    await flush();
    let replyMayStart = false;
    void player.waitUntilIdle(1000).then(() => (replyMayStart = true));
    await flush();
    expect(replyMayStart).toBe(false);
    jest.advanceTimersByTime(1000);
    await flush();
    expect(replyMayStart).toBe(true);
    expect(sounds[0].stopped).toBe(1);
    expect(player.isActive()).toBe(false);
  });

  it("the reply does not wait when no handover plays", async () => {
    const { player } = setup();
    await expect(player.waitUntilIdle()).resolves.toBeUndefined();
  });

  it("7. one clip at a time; a second play while one plays is refused; handled jobIds are remembered", async () => {
    const { player, sounds } = setup();
    void player.play(MSG);
    await flush();
    await expect(player.play({ ...MSG, jobId: "j3" })).resolves.toBe("stopped");
    expect(sounds).toHaveLength(1);
    expect(player.wasHandled("j2")).toBe(true);
    expect(player.wasHandled("j3")).toBe(true);
    expect(player.wasHandled("nope")).toBe(false);
  });
});
