import {
  getBuddyRequests,
  sendBuddyRequest,
  acceptBuddyRequest,
  declineBuddyRequest,
  cancelBuddyRequest,
} from "../index";
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
 * Wire shapes for the request flow.
 *
 * Decline and cancel look interchangeable and are not: DECLINE is the
 * receiver's refusal and is recorded permanently (it is what stops the sender
 * asking again), while CANCEL is the sender withdrawing and deletes the row.
 * Calling the wrong one either bars someone forever or lets a refused sender
 * back in, so the verbs and paths are worth pinning.
 */
beforeEach(() => {
  jest.clearAllMocks();
  client.post.mockResolvedValue({ data: {} });
  client.get.mockResolvedValue({ data: [] });
  client.delete.mockResolvedValue({ data: undefined });
});

describe("getBuddyRequests", () => {
  it("returns the response body as the list", async () => {
    const rows = [
      {
        id: "r1",
        direction: "incoming",
        profile: { id: "u1", name: "Sam" },
        createdAt: "2026-01-01",
      },
    ];
    client.get.mockResolvedValue({ data: rows });
    await expect(getBuddyRequests()).resolves.toEqual(rows);
    expect(client.get).toHaveBeenCalledWith("/buddies/requests");
  });
});

describe("sendBuddyRequest", () => {
  it("posts the target user id", async () => {
    await sendBuddyRequest("u1");
    expect(client.post).toHaveBeenCalledWith("/buddies/requests", { userId: "u1" });
  });
});

describe("acceptBuddyRequest", () => {
  it("posts to the accept sub-path for that request", async () => {
    await acceptBuddyRequest("r1");
    expect(client.post).toHaveBeenCalledWith("/buddies/requests/r1/accept");
  });
});

describe("declineBuddyRequest", () => {
  it("POSTs a decline — a refusal is recorded, not deleted", async () => {
    await declineBuddyRequest("r1");
    expect(client.post).toHaveBeenCalledWith("/buddies/requests/r1/decline");
    expect(client.delete).not.toHaveBeenCalled();
  });
});

describe("cancelBuddyRequest", () => {
  it("DELETEs — withdrawing your own ask is not a refusal", async () => {
    await cancelBuddyRequest("r1");
    expect(client.delete).toHaveBeenCalledWith("/buddies/requests/r1");
    expect(client.post).not.toHaveBeenCalled();
  });
});
