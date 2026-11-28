jest.mock("expo-notifications", () => ({
  IosAuthorizationStatus: { PROVISIONAL: 3 },
  getPermissionsAsync: jest.fn(),
}));
import * as Notifications from "expo-notifications";
import { askNotificationsNicely, needsInAppAsk, useNotificationAskStore } from "../notificationAsk";

describe("needsInAppAsk", () => {
  it("asks when the OS would prompt", () => {
    expect(needsInAppAsk({ granted: false, canAskAgain: true })).toBe(true);
  });
  it("does not ask when already granted or provisional", () => {
    expect(needsInAppAsk({ granted: true, canAskAgain: true })).toBe(false);
    expect(needsInAppAsk({ granted: false, canAskAgain: true, ios: { status: 3 } })).toBe(false);
  });
  it("does not ask when the OS will never prompt again", () => {
    expect(needsInAppAsk({ granted: false, canAskAgain: false })).toBe(false);
  });
});

describe("askNotificationsNicely", () => {
  beforeEach(() => useNotificationAskStore.setState({ open: false, hostMounted: true, resolve: null }));
  it("goes straight on when no screen can show the ask", async () => {
    useNotificationAskStore.setState({ hostMounted: false });
    await expect(askNotificationsNicely()).resolves.toBe(true);
  });
  it("goes straight on when the OS will not prompt", async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false, canAskAgain: false });
    await expect(askNotificationsNicely()).resolves.toBe(true);
    expect(useNotificationAskStore.getState().open).toBe(false);
  });
  it("opens the ask, and Allow resolves true", async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false, canAskAgain: true });
    const p = askNotificationsNicely();
    await new Promise((r) => setTimeout(r, 0));
    expect(useNotificationAskStore.getState().open).toBe(true);
    useNotificationAskStore.getState().answer(true);
    await expect(p).resolves.toBe(true);
    expect(useNotificationAskStore.getState().open).toBe(false);
  });
  it("Not now resolves false and keeps the sheet open for the doze", async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false, canAskAgain: true });
    const p = askNotificationsNicely();
    await new Promise((r) => setTimeout(r, 0));
    useNotificationAskStore.getState().answer(false);
    await expect(p).resolves.toBe(false);
    expect(useNotificationAskStore.getState().open).toBe(true);
  });
});
