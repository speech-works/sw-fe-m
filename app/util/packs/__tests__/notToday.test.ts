import { isFieldRequired, NOT_TODAY, saidNotToday } from "../formBlock";
import { FormFieldType, type FormField } from "../../../api/packs/types";

const didIt: FormField = {
  id: "did",
  type: FormFieldType.MULTIPLE_CHOICE,
  label: "Did you do today's step?",
  required: true,
  options: ["Yes", "I did a smaller version of it", NOT_TODAY],
};
const happened: FormField = {
  id: "happened",
  type: FormFieldType.TEXT_INPUT,
  label: "What happened, in order.",
  required: true,
};
const note: FormField = {
  id: "note",
  type: FormFieldType.TEXT_INPUT,
  label: "What do you want to remember?",
  required: false,
};
const fields = [didIt, happened, note];

describe("Not today makes the rest of a log optional", () => {
  it("keeps every required box required after Yes", () => {
    const answers = { did: "Yes" };
    expect(saidNotToday(fields, answers)).toBe(false);
    expect(isFieldRequired(happened, fields, answers)).toBe(true);
  });

  it("drops the required boxes after Not today", () => {
    const answers = { did: NOT_TODAY };
    expect(saidNotToday(fields, answers)).toBe(true);
    expect(isFieldRequired(happened, fields, answers)).toBe(false);
    expect(isFieldRequired(didIt, fields, answers)).toBe(true);
  });

  it("never makes an optional box required", () => {
    expect(isFieldRequired(note, fields, { did: "Yes" })).toBe(false);
  });

  it("ignores Not today ticked in a pick-many list", () => {
    const many = { ...didIt, multiple: true };
    const answers = { did: [NOT_TODAY] };
    expect(saidNotToday([many, happened], answers)).toBe(false);
    expect(isFieldRequired(happened, [many, happened], answers)).toBe(true);
  });
});
