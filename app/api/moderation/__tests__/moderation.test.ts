import { blockUser, unblockUser, getBlockedUsers, reportContent } from "../index";
import axiosClient from "../../axiosClient";

jest.mock("../../axiosClient", () => ({
  __esModule: true,
  default: { post: jest.fn(), get: jest.fn(), delete: jest.fn() },
}));

const client = axiosClient as unknown as {
  post: jest.Mock;
  get: jest.Mock;
  delete: jest.Mock;
};

/**
 * Wire-shape contract for the moderation endpoints.
 *
 * Cheap, and precisely the drift class that matters here: `alsoReport` decides
 * whether a block ALSO files an accusation against someone. Getting it wrong in
 * either direction is a real harm — a silent accusation, or a report the user
 * asked for that never arrives.
 */
beforeEach(() => {
  jest.clearAllMocks();
  client.post.mockResolvedValue({ data: undefined });
  client.get.mockResolvedValue({ data: [] });
  client.delete.mockResolvedValue({ data: undefined });
});

describe("blockUser", () => {
  it("does NOT file a report when no reason is given", async () => {
    // The block-from-a-post path. "I don't want to accuse them, I just want
    // out" is a legitimate intent, and forcing every block through a reason is
    // what corrupts the report data the review queue depends on.
    await blockUser("user-1");
    expect(client.post).toHaveBeenCalledWith("/moderation/blocks", {
      userId: "user-1",
      reason: undefined,
      alsoReport: false,
    });
  });

  it("files a report alongside the block when a reason is given", async () => {
    await blockUser("user-1", "harassment");
    expect(client.post).toHaveBeenCalledWith("/moderation/blocks", {
      userId: "user-1",
      reason: "harassment",
      alsoReport: true,
    });
  });
});

describe("unblockUser", () => {
  it("deletes the block by user id", async () => {
    await unblockUser("user-2");
    expect(client.delete).toHaveBeenCalledWith("/moderation/blocks/user-2");
  });
});

describe("getBlockedUsers", () => {
  it("returns the response body as the list", async () => {
    const rows = [{ userId: "u", name: "Sam", createdAt: "2026-01-01" }];
    client.get.mockResolvedValue({ data: rows });
    await expect(getBlockedUsers()).resolves.toEqual(rows);
    expect(client.get).toHaveBeenCalledWith("/moderation/blocks");
  });
});

describe("reportContent", () => {
  it("posts the payload verbatim", async () => {
    const payload = {
      targetType: "signal" as const,
      signalId: "sig-1",
      reason: "spam" as const,
    };
    await reportContent(payload);
    expect(client.post).toHaveBeenCalledWith("/moderation/reports", payload);
  });
});
