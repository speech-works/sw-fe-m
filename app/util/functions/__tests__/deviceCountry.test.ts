const mockGetLocales = jest.fn();
jest.mock("expo-localization", () => ({
  getLocales: () => mockGetLocales(),
}));

const mockUpdateMyUser = jest.fn();
jest.mock("../../../api/users", () => ({
  updateMyUser: (...a: unknown[]) => mockUpdateMyUser(...a),
}));

const mockGet = jest.fn();
jest.mock("../../../api/axiosClient", () => ({
  __esModule: true,
  default: { get: (...a: unknown[]) => mockGet(...a) },
}));

import {
  getDeviceCountry,
  resetDeviceCountrySync,
  syncDeviceCountry,
} from "../deviceCountry";
import { getCrisisResource } from "../../../api/crisis";

const region = (regionCode: string | null) =>
  mockGetLocales.mockReturnValue([{ regionCode }]);

beforeEach(() => {
  jest.clearAllMocks();
  resetDeviceCountrySync();
  mockUpdateMyUser.mockResolvedValue({});
  mockGet.mockResolvedValue({ data: {} });
});

describe("getDeviceCountry", () => {
  it("returns the device region upper-cased", () => {
    region("gb");
    expect(getDeviceCountry()).toBe("GB");
  });

  it.each([null, "", "419", "GBR"])("returns undefined for %p", (code) => {
    region(code);
    expect(getDeviceCountry()).toBeUndefined();
  });

  it("returns undefined rather than throwing when the OS call fails", () => {
    mockGetLocales.mockImplementation(() => {
      throw new Error("native module missing");
    });
    expect(getDeviceCountry()).toBeUndefined();
  });
});

describe("syncDeviceCountry", () => {
  it("PATCHes countryCode when the stored value differs", async () => {
    region("NZ");
    await expect(syncDeviceCountry({ id: "u1", countryCode: null })).resolves.toBe("NZ");
    expect(mockUpdateMyUser).toHaveBeenCalledWith({ countryCode: "NZ" });
  });

  it("writes nothing when the stored value already matches", async () => {
    region("IN");
    await expect(syncDeviceCountry({ id: "u1", countryCode: "IN" })).resolves.toBeNull();
    expect(mockUpdateMyUser).not.toHaveBeenCalled();
  });

  it("writes nothing when the device has no usable region", async () => {
    region(null);
    await syncDeviceCountry({ id: "u1", countryCode: "IN" });
    expect(mockUpdateMyUser).not.toHaveBeenCalled();
  });

  it("runs once per session for the same user", async () => {
    region("GB");
    await syncDeviceCountry({ id: "u1", countryCode: null });
    await syncDeviceCountry({ id: "u1", countryCode: null });
    expect(mockUpdateMyUser).toHaveBeenCalledTimes(1);
  });

  it("syncs again for a different account on the same device", async () => {
    region("GB");
    await syncDeviceCountry({ id: "u1", countryCode: null });
    await syncDeviceCountry({ id: "u2", countryCode: null });
    expect(mockUpdateMyUser).toHaveBeenCalledTimes(2);
  });

  it("retries on the next fetch after a failed write, and never throws", async () => {
    region("GB");
    mockUpdateMyUser.mockRejectedValueOnce(new Error("offline"));
    await expect(syncDeviceCountry({ id: "u1", countryCode: null })).resolves.toBeNull();
    await syncDeviceCountry({ id: "u1", countryCode: null });
    expect(mockUpdateMyUser).toHaveBeenCalledTimes(2);
  });
});

describe("getCrisisResource", () => {
  it("sends the device region as ?country= when no country is given", async () => {
    region("AU");
    await getCrisisResource();
    expect(mockGet).toHaveBeenCalledWith("/crisis-resources", {
      params: { country: "AU" },
    });
  });

  it("an explicit country wins over the device region", async () => {
    region("AU");
    await getCrisisResource("IN");
    expect(mockGet).toHaveBeenCalledWith("/crisis-resources", {
      params: { country: "IN" },
    });
  });

  it("sends no param when the device has no region", async () => {
    region(null);
    await getCrisisResource();
    expect(mockGet).toHaveBeenCalledWith("/crisis-resources", { params: undefined });
  });
});
