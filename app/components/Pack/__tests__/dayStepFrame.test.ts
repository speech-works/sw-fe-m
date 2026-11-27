import { ContentBlockType, ModuleContentBlock } from "../../../api/packs/types";
import { PIP_CARD_DONE, PIP_CARD_DONE_UP, PIP_CLOSE_UP, PIP_LOG_UP, PIP_PICKED, PIP_PRACTICE_UP, PIP_START_UP, PIP_YESTERDAY_UP, dayStepFrame, zoneTitleSize } from "../dayStepFrame";

const block = (type: ContentBlockType, content: unknown): ModuleContentBlock =>
  ({ id: "b", type, orderIndex: 1, content }) as unknown as ModuleContentBlock;

describe("dayStepFrame", () => {
  it("gives the start step the medium zone, the day's title and a large Pip", () => {
    const f = dayStepFrame(block(ContentBlockType.TEXT, { role: "bridge_in", markdown: "Hello." }), "Whether to mention your stutter");
    expect(f).toMatchObject({ kind: "start", zone: "medium", headerText: false, zoneMeta: true, zoneTitle: "Whether to mention your stutter", pip: "large", pipFace: "warm" });
    expect(f.pipUp).toBe(PIP_START_UP);
    expect(f.textDelay).toBeGreaterThan(0);
  });

  it("gives the close step the same frame, titled by the step's own kind line", () => {
    const f = dayStepFrame(block(ContentBlockType.TEXT, { role: "bridge_out", markdown: "Bye." }), "Day title");
    expect(f).toMatchObject({ kind: "close", zone: "medium", headerText: false, zoneMeta: true, zoneTitle: "What comes next", pip: "large", pipFace: "proud" });
    expect(f.pipUp).toBe(PIP_CLOSE_UP);
    // open palms come out on both sides: the title keeps clear of them
    expect(f.pipReach).toBeGreaterThan(0.3);
  });

  it("gives the recall question a title in the zone, the day title in the header and a small Pip", () => {
    const f = dayStepFrame(block(ContentBlockType.QUIZ, { mode: "recall", questions: [{ id: "q", text: "?", options: [] }] }), "Day title");
    expect(f).toMatchObject({ kind: "yesterday", zone: "medium", headerText: true, zoneMeta: false, zoneTitle: "From yesterday", pip: "small", pipFace: "thinking", textDelay: 0 });
    expect(f.pipUp).toBe(PIP_YESTERDAY_UP);
  });

  it("gives every other step the slim frame with no Pip", () => {
    const slim = { kind: "work", zone: "slim", headerText: true, zoneTitle: null, pip: null };
    expect(dayStepFrame(block(ContentBlockType.TEXT, { role: "teach", markdown: "## A\n\ntext" }), "T")).toMatchObject(slim);
    expect(dayStepFrame(block(ContentBlockType.TEXT, { markdown: "text" }), "T")).toMatchObject(slim);
    expect(dayStepFrame(block(ContentBlockType.QUIZ, { mode: "check", questions: [{ id: "q", text: "?", options: [] }] }), "T")).toMatchObject(slim);
    // a recall block the server sent no questions for draws nothing: no zone title over an empty sheet
    expect(dayStepFrame(block(ContentBlockType.QUIZ, { mode: "recall", questions: [] }), "T")).toMatchObject(slim);
    expect(dayStepFrame(block(ContentBlockType.GOALS, {}), "T")).toMatchObject(slim);
    expect(dayStepFrame(undefined, "T")).toMatchObject(slim);
  });

  it("gives the practice card and the log card the tall zone with Pip in the centre", () => {
    const tall = { zone: "tall", headerText: true, zoneTitle: null, pip: "hero", textDelay: 0 };
    const practice = dayStepFrame(block(ContentBlockType.ACTIVITY, {}), "T");
    expect(practice).toMatchObject({ ...tall, kind: "practice", pipFace: "curious" });
    expect(practice.pipUp).toBe(PIP_PRACTICE_UP);
    const log = dayStepFrame(block(ContentBlockType.FORM, {}), "T");
    expect(log).toMatchObject({ ...tall, kind: "log", pipFace: "listening" });
    expect(log.pipUp).toBe(PIP_LOG_UP);
  });

  it("shows a done card the same way for practice and log: warm face, one nod, no celebration", () => {
    for (const type of [ContentBlockType.ACTIVITY, ContentBlockType.FORM]) {
      const f = dayStepFrame(block(type, {}), "T", { completed: true });
      expect(f).toMatchObject({ zone: "tall", pip: "hero", pipFace: "warm" });
      expect(f.pipUp).toBe(PIP_CARD_DONE_UP);
    }
    for (const beats of [PIP_CARD_DONE_UP, PIP_CARD_DONE]) {
      expect(beats.filter((b) => b.body).map((b) => b.body)).toEqual(["nod"]);
      expect(beats.some((b) => b.move || b.face === "laugh" || b.face === "proud")).toBe(false);
    }
  });

  it("gives the video step the day's title in the zone and no Pip", () => {
    expect(dayStepFrame(block(ContentBlockType.VIDEO, {}), "Day title")).toMatchObject({ kind: "video", zone: "medium", headerText: false, zoneMeta: true, zoneTitle: "Day title", pip: null, pipUp: [] });
  });

  it("uses only Pip's real moves, faces and body moves", () => {
    const MOVES = ["h-palms", "h-wave", "h-cheek", "h-chin", "h-heart"];
    const FACES = ["calm", "smile", "laugh", "proud", "curious", "listening", "thinking", "warm"];
    const BODY = ["hop", "pop", "sway", "nod", "lean", "peek", "bighop", "bounce", "settle", "rise"];
    for (const beat of [...PIP_START_UP, ...PIP_CLOSE_UP, ...PIP_YESTERDAY_UP, ...PIP_PICKED, ...PIP_PRACTICE_UP, ...PIP_LOG_UP, ...PIP_CARD_DONE_UP, ...PIP_CARD_DONE]) {
      if (beat.move) expect(MOVES).toContain(beat.move);
      if (beat.face) expect(FACES).toContain(beat.face);
      if (beat.body) expect(BODY).toContain(beat.body);
    }
    // a pick is never marked: no laugh, no proud face, on any answer
    expect(PIP_PICKED.some((b) => b.face === "laugh" || b.face === "proud")).toBe(false);
  });
});

describe("zoneTitleSize", () => {
  it("starts at a smaller size when asked (the video step)", () => {
    expect(zoneTitleSize("When you cannot plan what to say", 342, 3, 26)).toMatchObject({ fontSize: 26, lineHeight: 32, lines: 2 });
  });

  it("keeps 30 for a title that fits in three lines", () => {
    expect(zoneTitleSize("Whether to mention your stutter", 192)).toMatchObject({ fontSize: 30, lineHeight: 36, lines: 3 });
    expect(zoneTitleSize("From yesterday", 208).fontSize).toBe(30);
  });
  it("goes smaller when a word does not fit or the title is long", () => {
    expect(zoneTitleSize("Disclosure conversations", 160).fontSize).toBeLessThan(30);
    expect(zoneTitleSize("Why you cannot plan a date the way you plan an interview", 193).fontSize).toBe(24);
  });
  it("never goes under 24 and still counts the lines the zone must hold", () => {
    const t = zoneTitleSize("A very long day title that will need a lot of lines to show in full", 150);
    expect(t.fontSize).toBe(24);
    expect(t.lines).toBeGreaterThan(3);
  });
});
