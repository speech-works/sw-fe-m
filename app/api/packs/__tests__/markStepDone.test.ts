import { markStepDone } from "../index";
import axiosClient from "../../axiosClient";

jest.mock("../../axiosClient", () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));

const client = axiosClient as unknown as { post: jest.Mock };

/**
 * D1 (10 Nov 2026): a step finished on one phone is sent to the server so the
 * other phone shows it done. The send is best effort and must never throw.
 */
describe("markStepDone", () => {
  beforeEach(() => client.post.mockReset());

  it("posts this step of this pack and day, with its run", async () => {
    client.post.mockResolvedValue({ data: { completedBlockIds: ["b1"], run: 2, applied: true } });
    await markStepDone("p1", "m1", "b1", 2);
    expect(client.post).toHaveBeenCalledWith("/packs/p1/modules/m1/blocks/b1/done", { run: 2 });
  });

  it("returns every finished step, including the other phone's", async () => {
    client.post.mockResolvedValue({ data: { completedBlockIds: ["b0", "b1", 7], run: 0, applied: true } });
    expect(await markStepDone("p1", "m1", "b1", 0)).toEqual({ ids: ["b0", "b1"], run: 0, applied: true });
  });

  it("reports a tick from before a restart as not saved (E1)", async () => {
    client.post.mockResolvedValue({ data: { completedBlockIds: [], run: 3, applied: false } });
    expect(await markStepDone("p1", "m1", "b1", 2)).toEqual({ ids: [], run: 3, applied: false });
  });

  it("returns null on a failed send, so the caller tries again later", async () => {
    client.post.mockRejectedValue(new Error("Network Error"));
    expect(await markStepDone("p1", "m1", "b1", 0)).toBeNull();

    client.post.mockRejectedValue({ response: { status: 404 } });
    expect(await markStepDone("p1", "m1", "b1", 0)).toBeNull();
  });

  it("reads an older server's answer as saved, in the run it was sent", async () => {
    client.post.mockResolvedValue({ data: { completedBlockIds: ["b1"] } });
    expect(await markStepDone("p1", "m1", "b1", 1)).toEqual({ ids: ["b1"], run: 1, applied: true });
  });
});
