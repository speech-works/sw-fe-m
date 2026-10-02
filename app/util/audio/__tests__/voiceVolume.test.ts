import { parseVoiceVolume, voiceVolumeOrDefault, volumeCorrection } from "../voiceVolume";

describe("voice volume from the server", () => {
  it("uses the server's volume", () => {
    expect(voiceVolumeOrDefault(0.46)).toBe(0.46);
    expect(voiceVolumeOrDefault(1)).toBe(1);
  });

  it.each([undefined, null, "0.5", NaN, Infinity, 0, -0.3, {}])(
    "plays at 1 when the volume is %p (older server)",
    (v) => {
      expect(parseVoiceVolume(v)).toBeNull();
      expect(voiceVolumeOrDefault(v)).toBe(1);
    },
  );

  it("never plays louder than 1", () => {
    expect(voiceVolumeOrDefault(1.8)).toBe(1);
  });
});

describe("volumeCorrection (fillers event while a reply plays)", () => {
  it("corrects a reply whose play_stream guessed another voice (failover)", () => {
    expect(volumeCorrection(0.46, 1)).toBe(1);
    expect(volumeCorrection(1, 0.46)).toBe(0.46);
  });

  it("changes nothing for the same volume or no volume", () => {
    expect(volumeCorrection(0.46, 0.46)).toBeNull();
    expect(volumeCorrection(0.46, undefined)).toBeNull();
    expect(volumeCorrection(0.46, "x")).toBeNull();
  });
});
