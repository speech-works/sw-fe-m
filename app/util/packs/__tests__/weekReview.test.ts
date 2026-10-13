import { groupWeekReviewEntries } from "../weekReview";
import type { WeekReviewEntry } from "../../../api/packs/types";

const KEY = "activity.toolkit_trial_log";
const line = (fieldId: string, value: string, group?: string): WeekReviewEntry => ({
  formKey: KEY,
  fieldId,
  label: fieldId,
  value,
  ...(group ? { group } : {}),
});

describe("groupWeekReviewEntries", () => {
  it("returns one untitled group capped per day when nothing is grouped", () => {
    const out = groupWeekReviewEntries(
      [line("a", "1"), line("b", "2"), line("c", "3"), line("d", "4")],
      3,
    );
    expect(out).toEqual([{ entries: [line("a", "1"), line("b", "2"), line("c", "3")] }]);
  });

  it("does not title a day whose lines all share one group", () => {
    const out = groupWeekReviewEntries([line("a", "1", "Onset"), line("b", "2", "Onset")], 3);
    expect(out).toHaveLength(1);
    expect(out[0].title).toBeUndefined();
  });

  it("titles each step once and caps each group, so the second log is not cut", () => {
    const out = groupWeekReviewEntries(
      [
        line("a", "1", "Onset"),
        line("b", "2", "Onset"),
        line("c", "3", "Onset"),
        line("d", "4", "Onset"),
        line("a", "5", "Contact"),
        line("b", "6", "Contact"),
      ],
      3,
    );
    expect(out.map((g) => [g.title, g.entries.map((e) => e.value)])).toEqual([
      ["Onset", ["1", "2", "3"]],
      ["Contact", ["5", "6"]],
    ]);
  });

  it("keeps an untitled old answer next to a titled step on the same day", () => {
    const out = groupWeekReviewEntries([line("a", "1", "Onset"), line("a", "2")], 3);
    expect(out).toEqual([
      { title: "Onset", entries: [line("a", "1", "Onset")] },
      { entries: [line("a", "2")] },
    ]);
  });
});
