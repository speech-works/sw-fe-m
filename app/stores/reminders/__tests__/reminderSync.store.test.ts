/**
 * D3 (10 Nov 2026): reminders set on one phone were missing on the other.
 * The store now settles its list with the server and reschedules here.
 */
const mockSchedule = { oneTime: jest.fn(), routine: jest.fn(), cancel: jest.fn(), cancelAll: jest.fn() };
jest.mock("../../../util/functions/notifications", () => ({
  scheduleOneTime: (...a: unknown[]) => mockSchedule.oneTime(...a),
  scheduleRoutine: (...a: unknown[]) => mockSchedule.routine(...a),
  cancelReminderNotifications: (...a: unknown[]) => mockSchedule.cancel(...a),
  cancelAllReminderNotifications: (...a: unknown[]) => mockSchedule.cancelAll(...a),
}));

const mockApi = { get: jest.fn(), put: jest.fn() };
jest.mock("../../../api/reminders", () => ({
  getServerReminders: (...a: unknown[]) => mockApi.get(...a),
  putServerReminders: (...a: unknown[]) => mockApi.put(...a),
}));

let mockUserId: string | null = "u1";
jest.mock("../../user", () => ({
  useUserStore: { getState: () => ({ user: mockUserId ? { id: mockUserId } : null }) },
}));

import { useReminderStore } from "../index";

const serverRoutine = {
  id: "s1",
  title: "Practice",
  category: "DAILY_PRACTICE",
  type: "ROUTINE" as const,
  date: "",
  time: "07:00",
  weekDays: [1, 3],
  active: true,
  createdAt: "2026-11-01T00:00:00.000Z",
};

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  jest.clearAllMocks();
  mockUserId = "u1";
  mockSchedule.routine.mockResolvedValue(["n1", "n2"]);
  mockSchedule.oneTime.mockResolvedValue("n3");
  mockApi.put.mockImplementation(async (reminders, updatedAt) => ({ reminders, updatedAt, applied: true }));
  useReminderStore.setState({ reminders: [], updatedAt: null, ownerId: null });
});

it("a second phone takes the server list and schedules it here, at the same wall-clock time", async () => {
  mockApi.get.mockResolvedValue({ reminders: [serverRoutine], updatedAt: "2026-11-10T10:00:00.000Z" });
  await useReminderStore.getState().syncWithServer("u1");
  const s = useReminderStore.getState();
  expect(s.reminders).toHaveLength(1);
  expect(s.reminders[0].notificationIds).toEqual(["n1", "n2"]);
  expect(mockSchedule.routine).toHaveBeenCalledWith(expect.objectContaining({ id: "s1", time: "07:00" }));
  expect(s.updatedAt).toBe("2026-11-10T10:00:00.000Z");
  expect(s.ownerId).toBe("u1");
  expect(mockApi.put).not.toHaveBeenCalled();
});

it("first run after the update uploads this phone's list when the server has none", async () => {
  useReminderStore.setState({
    reminders: [{ ...serverRoutine, id: "local", category: "DAILY_PRACTICE", notificationIds: ["x"] }],
  });
  mockApi.get.mockResolvedValue({ reminders: [], updatedAt: null });
  await useReminderStore.getState().syncWithServer("u1");
  expect(mockApi.put).toHaveBeenCalledTimes(1);
  const [sent] = mockApi.put.mock.calls[0];
  expect(sent[0].id).toBe("local");
  expect(sent[0]).not.toHaveProperty("notificationIds");
  expect(useReminderStore.getState().reminders[0].id).toBe("local");
});

it("a change made on this phone is sent to the server", async () => {
  await useReminderStore.getState().addReminder({
    title: "Read",
    category: "READING",
    type: "ROUTINE",
    date: "",
    time: "19:30",
    weekDays: [2],
    active: true,
  });
  await flush();
  expect(mockApi.put).toHaveBeenCalledTimes(1);
  expect(mockApi.put.mock.calls[0][0][0].time).toBe("19:30");
  expect(useReminderStore.getState().updatedAt).not.toBeNull();
});

it("when the server already has a newer list, the save gives way to it", async () => {
  useReminderStore.setState({ ownerId: "u1" });
  mockApi.put.mockResolvedValue({ reminders: [serverRoutine], updatedAt: "2030-01-01T00:00:00.000Z", applied: false });
  await useReminderStore.getState().addReminder({
    title: "Read", category: "READING", type: "ROUTINE", date: "", time: "19:30", weekDays: [2], active: true,
  });
  await flush();
  await flush();
  expect(useReminderStore.getState().reminders.map((r) => r.id)).toEqual(["s1"]);
});

it("sign-out empties the list without uploading, so other phones keep theirs", async () => {
  useReminderStore.setState({
    reminders: [{ ...serverRoutine, category: "DAILY_PRACTICE", notificationIds: ["n1"] }],
    updatedAt: "2026-11-10T10:00:00.000Z",
    ownerId: "u1",
  });
  await useReminderStore.getState().removeAll();
  const s = useReminderStore.getState();
  expect(s.reminders).toEqual([]);
  expect(s.updatedAt).toBeNull();
  expect(s.ownerId).toBeNull();
  expect(mockApi.put).not.toHaveBeenCalled();
});

it("a list left by another account is dropped, never uploaded to the new one", async () => {
  useReminderStore.setState({
    reminders: [{ ...serverRoutine, id: "theirs", category: "DAILY_PRACTICE", notificationIds: ["n1"] }],
    updatedAt: "2026-11-10T12:00:00.000Z",
    ownerId: "someone-else",
  });
  mockApi.get.mockResolvedValue({ reminders: [], updatedAt: null });
  await useReminderStore.getState().syncWithServer("u1");
  expect(useReminderStore.getState().reminders).toEqual([]);
  expect(mockApi.put).not.toHaveBeenCalled();
});

it("offline: the local list is kept as it is", async () => {
  useReminderStore.setState({
    reminders: [{ ...serverRoutine, category: "DAILY_PRACTICE", notificationIds: ["n1"] }],
    updatedAt: "2026-11-10T10:00:00.000Z",
    ownerId: "u1",
  });
  mockApi.get.mockRejectedValue(new Error("Network Error"));
  await useReminderStore.getState().syncWithServer("u1");
  expect(useReminderStore.getState().reminders[0].notificationIds).toEqual(["n1"]);
});
