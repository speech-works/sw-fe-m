import {
  CALL_GATE_COPY,
  VOLUME_LIMIT,
  VOLUME_TARGET,
  decideCallGate,
} from "../callGate";

describe("call gate decision", () => {
  it("keeps the constants in one place", () => {
    expect(VOLUME_LIMIT).toBe(0.6);
    expect(VOLUME_TARGET).toBe(0.5);
    expect(VOLUME_TARGET).toBeLessThan(VOLUME_LIMIT);
  });

  it("asks for headphones first, whatever the volume", () => {
    expect(decideCallGate(1, VOLUME_LIMIT, false)).toBe("need_headset");
    expect(decideCallGate(0.1, VOLUME_LIMIT, false)).toBe("need_headset");
    expect(decideCallGate(null, VOLUME_LIMIT, false)).toBe("need_headset");
  });

  it("asks for a lower volume only above the limit", () => {
    expect(decideCallGate(0.61, VOLUME_LIMIT, true)).toBe("need_lower_volume");
    expect(decideCallGate(1, VOLUME_LIMIT, true)).toBe("need_lower_volume");
  });

  it("lets the call go at or below the limit", () => {
    expect(decideCallGate(0.6, VOLUME_LIMIT, true)).toBe("ok");
    expect(decideCallGate(0.5, VOLUME_LIMIT, true)).toBe("ok");
    expect(decideCallGate(0, VOLUME_LIMIT, true)).toBe("ok");
  });

  it("never blocks when the volume cannot be read", () => {
    expect(decideCallGate(null, VOLUME_LIMIT, true)).toBe("ok");
    expect(decideCallGate(NaN, VOLUME_LIMIT, true)).toBe("ok");
  });

  it("uses plain wording without em dashes", () => {
    for (const text of Object.values(CALL_GATE_COPY)) {
      expect(text).not.toMatch(/—/);
    }
    expect(CALL_GATE_COPY.headset).toBe("Connect headphones to take this call.");
  });
});
