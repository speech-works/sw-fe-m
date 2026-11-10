import { useMoodCheckStore } from "../mood";
import { getTodayMood } from "../../api/moodCheck";

jest.mock("../../api/moodCheck", () => ({ getTodayMood: jest.fn() }));

/** (D2, 10 Nov 2026) a second phone must not ask the mood question again. */
const reset = () =>
  useMoodCheckStore.setState({
    hasRecordedToday: false,
    moodType: null,
    lastRecordedDate: null,
  });

describe("mood store syncFromServer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    reset();
  });

  it("marks today answered when the server says so", async () => {
    (getTodayMood as jest.Mock).mockResolvedValue({ answered: true, mood: "CALM" });
    expect(await useMoodCheckStore.getState().syncFromServer()).toBe(true);
    expect(useMoodCheckStore.getState().hasRecordedToday).toBe(true);
    expect(useMoodCheckStore.getState().moodType).toBe("CALM");
  });

  it("keeps asking when the server says not answered", async () => {
    (getTodayMood as jest.Mock).mockResolvedValue({ answered: false, mood: null });
    expect(await useMoodCheckStore.getState().syncFromServer()).toBe(false);
    expect(useMoodCheckStore.getState().hasRecordedToday).toBe(false);
  });

  it("falls back to the phone's flag when the server cannot say", async () => {
    (getTodayMood as jest.Mock).mockResolvedValue(null);
    expect(await useMoodCheckStore.getState().syncFromServer()).toBe(false);
    useMoodCheckStore.setState({ hasRecordedToday: true });
    expect(await useMoodCheckStore.getState().syncFromServer()).toBe(true);
  });

  it("skips the request when the phone already knows", async () => {
    useMoodCheckStore.setState({ hasRecordedToday: true });
    await useMoodCheckStore.getState().syncFromServer();
    expect(getTodayMood).not.toHaveBeenCalled();
  });
});
