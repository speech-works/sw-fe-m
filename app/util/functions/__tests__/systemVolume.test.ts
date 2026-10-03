import { NativeModules } from "react-native";

const mockGetVolume = jest.fn();
const mockSetVolume = jest.fn();
jest.mock(
  "react-native-volume-manager",
  () => ({
    VolumeManager: {
      getVolume: (...a: unknown[]) => mockGetVolume(...a),
      setVolume: (...a: unknown[]) => mockSetVolume(...a),
    },
  }),
  { virtual: true },
);

import { getSystemVolume, setSystemVolume } from "../systemVolume";

describe("systemVolume helper", () => {
  beforeEach(() => {
    mockGetVolume.mockReset();
    mockSetVolume.mockReset();
    (NativeModules as Record<string, unknown>).VolumeManager = {};
  });

  it("reads the volume from an object or a number", async () => {
    mockGetVolume.mockResolvedValueOnce({ volume: 0.7 });
    expect(await getSystemVolume()).toBe(0.7);
    mockGetVolume.mockResolvedValueOnce(0.4);
    expect(await getSystemVolume()).toBe(0.4);
  });

  it("returns null when the read fails", async () => {
    mockGetVolume.mockRejectedValueOnce(new Error("no"));
    expect(await getSystemVolume()).toBeNull();
  });

  it("sets the volume without the system slider", async () => {
    mockSetVolume.mockResolvedValueOnce(undefined);
    expect(await setSystemVolume(0.5)).toBe(true);
    expect(mockSetVolume).toHaveBeenCalledWith(0.5, { showUI: false });
  });

  it("returns false when the module is missing or the call fails", async () => {
    mockSetVolume.mockRejectedValueOnce(new Error("no"));
    expect(await setSystemVolume(0.5)).toBe(false);
    delete (NativeModules as Record<string, unknown>).VolumeManager;
    expect(await getSystemVolume()).toBeNull();
  });
});
