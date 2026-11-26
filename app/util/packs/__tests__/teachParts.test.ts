import { readMinutes, teachParts } from "../teachParts";
import { dayStep } from "../stepList";
import { ContentBlockType, ModuleContentBlock } from "../../../api/packs/types";

const DAY5 = [
  "## The page and the mouth are two different places",
  "",
  "You have an opening answer in three parts.",
  "",
  "### Ninety seconds, recorded",
  "",
  "**What to listen for:** whether you said what you meant to say.",
  "",
  "### The word you did not want to say",
  "",
  "Decide about it now.",
  "",
  "### Once, and then stop",
  "",
  "Listen once.",
].join("\n");

describe("teachParts", () => {
  it("splits a lesson at its own headings", () => {
    const parts = teachParts(DAY5);
    expect(parts.map((p) => p.title)).toEqual([
      "The page and the mouth are two different places",
      "Ninety seconds, recorded",
      "The word you did not want to say",
      "Once, and then stop",
    ]);
    expect(parts[1].markdown.startsWith("### Ninety seconds, recorded")).toBe(true);
    expect(parts[1].markdown).toContain("**What to listen for:**");
  });

  it("keeps text before the first heading with the first part", () => {
    const parts = teachParts("Intro line.\n\n## A\n\nOne.\n\n## B\n\nTwo.");
    expect(parts).toHaveLength(2);
    expect(parts[0].markdown.startsWith("Intro line.")).toBe(true);
  });

  it("leaves a lesson with one heading whole", () => {
    const parts = teachParts("## Only one\n\nText.\n\nMore text.");
    expect(parts).toHaveLength(1);
    expect(parts[0].title).toBe("Only one");
  });

  it("never splits a block with a Copy button marker", () => {
    const md = "## A\n\nSend this:\n{{copyButton}}\n\n## B\n\nText.";
    expect(teachParts(md)).toEqual([{ title: "", markdown: md }]);
  });

  it("returns nothing for empty content", () => {
    expect(teachParts("")).toEqual([]);
    expect(teachParts(undefined)).toEqual([]);
  });

  it("estimates read time at about 200 words a minute", () => {
    expect(readMinutes("word ".repeat(470))).toBe(2);
    expect(readMinutes("short")).toBe(1);
  });
});

describe("dayStep", () => {
  const block = (type: ContentBlockType, content: object): ModuleContentBlock =>
    ({ id: "b", type, content, orderIndex: 1 }) as unknown as ModuleContentBlock;

  it("names a lesson by its first heading and counts its parts", () => {
    expect(dayStep(block(ContentBlockType.TEXT, { markdown: DAY5, role: "teach" }))).toEqual({
      title: "The page and the mouth are two different places",
      kind: "Lesson · 4 parts",
    });
  });

  it("names bridges, quizzes and activities from their own content", () => {
    expect(dayStep(block(ContentBlockType.TEXT, { markdown: "x", role: "bridge_in" })).title).toBe("Start");
    expect(dayStep(block(ContentBlockType.QUIZ, { mode: "recall", questionKeys: [], questions: [{}] }))).toEqual({
      title: "Yesterday",
      kind: "1 question",
    });
    expect(
      dayStep(block(ContentBlockType.ACTIVITY, { refId: "r", titleOverride: "Ninety seconds, and one look at it", estimatedMinutes: 5 })),
    ).toEqual({ title: "Ninety seconds, and one look at it", kind: "Practice", minutes: 5 });
  });
});
