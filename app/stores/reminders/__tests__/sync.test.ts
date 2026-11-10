import { decideSync, mergeReminders } from "../sync";

// D3 (10 Nov 2026): reminders now follow the account to every phone.
describe("decideSync", () => {
  const t1 = "2026-11-10T10:00:00.000Z";
  const t2 = "2026-11-10T11:00:00.000Z";

  it("uploads on the first run when the server has nothing and the phone has reminders", () => {
    expect(decideSync({ count: 2, updatedAt: null }, { updatedAt: null })).toBe("UPLOAD");
  });

  it("does nothing when neither side has anything", () => {
    expect(decideSync({ count: 0, updatedAt: null }, { updatedAt: null })).toBe("NONE");
  });

  it("takes the server list on a new phone", () => {
    expect(decideSync({ count: 0, updatedAt: null }, { updatedAt: t1 })).toBe("ADOPT");
  });

  it("joins an old phone list with the server list instead of dropping it", () => {
    expect(decideSync({ count: 1, updatedAt: null }, { updatedAt: t1 })).toBe("MERGE");
  });

  it("newest updatedAt wins", () => {
    expect(decideSync({ count: 1, updatedAt: t2 }, { updatedAt: t1 })).toBe("UPLOAD");
    expect(decideSync({ count: 1, updatedAt: t1 }, { updatedAt: t2 })).toBe("ADOPT");
    expect(decideSync({ count: 1, updatedAt: t1 }, { updatedAt: t1 })).toBe("NONE");
  });

  it("an emptied list that is newer is uploaded, so deletes reach the other phone", () => {
    expect(decideSync({ count: 0, updatedAt: t2 }, { updatedAt: t1 })).toBe("UPLOAD");
  });
});

describe("mergeReminders", () => {
  it("keeps server ones first, adds the phone's own, and stops at the cap", () => {
    const merged = mergeReminders(
      [{ id: "a", time: "07:00" }, { id: "b", time: "08:00" }],
      [{ id: "b", time: "08:00" }, { id: "c", time: "09:00" }, { id: "d", time: "10:00" }],
      3,
    );
    expect(merged.map((r) => r.id)).toEqual(["a", "b", "c"]);
  });

  it("skips the same alert made separately on the other phone (E4)", () => {
    const merged = mergeReminders(
      [{ id: "s1", category: "MOOD", type: "ROUTINE", time: "09:00", weekDays: [1, 2, 3], title: "Check in" }],
      [
        { id: "p1", category: "MOOD", type: "ROUTINE", time: "09:00", weekDays: [3, 2, 1], title: "A minute for your mind" },
        { id: "p2", category: "MOOD", type: "ROUTINE", time: "21:00", weekDays: [1, 2, 3], title: "Check in" },
      ],
      3,
    );
    expect(merged.map((r) => r.id)).toEqual(["s1", "p2"]);
  });

  it("keeps two custom reminders at one time when their words differ", () => {
    const merged = mergeReminders(
      [{ id: "s1", category: "CUSTOM", type: "ROUTINE", time: "09:00", title: "Call mum" }],
      [{ id: "p1", category: "CUSTOM", type: "ROUTINE", time: "09:00", title: "Read aloud" }],
      3,
    );
    expect(merged).toHaveLength(2);
  });

  it("treats one-time reminders on different dates as different", () => {
    const merged = mergeReminders(
      [{ id: "s1", category: "PRACTICE", type: "ONE_TIME", time: "09:00", date: "2026-11-11" }],
      [{ id: "p1", category: "PRACTICE", type: "ONE_TIME", time: "09:00", date: "2026-11-12" }],
      3,
    );
    expect(merged).toHaveLength(2);
  });
});
