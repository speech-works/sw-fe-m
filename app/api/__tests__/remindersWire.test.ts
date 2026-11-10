import { fromWire } from "../reminders";

// D3 (10 Nov 2026): axiosClient turns "2026-11-12" into a Date. A reminder's
// date is a calendar day, so it must come back as the same day string.
it("turns revived dates back into the strings the reminder store uses", () => {
  const out = fromWire({
    reminders: [
      {
        id: "a",
        title: "t",
        category: "CUSTOM",
        type: "ONE_TIME",
        date: new Date(2026, 10, 12), // what parseISO("2026-11-12") gives
        time: "07:00",
        active: true,
        createdAt: new Date("2026-11-01T00:00:00.000Z"),
      },
    ],
    updatedAt: new Date("2026-11-10T10:00:00.000Z"),
    applied: true,
  });
  expect(out.reminders[0].date).toBe("2026-11-12");
  expect(out.reminders[0].time).toBe("07:00");
  expect(out.reminders[0].createdAt).toBe("2026-11-01T00:00:00.000Z");
  expect(out.updatedAt).toBe("2026-11-10T10:00:00.000Z");
});

it("keeps a null updatedAt (nothing saved yet)", () => {
  expect(fromWire({ reminders: [], updatedAt: null }).updatedAt).toBeNull();
});
