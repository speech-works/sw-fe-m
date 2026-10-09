import { FormField, FormFieldType } from "../../../api/packs/types";
import { textFieldProblem, wordCount } from "../textLimits";

const role: FormField = {
  id: "role",
  type: FormFieldType.TEXT_INPUT,
  label: "What is the role?",
  minWords: 8,
  maxWords: 100,
};

describe("textFieldProblem", () => {
  it("counts words", () => {
    expect(wordCount("  one  two\nthree ")).toBe(3);
    expect(wordCount("")).toBe(0);
  });

  it("lets an optional field stay empty", () => {
    expect(textFieldProblem(role, "")).toBeNull();
    expect(textFieldProblem(role, undefined)).toBeNull();
  });

  it("asks for more when a filled answer is too short", () => {
    expect(textFieldProblem(role, "Backend engineer")).toContain("at least 8 words");
  });

  it("accepts an answer in range", () => {
    expect(
      textFieldProblem(role, "Backend engineer on a payments team building Java APIs daily"),
    ).toBeNull();
  });

  it("ignores fields that are not text", () => {
    expect(textFieldProblem({ ...role, type: FormFieldType.SLIDER }, "x")).toBeNull();
  });
});
