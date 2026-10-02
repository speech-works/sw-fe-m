import {
  FILLER_FINISH_TIMEOUT_MS,
  FILLER_START_DELAY_MS,
  FillerPlayer,
  chooseNextFiller,
  shouldStartFiller,
  type FillerEnded,
  type FillerGateInput,
  type FillerSound,
} from "../fillerPlayer";

const base: FillerGateInput = {
  now: 10_000,
  turnEndedAt: 10_000 - FILLER_START_DELAY_MS,
  playbackState: "user_listening",
  replyStarting: false,
  playedThisWait: false,
  userSpokeSinceTurnEnd: false,
  fillerCount: 4,
  stopping: false,
};

describe("shouldStartFiller", () => {
  it("starts once the delay after the caller's turn has passed", () => {
    expect(shouldStartFiller(base)).toBe(true);
    expect(shouldStartFiller({ ...base, playbackState: "agent_preparing" })).toBe(true);
  });

  it("plays only for a really late reply: never in the first 1.8 s (a normal reply takes about 1.1 s)", () => {
    expect(FILLER_START_DELAY_MS).toBe(1800);
    expect(shouldStartFiller({ ...base, now: base.turnEndedAt! + 1100 })).toBe(false);
    expect(shouldStartFiller({ ...base, now: base.turnEndedAt! + 1799 })).toBe(false);
    expect(shouldStartFiller({ ...base, now: base.turnEndedAt! + 1800 })).toBe(true);
  });

  it("waits for the delay", () => {
    expect(shouldStartFiller({ ...base, now: base.turnEndedAt! + FILLER_START_DELAY_MS - 1 })).toBe(false);
  });

  it("never plays before the caller has had a turn (the opening line, idle check-ins)", () => {
    expect(shouldStartFiller({ ...base, turnEndedAt: null })).toBe(false);
  });

  it.each([
    ["the reply is starting", { replyStarting: true }],
    ["a filler already played for this reply", { playedThisWait: true }],
    ["the caller spoke again", { userSpokeSinceTurnEnd: true }],
    ["the voice has no clips", { fillerCount: 0 }],
    ["the call is ending", { stopping: true }],
    ["the reply is playing", { playbackState: "agent_playing" }],
    ["the caller interrupted", { playbackState: "interrupting" }],
    ["the call is ending (state)", { playbackState: "ending" }],
  ])("does not start when %s", (_label, patch) => {
    expect(shouldStartFiller({ ...base, ...(patch as Partial<FillerGateInput>) })).toBe(false);
  });
});

describe("chooseNextFiller", () => {
  it("never repeats the previous filler", () => {
    for (let prev = 0; prev < 4; prev++) {
      for (const r of [0, 0.2, 0.4, 0.6, 0.8, 0.9999]) {
        const next = chooseNextFiller(4, prev, () => r);
        expect(next).not.toBe(prev);
        expect(next).toBeGreaterThanOrEqual(0);
        expect(next).toBeLessThan(4);
      }
    }
  });

  it("can reach every other filler", () => {
    const seen = new Set([0, 0.3, 0.6, 0.99].map((r) => chooseNextFiller(4, 2, () => r)));
    expect([...seen].sort()).toEqual([0, 1, 3]);
  });

  it("handles one clip and no previous", () => {
    expect(chooseNextFiller(1, 0)).toBe(0);
    expect(chooseNextFiller(4, null, () => 0.99)).toBe(3);
  });
});

