import { getFormRecall } from "../index";
import axiosClient from "../../axiosClient";

jest.mock("../../axiosClient", () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

const client = axiosClient as unknown as { get: jest.Mock };

/**
 * The earlier-answers panel is extra. Whatever the server does, the form has
 * to open and work, so every failure is "nothing to show".
 */
describe("getFormRecall", () => {
  const EMPTY = { items: [], savedAt: null };

  it("asks for this block's recall, on this pack and day", async () => {
    client.get.mockResolvedValue({ data: EMPTY });
    await getFormRecall("p1", "m1", "b1");
    expect(client.get).toHaveBeenCalledWith("/packs/p1/modules/m1/blocks/b1/recall");
  });

  it("returns the BTT day 5 prediction and first number", async () => {
    const data = {
      items: [
        { label: "Your prediction", value: "I'll block on my name and they'll look away." },
        { label: "How sure you were", value: "80" },
      ],
      savedAt: "2026-09-28T09:00:00.000Z",
    };
    client.get.mockResolvedValue({ data });
    expect(await getFormRecall("p1", "m1", "b1")).toEqual(data);
  });

  it("shows nothing when the server predates the endpoint or the call fails", async () => {
    client.get.mockRejectedValue({ response: { status: 404 } });
    expect(await getFormRecall("p1", "m1", "b1")).toEqual(EMPTY);

    client.get.mockRejectedValue(new Error("Network Error"));
    expect(await getFormRecall("p1", "m1", "b1")).toEqual(EMPTY);
  });

  it("drops malformed rows and treats an odd body as empty", async () => {
    client.get.mockResolvedValue({
      data: { items: [{ label: "x" }, { label: "ok", value: "1" }, { label: "blank", value: " " }], savedAt: "t" },
    });
    expect(await getFormRecall("p1", "m1", "b1")).toEqual({
      items: [{ label: "ok", value: "1" }],
      savedAt: "t",
    });

    client.get.mockResolvedValue({ data: "<html>" });
    expect(await getFormRecall("p1", "m1", "b1")).toEqual(EMPTY);
  });
});
