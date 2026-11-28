import AsyncStorage from "@react-native-async-storage/async-storage";
import { FURTHEST_KEY, furthestAfter, recordDayFinished } from "../furthestDay";

describe("furthestAfter", () => {
  it("never plays in the first program: every new day there only moves the record", () => {
    let r = furthestAfter(null, "a", 1);
    expect(r.furthest).toBe(false);
    for (let d = 2; d <= 7; d++) {
      r = furthestAfter(r.record, "a", d);
      expect(r.furthest).toBe(false);
      expect(r.record).toEqual({ day: d, packId: "a" });
    }
  });
  it("plays when a later program goes past where an earlier one stopped, once", () => {
    const first = { day: 4, packId: "a" };
    expect(furthestAfter(first, "b", 3).furthest).toBe(false);
    expect(furthestAfter(first, "b", 4).furthest).toBe(false);
    const past = furthestAfter(first, "b", 5);
    expect(past).toEqual({ furthest: true, record: { day: 5, packId: "b" } });
    expect(furthestAfter(past.record, "b", 6).furthest).toBe(false);
  });
  it("ignores a day with no number", () => {
    expect(furthestAfter({ day: 3, packId: "a" }, "b", NaN)).toEqual({ furthest: false, record: { day: 3, packId: "a" } });
  });
});

describe("recordDayFinished", () => {
  beforeEach(() => AsyncStorage.clear());
  it("keeps the record on the phone", async () => {
    expect(await recordDayFinished("a", 3)).toBe(false);
    expect(await recordDayFinished("b", 2)).toBe(false);
    expect(await recordDayFinished("b", 4)).toBe(true);
    expect(JSON.parse((await AsyncStorage.getItem(FURTHEST_KEY))!)).toEqual({ day: 4, packId: "b" });
  });
});
