import axiosClient from "../axiosClient";
import { getTodayMood } from "../moodCheck";

jest.mock("../axiosClient", () => ({ __esModule: true, default: { get: jest.fn() } }));

describe("getTodayMood (D2, 10 Nov 2026)", () => {
  const get = (axiosClient as any).get as jest.Mock;
  it("returns the server answer", async () => {
    get.mockResolvedValue({ data: { answered: true, mood: "SAD" } });
    expect(await getTodayMood()).toEqual({ answered: true, mood: "SAD" });
  });
  it("returns null on an older server (error body or failure)", async () => {
    get.mockResolvedValue({ data: { error: "not found" } });
    expect(await getTodayMood()).toBeNull();
    get.mockRejectedValue(new Error("offline"));
    expect(await getTodayMood()).toBeNull();
  });
});