class FakeSound implements FillerSound {
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

function setup() {
  const sounds: FakeSound[] = [];
  const ended: FillerEnded[] = [];
  let clock = 0;
  const player = new FillerPlayer(
    async (uri) => {
      const s = new FakeSound(uri);
      sounds.push(s);
      return s;
    },
    (e) => ended.push(e),
    () => clock,
  );
  return { player, sounds, ended, tick: (ms: number) => (clock += ms) };
}

const URLS = [0, 1, 2, 3].map((i) => `https://api.test/tts/filler/google/Kore/${i}`);

describe("FillerPlayer", () => {
  afterEach(() => jest.useRealTimers());

  it("preloads the clips and plays one with its own sound", async () => {
    const { player, sounds } = setup();
    await player.setUrls(URLS);
    expect(sounds.map((s) => s.uri)).toEqual(URLS);
    const i = await player.play(() => 0);
    expect(i).toBe(0);
    expect(sounds[0].played).toBe(1);
    expect(player.isPlaying()).toBe(true);
  });

  it("plays fillers at the voice's volume (1 until the server sends one)", async () => {
    const { player, sounds } = setup();
    await player.setUrls(URLS);
    const a = await player.play(() => 0);
    expect(sounds[a!].volume).toBe(1);
    sounds[a!].finish();
    player.setVolume(0.46);
    const b = await player.play(() => 0);
    expect(sounds[b!].volume).toBe(0.46);
  });

  it("does not play the same filler twice in a row", async () => {
    const { player, sounds } = setup();
    await player.setUrls(URLS);
    const a = await player.play(() => 0);
    sounds[a!].finish();
    const b = await player.play(() => 0);
    expect(b).not.toBe(a);
  });

  it("plays nothing when the list is empty, and drops the old voice's clips", async () => {
    const { player, sounds } = setup();
    await player.setUrls(URLS);
    await player.setUrls([]);
    expect(sounds.every((s) => s.unloaded === 1)).toBe(true);
    expect(player.count).toBe(0);
    expect(await player.play()).toBeNull();
  });

  it("lets the reply wait for the filler to finish, without cutting it", async () => {
    const { player, sounds, ended, tick } = setup();
    await player.setUrls(URLS);
    const i = (await player.play(() => 0))!;
    let replyMayStart = false;
    void player.waitUntilIdle().then(() => (replyMayStart = true));
    await Promise.resolve();
    expect(replyMayStart).toBe(false);
    tick(400);
    sounds[i].finish();
    await Promise.resolve();
    expect(replyMayStart).toBe(true);
    expect(sounds[i].stopped).toBe(0);
    expect(ended).toEqual([{ fillerIndex: i, reason: "finished", waitedMs: 400 }]);
  });

  it("stops the filler after the safety timeout so two sounds never overlap", async () => {
    jest.useFakeTimers();
    const { player, sounds, ended } = setup();
    await player.setUrls(URLS);
    const i = (await player.play(() => 0))!;
    const waiting = player.waitUntilIdle();
    jest.advanceTimersByTime(FILLER_FINISH_TIMEOUT_MS);
    await waiting;
    expect(sounds[i].stopped).toBe(1);
    expect(ended[0].reason).toBe("reply_timeout");
    expect(player.isPlaying()).toBe(false);
  });

  it("resolves at once when no filler is playing", async () => {
    const { player } = setup();
    await expect(player.waitUntilIdle()).resolves.toBeUndefined();
  });

  it("stops at once when the caller speaks", async () => {
    const { player, sounds, ended } = setup();
    await player.setUrls(URLS);
    const i = (await player.play(() => 0))!;
    player.stop("user_speech");
    expect(sounds[i].stopped).toBe(1);
    expect(ended[0]).toMatchObject({ fillerIndex: i, reason: "user_speech", waitedMs: 0 });
  });

  it("unloads everything on dispose", async () => {
    const { player, sounds } = setup();
    await player.setUrls(URLS);
    await player.play(() => 0);
    await player.dispose();
    expect(sounds.every((s) => s.unloaded >= 1)).toBe(true);
    expect(player.isPlaying()).toBe(false);
  });

  it("ignores clips that finish loading after the list was replaced", async () => {
    const resolvers: ((s: FakeSound) => void)[] = [];
    const created: FakeSound[] = [];
    const player = new FillerPlayer(
      (uri) =>
        new Promise<FillerSound>((r) => {
          const s = new FakeSound(uri);
          created.push(s);
          resolvers.push(r);
        }),
    );
    const first = player.setUrls(URLS.slice(0, 2));
    const second = player.setUrls([]);
    await second;
    resolvers.forEach((r, n) => r(created[n]));
    await first;
    expect(player.count).toBe(0);
    expect(created.every((s) => s.unloaded === 1)).toBe(true);
  });
});
